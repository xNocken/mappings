import type Reader from '../classes/Reader';

const EUsmapPropertyType = [
  'ByteProperty',
  'BoolProperty',
  'IntProperty',
  'FloatProperty',
  'ObjectProperty',
  'NameProperty',
  'DelegateProperty',
  'DoubleProperty',
  'ArrayProperty',
  'StructProperty',
  'StrProperty',
  'TextProperty',
  'InterfaceProperty',
  'MulticastDelegateProperty',
  'WeakObjectProperty', //
  'LazyObjectProperty', // When deserialized, these 3 properties will be SoftObjects
  'AssetObjectProperty', //
  'SoftObjectProperty',
  'UInt64Property',
  'UInt32Property',
  'UInt16Property',
  'Int64Property',
  'Int16Property',
  'Int8Property',
  'MapProperty',
  'SetProperty',
  'EnumProperty',
  'FieldPathProperty',
  'OptionalProperty',
];

const readPropData = (reader: Reader, readName: () => string): string => {
  const propType = EUsmapPropertyType[reader.readByte()];

  switch (propType) {
    case 'EnumProperty': {
      const prop = readPropData(reader, readName);

      const enumName = readName();

      return `${enumName}<${prop}>`;
    }

    case 'StructProperty':
      return readName();

    case 'SetProperty':
    case 'OptionalProperty':
    case 'ArrayProperty':
      return `${propType}<${readPropData(reader, readName)}>`;

    case 'MapProperty':
      return `${propType}<${readPropData(reader, readName)}, ${readPropData(reader, readName)}>`;

    default:
      return propType;
  }
};

export default readPropData;
