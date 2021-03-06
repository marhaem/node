/* */ 
var common = require('./common');
common.register('set', _set, {
  allowGlobbing: false,
  wrapOutput: false
});
function _set(options) {
  if (!options) {
    var args = [].slice.call(arguments, 0);
    if (args.length < 2)
      common.error('must provide an argument');
    options = args[1];
  }
  var negate = (options[0] === '+');
  if (negate) {
    options = '-' + options.slice(1);
  }
  options = common.parseOptions(options, {
    'e': 'fatal',
    'v': 'verbose',
    'f': 'noglob'
  });
  if (negate) {
    Object.keys(options).forEach(function(key) {
      options[key] = !options[key];
    });
  }
  Object.keys(options).forEach(function(key) {
    if (negate !== options[key]) {
      common.config[key] = options[key];
    }
  });
  return;
}
module.exports = _set;
