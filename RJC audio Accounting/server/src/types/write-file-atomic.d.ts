declare module "write-file-atomic" {
  export interface Options {
    chown?: { uid: number; gid: number };
    encoding?: BufferEncoding | null;
    fsync?: boolean;
    mode?: number;
    tmpfileCreated?: (tmpfile: string) => void;
  }

  function writeFileAtomic(
    filename: string,
    data: string | Buffer | TypedArray | DataView,
    options?: Options | BufferEncoding
  ): Promise<void>;

  namespace writeFileAtomic {
    function sync(
      filename: string,
      data: string | Buffer | TypedArray | DataView,
      options?: Options | BufferEncoding
    ): void;
  }

  type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;

  export default writeFileAtomic;
}
