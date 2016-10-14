/* */ 
'use strict';
var Utils = require('../utils'),
    Helpers = require('./helpers'),
    _ = require('lodash'),
    Association = require('./base'),
    util = require('util');
var HasOne = function(srcModel, targetModel, options) {
  Association.call(this);
  this.associationType = 'HasOne';
  this.source = srcModel;
  this.target = targetModel;
  this.options = options;
  this.scope = options.scope;
  this.isSingleAssociation = true;
  this.isSelfAssociation = (this.source === this.target);
  this.as = this.options.as;
  this.foreignKeyAttribute = {};
  if (this.as) {
    this.isAliased = true;
    this.options.name = {singular: this.as};
  } else {
    this.as = this.target.options.name.singular;
    this.options.name = this.target.options.name;
  }
  if (_.isObject(this.options.foreignKey)) {
    this.foreignKeyAttribute = this.options.foreignKey;
    this.foreignKey = this.foreignKeyAttribute.name || this.foreignKeyAttribute.fieldName;
  } else if (this.options.foreignKey) {
    this.foreignKey = this.options.foreignKey;
  }
  if (!this.foreignKey) {
    this.foreignKey = Utils.camelizeIf([Utils.underscoredIf(Utils.singularize(this.source.name), this.target.options.underscored), this.source.primaryKeyAttribute].join('_'), !this.source.options.underscored);
  }
  this.sourceIdentifier = this.source.primaryKeyAttribute;
  this.sourceKey = this.source.primaryKeyAttribute;
  this.sourceKeyIsPrimary = this.sourceKey === this.source.primaryKeyAttribute;
  this.associationAccessor = this.as;
  this.options.useHooks = options.useHooks;
  if (this.target.rawAttributes[this.foreignKey]) {
    this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
  }
  var singular = Utils.uppercaseFirst(this.options.name.singular);
  this.accessors = {
    get: 'get' + singular,
    set: 'set' + singular,
    create: 'create' + singular
  };
};
util.inherits(HasOne, Association);
HasOne.prototype.injectAttributes = function() {
  var newAttributes = {},
      keyType = this.source.rawAttributes[this.source.primaryKeyAttribute].type;
  newAttributes[this.foreignKey] = _.defaults({}, this.foreignKeyAttribute, {
    type: this.options.keyType || keyType,
    allowNull: true
  });
  Utils.mergeDefaults(this.target.rawAttributes, newAttributes);
  this.identifierField = this.target.rawAttributes[this.foreignKey].field || this.foreignKey;
  if (this.options.constraints !== false) {
    var target = this.target.rawAttributes[this.foreignKey] || newAttributes[this.foreignKey];
    this.options.onDelete = this.options.onDelete || (target.allowNull ? 'SET NULL' : 'CASCADE');
    this.options.onUpdate = this.options.onUpdate || 'CASCADE';
  }
  Helpers.addForeignKeyConstraints(this.target.rawAttributes[this.foreignKey], this.source, this.target, this.options);
  this.target.refreshAttributes();
  Helpers.checkNamingCollision(this);
  return this;
};
HasOne.prototype.mixin = function(obj) {
  var association = this;
  obj[this.accessors.get] = function(options) {
    return association.get(this, options);
  };
  association.injectSetter(obj);
  association.injectCreator(obj);
};
HasOne.prototype.get = function(instances, options) {
  var association = this,
      Target = association.target,
      instance,
      where = {};
  options = Utils.cloneDeep(options);
  if (options.hasOwnProperty('scope')) {
    if (!options.scope) {
      Target = Target.unscoped();
    } else {
      Target = Target.scope(options.scope);
    }
  }
  if (options.hasOwnProperty('schema')) {
    Target = Target.schema(options.schema, options.schemaDelimiter);
  }
  if (!Array.isArray(instances)) {
    instance = instances;
    instances = undefined;
  }
  if (instances) {
    where[association.foreignKey] = {$in: instances.map(function(instance) {
        return instance.get(association.sourceKey);
      })};
  } else {
    where[association.foreignKey] = instance.get(association.sourceKey);
  }
  if (association.scope) {
    _.assign(where, association.scope);
  }
  options.where = options.where ? {$and: [where, options.where]} : where;
  if (instances) {
    return Target.findAll(options).then(function(results) {
      var result = {};
      instances.forEach(function(instance) {
        result[instance.get(association.sourceKey, {raw: true})] = null;
      });
      results.forEach(function(instance) {
        result[instance.get(association.foreignKey, {raw: true})] = instance;
      });
      return result;
    });
  }
  return Target.findOne(options);
};
HasOne.prototype.injectSetter = function(instancePrototype) {
  var association = this;
  instancePrototype[this.accessors.set] = function(associatedInstance, options) {
    var instance = this,
        alreadyAssociated;
    options = _.assign({}, options, {scope: false});
    return instance[association.accessors.get](options).then(function(oldInstance) {
      alreadyAssociated = oldInstance && associatedInstance && _.every(association.target.primaryKeyAttributes, function(attribute) {
        return oldInstance.get(attribute, {raw: true}) === associatedInstance.get(attribute, {raw: true});
      });
      if (oldInstance && !alreadyAssociated) {
        oldInstance[association.foreignKey] = null;
        return oldInstance.save(_.extend({}, options, {
          fields: [association.foreignKey],
          allowNull: [association.foreignKey],
          association: true
        }));
      }
    }).then(function() {
      if (associatedInstance && !alreadyAssociated) {
        if (!(associatedInstance instanceof association.target.Instance)) {
          var tmpInstance = {};
          tmpInstance[association.target.primaryKeyAttribute] = associatedInstance;
          associatedInstance = association.target.build(tmpInstance, {isNewRecord: false});
        }
        _.assign(associatedInstance, association.scope);
        associatedInstance.set(association.foreignKey, instance.get(association.sourceIdentifier));
        return associatedInstance.save(options);
      }
      return null;
    });
  };
  return this;
};
HasOne.prototype.injectCreator = function(instancePrototype) {
  var association = this;
  instancePrototype[this.accessors.create] = function(values, options) {
    var instance = this;
    values = values || {};
    options = options || {};
    if (association.scope) {
      Object.keys(association.scope).forEach(function(attribute) {
        values[attribute] = association.scope[attribute];
        if (options.fields)
          options.fields.push(attribute);
      });
    }
    values[association.foreignKey] = instance.get(association.sourceIdentifier);
    if (options.fields)
      options.fields.push(association.foreignKey);
    return association.target.create(values, options);
  };
  return this;
};
module.exports = HasOne;