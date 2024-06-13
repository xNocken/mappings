// TODO: replace with byte level reader
export default class Reader {
  buffer: Uint8Array;
  lastBit = 0;

  isError = false;

  offset = 0;
  offsets: number[] = [];

  float32Array = new Float32Array(1);
  uInt8Float32Array = new Uint8Array(this.float32Array.buffer);

  double64Array = new Float64Array(1);
  uInt8Double64Array = new Uint8Array(this.double64Array.buffer);

  constructor(input: Uint8Array, bitCount?: number) {
    this.buffer = new Uint8Array(input);
    this.lastBit = bitCount || this.buffer.length * 8;
  }

  addOffset(index: number, offset: number) {
    if (!this.canRead(offset)) {
      throw Error('offset is larger than buffer');
    }

    this.offsets[index] = this.lastBit;

    this.lastBit = this.offset + offset;
  }

  addOffsetByte(index: number, offset: number) {
    this.addOffset(index, offset * 8);
  }

  popOffset(index: number, numBits?: number, ignoreError?: boolean) {
    if (this.isError && !ignoreError) {
      throw Error(`Too much was read expected ${numBits || 'unknown'}`);
    }

    this.isError = false;

    this.offset = this.lastBit;

    this.lastBit = this.offsets[index];

    if (!this.lastBit) {
      throw Error(`No offset found for index ${index}`);
    }

    for (let i = index; i < this.offsets.length; i += 1) {
      this.offsets.pop();
    }
  }

  resolveError(index: number) {
    if (this.offsets[index] === undefined) {
      return;
    }

    this.isError = false;

    this.offset = this.lastBit;

    this.lastBit = this.offsets[index];

    for (let i = index; i < this.offsets.length; i += 1) {
      this.offsets.pop();
    }
  }

  getLastByte(): number {
    return this.buffer[(this.lastBit >> 3) - 1];
  }

  readBit(): boolean {
    if (this.atEnd() || this.isError) {
      this.isError = true;

      return false;
    }

    const byteOffset = this.offset >>> 3;

    const value = (this.buffer[byteOffset] >> (this.offset & 7)) & 1;

    this.offset += 1;

    return value === 1;
  }

  readBits(bitCount: number): Uint8Array {
    const buffer = new Uint8Array(Math.ceil(bitCount / 8));
    let readBytes = 0;

    if ((this.offset & 7) === 0) {
      readBytes = bitCount >> 3;

      const bytes = this.readBytes(readBytes);

      buffer.set(bytes, 0);
    }

    let currentBit = 0;
    let currentResultOffset = 0;
    let currentByte = this.buffer[this.offset >>> 3];
    let currentByteBit = 1 << (this.offset & 7);

    for (let i = readBytes * 8; i < bitCount; i += 1) {
      const bitOffset = this.offset & 7;
      const resultBitOffset = i & 7;

      if (resultBitOffset === 0) {
        currentResultOffset = i >> 3;
        currentBit = 1;
      }

      if (bitOffset === 0) {
        currentByteBit = 1;
        currentByte = this.buffer[this.offset >>> 3];
      }

      if (currentByte & currentByteBit) {
        buffer[currentResultOffset] |= currentBit;
      } else {
        buffer[currentResultOffset] &= ~currentBit;
      }

      this.offset += 1;

      currentByteBit *= 2;
      currentBit *= 2;
    }

    return buffer;
  }

  readBitsToUnsignedInt(count: number): number {
    let val = 0;
    let readBits = 0;
    let countLeft = count;

    if ((this.offset & 7) === 0) {
      let index = 0;

      while (countLeft >= 8) {
        val |= this.buffer[this.offset >>> 3] << (index * 8);

        index += 1;
        countLeft -= 8;
        readBits += 8;
        this.offset += 8;
      }

      if (countLeft === 0) {
        return val >>> 0;
      }
    }

    let currentBit = 1 << readBits;
    let currentByte = this.buffer[this.offset >>> 3];
    let currentByteBit = 1 << (this.offset & 7);

    for (let i = 0; i < countLeft; i += 1) {
      const bitOffset = this.offset & 7;

      if (bitOffset === 0) {
        currentByteBit = 1;
        currentByte = this.buffer[this.offset >>> 3];
      }

      if (currentByte & currentByteBit) {
        val |= currentBit;
      }

      this.offset += 1;

      currentByteBit *= 2;
      currentBit *= 2;
    }

    return val >>> 0;
  }

  /**
   * Return the next bits from the array thats smaller than maxValue
   */
  readSerializedInt(maxValue: number): number {
    let value = 0;

    let currentByte = this.buffer[this.offset >>> 3];
    let currentByteBit = 1 << (this.offset & 7);

    for (let mask = 1; (value + mask) < maxValue; mask *= 2) {
      const bitOffset = this.offset & 7;

      if (bitOffset === 0) {
        currentByteBit = 1;
        currentByte = this.buffer[this.offset >>> 3];
      }

      if (currentByte & currentByteBit) {
        value |= mask;
      }

      this.offset += 1;

      currentByteBit *= 2;
    }

    return value;
  }

