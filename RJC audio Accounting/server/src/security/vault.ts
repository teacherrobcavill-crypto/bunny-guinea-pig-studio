import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import writeFileAtomic from "write-file-atomic";
import { z } from "zod";
import {
  OperatingMode,
  OperatingModeSchema,
  StagedDraft,
  StagedDraftSchema,
  VatMode,
  VatModeSchema
} from "@rjc/shared";

const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const MASTER_KEY_LENGTH_BYTES = 32;

const vaultQueue = pLimit(1);
const draftsQueue = pLimit(1);

export interface VaultCredentials {
  geminiApiKey?: string;
  freeagentClientId?: string;
  freeagentClientSecret?: string;
  freeagentAccessToken?: string;
  freeagentRefreshToken?: string;
  freeagentTokenExpiresAt?: number;
  operatingMode: OperatingMode;
  vatMode: VatMode;
  defaultUserUri?: string;
  companyName?: string;
}

const VaultCredentialsSchema = z.object({
  geminiApiKey: z.string().optional(),
  freeagentClientId: z.string().optional(),
  freeagentClientSecret: z.string().optional(),
  freeagentAccessToken: z.string().optional(),
  freeagentRefreshToken: z.string().optional(),
  freeagentTokenExpiresAt: z.number().optional(),
  operatingMode: OperatingModeSchema.default("mock"),
  vatMode: VatModeSchema.default("uk_vat_registered"),
  defaultUserUri: z.string().optional(),
  companyName: z.string().default("RJC Audio Ltd")
});

export function getDataDir(customDataDir?: string): string {
  if (customDataDir) {
    return path.resolve(customDataDir);
  }
  if (process.env.RJC_DATA_DIR) {
    return path.resolve(process.env.RJC_DATA_DIR);
  }
  return path.resolve(process.cwd(), "data");
}

function ensureDirectories(dataDir: string): void {
  const uploadsDir = path.join(dataDir, "uploads");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o700 });
  }
}

export function ensureMasterKey(dataDir?: string): Buffer {
  const resolvedDir = getDataDir(dataDir);
  ensureDirectories(resolvedDir);

  const keyPath = path.join(resolvedDir, ".master.key");
  if (!fs.existsSync(keyPath)) {
    const keyBuffer = crypto.randomBytes(MASTER_KEY_LENGTH_BYTES);
    fs.writeFileSync(keyPath, keyBuffer, { mode: 0o600 });
    fs.chmodSync(keyPath, 0o600);
    return keyBuffer;
  }

  const existing = fs.readFileSync(keyPath);
  if (existing.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(
      `Invalid master key length at ${keyPath}: expected ${MASTER_KEY_LENGTH_BYTES} bytes, got ${existing.length}`
    );
  }
  return existing;
}

