/* */ 
'use strict';
var AbstractConnectionManager = require('../abstract/connection-manager'),
    ConnectionManager,
    Utils = require('../../utils'),
    Promise = require('../../promise'),
    sequelizeErrors = require('../../errors'),
    dataTypes = require('../../data-types').mysql,
    parserMap = {};
ConnectionManager = function(dialect, sequelize) {
  AbstractConnectionManager.call(this, dialect, sequelize);
  this.sequelize = sequelize;
  this.sequelize.config.port = this.sequelize.config.port || 3306;
  try {
    if (sequelize.config.dialectModulePath) {
      this.lib = require(sequelize.config.dialectModulePath);
    } else {
      this.lib = require('@empty');
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error('Please install mysql package manually');
    }
    throw err;
  }
  this.refreshTypeParser(dataTypes);
};
Utils._.extend(ConnectionManager.prototype, AbstractConnectionManager.prototype);
ConnectionManager.prototype.$refreshTypeParser = function(dataType) {
  dataType.types.mysql.forEach(function(type) {
    parserMap[type] = dataType.parse;
  });
};
ConnectionManager.prototype.$clearTypeParser = function() {
  parserMap = {};
};
ConnectionManager.$typecast = function(field, next) {
  if (parserMap[field.type]) {
    return parserMap[field.type](field, this.sequelize.options);
  }
  return next();
};
ConnectionManager.prototype.connect = function(config) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var connectionConfig = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      timezone: self.sequelize.options.timezone,
      typeCast: ConnectionManager.$typecast.bind(self)
    };
    if (config.dialectOptions) {
      Object.keys(config.dialectOptions).forEach(function(key) {
        connectionConfig[key] = config.dialectOptions[key];
      });
    }
    var connection = self.lib.createConnection(connectionConfig);
    connection.connect(function(err) {
      if (err) {
        if (err.code) {
          switch (err.code) {
            case 'ECONNREFUSED':
              reject(new sequelizeErrors.ConnectionRefusedError(err));
              break;
            case 'ER_ACCESS_DENIED_ERROR':
              reject(new sequelizeErrors.AccessDeniedError(err));
              break;
            case 'ENOTFOUND':
              reject(new sequelizeErrors.HostNotFoundError(err));
              break;
            case 'EHOSTUNREACH':
              reject(new sequelizeErrors.HostNotReachableError(err));
              break;
            case 'EINVAL':
              reject(new sequelizeErrors.InvalidConnectionError(err));
              break;
            default:
              reject(new sequelizeErrors.ConnectionError(err));
              break;
          }
        } else {
          reject(new sequelizeErrors.ConnectionError(err));
        }
        return;
      }
      if (config.pool.handleDisconnects) {
        connection.on('error', function(err) {
          if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            self.pool.destroy(connection);
          }
        });
      }
      resolve(connection);
    });
  }).tap(function(connection) {
    connection.query("SET time_zone = '" + self.sequelize.options.timezone + "'");
  });
};
ConnectionManager.prototype.disconnect = function(connection) {
  if (connection._protocol._ended) {
    return Promise.resolve();
  }
  return new Promise(function(resolve, reject) {
    connection.end(function(err) {
      if (err)
        return reject(new sequelizeErrors.ConnectionError(err));
      resolve();
    });
  });
};
ConnectionManager.prototype.validate = function(connection) {
  return connection && ['disconnected', 'protocol_error'].indexOf(connection.state) === -1;
};
module.exports = ConnectionManager;
