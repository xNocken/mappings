export type CompressionMethod = 'None' | 'Oodle' | 'Brotli' | 'Zstandard';

export interface Mappings {
  url: string;
  fileName: string;
  hash: string;
  length: number;
  uploaded: string;
  meta: Meta;
}

export interface Meta {
  version: string;
  compressionMethod: CompressionMethod;
  platform: string;
}