export function encryptBuffer(plainBuffer: Buffer, key?: Buffer): Buffer {
  const masterKey = key ?? ensureMasterKey();
  if (masterKey.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(`AES-256-GCM requires a ${MASTER_KEY_LENGTH_BYTES}-byte key`);
  }

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptBuffer(payloadBuffer: Buffer, key?: Buffer): Buffer {
  const masterKey = key ?? ensureMasterKey();
  if (masterKey.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(`AES-256-GCM requires a ${MASTER_KEY_LENGTH_BYTES}-byte key`);
  }

  if (payloadBuffer.length < IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES) {
    throw new Error("Encrypted payload buffer is too short to contain IV and authTag");
  }

  const iv = payloadBuffer.subarray(0, IV_LENGTH_BYTES);
  const authTag = payloadBuffer.subarray(
    IV_LENGTH_BYTES,
    IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES
  );
  const ciphertext = payloadBuffer.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function getDefaultVaultCredentials(): VaultCredentials {
  return {
    operatingMode: (process.env.OPERATING_MODE as OperatingMode) || "mock",
    vatMode: (process.env.VAT_MODE as VatMode) || "uk_vat_registered",
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    freeagentClientId: process.env.FREEAGENT_CLIENT_ID || undefined,
    freeagentClientSecret: process.env.FREEAGENT_CLIENT_SECRET || undefined,
    companyName: "RJC Audio Ltd"
  };
}

async function readVaultInternal(dataDir?: string): Promise<VaultCredentials> {
  const resolvedDir = getDataDir(dataDir);
  const masterKey = ensureMasterKey(resolvedDir);
  const vaultPath = path.join(resolvedDir, "vault.enc");

  if (!fs.existsSync(vaultPath)) {
    return VaultCredentialsSchema.parse(getDefaultVaultCredentials());
  }

  const encrypted = await fsp.readFile(vaultPath);
  const decrypted = decryptBuffer(encrypted, masterKey);
  const parsedJson = JSON.parse(decrypted.toString("utf-8"));
  return VaultCredentialsSchema.parse({
    ...getDefaultVaultCredentials(),
    ...parsedJson
  });
}

export async function loadVault(dataDir?: string): Promise<VaultCredentials> {
  return vaultQueue(() => readVaultInternal(dataDir));
}

export async function saveVault(
  partialUpdate: Partial<VaultCredentials>,
  dataDir?: string
): Promise<VaultCredentials> {
  return vaultQueue(async () => {
    const resolvedDir = getDataDir(dataDir);
    const masterKey = ensureMasterKey(resolvedDir);
    const vaultPath = path.join(resolvedDir, "vault.enc");

    let current: VaultCredentials;
    try {
      current = await readVaultInternal(resolvedDir);
    } catch {
      current = VaultCredentialsSchema.parse(getDefaultVaultCredentials());
    }

    const updated = VaultCredentialsSchema.parse({
      ...current,
      ...partialUpdate
    });

    const plainBuffer = Buffer.from(JSON.stringify(updated, null, 2), "utf-8");
    const encryptedBuffer = encryptBuffer(plainBuffer, masterKey);

    await writeFileAtomic(vaultPath, encryptedBuffer, { mode: 0o600 });
    return updated;
  });
}

const StagedDraftArraySchema = z.array(StagedDraftSchema);

async function readStagedDraftsInternal(dataDir?: string): Promise<StagedDraft[]> {
  const resolvedDir = getDataDir(dataDir);
  ensureDirectories(resolvedDir);
  const draftsPath = path.join(resolvedDir, "staged_drafts.json");

  if (!fs.existsSync(draftsPath)) {
    return [];
  }

  const raw = await fsp.readFile(draftsPath, "utf-8");
  if (!raw.trim()) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return StagedDraftArraySchema.parse(parsed);
}

async function writeStagedDraftsInternal(
  drafts: StagedDraft[],
  dataDir?: string
): Promise<void> {
  const resolvedDir = getDataDir(dataDir);
  ensureDirectories(resolvedDir);
  const draftsPath = path.join(resolvedDir, "staged_drafts.json");
  const validated = StagedDraftArraySchema.parse(drafts);
  await writeFileAtomic(draftsPath, JSON.stringify(validated, null, 2), {
    mode: 0o600
  });
}

export async function listStagedDrafts(dataDir?: string): Promise<StagedDraft[]> {
  return draftsQueue(() => readStagedDraftsInternal(dataDir));
}

export async function getStagedDraft(
  id: string,
  dataDir?: string
): Promise<StagedDraft | null> {
  return draftsQueue(async () => {
    const drafts = await readStagedDraftsInternal(dataDir);
    return drafts.find((d) => d.id === id) ?? null;
  });
}

export async function saveStagedDraft(
  draft: StagedDraft,
  dataDir?: string
): Promise<StagedDraft> {
  return draftsQueue(async () => {
    const validatedDraft = StagedDraftSchema.parse(draft);
    const drafts = await readStagedDraftsInternal(dataDir);
    const existingIndex = drafts.findIndex((d) => d.id === validatedDraft.id);

    if (existingIndex >= 0) {
      drafts[existingIndex] = validatedDraft;
    } else {
      drafts.unshift(validatedDraft);
    }

    await writeStagedDraftsInternal(drafts, dataDir);
    return validatedDraft;
  });
}

export async function updateStagedDraft(
  id: string,
  updater: (draft: StagedDraft) => StagedDraft,
  dataDir?: string
): Promise<StagedDraft | null> {
  return draftsQueue(async () => {
    const drafts = await readStagedDraftsInternal(dataDir);
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) {
      return null;
    }

    const updated = StagedDraftSchema.parse(updater(drafts[index]));
    drafts[index] = updated;
    await writeStagedDraftsInternal(drafts, dataDir);
    return updated;
  });
}

export async function deleteStagedDraft(
  id: string,
  dataDir?: string
): Promise<boolean> {
  return draftsQueue(async () => {
    const drafts = await readStagedDraftsInternal(dataDir);
    const filtered = drafts.filter((d) => d.id !== id);
    if (filtered.length === drafts.length) {
      return false;
    }

    await writeStagedDraftsInternal(filtered, dataDir);
    await deleteUploadFile(id, dataDir);
    return true;
  });
}

function getUploadFilePath(draftId: string, dataDir?: string): string {
  const safeId = path.basename(draftId);
  const resolvedDir = getDataDir(dataDir);
  ensureDirectories(resolvedDir);
  return path.join(resolvedDir, "uploads", `${safeId}.bin`);
}

export async function saveUploadFile(
  draftId: string,
  fileBuffer: Buffer,
  dataDir?: string
): Promise<string> {
  const uploadPath = getUploadFilePath(draftId, dataDir);
  await writeFileAtomic(uploadPath, fileBuffer, { mode: 0o600 });
  return uploadPath;
}

export async function readUploadFile(
  draftId: string,
  dataDir?: string
): Promise<Buffer | null> {
  const uploadPath = getUploadFilePath(draftId, dataDir);
  try {
    return await fsp.readFile(uploadPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function deleteUploadFile(
  draftId: string,
  dataDir?: string
): Promise<void> {
  const uploadPath = getUploadFilePath(draftId, dataDir);
  try {
    await fsp.unlink(uploadPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw err;
  }
}
