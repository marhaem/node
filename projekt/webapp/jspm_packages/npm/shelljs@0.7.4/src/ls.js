/* */ 
(function(process) {
  var path = require('path');
  var fs = require('fs');
  var common = require('./common');
  var glob = require('glob');
  var globPatternRecursive = path.sep + '**' + path.sep + '*';
  common.register('ls', _ls, {cmdOptions: {
      'R': 'recursive',
      'A': 'all',
      'a': 'all_deprecated',
      'd': 'directory',
      'l': 'long'
    }});
  function _ls(options, paths) {
    if (options.all_deprecated) {
      common.log('ls: Option -a is deprecated. Use -A instead');
      options.all = true;
    }
    if (!paths) {
      paths = ['.'];
    } else {
      paths = [].slice.call(arguments, 1);
    }
    var list = [];
    function pushFile(abs, relName, stat) {
      if (process.platform === 'win32') {
        relName = relName.replace(/\\/g, '/');
      }
      if (options.long) {
        stat = stat || fs.lstatSync(abs);
        list.push(addLsAttributes(relName, stat));
      } else {
        list.push(relName);
      }
    }
    paths.forEach(function(p) {
      var stat;
      try {
        stat = fs.lstatSync(p);
      } catch (e) {
        common.error('no such file or directory: ' + p, 2, true);
        return;
      }
      if (stat.isDirectory() && !options.directory) {
        if (options.recursive) {
          glob.sync(p + globPatternRecursive, {dot: options.all}).forEach(function(item) {
            pushFile(item, path.relative(p, item));
          });
        } else if (options.all) {
          fs.readdirSync(p).forEach(function(item) {
            pushFile(path.join(p, item), item);
          });
        } else {
          fs.readdirSync(p).forEach(function(item) {
            if (item[0] !== '.') {
              pushFile(path.join(p, item), item);
            }
          });
        }
      } else {
        pushFile(p, p, stat);
      }
    });
    return list;
  }
  function addLsAttributes(pathName, stats) {
    stats.name = pathName;
    stats.toString = function() {
      return [this.mode, this.nlink, this.uid, this.gid, this.size, this.mtime, this.name].join(' ');
    };
    return stats;
  }
  module.exports = _ls;
})(require('process'));
