/* */ 
var Hapi = require('hapi');
var secret = 'NeverShareYourSecret';
var server = new Hapi.Server({debug: false});
server.connection();
var db = {
  "123": {
    allowed: true,
    "name": "Charlie"
  },
  "321": {
    allowed: false,
    "name": "Old Gregg"
  }
};
var scopesDb = {
  "123": ['Admin', 'Authenticated'],
  "321": ['Authenticated']
};
var validate = function(decoded, request, callback) {
  if (db[decoded.id].allowed) {
    var credentials = db[decoded.id];
    credentials.scope = scopesDb[decoded.id];
    return callback(null, true, credentials);
  } else {
    return callback(null, false);
  }
};
var home = function(req, reply) {
  reply('Hai!');
};
var privado = function(req, reply) {
  reply('worked');
};
server.register(require('../lib/index'), function() {
  server.auth.strategy('jwt', 'jwt', {
    key: secret,
    validateFunc: validate,
    verifyOptions: {algorithms: ['HS256']}
  });
  server.route([{
    method: 'GET',
    path: '/',
    handler: home,
    config: {auth: false}
  }, {
    method: 'POST',
    path: '/privado-with-scope',
    handler: privado,
    config: {auth: {
        strategy: 'jwt',
        scope: ['Admin']
      }}
  }]);
});
module.exports = server;
