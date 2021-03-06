/* */ 
'use strict';
const Directory = require('./directory');
const Etag = require('./etag');
const File = require('./file');
const Hoek = require('hoek');
const internals = {defaults: {etagsCacheMaxSize: 1000}};
exports.register = function(server, options, next) {
  const settings = Hoek.applyToDefaults(internals.defaults, options);
  server.expose('_etags', settings.etagsCacheMaxSize ? new Etag.Cache(settings.etagsCacheMaxSize) : null);
  server.expose('_pendings', {});
  server.handler('file', File.handler);
  server.handler('directory', Directory.handler);
  server.decorate('reply', 'file', function(path, responseOptions) {
    responseOptions = responseOptions || {};
    if (typeof responseOptions.confine === 'undefined' || responseOptions.confine === true) {
      responseOptions.confine = '.';
    }
    return this.response(File.response(path, responseOptions, this.request));
  });
  return next();
};
exports.register.attributes = {
  pkg: require('../package.json!systemjs-json'),
  connections: false,
  once: true
};
