import fs from 'fs';

import Reader from './classes/Reader';
import decompress from './utils/decompress';
import readPropData from './utils/read-prop-data';

import type { Struct } from './types/result';

const magic = 0x30C4;
const maxVersion = 0;

export default (usmap: Buffer, fileName: string) => {
  const reader = new Reader(usmap);

  const fileMagic = reader.readInt16();

  if (fileMagic !== magic) {
    throw Error('Invalid magic number');
  }

  const version = reader.readByte();

  if (version > maxVersion) {
    throw Error('Invalid version');
  }

  const uncompressed = decompress(reader);

  const nameMapLength = uncompressed.readInt32();
  const nameMap: string[] = [];

  for (let i = 0; i < nameMapLength; i += 1) {
    nameMap.push(uncompressed.readString());
  }

  const enumCount = uncompressed.readInt32();
  const enums: Record<string, string[]> = {};

  const readName = () => {
    const index = uncompressed.readInt32();

    if (index === -1) {
      return 'None';
    }

    if (!nameMap[index]) {
      throw Error(`Invalid name index ${index}`);
    }

    return nameMap[index];
  };

  for (let i = 0; i < enumCount; i += 1) {
    const enumName = readName();
    const enumValueCount = uncompressed.readByte();

    const values: string[] = [];

    for (let j = 0; j < enumValueCount; j += 1) {
      values.push(readName());
    }

    enums[enumName] = values;
  }

  const structCount = uncompressed.readInt32();
  const structs: Record<string, Struct> = {};

  for (let i = 0; i < structCount; i += 1) {
    const name = readName();
    const superClass = readName();
    const propertyCount = uncompressed.readInt16();

    const exportCount = uncompressed.readInt16();

    const structEntry: Struct = {
      super: superClass,
      propertyCount,
      properties: {},
    };

    structs[name] = structEntry;

    for (let j = 0; j < exportCount; j += 1) {
      uncompressed.skipBits(16); // schema index
      uncompressed.skipBits(8); // arraySize

      const propertyName = readName();
      const type = readPropData(uncompressed, readName);

      structEntry.properties[propertyName] = type;
    }
  }

  fs.mkdirSync(`output/${fileName}`, { recursive: true });

  const sortedStructs = Object.fromEntries(Object.keys(structs).sort().map((key) => [key, structs[key]]));
  const sortedEnums = Object.fromEntries(Object.keys(enums).sort().map((key) => [key, enums[key]]));

  // per version output
  fs.writeFileSync(`output/${fileName}/enums.json`, JSON.stringify(sortedEnums, null, 2));
  fs.writeFileSync(`output/${fileName}/structs.json`, JSON.stringify(sortedStructs, null, 2));

  // overwriting output
  fs.writeFileSync('output/enums.json', JSON.stringify(sortedEnums, null, 2));
  fs.writeFileSync('output/structs.json', JSON.stringify(sortedStructs, null, 2));
};
