/* */ 
var inherits = require('util').inherits;
var Connection = require('./Connection');
var Events = require('events');
module.exports = PoolConnection;
inherits(PoolConnection, Connection);
function PoolConnection(pool, options) {
  Connection.call(this, options);
  this._pool = pool;
  if (Events.usingDomains) {
    if (this.domain) {
      this.domain.remove(this);
    }
    if (pool.domain) {
      pool.domain.add(this);
    }
  }
  this.on('end', this._removeFromPool);
  this.on('error', function(err) {
    if (err.fatal) {
      this._removeFromPool();
    }
  });
}
PoolConnection.prototype.release = function release() {
  var pool = this._pool;
  var connection = this;
  if (!pool || pool._closed) {
    return undefined;
  }
  return pool.releaseConnection(this);
};
PoolConnection.prototype._realEnd = Connection.prototype.end;
PoolConnection.prototype.end = function() {
  console.warn('Calling conn.end() to release a pooled connection is ' + 'deprecated. In next version calling conn.end() will be ' + 'restored to default conn.end() behavior. Use ' + 'conn.release() instead.');
  this.release();
};
PoolConnection.prototype.destroy = function() {
  Connection.prototype.destroy.apply(this, arguments);
  this._removeFromPool(this);
};
PoolConnection.prototype._removeFromPool = function _removeFromPool() {
  if (!this._pool || this._pool._closed) {
    return;
  }
  var pool = this._pool;
  this._pool = null;
  pool._purgeConnection(this);
};
