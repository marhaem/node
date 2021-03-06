/* */ 
(function(Buffer, process) {
  var Buffer = require('safe-buffer').Buffer;
  var Stream = require('stream');
  var util = require('util');
  function DataStream(data) {
    this.buffer = null;
    this.writable = true;
    this.readable = true;
    if (!data) {
      this.buffer = Buffer.alloc(0);
      return this;
    }
    if (typeof data.pipe === 'function') {
      this.buffer = Buffer.alloc(0);
      data.pipe(this);
      return this;
    }
    if (data.length || typeof data === 'object') {
      this.buffer = data;
      this.writable = false;
      process.nextTick(function() {
        this.emit('end', data);
        this.readable = false;
        this.emit('close');
      }.bind(this));
      return this;
    }
    throw new TypeError('Unexpected data type (' + typeof data + ')');
  }
  util.inherits(DataStream, Stream);
  DataStream.prototype.write = function write(data) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(data)]);
    this.emit('data', data);
  };
  DataStream.prototype.end = function end(data) {
    if (data)
      this.write(data);
    this.emit('end', data);
    this.emit('close');
    this.writable = false;
    this.readable = false;
  };
  module.exports = DataStream;
})(require('buffer').Buffer, require('process'));
