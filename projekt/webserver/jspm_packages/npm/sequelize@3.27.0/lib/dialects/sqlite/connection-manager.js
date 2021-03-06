/* */ 
'use strict';
var AbstractConnectionManager = require('../abstract/connection-manager'),
    ConnectionManager,
    Utils = require('../../utils'),
    Promise = require('../../promise'),
    dataTypes = require('../../data-types').sqlite,
    sequelizeErrors = require('../../errors'),
    parserStore = require('../parserStore')('sqlite');
ConnectionManager = function(dialect, sequelize) {
  this.sequelize = sequelize;
  this.config = sequelize.config;
  this.dialect = dialect;
  this.dialectName = this.sequelize.options.dialect;
  this.connections = {};
  if (this.sequelize.options.host === 'localhost')
    delete this.sequelize.options.host;
  try {
    this.lib = require(sequelize.config.dialectModulePath || 'sqlite3').verbose();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error('Please install sqlite3 package manually');
    }
    throw err;
  }
  this.refreshTypeParser(dataTypes);
};
Utils._.extend(ConnectionManager.prototype, AbstractConnectionManager.prototype);
ConnectionManager.prototype.$refreshTypeParser = function(dataType) {
  parserStore.refresh(dataType);
};
ConnectionManager.prototype.$clearTypeParser = function() {
  parserStore.clear();
};
ConnectionManager.prototype.getConnection = function(options) {
  var self = this;
  options = options || {};
  options.uuid = options.uuid || 'default';
  options.inMemory = ((self.sequelize.options.storage || self.sequelize.options.host || ':memory:') === ':memory:') ? 1 : 0;
  var dialectOptions = self.sequelize.options.dialectOptions;
  options.readWriteMode = dialectOptions && dialectOptions.mode;
  if (self.connections[options.inMemory || options.uuid]) {
    return Promise.resolve(self.connections[options.inMemory || options.uuid]);
  }
  return new Promise(function(resolve, reject) {
    self.connections[options.inMemory || options.uuid] = new self.lib.Database(self.sequelize.options.storage || self.sequelize.options.host || ':memory:', options.readWriteMode || (self.lib.OPEN_READWRITE | self.lib.OPEN_CREATE), function(err) {
      if (err) {
        if (err.code === 'SQLITE_CANTOPEN')
          return reject(new sequelizeErrors.ConnectionError(err));
        return reject(new sequelizeErrors.ConnectionError(err));
      }
      resolve(self.connections[options.inMemory || options.uuid]);
    });
  }).tap(function(connection) {
    if (self.sequelize.options.foreignKeys !== false) {
      connection.run('PRAGMA FOREIGN_KEYS=ON');
    }
  });
};
ConnectionManager.prototype.releaseConnection = function(connection, force) {
  if (connection.filename === ':memory:' && force !== true)
    return;
  if (connection.uuid) {
    connection.close();
    delete this.connections[connection.uuid];
  }
};
module.exports = ConnectionManager;
