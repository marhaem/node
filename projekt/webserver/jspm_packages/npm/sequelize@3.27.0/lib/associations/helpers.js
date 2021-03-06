/* */ 
'use strict';
var Utils = require('../utils');
function checkNamingCollision(association) {
  if (association.source.rawAttributes.hasOwnProperty(association.as)) {
    throw new Error('Naming collision between attribute \'' + association.as + '\' and association \'' + association.as + '\' on model ' + association.source.name + '. To remedy this, change either foreignKey or as in your association definition');
  }
}
function addForeignKeyConstraints(newAttribute, source, target, options, key) {
  if (options.foreignKeyConstraint || options.onDelete || options.onUpdate) {
    var primaryKeys = Utils._.chain(source.rawAttributes).keys().filter(function($key) {
      return source.rawAttributes[$key].primaryKey;
    }).map(function($key) {
      return source.rawAttributes[$key].field || $key;
    }).value();
    if (primaryKeys.length === 1) {
      if (!!source.$schema) {
        newAttribute.references = {model: source.modelManager.sequelize.queryInterface.QueryGenerator.addSchema({
            tableName: source.tableName,
            $schema: source.$schema,
            $schemaDelimiter: source.$schemaDelimiter
          })};
      } else {
        newAttribute.references = {model: source.tableName};
      }
      newAttribute.references.key = key || primaryKeys[0];
      newAttribute.onDelete = options.onDelete;
      newAttribute.onUpdate = options.onUpdate;
    }
  }
}
module.exports = {
  checkNamingCollision: checkNamingCollision,
  addForeignKeyConstraints: addForeignKeyConstraints
};
