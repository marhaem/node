/* */ 
var common = require('./common');
common.register('echo', _echo, {allowGlobbing: false});
function _echo(opts, messages) {
  messages = [].slice.call(arguments, opts ? 0 : 1);
  if (messages[0] === '-e') {
    messages.shift();
  }
  console.log.apply(console, messages);
  return messages.join(' ');
}
module.exports = _echo;
