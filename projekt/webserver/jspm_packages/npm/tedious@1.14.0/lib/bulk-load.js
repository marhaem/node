/* */ 
'use strict';
var _get = require('babel-runtime/helpers/get')['default'];
var _inherits = require('babel-runtime/helpers/inherits')['default'];
var _createClass = require('babel-runtime/helpers/create-class')['default'];
var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];
var EventEmitter = require('events').EventEmitter;
var WritableTrackingBuffer = require('./tracking-buffer/tracking-buffer').WritableTrackingBuffer;
var TOKEN_TYPE = require('./token/token').TYPE;
var FLAGS = {
  nullable: 1 << 0,
  caseSen: 1 << 1,
  updateableReadWrite: 1 << 2,
  updateableUnknown: 1 << 3,
  identity: 1 << 4,
  computed: 1 << 5,
  fixedLenCLRType: 1 << 8,
  sparseColumnSet: 1 << 10,
  hidden: 1 << 13,
  key: 1 << 14,
  nullableUnknown: 1 << 15
};
var DONE_STATUS = {
  FINAL: 0x00,
  MORE: 0x1,
  ERROR: 0x2,
  INXACT: 0x4,
  COUNT: 0x10,
  ATTN: 0x20,
  SRVERROR: 0x100
};
module.exports = (function(_EventEmitter) {
  _inherits(BulkLoad, _EventEmitter);
  function BulkLoad(table, options1, callback) {
    _classCallCheck(this, BulkLoad);
    _get(Object.getPrototypeOf(BulkLoad.prototype), 'constructor', this).call(this);
    this.error = undefined;
    this.canceled = false;
    this.table = table;
    this.options = options1;
    this.callback = callback;
    this.columns = [];
    this.columnsByName = {};
    this.rowsData = new WritableTrackingBuffer(1024, 'ucs2', true);
    this.firstRowWritten = false;
  }
  _createClass(BulkLoad, [{
    key: 'addColumn',
    value: function addColumn(name, type, options) {
      if (options == null) {
        options = {};
      }
      if (this.firstRowWritten) {
        throw new Error('Columns cannot be added to bulk insert after the first row has been written.');
      }
      var column = {
        type: type,
        name: name,
        value: null,
        output: options.output || (options.output = false),
        length: options.length,
        precision: options.precision,
        scale: options.scale,
        objName: options.objName || name,
        nullable: options.nullable
      };
      if ((type.id & 0x30) === 0x20) {
        if (column.length == undefined && type.resolveLength) {
          column.length = type.resolveLength(column);
        }
      }
      if (type.hasPrecision) {
        if (column.precision == undefined && type.resolvePrecision) {
          column.precision = type.resolvePrecision(column);
        }
      }
      if (type.hasScale) {
        if (column.scale == undefined && type.resolveScale) {
          column.scale = type.resolveScale(column);
        }
      }
      this.columns.push(column);
      return this.columnsByName[name] = column;
    }
  }, {
    key: 'addRow',
    value: function addRow(row) {
      this.firstRowWritten = true;
      if (arguments.length > 1 || !row || typeof row !== 'object') {
        var arrTemp = new Array(arguments.length);
        for (var i = 0,
            len = arguments.length; i < len; i++) {
          var c = arguments[i];
          arrTemp[i] = c;
        }
        row = arrTemp;
      }
      this.rowsData.writeUInt8(TOKEN_TYPE.ROW);
      var arr = row instanceof Array;
      for (var i = 0,
          len = this.columns.length; i < len; i++) {
        var c = this.columns[i];
        c.type.writeParameterData(this.rowsData, {
          length: c.length,
          scale: c.scale,
          precision: c.precision,
          value: row[arr ? i : c.objName]
        }, this.options);
      }
    }
  }, {
    key: 'getBulkInsertSql',
    value: function getBulkInsertSql() {
      var sql = 'insert bulk ' + this.table + '(';
      for (var i = 0,
          len = this.columns.length; i < len; i++) {
        var c = this.columns[i];
        if (i !== 0) {
          sql += ', ';
        }
        sql += '[' + c.name + '] ' + c.type.declaration(c);
      }
      sql += ')';
      return sql;
    }
  }, {
    key: 'getTableCreationSql',
    value: function getTableCreationSql() {
      var sql = 'CREATE TABLE ' + this.table + '(\n';
      for (var i = 0,
          len = this.columns.length; i < len; i++) {
        var c = this.columns[i];
        if (i !== 0) {
          sql += ',\n';
        }
        sql += '[' + c.name + '] ' + c.type.declaration(c);
        if (c.nullable !== void 0) {
          sql += ' ' + (c.nullable ? 'NULL' : 'NOT NULL');
        }
      }
      sql += '\n)';
      return sql;
    }
  }, {
    key: 'getPayload',
    value: function getPayload() {
      var metaData = this.getColMetaData();
      var length = metaData.length;
      var rows = this.rowsData.data;
      length += rows.length;
      var tBuf = new WritableTrackingBuffer(this.options.tdsVersion < '7_2' ? 9 : 13);
      tBuf.writeUInt8(TOKEN_TYPE.DONE);
      var status = DONE_STATUS.FINAL;
      tBuf.writeUInt16LE(status);
      tBuf.writeUInt16LE(0);
      tBuf.writeUInt32LE(0);
      if (this.options.tdsVersion >= '7_2') {
        tBuf.writeUInt32LE(0);
      }
      var done = tBuf.data;
      length += done.length;
      var payload = new WritableTrackingBuffer(length);
      payload.copyFrom(metaData);
      payload.copyFrom(rows);
      payload.copyFrom(done);
      return payload;
    }
  }, {
    key: 'getColMetaData',
    value: function getColMetaData() {
      var tBuf = new WritableTrackingBuffer(100, null, true);
      tBuf.writeUInt8(TOKEN_TYPE.COLMETADATA);
      tBuf.writeUInt16LE(this.columns.length);
      for (var j = 0,
          len = this.columns.length; j < len; j++) {
        var c = this.columns[j];
        if (this.options.tdsVersion < '7_2') {
          tBuf.writeUInt16LE(0);
        } else {
          tBuf.writeUInt32LE(0);
        }
        var flags = FLAGS.updateableReadWrite;
        if (c.nullable) {
          flags |= FLAGS.nullable;
        } else if (c.nullable === void 0 && this.options.tdsVersion >= '7_2') {
          flags |= FLAGS.nullableUnknown;
        }
        tBuf.writeUInt16LE(flags);
        c.type.writeTypeInfo(tBuf, c, this.options);
        tBuf.writeBVarchar(c.name, 'ucs2');
      }
      return tBuf.data;
    }
  }]);
  return BulkLoad;
})(EventEmitter);
