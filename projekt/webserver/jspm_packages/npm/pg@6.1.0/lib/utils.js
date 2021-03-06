/* */ 
(function(Buffer) {
  var defaults = require('./defaults');
  function arrayString(val) {
    var result = '{';
    for (var i = 0; i < val.length; i++) {
      if (i > 0) {
        result = result + ',';
      }
      if (val[i] === null || typeof val[i] === 'undefined') {
        result = result + 'NULL';
      } else if (Array.isArray(val[i])) {
        result = result + arrayString(val[i]);
      } else {
        result = result + JSON.stringify(prepareValue(val[i]));
      }
    }
    result = result + '}';
    return result;
  }
  var prepareValue = function(val, seen) {
    if (val instanceof Buffer) {
      return val;
    }
    if (val instanceof Date) {
      if (defaults.parseInputDatesAsUTC) {
        return dateToStringUTC(val);
      } else {
        return dateToString(val);
      }
    }
    if (Array.isArray(val)) {
      return arrayString(val);
    }
    if (val === null || typeof val === 'undefined') {
      return null;
    }
    if (typeof val === 'object') {
      return prepareObject(val, seen);
    }
    if (typeof val === 'undefined') {
      throw new Error('SQL queries with undefined where clause option');
    }
    return val.toString();
  };
  function prepareObject(val, seen) {
    if (val.toPostgres && typeof val.toPostgres === 'function') {
      seen = seen || [];
      if (seen.indexOf(val) !== -1) {
        throw new Error('circular reference detected while preparing "' + val + '" for query');
      }
      seen.push(val);
      return prepareValue(val.toPostgres(prepareValue), seen);
    }
    return JSON.stringify(val);
  }
  function pad(number, digits) {
    number = "" + number;
    while (number.length < digits)
      number = "0" + number;
    return number;
  }
  function dateToString(date) {
    var offset = -date.getTimezoneOffset();
    var ret = pad(date.getFullYear(), 4) + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2) + 'T' + pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2) + '.' + pad(date.getMilliseconds(), 3);
    if (offset < 0) {
      ret += "-";
      offset *= -1;
    } else
      ret += "+";
    return ret + pad(Math.floor(offset / 60), 2) + ":" + pad(offset % 60, 2);
  }
  function dateToStringUTC(date) {
    var ret = pad(date.getUTCFullYear(), 4) + '-' + pad(date.getUTCMonth() + 1, 2) + '-' + pad(date.getUTCDate(), 2) + 'T' + pad(date.getUTCHours(), 2) + ':' + pad(date.getUTCMinutes(), 2) + ':' + pad(date.getUTCSeconds(), 2) + '.' + pad(date.getUTCMilliseconds(), 3);
    return ret + "+00:00";
  }
  function normalizeQueryConfig(config, values, callback) {
    config = (typeof(config) == 'string') ? {text: config} : config;
    if (values) {
      if (typeof values === 'function') {
        config.callback = values;
      } else {
        config.values = values;
      }
    }
    if (callback) {
      config.callback = callback;
    }
    return config;
  }
  module.exports = {
    prepareValue: function prepareValueWrapper(value) {
      return prepareValue(value);
    },
    normalizeQueryConfig: normalizeQueryConfig
  };
})(require('buffer').Buffer);
