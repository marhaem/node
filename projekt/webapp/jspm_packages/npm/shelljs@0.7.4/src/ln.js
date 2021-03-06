/* */ 
(function(process) {
  var fs = require('fs');
  var path = require('path');
  var common = require('./common');
  common.register('ln', _ln, {cmdOptions: {
      's': 'symlink',
      'f': 'force'
    }});
  function _ln(options, source, dest) {
    if (!source || !dest) {
      common.error('Missing <source> and/or <dest>');
    }
    source = String(source);
    var sourcePath = path.normalize(source).replace(RegExp(path.sep + '$'), '');
    var isAbsolute = (path.resolve(source) === sourcePath);
    dest = path.resolve(process.cwd(), String(dest));
    if (common.existsSync(dest)) {
      if (!options.force) {
        common.error('Destination file exists', true);
      }
      fs.unlinkSync(dest);
    }
    if (options.symlink) {
      var isWindows = common.platform === 'win';
      var linkType = isWindows ? 'file' : null;
      var resolvedSourcePath = isAbsolute ? sourcePath : path.resolve(process.cwd(), path.dirname(dest), source);
      if (!common.existsSync(resolvedSourcePath)) {
        common.error('Source file does not exist', true);
      } else if (isWindows && fs.statSync(resolvedSourcePath).isDirectory()) {
        linkType = 'junction';
      }
      try {
        fs.symlinkSync(linkType === 'junction' ? resolvedSourcePath : source, dest, linkType);
      } catch (err) {
        common.error(err.message);
      }
    } else {
      if (!common.existsSync(source)) {
        common.error('Source file does not exist', true);
      }
      try {
        fs.linkSync(source, dest);
      } catch (err) {
        common.error(err.message);
      }
    }
    return '';
  }
  module.exports = _ln;
})(require('process'));
