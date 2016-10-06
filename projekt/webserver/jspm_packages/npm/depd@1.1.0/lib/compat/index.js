/* */ 
(function(Buffer) {
  'use strict';
  var Buffer = require('buffer');
  var EventEmitter = require('events').EventEmitter;
  lazyProperty(module.exports, 'bufferConcat', function bufferConcat() {
    return Buffer.concat || require('./buffer-concat');
  });
  lazyProperty(module.exports, 'callSiteToString', function callSiteToString() {
    var limit = Error.stackTraceLimit;
    var obj = {};
    var prep = Error.prepareStackTrace;
    function prepareObjectStackTrace(obj, stack) {
      return stack;
    }
    Error.prepareStackTrace = prepareObjectStackTrace;
    Error.stackTraceLimit = 2;
    Error.captureStackTrace(obj);
    var stack = obj.stack.slice();
    Error.prepareStackTrace = prep;
    Error.stackTraceLimit = limit;
    return stack[0].toString ? toString : require('./callsite-tostring');
  });
  lazyProperty(module.exports, 'eventListenerCount', function eventListenerCount() {
    return EventEmitter.listenerCount || require('./event-listener-count');
  });
  function lazyProperty(obj, prop, getter) {
    function get() {
      var val = getter();
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: true,
        value: val
      });
      return val;
    }
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      get: get
    });
  }
  function toString(obj) {
    return obj.toString();
  }
})(require('buffer').Buffer);
