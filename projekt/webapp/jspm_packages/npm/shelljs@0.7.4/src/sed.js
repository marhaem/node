/* */ 
var common = require('./common');
var fs = require('fs');
common.register('sed', _sed, {
  globStart: 3,
  canReceivePipe: true,
  cmdOptions: {'i': 'inplace'}
});
function _sed(options, regex, replacement, files) {
  var pipe = common.readFromPipe();
  if (typeof replacement !== 'string' && typeof replacement !== 'function') {
    if (typeof replacement === 'number') {
      replacement = replacement.toString();
    } else {
      common.error('invalid replacement string');
    }
  }
  if (typeof regex === 'string') {
    regex = RegExp(regex);
  }
  if (!files && !pipe) {
    common.error('no files given');
  }
  files = [].slice.call(arguments, 3);
  if (pipe) {
    files.unshift('-');
  }
  var sed = [];
  files.forEach(function(file) {
    if (!common.existsSync(file) && file !== '-') {
      common.error('no such file or directory: ' + file, 2, true);
      return;
    }
    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    var lines = contents.split(/\r*\n/);
    var result = lines.map(function(line) {
      return line.replace(regex, replacement);
    }).join('\n');
    sed.push(result);
    if (options.inplace) {
      fs.writeFileSync(file, result, 'utf8');
    }
  });
  return sed.join('\n');
}
module.exports = _sed;
