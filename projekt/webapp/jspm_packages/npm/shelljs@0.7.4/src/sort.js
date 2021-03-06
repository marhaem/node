/* */ 
var common = require('./common');
var fs = require('fs');
common.register('sort', _sort, {
  canReceivePipe: true,
  cmdOptions: {
    'r': 'reverse',
    'n': 'numerical'
  }
});
function parseNumber(str) {
  var match = str.match(/^\s*(\d*)\s*(.*)$/);
  return {
    num: Number(match[1]),
    value: match[2]
  };
}
function unixCmp(a, b) {
  var aLower = a.toLowerCase();
  var bLower = b.toLowerCase();
  return (aLower === bLower ? -1 * a.localeCompare(b) : aLower.localeCompare(bLower));
}
function numericalCmp(a, b) {
  var objA = parseNumber(a);
  var objB = parseNumber(b);
  if (objA.hasOwnProperty('num') && objB.hasOwnProperty('num')) {
    return ((objA.num !== objB.num) ? (objA.num - objB.num) : unixCmp(objA.value, objB.value));
  } else {
    return unixCmp(objA.value, objB.value);
  }
}
function _sort(options, files) {
  var pipe = common.readFromPipe();
  if (!files && !pipe)
    common.error('no files given');
  files = [].slice.call(arguments, 1);
  if (pipe) {
    files.unshift('-');
  }
  var lines = [];
  files.forEach(function(file) {
    if (!common.existsSync(file) && file !== '-') {
      common.error('no such file or directory: ' + file);
    }
    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    lines = lines.concat(contents.trimRight().split(/\r*\n/));
  });
  var sorted;
  sorted = lines.sort(options.numerical ? numericalCmp : unixCmp);
  if (options.reverse) {
    sorted = sorted.reverse();
  }
  return sorted.join('\n') + '\n';
}
module.exports = _sort;
