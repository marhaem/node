/* */ 
(function(process) {
  var fs = require('fs');
  var common = require('./common');
  common.register('cd', _cd, {});
  function _cd(options, dir) {
    if (!dir)
      dir = common.getUserHome();
    if (dir === '-') {
      if (!process.env.OLDPWD) {
        common.error('could not find previous directory');
      } else {
        dir = process.env.OLDPWD;
      }
    }
    try {
      var curDir = process.cwd();
      process.chdir(dir);
      process.env.OLDPWD = curDir;
    } catch (e) {
      var err;
      try {
        fs.statSync(dir);
        err = 'not a directory: ' + dir;
      } catch (e2) {
        err = 'no such file or directory: ' + dir;
      }
      if (err)
        common.error(err);
    }
    return '';
  }
  module.exports = _cd;
})(require('process'));
