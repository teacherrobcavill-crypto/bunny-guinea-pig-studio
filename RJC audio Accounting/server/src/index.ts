import "dotenv/config";
import { createApp } from "./app.js";
import { ensureMasterKey } from "./security/vault.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 3001;

ensureMasterKey();

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(
    `RJC Audio Ltd Accounting Server listening strictly on http://${HOST}:${PORT}`
  );
});
