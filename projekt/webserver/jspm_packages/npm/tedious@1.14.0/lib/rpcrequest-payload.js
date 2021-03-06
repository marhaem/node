/* */ 
'use strict';
var _createClass = require('babel-runtime/helpers/create-class')['default'];
var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];
var WritableTrackingBuffer = require('./tracking-buffer/tracking-buffer').WritableTrackingBuffer;
var writeAllHeaders = require('./all-headers').writeToTrackingBuffer;
var STATUS = {
  BY_REF_VALUE: 0x01,
  DEFAULT_VALUE: 0x02
};
module.exports = (function() {
  function RpcRequestPayload(request, txnDescriptor, options) {
    _classCallCheck(this, RpcRequestPayload);
    this.request = request;
    this.procedure = this.request.sqlTextOrProcedure;
    var buffer = new WritableTrackingBuffer(500);
    if (options.tdsVersion >= '7_2') {
      var outstandingRequestCount = 1;
      writeAllHeaders(buffer, txnDescriptor, outstandingRequestCount);
    }
    if (typeof this.procedure === 'string') {
      buffer.writeUsVarchar(this.procedure);
    } else {
      buffer.writeUShort(0xFFFF);
      buffer.writeUShort(this.procedure);
    }
    var optionFlags = 0;
    buffer.writeUInt16LE(optionFlags);
    var parameters = this.request.parameters;
    for (var i = 0,
        len = parameters.length; i < len; i++) {
      var parameter = parameters[i];
      buffer.writeBVarchar('@' + parameter.name);
      var statusFlags = 0;
      if (parameter.output) {
        statusFlags |= STATUS.BY_REF_VALUE;
      }
      buffer.writeUInt8(statusFlags);
      var param = {value: parameter.value};
      var type = parameter.type;
      if ((type.id & 0x30) === 0x20) {
        if (parameter.length) {
          param.length = parameter.length;
        } else if (type.resolveLength) {
          param.length = type.resolveLength(parameter);
        }
      }
      if (type.hasPrecision) {
        if (parameter.precision) {
          param.precision = parameter.precision;
        } else if (type.resolvePrecision) {
          param.precision = type.resolvePrecision(parameter);
        }
      }
      if (type.hasScale) {
        if (parameter.scale) {
          param.scale = parameter.scale;
        } else if (type.resolveScale) {
          param.scale = type.resolveScale(parameter);
        }
      }
      type.writeTypeInfo(buffer, param, options);
      type.writeParameterData(buffer, param, options);
    }
    this.data = buffer.data;
  }
  _createClass(RpcRequestPayload, [{
    key: 'toString',
    value: function toString(indent) {
      indent || (indent = '');
      return indent + ('RPC Request - ' + this.procedure);
    }
  }]);
  return RpcRequestPayload;
})();
