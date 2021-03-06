/* */ 
(function(Buffer) {
  'use strict';
  const Stream = require('stream');
  const internals = {
    blank: new Buffer(''),
    decodeChars: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1]
  };
  exports.decode = function(buffer) {
    const decodeChars = internals.decodeChars;
    const len = buffer.length;
    const allocated = Math.ceil(len / 4) * 3;
    const result = new Buffer(allocated);
    let c1;
    let c2;
    let c3;
    let c4;
    let j = 0;
    for (let i = 0; i < len; ) {
      do {
        c1 = decodeChars[buffer[i++] & 0xff];
      } while (i < len && c1 === -1);
      if (c1 === -1) {
        break;
      }
      do {
        c2 = decodeChars[buffer[i++] & 0xff];
      } while (i < len && c2 === -1);
      if (c2 === -1) {
        break;
      }
      result[j++] = (c1 << 2) | ((c2 & 0x30) >> 4);
      do {
        c3 = buffer[i++] & 0xff;
        if (c3 === 61) {
          return result.slice(0, j);
        }
        c3 = decodeChars[c3];
      } while (i < len && c3 === -1);
      if (c3 === -1) {
        break;
      }
      result[j++] = ((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2);
      do {
        c4 = buffer[i++] & 0xff;
        if (c4 === 61) {
          return result.slice(0, j);
        }
        c4 = decodeChars[c4];
      } while (i < len && c4 === -1);
      if (c4 !== -1) {
        result[j++] = ((c3 & 0x03) << 6) | c4;
      }
    }
    return (j === allocated ? result : result.slice(0, j));
  };
  exports.Decoder = class Decoder extends Stream.Transform {
    constructor() {
      super();
      this._reminder = null;
    }
    _transform(chunk, encoding, callback) {
      let part = this._reminder ? Buffer.concat([this._reminder, chunk]) : chunk;
      const remaining = part.length % 4;
      if (remaining) {
        this._reminder = part.slice(part.length - remaining);
        part = part.slice(0, part.length - remaining);
      } else {
        this._reminder = null;
      }
      this.push(exports.decode(part));
      return callback();
    }
    _flush(callback) {
      if (this._reminder) {
        this.push(exports.decode(this._reminder));
      }
      return callback();
    }
  };
})(require('buffer').Buffer);
