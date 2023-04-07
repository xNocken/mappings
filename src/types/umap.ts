// eslint-disable-next-line import/prefer-default-export
export enum CompressionMethod {
  None = 0,
  Oodle = 1,
  Brotli = 2,
}

export interface OodleDecompress {
  (
    inData: Uint8Array,
    inSize: number,
    outData: Uint8Array,
    outSize: number,
    fuzzSafe: number,
    checkCrc: number,
    verbosity: number,
    decBufBase: number,
    decBufSize: number,
    fpCallback: number,
    callbackUserData: number,
    decoderMemory: number,
    decoderMemorySize: number,
    threadPhase: number,
  ): number;
}

export interface OodleLib {
  OodleLZ_Decompress: OodleDecompress;
}
