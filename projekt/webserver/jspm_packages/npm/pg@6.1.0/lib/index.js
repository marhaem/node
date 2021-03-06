/* */ 
(function(process) {
  var EventEmitter = require('events').EventEmitter;
  var util = require('util');
  var Client = require('./client');
  var defaults = require('./defaults');
  var Connection = require('./connection');
  var ConnectionParameters = require('./connection-parameters');
  var poolFactory = require('./pool-factory');
  var PG = function(clientConstructor) {
    EventEmitter.call(this);
    this.defaults = defaults;
    this.Client = clientConstructor;
    this.Query = this.Client.Query;
    this.Pool = poolFactory(this.Client);
    this._pools = [];
    this.Connection = Connection;
    this.types = require('pg-types');
  };
  util.inherits(PG, EventEmitter);
  PG.prototype.end = function() {
    var self = this;
    var keys = Object.keys(this._pools);
    var count = keys.length;
    if (count === 0) {
      self.emit('end');
    } else {
      keys.forEach(function(key) {
        var pool = self._pools[key];
        delete self._pools[key];
        pool.pool.drain(function() {
          pool.pool.destroyAllNow(function() {
            count--;
            if (count === 0) {
              self.emit('end');
            }
          });
        });
      });
    }
  };
  PG.prototype.connect = function(config, callback) {
    if (typeof config == "function") {
      callback = config;
      config = null;
    }
    var poolName = JSON.stringify(config || {});
    if (typeof config == 'string') {
      config = new ConnectionParameters(config);
    }
    config = config || {};
    config.max = config.max || config.poolSize || defaults.poolSize;
    config.idleTimeoutMillis = config.idleTimeoutMillis || config.poolIdleTimeout || defaults.poolIdleTimeout;
    config.log = config.log || config.poolLog || defaults.poolLog;
    this._pools[poolName] = this._pools[poolName] || new this.Pool(config);
    var pool = this._pools[poolName];
    if (!pool.listeners('error').length) {
      pool.on('error', function(e) {
        this.emit('error', e, e.client);
      }.bind(this));
    }
    return pool.connect(callback);
  };
  PG.prototype.cancel = function(config, client, query) {
    if (client.native) {
      return client.cancel(query);
    }
    var c = config;
    if (typeof c === 'function') {
      c = defaults;
    }
    var cancellingClient = new this.Client(c);
    cancellingClient.cancel(client, query);
  };
  if (typeof process.env.NODE_PG_FORCE_NATIVE != 'undefined') {
    module.exports = new PG(require('./native/index'));
  } else {
    module.exports = new PG(Client);
    module.exports.__defineGetter__("native", function() {
      delete module.exports.native;
      var native = null;
      try {
        native = new PG(require('./native/index'));
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
          throw err;
        }
        console.error(err.message);
      }
      module.exports.native = native;
      return native;
    });
  }
})(require('process'));
