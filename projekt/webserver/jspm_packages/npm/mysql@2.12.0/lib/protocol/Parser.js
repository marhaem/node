/* */ 
(function(Buffer, process) {
  var MAX_PACKET_LENGTH = Math.pow(2, 24) - 1;
  var MUL_32BIT = Math.pow(2, 32);
  var PacketHeader = require('./PacketHeader');
  var BigNumber = require('bignumber.js');
  module.exports = Parser;
  function Parser(options) {
    options = options || {};
    this._supportBigNumbers = options.config && options.config.supportBigNumbers;
    this._buffer = new Buffer(0);
    this._nextBuffers = [];
    this._longPacketBuffers = [];
    this._offset = 0;
    this._packetEnd = null;
    this._packetHeader = null;
    this._packetOffset = null;
    this._onError = options.onError || function(err) {
      throw err;
    };
    this._onPacket = options.onPacket || function() {};
    this._nextPacketNumber = 0;
    this._encoding = 'utf-8';
    this._paused = false;
  }
  Parser.prototype.write = function write(chunk) {
    this._nextBuffers.push(chunk);
    while (!this._paused) {
      if (!this._packetHeader) {
        if (!this._combineNextBuffers(4)) {
          break;
        }
        this._packetHeader = new PacketHeader(this.parseUnsignedNumber(3), this.parseUnsignedNumber(1));
        if (this._packetHeader.number !== this._nextPacketNumber) {
          var err = new Error('Packets out of order. Got: ' + this._packetHeader.number + ' ' + 'Expected: ' + this._nextPacketNumber);
          err.code = 'PROTOCOL_PACKETS_OUT_OF_ORDER';
          err.fatal = true;
          this._onError(err);
        }
        this.incrementPacketNumber();
      }
      if (!this._combineNextBuffers(this._packetHeader.length)) {
        break;
      }
      this._packetEnd = this._offset + this._packetHeader.length;
      this._packetOffset = this._offset;
      if (this._packetHeader.length === MAX_PACKET_LENGTH) {
        this._longPacketBuffers.push(this._buffer.slice(this._packetOffset, this._packetEnd));
        this._advanceToNextPacket();
        continue;
      }
      this._combineLongPacketBuffers();
      var hadException = true;
      try {
        this._onPacket(this._packetHeader);
        hadException = false;
      } catch (err) {
        if (!err || typeof err.code !== 'string' || err.code.substr(0, 7) !== 'PARSER_') {
          throw err;
        }
        this._onError(err);
        hadException = false;
      } finally {
        this._advanceToNextPacket();
        if (hadException) {
          process.nextTick(this.write.bind(this));
        }
      }
    }
  };
  Parser.prototype.append = function append(chunk) {
    if (!chunk || chunk.length === 0) {
      return;
    }
    var buffer = chunk;
    var sliceEnd = this._buffer.length;
    var sliceStart = this._packetOffset === null ? this._offset : this._packetOffset;
    var sliceLength = sliceEnd - sliceStart;
    if (sliceLength !== 0) {
      buffer = new Buffer(sliceLength + chunk.length);
      this._buffer.copy(buffer, 0, sliceStart, sliceEnd);
      chunk.copy(buffer, sliceLength);
    }
    this._buffer = buffer;
    this._offset = this._offset - sliceStart;
    this._packetEnd = this._packetEnd !== null ? this._packetEnd - sliceStart : null;
    this._packetOffset = this._packetOffset !== null ? this._packetOffset - sliceStart : null;
  };
  Parser.prototype.pause = function() {
    this._paused = true;
  };
  Parser.prototype.resume = function() {
    this._paused = false;
    process.nextTick(this.write.bind(this));
  };
  Parser.prototype.peak = function() {
    return this._buffer[this._offset];
  };
  Parser.prototype.parseUnsignedNumber = function parseUnsignedNumber(bytes) {
    if (bytes === 1) {
      return this._buffer[this._offset++];
    }
    var buffer = this._buffer;
    var offset = this._offset + bytes - 1;
    var value = 0;
    if (bytes > 4) {
      var err = new Error('parseUnsignedNumber: Supports only up to 4 bytes');
      err.offset = (this._offset - this._packetOffset - 1);
      err.code = 'PARSER_UNSIGNED_TOO_LONG';
      throw err;
    }
    while (offset >= this._offset) {
      value = ((value << 8) | buffer[offset]) >>> 0;
      offset--;
    }
    this._offset += bytes;
    return value;
  };
  Parser.prototype.parseLengthCodedString = function() {
    var length = this.parseLengthCodedNumber();
    if (length === null) {
      return null;
    }
    return this.parseString(length);
  };
  Parser.prototype.parseLengthCodedBuffer = function() {
    var length = this.parseLengthCodedNumber();
    if (length === null) {
      return null;
    }
    return this.parseBuffer(length);
  };
  Parser.prototype.parseLengthCodedNumber = function parseLengthCodedNumber() {
    if (this._offset >= this._buffer.length) {
      var err = new Error('Parser: read past end');
      err.offset = (this._offset - this._packetOffset);
      err.code = 'PARSER_READ_PAST_END';
      throw err;
    }
    var bits = this._buffer[this._offset++];
    if (bits <= 250) {
      return bits;
    }
    switch (bits) {
      case 251:
        return null;
      case 252:
        return this.parseUnsignedNumber(2);
      case 253:
        return this.parseUnsignedNumber(3);
      case 254:
        break;
      default:
        var err = new Error('Unexpected first byte' + (bits ? ': 0x' + bits.toString(16) : ''));
        err.offset = (this._offset - this._packetOffset - 1);
        err.code = 'PARSER_BAD_LENGTH_BYTE';
        throw err;
    }
    var low = this.parseUnsignedNumber(4);
    var high = this.parseUnsignedNumber(4);
    var value;
    if (high >>> 21) {
      value = (new BigNumber(low)).plus((new BigNumber(MUL_32BIT)).times(high)).toString();
      if (this._supportBigNumbers) {
        return value;
      }
      var err = new Error('parseLengthCodedNumber: JS precision range exceeded, ' + 'number is >= 53 bit: "' + value + '"');
      err.offset = (this._offset - this._packetOffset - 8);
      err.code = 'PARSER_JS_PRECISION_RANGE_EXCEEDED';
      throw err;
    }
    value = low + (MUL_32BIT * high);
    return value;
  };
  Parser.prototype.parseFiller = function(length) {
    return this.parseBuffer(length);
  };
  Parser.prototype.parseNullTerminatedBuffer = function() {
    var end = this._nullByteOffset();
    var value = this._buffer.slice(this._offset, end);
    this._offset = end + 1;
    return value;
  };
  Parser.prototype.parseNullTerminatedString = function() {
    var end = this._nullByteOffset();
    var value = this._buffer.toString(this._encoding, this._offset, end);
    this._offset = end + 1;
    return value;
  };
  Parser.prototype._nullByteOffset = function() {
    var offset = this._offset;
    while (this._buffer[offset] !== 0x00) {
      offset++;
      if (offset >= this._buffer.length) {
        var err = new Error('Offset of null terminated string not found.');
        err.offset = (this._offset - this._packetOffset);
        err.code = 'PARSER_MISSING_NULL_BYTE';
        throw err;
      }
    }
    return offset;
  };
  Parser.prototype.parsePacketTerminatedString = function() {
    var length = this._packetEnd - this._offset;
    return this.parseString(length);
  };
  Parser.prototype.parseBuffer = function(length) {
    var response = new Buffer(length);
    this._buffer.copy(response, 0, this._offset, this._offset + length);
    this._offset += length;
    return response;
  };
  Parser.prototype.parseString = function(length) {
    var offset = this._offset;
    var end = offset + length;
    var value = this._buffer.toString(this._encoding, offset, end);
    this._offset = end;
    return value;
  };
  Parser.prototype.parseGeometryValue = function() {
    var buffer = this.parseLengthCodedBuffer();
    var offset = 4;
    if (buffer === null || !buffer.length) {
      return null;
    }
    function parseGeometry() {
      var result = null;
      var byteOrder = buffer.readUInt8(offset);
      offset += 1;
      var wkbType = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
      offset += 4;
      switch (wkbType) {
        case 1:
          var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
          offset += 8;
          var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
          offset += 8;
          result = {
            x: x,
            y: y
          };
          break;
        case 2:
          var numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
          offset += 4;
          result = [];
          for (var i = numPoints; i > 0; i--) {
            var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
            offset += 8;
            var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
            offset += 8;
            result.push({
              x: x,
              y: y
            });
          }
          break;
        case 3:
          var numRings = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
          offset += 4;
          result = [];
          for (var i = numRings; i > 0; i--) {
            var numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
            offset += 4;
            var line = [];
            for (var j = numPoints; j > 0; j--) {
              var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
              offset += 8;
              var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
              offset += 8;
              line.push({
                x: x,
                y: y
              });
            }
            result.push(line);
          }
          break;
        case 4:
        case 5:
        case 6:
        case 7:
          var num = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
          offset += 4;
          var result = [];
          for (var i = num; i > 0; i--) {
            result.push(parseGeometry());
          }
          break;
      }
      return result;
    }
    return parseGeometry();
  };
  Parser.prototype.reachedPacketEnd = function() {
    return this._offset === this._packetEnd;
  };
  Parser.prototype.incrementPacketNumber = function() {
    var currentPacketNumber = this._nextPacketNumber;
    this._nextPacketNumber = (this._nextPacketNumber + 1) % 256;
    return currentPacketNumber;
  };
  Parser.prototype.resetPacketNumber = function() {
    this._nextPacketNumber = 0;
  };
  Parser.prototype.packetLength = function() {
    return this._longPacketBuffers.reduce(function(length, buffer) {
      return length + buffer.length;
    }, this._packetHeader.length);
  };
  Parser.prototype._combineNextBuffers = function _combineNextBuffers(bytes) {
    if ((this._buffer.length - this._offset) >= bytes) {
      return true;
    }
    if (!this._nextBuffers.length) {
      return false;
    }
    while (this._nextBuffers.length && (this._buffer.length - this._offset) < bytes) {
      this.append(this._nextBuffers.shift());
    }
    return (this._buffer.length - this._offset) >= bytes;
  };
  Parser.prototype._combineLongPacketBuffers = function _combineLongPacketBuffers() {
    if (!this._longPacketBuffers.length) {
      return;
    }
    var trailingPacketBytes = this._buffer.length - this._packetEnd;
    var length = this._longPacketBuffers.reduce(function(length, buffer) {
      return length + buffer.length;
    }, (this._buffer.length - this._offset));
    var combinedBuffer = new Buffer(length);
    var offset = this._longPacketBuffers.reduce(function(offset, buffer) {
      buffer.copy(combinedBuffer, offset);
      return offset + buffer.length;
    }, 0);
    this._buffer.copy(combinedBuffer, offset, this._offset);
    this._buffer = combinedBuffer;
    this._longPacketBuffers = [];
    this._offset = 0;
    this._packetEnd = this._buffer.length - trailingPacketBytes;
    this._packetOffset = 0;
  };
  Parser.prototype._advanceToNextPacket = function() {
    this._offset = this._packetEnd;
    this._packetHeader = null;
    this._packetEnd = null;
    this._packetOffset = null;
  };
})(require('buffer').Buffer, require('process'));