  canRead(number: number): boolean {
    return number + this.offset <= this.lastBit;
  }

  readIntPacked(): number {
    let remaining = true;
    let value = 0;
    let index = 0;

    while (remaining) {
      if (!this.canRead(8)) {
        this.isError = true;

        return 0;
      }

      const currentByte = this.readByte();

      remaining = (currentByte & 1) === 1;

      value += (currentByte >> 1) << (7 * index);

      index += 1;
    }

    return value;
  }

  readBytes(byteCount: number): Uint8Array {
    if ((this.offset & 7) === 0) {
      const start = this.offset >>> 3;

      if (!this.canRead(byteCount)) {
        this.isError = true;

        return new Uint8Array(0);
      }

      const arr = this.buffer.subarray(start, start + byteCount);

      this.offset += byteCount * 8;

      return arr;
    }

    const result = new Uint8Array(byteCount);

    for (let i = 0; i < byteCount; i += 1) {
      result[i] = this.readByte();
    }

    return result;
  }

  readByte(): number {
    return this.readBitsToUnsignedInt(8);
  }

  readInt16(): number {
    const [first, last] = this.readBytes(2);

    const val = first + (last << 8);

    return val | (val & 2 ** 15) * 0x1fffe;
  }

  readUInt16(): number {
    return this.readBitsToUnsignedInt(16);
  }

  readUInt32(): number {
    return this.readBitsToUnsignedInt(32);
  }

  readInt32(): number {
    const bytes = this.readBytes(4);

    return bytes[0]
      + (bytes[1] << 8)
      + (bytes[2] << 16)
      + (bytes[3] << 24);
  }

  readUInt64(): bigint {
    const bytes = this.readBytes(8);

    const lo = bytes[0]
      + (bytes[1] << 8)
      + (bytes[2] << 16)
      + (bytes[3] * 2 ** 24);

    const hi = bytes[4]
      + (bytes[5] << 8)
      + (bytes[6] << 16)
      + (bytes[7] * 2 ** 24);

    return BigInt(lo) + (BigInt(hi) << 32n);
  }

  readString(useShort = false): string {
    const length = useShort ? this.readUInt16() : this.readByte();
    let result = '';

    if (length === 0) {
      return '';
    }

    if (!this.canRead(length)) {
      this.isError = true;

      return '';
    }

    const bytes = this.readBytes(length);

    for (let i = 0; i < length; i += 1) {
      result += String.fromCharCode(bytes[i]);
    }

    return result.trim();
  }

  readBoolean(): boolean {
    const val = this.readBit();

    this.offset += 31;

    return val;
  }

  getBitsLeft(): number {
    return this.lastBit - this.offset;
  }

  /**
   * Append data to current buffer
   */
  appendDataFromChecked(data: Uint8Array, bitCount: number) {
    const newBuffer = new Uint8Array(data.length + this.buffer.length);

    newBuffer.set(this.buffer, 0);
    newBuffer.set(data, this.buffer.length);

    this.buffer = newBuffer;

    this.lastBit += bitCount;
  }

  atEnd(): boolean {
    return this.lastBit <= this.offset;
  }

  readFloat32(): number {
    if (!this.canRead(32)) {
      this.isError = true;

      return 0;
    }

    const result = this.readBytes(4);

    [
      this.uInt8Float32Array[0],
      this.uInt8Float32Array[1],
      this.uInt8Float32Array[2],
      this.uInt8Float32Array[3],
    ] = result;

    return this.float32Array[0];
  }

  readDouble64(): number {
    if (!this.canRead(64)) {
      this.isError = true;

      return 0;
    }

    const result = this.readBytes(8);

    [
      this.uInt8Double64Array[0],
      this.uInt8Double64Array[1],
      this.uInt8Double64Array[2],
      this.uInt8Double64Array[3],
      this.uInt8Double64Array[4],
      this.uInt8Double64Array[5],
      this.uInt8Double64Array[6],
      this.uInt8Double64Array[7],
    ] = result;

    return this.double64Array[0];
  }

  /**
   * Read an id
   */
  readBytesToHex(length = 16): string {
    let result = '';

    const bytes = this.readBytes(length);

    for (let i = 0; i < length; i += 1) {
      const num = bytes[i].toString(16);

      result += `${num.length - 1 ? '' : '0'}${num}`;
    }

    return result;
  }

  readId(): string {
    return this.readBytesToHex(16);
  }

  skipBits(bits: number) {
    this.offset += bits;
  }

  skipBytes(bits: number) {
    this.offset += bits * 8;
  }

  getByteOffset(): number {
    return this.offset >>> 3;
  }

  goTo(offset: number) {
    this.offset = offset;
  }

  goToByte(offset: number) {
    this.offset = offset * 8;
  }
}
