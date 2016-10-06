/* */ 
'use strict';
Object.defineProperty(exports, "__esModule", {value: true});
exports.default = isAlphanumeric;
var _assertString = require('./util/assertString');
var _assertString2 = _interopRequireDefault(_assertString);
var _alpha = require('./alpha');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function isAlphanumeric(str) {
  var locale = arguments.length <= 1 || arguments[1] === undefined ? 'en-US' : arguments[1];
  (0, _assertString2.default)(str);
  if (locale in _alpha.alphanumeric) {
    return _alpha.alphanumeric[locale].test(str);
  }
  throw new Error('Invalid locale \'' + locale + '\'');
}
module.exports = exports['default'];
