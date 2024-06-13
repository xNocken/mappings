import brotli from 'brotli';
import ffi from 'ffi-napi';
import zstd from 'fzstd';

import Reader from '../classes/Reader';
import { CompressionMethod } from '../types/umap';

import getOodlePath from './get-oodle-path';

import type { OodleLib } from '../types/umap';

const oodleLib: OodleLib = <OodleLib><unknown>ffi.Library(getOodlePath(), {
  OodleLZ_Decompress: ['size_t', ['uint8*', 'size_t', 'uint8*', 'size_t', 'int64', 'int64', 'int64', 'int64', 'int64', 'int64', 'int64', 'int64', 'int64', 'int64']],
});

export default (reader: Reader): Reader => {
  const compMethod = reader.readByte();
  const compSize = reader.readInt32();
  const uncompSize = reader.readInt32();

  switch (compMethod) {
    case CompressionMethod.None:
      reader.addOffsetByte(0, Math.min(compSize, reader.getBitsLeft() / 8));

      return reader;

    case CompressionMethod.Oodle: {
      const compData = reader.readBytes(compSize);
      const uncompData = Buffer.allocUnsafe(uncompSize);

      const result = oodleLib.OodleLZ_Decompress(
        compData,
        compSize,
        uncompData,
        uncompSize,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      );

      if (result !== uncompSize) {
        throw Error('Failed to decompress data');
      }

      return new Reader(uncompData);
    }

    case CompressionMethod.Brotli: {
      const data = reader.readBytes(compSize);
      const decompressed = brotli.decompress(Buffer.from(data), uncompSize);

      return new Reader(decompressed);
    }

    case CompressionMethod.Zstd: {
      const data = reader.readBytes(compSize);
      const decompressed = zstd.decompress(data);

      return new Reader(decompressed);
    }

    default:
      throw Error('Invalid compression method');
  }
};
