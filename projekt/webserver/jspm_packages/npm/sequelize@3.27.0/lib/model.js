/* */ 
(function(Buffer) {
  'use strict';
  var Utils = require('./utils'),
      Instance = require('./instance'),
      Association = require('./associations/base'),
      HasMany = require('./associations/has-many'),
      DataTypes = require('./data-types'),
      Util = require('util'),
      Promise = require('./promise'),
      QueryTypes = require('./query-types'),
      Hooks = require('./hooks'),
      sequelizeErrors = require('./errors'),
      _ = require('lodash'),
      associationsMixin = require('./associations/mixin');
  var Model = function(name, attributes, options) {
    this.options = Utils._.extend({
      timestamps: true,
      instanceMethods: {},
      classMethods: {},
      validate: {},
      freezeTableName: false,
      underscored: false,
      underscoredAll: false,
      paranoid: false,
      rejectOnEmpty: false,
      whereCollection: null,
      schema: null,
      schemaDelimiter: '',
      defaultScope: {},
      scopes: [],
      hooks: {},
      indexes: []
    }, options || {});
    this.associations = {};
    this.modelManager = null;
    this.name = name;
    this.options.hooks = _.mapValues(this.replaceHookAliases(this.options.hooks), function(hooks) {
      if (!Array.isArray(hooks))
        hooks = [hooks];
      return hooks;
    });
    this.sequelize = options.sequelize;
    this.underscored = this.underscored || this.underscoredAll;
    if (!this.options.tableName) {
      this.tableName = this.options.freezeTableName ? name : Utils.underscoredIf(Utils.pluralize(name), this.options.underscoredAll);
    } else {
      this.tableName = this.options.tableName;
    }
    this.$schema = this.options.schema;
    this.$schemaDelimiter = this.options.schemaDelimiter;
    _.each(options.validate, function(validator, validatorType) {
      if (_.includes(Utils._.keys(attributes), validatorType)) {
        throw new Error('A model validator function must not have the same name as a field. Model: ' + name + ', field/validation name: ' + validatorType);
      }
      if (!_.isFunction(validator)) {
        throw new Error('Members of the validate option must be functions. Model: ' + name + ', error with validate member ' + validatorType);
      }
    });
    this.attributes = this.rawAttributes = _.mapValues(attributes, function(attribute, name) {
      if (!Utils._.isPlainObject(attribute)) {
        attribute = {type: attribute};
      }
      attribute = this.sequelize.normalizeAttribute(attribute);
      if (attribute.references) {
        attribute = Utils.formatReferences(attribute);
        if (attribute.references.model instanceof Model) {
          attribute.references.model = attribute.references.model.tableName;
        }
      }
      if (attribute.type === undefined) {
        throw new Error('Unrecognized data type for field ' + name);
      }
      return attribute;
    }.bind(this));
  };
  Object.defineProperty(Model.prototype, 'QueryInterface', {get: function() {
      return this.modelManager.sequelize.getQueryInterface();
    }});
  Object.defineProperty(Model.prototype, 'QueryGenerator', {get: function() {
      return this.QueryInterface.QueryGenerator;
    }});
  Model.prototype.toString = function() {
    return '[object SequelizeModel:' + this.name + ']';
  };
  var paranoidClause = function(model, options) {
    options = options || {};
    if (options.include) {
      options.include.forEach(function(include) {
        paranoidClause(include.model, include);
      });
    }
    if (_.get(options, 'groupedLimit.on.options.paranoid')) {
      var throughModel = _.get(options, 'groupedLimit.on.through.model');
      if (throughModel) {
        options.groupedLimit.through = paranoidClause(throughModel, options.groupedLimit.through);
      }
    }
    if (!model.options.timestamps || !model.options.paranoid || options.paranoid === false) {
      return options;
    }
    var deletedAtCol = model._timestampAttributes.deletedAt,
        deletedAtAttribute = model.rawAttributes[deletedAtCol],
        deletedAtObject = {},
        deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;
    deletedAtObject[deletedAtAttribute.field || deletedAtCol] = deletedAtDefaultValue;
    if (Utils._.isEmpty(options.where)) {
      options.where = deletedAtObject;
    } else {
      options.where = {$and: [deletedAtObject, options.where]};
    }
    return options;
  };
  var addOptionalClassMethods = function() {
    var self = this;
    Utils._.each(this.options.classMethods || {}, function(fct, name) {
      self[name] = fct;
    });
  };
  var addDefaultAttributes = function() {
    var self = this,
        tail = {},
        head = {};
    if (!_.some(this.rawAttributes, 'primaryKey')) {
      if ('id' in this.rawAttributes) {
        throw new Error("A column called 'id' was added to the attributes of '" + this.tableName + "' but not marked with 'primaryKey: true'");
      }
      head = {id: {
          type: new DataTypes.INTEGER(),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          _autoGenerated: true
        }};
    }
    if (this._timestampAttributes.createdAt) {
      tail[this._timestampAttributes.createdAt] = {
        type: DataTypes.DATE,
        allowNull: false,
        _autoGenerated: true
      };
    }
    if (this._timestampAttributes.updatedAt) {
      tail[this._timestampAttributes.updatedAt] = {
        type: DataTypes.DATE,
        allowNull: false,
        _autoGenerated: true
      };
    }
    if (this._timestampAttributes.deletedAt) {
      tail[this._timestampAttributes.deletedAt] = {
        type: DataTypes.DATE,
        _autoGenerated: true
      };
    }
    var existingAttributes = Utils._.clone(self.rawAttributes);
    self.rawAttributes = {};
    Utils._.each(head, function(value, attr) {
      self.rawAttributes[attr] = value;
    });
    Utils._.each(existingAttributes, function(value, attr) {
      self.rawAttributes[attr] = value;
    });
    Utils._.each(tail, function(value, attr) {
      if (Utils._.isUndefined(self.rawAttributes[attr])) {
        self.rawAttributes[attr] = value;
      }
    });
    if (!Object.keys(this.primaryKeys).length) {
      self.primaryKeys.id = self.rawAttributes.id;
    }
  };
  var findAutoIncrementField = function() {
    var fields = this.QueryGenerator.findAutoIncrementField(this);
    this.autoIncrementField = null;
    fields.forEach(function(field) {
      if (this.autoIncrementField) {
        throw new Error('Invalid Instance definition. Only one autoincrement field allowed.');
      } else {
        this.autoIncrementField = field;
      }
    }.bind(this));
  };
  function conformOptions(options, self) {
    if (self) {
      self.$expandAttributes(options);
    }
    if (!options.include) {
      return;
    }
    if (!Array.isArray(options.include)) {
      options.include = [options.include];
    } else if (!options.include.length) {
      delete options.include;
      return;
    }
    options.include = options.include.map(function(include) {
      include = conformInclude(include, self);
      return include;
    });
  }
  Model.$conformOptions = conformOptions;
  function conformInclude(include, self) {
    var model;
    if (include._pseudo)
      return include;
    if (include instanceof Association) {
      if (self && include.target.name === self.name) {
        model = include.source;
      } else {
        model = include.target;
      }
      include = {
        model: model,
        association: include,
        as: include.as
      };
    } else if (include instanceof Model) {
      include = {model: include};
    } else if (_.isPlainObject(include)) {
      if (include.association) {
        if (self && include.association.target.name === self.name) {
          model = include.association.source;
        } else {
          model = include.association.target;
        }
        if (!include.model) {
          include.model = model;
        }
        if (!include.as) {
          include.as = include.association.as;
        }
      } else {
        model = include.model;
      }
      conformOptions(include, model);
    } else {
      throw new Error('Include unexpected. Element has to be either a Model, an Association or an object.');
    }
    return include;
  }
  Model.$conformInclude = conformInclude;
  var expandIncludeAllElement = function(includes, include) {
    var all = include.all;
    delete include.all;
    if (all !== true) {
      if (!Array.isArray(all)) {
        all = [all];
      }
      var validTypes = {
        BelongsTo: true,
        HasOne: true,
        HasMany: true,
        One: ['BelongsTo', 'HasOne'],
        Has: ['HasOne', 'HasMany'],
        Many: ['HasMany']
      };
      for (var i = 0; i < all.length; i++) {
        var type = all[i];
        if (type === 'All') {
          all = true;
          break;
        }
        var types = validTypes[type];
        if (!types) {
          throw new Error('include all \'' + type + '\' is not valid - must be BelongsTo, HasOne, HasMany, One, Has, Many or All');
        }
        if (types !== true) {
          all.splice(i, 1);
          i--;
          for (var j = 0; j < types.length; j++) {
            if (all.indexOf(types[j]) === -1) {
              all.unshift(types[j]);
              i++;
            }
          }
        }
      }
    }
    var nested = include.nested;
    if (nested) {
      delete include.nested;
      if (!include.include) {
        include.include = [];
      } else if (!Array.isArray(include.include)) {
        include.include = [include.include];
      }
    }
    var used = [];
    (function addAllIncludes(parent, includes) {
      Utils._.forEach(parent.associations, function(association) {
        if (all !== true && all.indexOf(association.associationType) === -1) {
          return;
        }
        var model = association.target;
        var as = association.options.as;
        var predicate = {model: model};
        if (as) {
          predicate.as = as;
        }
        if (Utils._.find(includes, predicate)) {
          return;
        }
        if (nested && used.indexOf(model) !== -1) {
          return;
        }
        used.push(parent);
        var thisInclude = Utils.cloneDeep(include);
        thisInclude.model = model;
        if (as) {
          thisInclude.as = as;
        }
        includes.push(thisInclude);
        if (nested) {
          addAllIncludes(model, thisInclude.include);
          if (thisInclude.include.length === 0)
            delete thisInclude.include;
        }
      });
      used.pop();
    })(this, includes);
  };
  var validateIncludedElement;
  var validateIncludedElements = function(options, tableNames) {
    if (!options.model)
      options.model = this;
    tableNames = tableNames || {};
    options.includeNames = [];
    options.includeMap = {};
    options.hasSingleAssociation = false;
    options.hasMultiAssociation = false;
    if (!options.parent) {
      options.topModel = options.model;
      options.topLimit = options.limit;
    }
    options.include = options.include.map(function(include) {
      include = conformInclude(include);
      include.parent = options;
      validateIncludedElement.call(options.model, include, tableNames, options);
      if (include.duplicating === undefined) {
        include.duplicating = include.association.isMultiAssociation;
      }
      include.hasDuplicating = include.hasDuplicating || include.duplicating;
      include.hasRequired = include.hasRequired || include.required;
      options.hasDuplicating = options.hasDuplicating || include.hasDuplicating;
      options.hasRequired = options.hasRequired || include.required;
      options.hasWhere = options.hasWhere || include.hasWhere || !!include.where;
      return include;
    });
    options.include.forEach(function(include) {
      include.hasParentWhere = options.hasParentWhere || !!options.where;
      include.hasParentRequired = options.hasParentRequired || !!options.required;
      if (include.subQuery !== false && options.hasDuplicating && options.topLimit) {
        if (include.duplicating) {
          include.subQuery = false;
          include.subQueryFilter = include.hasRequired;
        } else {
          include.subQuery = include.hasRequired;
          include.subQueryFilter = false;
        }
      } else {
        include.subQuery = include.subQuery || false;
        if (include.duplicating) {
          include.subQueryFilter = include.subQuery;
          include.subQuery = false;
        } else {
          include.subQueryFilter = false;
          include.subQuery = include.subQuery || (include.hasParentRequired && include.hasRequired);
        }
      }
      options.includeMap[include.as] = include;
      options.includeNames.push(include.as);
      if (options.topModel === options.model && options.subQuery === undefined && options.topLimit) {
        if (include.subQuery) {
          options.subQuery = include.subQuery;
        } else if (include.hasDuplicating) {
          options.subQuery = true;
        }
      }
      options.hasIncludeWhere = options.hasIncludeWhere || include.hasIncludeWhere || !!include.where;
      options.hasIncludeRequired = options.hasIncludeRequired || include.hasIncludeRequired || !!include.required;
      if (include.association.isMultiAssociation || include.hasMultiAssociation) {
        options.hasMultiAssociation = true;
      }
      if (include.association.isSingleAssociation || include.hasSingleAssociation) {
        options.hasSingleAssociation = true;
      }
      return include;
    });
    if (options.topModel === options.model && options.subQuery === undefined) {
      options.subQuery = false;
    }
    return options;
  };
  Model.$validateIncludedElements = validateIncludedElements;
  validateIncludedElement = function(include, tableNames, options) {
    tableNames[include.model.getTableName()] = true;
    if (include.attributes && !options.raw) {
      include.model.$expandAttributes(include);
      include = Utils.mapFinderOptions(include, include.model);
      include.originalAttributes = include.attributes.slice(0);
      if (include.attributes.length) {
        _.each(include.model.primaryKeys, function(attr, key) {
          if (!_.some(include.attributes, function(includeAttr) {
            if (attr.field !== key) {
              return Array.isArray(includeAttr) && includeAttr[0] === attr.field && includeAttr[1] === key;
            }
            return includeAttr === key;
          })) {
            include.attributes.unshift(key);
          }
        });
      }
    } else {
      include = Utils.mapFinderOptions(include, include.model);
    }
    if (include._pseudo) {
      include.attributes = Object.keys(include.model.tableAttributes);
      return Utils.mapFinderOptions(include, include.model);
    }
    var association = include.association || this.getAssociation(include.model, include.as);
    if (!association) {
      var msg = include.model.name;
      if (include.as) {
        msg += ' (' + include.as + ')';
      }
      msg += ' is not associated to ' + this.name + '!';
      throw new Error(msg);
    }
    include.association = association;
    include.as = association.as;
    if (include.association.through && Object(include.association.through.model) === include.association.through.model) {
      if (!include.include)
        include.include = [];
      var through = include.association.through;
      include.through = Utils._.defaults(include.through || {}, {
        model: through.model,
        as: through.model.name,
        association: {isSingleAssociation: true},
        _pseudo: true,
        parent: include
      });
      if (through.scope) {
        include.through.where = include.through.where ? {$and: [include.through.where, through.scope]} : through.scope;
      }
      include.include.push(include.through);
      tableNames[through.tableName] = true;
    }
    var model;
    if (include.model.scoped === true) {
      model = include.model;
    } else {
      model = include.association.target.name === include.model.name ? include.association.target : include.association.source;
    }
    model.$injectScope(include);
    if (!include.attributes) {
      include.attributes = Object.keys(include.model.tableAttributes);
    }
    include = Utils.mapFinderOptions(include, include.model);
    if (include.required === undefined) {
      include.required = !!include.where;
    }
    if (include.association.scope) {
      include.where = include.where ? {$and: [include.where, include.association.scope]} : include.association.scope;
    }
    if (include.limit && include.separate === undefined) {
      include.separate = true;
    }
    if (include.separate === true && !(include.association instanceof HasMany)) {
      throw new Error('Only HasMany associations support include.separate');
    }
    if (include.separate === true) {
      include.duplicating = false;
    }
    if (include.separate === true && options.attributes && options.attributes.length && !_.includes(options.attributes, association.source.primaryKeyAttribute)) {
      options.attributes.push(association.source.primaryKeyAttribute);
    }
    if (include.hasOwnProperty('include')) {
      validateIncludedElements.call(include.model, include, tableNames, options);
    }
    return include;
  };
  var expandIncludeAll = Model.$expandIncludeAll = function(options) {
    var includes = options.include;
    if (!includes) {
      return;
    }
    for (var index = 0; index < includes.length; index++) {
      var include = includes[index];
      if (include.all) {
        includes.splice(index, 1);
        index--;
        expandIncludeAllElement.call(this, includes, include);
      }
    }
    Utils._.forEach(includes, function(include) {
      expandIncludeAll.call(include.model, include);
    });
  };
  Model.prototype.init = function(modelManager) {
    var self = this;
    this.modelManager = modelManager;
    this.primaryKeys = {};
    this._timestampAttributes = {};
    if (this.options.timestamps) {
      if (this.options.createdAt !== false) {
        this._timestampAttributes.createdAt = this.options.createdAt || Utils.underscoredIf('createdAt', this.options.underscored);
      }
      if (this.options.updatedAt !== false) {
        this._timestampAttributes.updatedAt = this.options.updatedAt || Utils.underscoredIf('updatedAt', this.options.underscored);
      }
      if (this.options.paranoid && this.options.deletedAt !== false) {
        this._timestampAttributes.deletedAt = this.options.deletedAt || Utils.underscoredIf('deletedAt', this.options.underscored);
      }
    }
    addOptionalClassMethods.call(this);
    this.Instance = function() {
      Instance.apply(this, arguments);
    };
    Util.inherits(this.Instance, Instance);
    this._readOnlyAttributes = Utils._.values(this._timestampAttributes);
    this._hasReadOnlyAttributes = this._readOnlyAttributes && this._readOnlyAttributes.length;
    this._isReadOnlyAttribute = Utils._.memoize(function(key) {
      return self._hasReadOnlyAttributes && self._readOnlyAttributes.indexOf(key) !== -1;
    });
    if (this.options.instanceMethods) {
      Utils._.each(this.options.instanceMethods, function(fct, name) {
        self.Instance.prototype[name] = fct;
      });
    }
    addDefaultAttributes.call(this);
    this.refreshAttributes();
    findAutoIncrementField.call(this);
    this.$scope = this.options.defaultScope;
    if (_.isPlainObject(this.$scope)) {
      conformOptions(this.$scope, this);
    }
    _.each(this.options.scopes, function(scope) {
      if (_.isPlainObject(scope)) {
        conformOptions(scope, this);
      }
    }.bind(this));
    this.options.indexes = this.options.indexes.map(this.$conformIndex);
    this.Instance.prototype.$Model = this.Instance.prototype.Model = this;
    return this;
  };
  Model.prototype.$conformIndex = function(index) {
    index = _.defaults(index, {
      type: '',
      parser: null
    });
    if (index.type && index.type.toLowerCase() === 'unique') {
      index.unique = true;
      delete index.type;
    }
    return index;
  };
  Model.prototype.refreshAttributes = function() {
    var self = this,
        attributeManipulation = {};
    this.Instance.prototype._customGetters = {};
    this.Instance.prototype._customSetters = {};
    Utils._.each(['get', 'set'], function(type) {
      var opt = type + 'terMethods',
          funcs = Utils._.clone(Utils._.isObject(self.options[opt]) ? self.options[opt] : {}),
          _custom = type === 'get' ? self.Instance.prototype._customGetters : self.Instance.prototype._customSetters;
      Utils._.each(funcs, function(method, attribute) {
        _custom[attribute] = method;
        if (type === 'get') {
          funcs[attribute] = function() {
            return this.get(attribute);
          };
        }
        if (type === 'set') {
          funcs[attribute] = function(value) {
            return this.set(attribute, value);
          };
        }
      });
      Utils._.each(self.rawAttributes, function(options, attribute) {
        if (options.hasOwnProperty(type)) {
          _custom[attribute] = options[type];
        }
        if (type === 'get') {
          funcs[attribute] = function() {
            return this.get(attribute);
          };
        }
        if (type === 'set') {
          funcs[attribute] = function(value) {
            return this.set(attribute, value);
          };
        }
      });
      Utils._.each(funcs, function(fct, name) {
        if (!attributeManipulation[name]) {
          attributeManipulation[name] = {configurable: true};
        }
        attributeManipulation[name][type] = fct;
      });
    });
    this._booleanAttributes = [];
    this._dateAttributes = [];
    this._hstoreAttributes = [];
    this._rangeAttributes = [];
    this._jsonAttributes = [];
    this._geometryAttributes = [];
    this._virtualAttributes = [];
    this._defaultValues = {};
    this.Instance.prototype.validators = {};
    this.fieldRawAttributesMap = {};
    this.primaryKeys = {};
    self.options.uniqueKeys = {};
    _.each(this.rawAttributes, function(definition, name) {
      definition.type = self.sequelize.normalizeDataType(definition.type);
      definition.Model = self;
      definition.fieldName = name;
      definition._modelAttribute = true;
      if (definition.field === undefined) {
        definition.field = name;
      }
      if (definition.primaryKey === true) {
        self.primaryKeys[name] = definition;
      }
      self.fieldRawAttributesMap[definition.field] = definition;
      if (definition.type instanceof DataTypes.BOOLEAN) {
        self._booleanAttributes.push(name);
      } else if (definition.type instanceof DataTypes.DATE) {
        self._dateAttributes.push(name);
      } else if (definition.type instanceof DataTypes.HSTORE || DataTypes.ARRAY.is(definition.type, DataTypes.HSTORE)) {
        self._hstoreAttributes.push(name);
      } else if (definition.type instanceof DataTypes.RANGE || DataTypes.ARRAY.is(definition.type, DataTypes.RANGE)) {
        self._rangeAttributes.push(name);
      } else if (definition.type instanceof DataTypes.JSON) {
        self._jsonAttributes.push(name);
      } else if (definition.type instanceof DataTypes.VIRTUAL) {
        self._virtualAttributes.push(name);
      } else if (definition.type instanceof DataTypes.GEOMETRY) {
        self._geometryAttributes.push(name);
      }
      if (definition.hasOwnProperty('defaultValue')) {
        self._defaultValues[name] = Utils._.partial(Utils.toDefaultValue, definition.defaultValue);
      }
      if (definition.hasOwnProperty('unique') && definition.unique !== false) {
        var idxName;
        if (typeof definition.unique === 'object' && definition.unique.hasOwnProperty('name')) {
          idxName = definition.unique.name;
        } else if (typeof definition.unique === 'string') {
          idxName = definition.unique;
        } else {
          idxName = self.tableName + '_' + name + '_unique';
        }
        var idx = self.options.uniqueKeys[idxName] || {fields: []};
        idx = idx || {
          fields: [],
          msg: null
        };
        idx.fields.push(definition.field);
        idx.msg = idx.msg || definition.unique.msg || null;
        idx.name = idxName || false;
        idx.column = name;
        self.options.uniqueKeys[idxName] = idx;
      }
      if (definition.hasOwnProperty('validate')) {
        self.Instance.prototype.validators[name] = definition.validate;
      }
      if (definition.index === true && definition.type instanceof DataTypes.JSONB) {
        self.options.indexes.push({
          fields: [definition.field || name],
          using: 'gin'
        });
        delete definition.index;
      }
    });
    this.fieldAttributeMap = Utils._.reduce(this.fieldRawAttributesMap, function(map, value, key) {
      if (key !== value.fieldName) {
        map[key] = value.fieldName;
      }
      return map;
    }, {});
    this.uniqueKeys = this.options.uniqueKeys;
    this._hasBooleanAttributes = !!this._booleanAttributes.length;
    this._isBooleanAttribute = Utils._.memoize(function(key) {
      return self._booleanAttributes.indexOf(key) !== -1;
    });
    this._hasDateAttributes = !!this._dateAttributes.length;
    this._isDateAttribute = Utils._.memoize(function(key) {
      return self._dateAttributes.indexOf(key) !== -1;
    });
    this._hasHstoreAttributes = !!this._hstoreAttributes.length;
    this._isHstoreAttribute = Utils._.memoize(function(key) {
      return self._hstoreAttributes.indexOf(key) !== -1;
    });
    this._hasRangeAttributes = !!this._rangeAttributes.length;
    this._isRangeAttribute = Utils._.memoize(function(key) {
      return self._rangeAttributes.indexOf(key) !== -1;
    });
    this._hasJsonAttributes = !!this._jsonAttributes.length;
    this._isJsonAttribute = Utils._.memoize(function(key) {
      return self._jsonAttributes.indexOf(key) !== -1;
    });
    this._hasVirtualAttributes = !!this._virtualAttributes.length;
    this._isVirtualAttribute = Utils._.memoize(function(key) {
      return self._virtualAttributes.indexOf(key) !== -1;
    });
    this._hasGeometryAttributes = !!this._geometryAttributes.length;
    this._isGeometryAttribute = Utils._.memoize(function(key) {
      return self._geometryAttributes.indexOf(key) !== -1;
    });
    this._hasDefaultValues = !Utils._.isEmpty(this._defaultValues);
    this.attributes = this.rawAttributes;
    this.tableAttributes = Utils._.omit(this.rawAttributes, this._virtualAttributes);
    this.Instance.prototype._hasCustomGetters = Object.keys(this.Instance.prototype._customGetters).length;
    this.Instance.prototype._hasCustomSetters = Object.keys(this.Instance.prototype._customSetters).length;
    Object.keys(attributeManipulation).forEach((function(key) {
      if (Instance.prototype.hasOwnProperty(key)) {
        this.sequelize.log("Not overriding built-in method from model attribute: " + key);
        return;
      }
      Object.defineProperty(this.Instance.prototype, key, attributeManipulation[key]);
    }).bind(this));
    this.Instance.prototype.rawAttributes = this.rawAttributes;
    this.Instance.prototype.attributes = Object.keys(this.Instance.prototype.rawAttributes);
    this.Instance.prototype._isAttribute = Utils._.memoize(function(key) {
      return self.Instance.prototype.attributes.indexOf(key) !== -1;
    });
    this.primaryKeyAttributes = Object.keys(this.primaryKeys);
    this.primaryKeyAttribute = this.primaryKeyAttributes[0];
    if (this.primaryKeyAttribute) {
      this.primaryKeyField = this.rawAttributes[this.primaryKeyAttribute].field || this.primaryKeyAttribute;
    }
    this.primaryKeyCount = this.primaryKeyAttributes.length;
    this._hasPrimaryKeys = this.options.hasPrimaryKeys = this.hasPrimaryKeys = this.primaryKeyCount > 0;
    this._isPrimaryKey = Utils._.memoize(function(key) {
      return self.primaryKeyAttributes.indexOf(key) !== -1;
    });
  };
  Model.prototype.removeAttribute = function(attribute) {
    delete this.rawAttributes[attribute];
    this.refreshAttributes();
  };
  Model.prototype.sync = function(options) {
    options = _.extend({}, this.options, options);
    options.hooks = options.hooks === undefined ? true : !!options.hooks;
    var self = this,
        attributes = this.tableAttributes;
    return Promise.try(function() {
      if (options.hooks) {
        return self.runHooks('beforeSync', options);
      }
    }).then(function() {
      if (options.force) {
        return self.drop(options);
      }
    }).then(function() {
      return self.QueryInterface.createTable(self.getTableName(options), attributes, options, self);
    }).then(function() {
      return self.QueryInterface.showIndex(self.getTableName(options), options);
    }).then(function(indexes) {
      self.options.indexes = self.QueryInterface.nameIndexes(self.options.indexes, self.tableName);
      indexes = _.filter(self.options.indexes, function(item1) {
        return !_.some(indexes, function(item2) {
          return item1.name === item2.name;
        });
      });
      return Promise.map(indexes, function(index) {
        return self.QueryInterface.addIndex(self.getTableName(options), _.assign({
          logging: options.logging,
          benchmark: options.benchmark,
          transaction: options.transaction
        }, index), self.tableName);
      });
    }).then(function() {
      if (options.hooks) {
        return self.runHooks('afterSync', options);
      }
    }).return(this);
  };
  Model.prototype.drop = function(options) {
    return this.QueryInterface.dropTable(this.getTableName(options), options);
  };
  Model.prototype.dropSchema = function(schema) {
    return this.QueryInterface.dropSchema(schema);
  };
  Model.prototype.schema = function(schema, options) {
    var self = this;
    var clone = Object.create(self);
    clone.$schema = schema;
    if (!!options) {
      if (typeof options === 'string') {
        clone.$schemaDelimiter = options;
      } else {
        if (!!options.schemaDelimiter) {
          clone.$schemaDelimiter = options.schemaDelimiter;
        }
      }
    }
    clone.Instance = function() {
      self.Instance.apply(this, arguments);
    };
    clone.Instance.prototype = Object.create(self.Instance.prototype);
    clone.Instance.prototype.$Model = clone;
    return clone;
  };
  Model.prototype.getTableName = function(options) {
    return this.QueryGenerator.addSchema(this);
  };
  Model.prototype.unscoped = function() {
    return this.scope();
  };
  Model.prototype.addScope = function(name, scope, options) {
    options = _.assign({override: false}, options);
    if ((name === 'defaultScope' || name in this.options.scopes) && options.override === false) {
      throw new Error('The scope ' + name + ' already exists. Pass { override: true } as options to silence this error');
    }
    conformOptions(scope, this);
    if (name === 'defaultScope') {
      this.options.defaultScope = this.$scope = scope;
    } else {
      this.options.scopes[name] = scope;
    }
  };
  Model.prototype.scope = function(option) {
    var self = Object.create(this),
        options,
        scope,
        scopeName;
    self.$scope = {};
    self.scoped = true;
    if (!option) {
      return self;
    }
    options = _.flatten(arguments);
    options.forEach(function(option) {
      scope = null;
      scopeName = null;
      if (_.isPlainObject(option)) {
        if (!!option.method) {
          if (Array.isArray(option.method) && !!self.options.scopes[option.method[0]]) {
            scopeName = option.method[0];
            scope = self.options.scopes[scopeName].apply(self, option.method.splice(1));
          } else if (!!self.options.scopes[option.method]) {
            scopeName = option.method;
            scope = self.options.scopes[scopeName].apply(self);
          }
        } else {
          scope = option;
        }
      } else {
        if (option === 'defaultScope' && _.isPlainObject(self.options.defaultScope)) {
          scope = self.options.defaultScope;
        } else {
          scopeName = option;
          scope = self.options.scopes[scopeName];
          if (_.isFunction(scope)) {
            scope = scope();
            conformOptions(scope, self);
          }
        }
      }
      if (!!scope) {
        _.assignWith(self.$scope, scope, function scopeCustomizer(objectValue, sourceValue, key) {
          if (key === 'where') {
            return Array.isArray(sourceValue) ? sourceValue : _.assign(objectValue || {}, sourceValue);
          } else if ((['attributes', 'include'].indexOf(key) >= 0) && Array.isArray(objectValue) && Array.isArray(sourceValue)) {
            return objectValue.concat(sourceValue);
          }
          return objectValue ? objectValue : sourceValue;
        });
      } else {
        throw new Error('Invalid scope ' + scopeName + ' called.');
      }
    });
    return self;
  };
  Model.prototype.all = function(options) {
    return this.findAll(options);
  };
  Model.prototype.findAll = function(options) {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new Error('The argument passed to findAll must be an options object, use findById if you wish to pass a single primary key value');
    }
    if (arguments.length > 1) {
      throw new Error('Please note that find* was refactored and uses only one options object from now on.');
    }
    var tableNames = {},
        originalOptions;
    tableNames[this.getTableName(options)] = true;
    options = Utils.cloneDeep(options);
    _.defaults(options, {
      hooks: true,
      rejectOnEmpty: this.options.rejectOnEmpty
    });
    options.rejectOnEmpty = options.rejectOnEmpty || this.options.rejectOnEmpty;
    return Promise.bind(this).then(function() {
      conformOptions(options, this);
      this.$injectScope(options);
      if (options.hooks) {
        return this.runHooks('beforeFind', options);
      }
    }).then(function() {
      expandIncludeAll.call(this, options);
      if (options.hooks) {
        return this.runHooks('beforeFindAfterExpandIncludeAll', options);
      }
    }).then(function() {
      if (options.include) {
        options.hasJoin = true;
        validateIncludedElements.call(this, options, tableNames);
        if (options.attributes && !options.raw && this.primaryKeyAttribute && options.attributes.indexOf(this.primaryKeyAttribute) === -1) {
          options.originalAttributes = options.attributes;
          options.attributes = [this.primaryKeyAttribute].concat(options.attributes);
        }
      }
      if (!options.attributes) {
        options.attributes = Object.keys(this.tableAttributes);
      }
      this.options.whereCollection = options.where || null;
      Utils.mapFinderOptions(options, this);
      options = paranoidClause(this, options);
      if (options.hooks) {
        return this.runHooks('beforeFindAfterOptions', options);
      }
    }).then(function() {
      originalOptions = Utils.cloneDeep(options);
      options.tableNames = Object.keys(tableNames);
      return this.QueryInterface.select(this, this.getTableName(options), options);
    }).tap(function(results) {
      if (options.hooks) {
        return this.runHooks('afterFind', results, options);
      }
    }).then(function(results) {
      if (_.isEmpty(results) && options.rejectOnEmpty) {
        if (typeof options.rejectOnEmpty === 'function') {
          throw new options.rejectOnEmpty();
        } else if (typeof options.rejectOnEmpty === 'object') {
          throw options.rejectOnEmpty;
        } else {
          throw new sequelizeErrors.EmptyResultError();
        }
      }
      return Model.$findSeparate(results, originalOptions);
    });
  };
  Model.$findSeparate = function(results, options) {
    if (!options.include || options.raw || !results)
      return Promise.resolve(results);
    var original = results;
    if (options.plain)
      results = [results];
    if (!results.length)
      return original;
    return Promise.map(options.include, function(include) {
      if (!include.separate) {
        return Model.$findSeparate(results.reduce(function(memo, result) {
          var associations = result.get(include.association.as);
          if (!associations)
            return memo;
          if (!Array.isArray(associations))
            associations = [associations];
          return memo.concat(associations);
        }, []), _.assign({}, _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain', 'scope'), {include: include.include || []}));
      }
      return include.association.get(results, _.assign({}, _.omit(options, 'include', 'attributes', 'order', 'where', 'limit', 'plain'), _.omit(include, 'parent', 'association', 'as'))).then(function(map) {
        results.forEach(function(result) {
          result.set(include.association.as, map[result.get(include.association.source.primaryKeyAttribute)], {raw: true});
        });
      });
    }).return(original);
  };
  Model.prototype.findById = function(param, options) {
    if ([null, undefined].indexOf(param) !== -1) {
      return Promise.resolve(null);
    }
    options = Utils.cloneDeep(options) || {};
    if (typeof param === 'number' || typeof param === 'string' || Buffer.isBuffer(param)) {
      options.where = {};
      options.where[this.primaryKeyAttribute] = param;
    } else {
      throw new Error('Argument passed to findById is invalid: ' + param);
    }
    return Model.prototype.findOne.call(this, options);
  };
  Model.prototype.findByPrimary = Model.prototype.findById;
  Model.prototype.findOne = function(options) {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new Error('The argument passed to findOne must be an options object, use findById if you wish to pass a single primary key value');
    }
    options = Utils.cloneDeep(options);
    if (options.limit === undefined) {
      var pkVal = options.where && options.where[this.primaryKeyAttribute];
      if (!options.where || !(Utils.isPrimitive(pkVal) || Buffer.isBuffer(pkVal))) {
        options.limit = 1;
      }
    }
    return Model.prototype.findAll.call(this, _.defaults(options, {
      plain: true,
      rejectOnEmpty: false
    }));
  };
  Model.prototype.find = Model.prototype.findOne;
  Model.prototype.aggregate = function(attribute, aggregateFunction, options) {
    options = Utils.cloneDeep(options);
    options = _.defaults(options, {attributes: []});
    conformOptions(options, this);
    this.$injectScope(options);
    if (options.include) {
      expandIncludeAll.call(this, options);
      validateIncludedElements.call(this, options);
    }
    var attrOptions = this.rawAttributes[attribute],
        field = attrOptions && attrOptions.field || attribute,
        aggregateColumn = this.sequelize.col(field);
    if (options.distinct) {
      aggregateColumn = this.sequelize.fn('DISTINCT', aggregateColumn);
    }
    options.attributes.push([this.sequelize.fn(aggregateFunction, aggregateColumn), aggregateFunction]);
    if (!options.dataType) {
      if (attrOptions) {
        options.dataType = attrOptions.type;
      } else {
        options.dataType = new DataTypes.FLOAT();
      }
    } else {
      options.dataType = this.sequelize.normalizeDataType(options.dataType);
    }
    Utils.mapOptionFieldNames(options, this);
    options = paranoidClause(this, options);
    return this.QueryInterface.rawSelect(this.getTableName(options), options, aggregateFunction, this);
  };
  Model.prototype.count = function(options) {
    return Promise.bind(this).then(function() {
      options = _.defaults(Utils.cloneDeep(options), {hooks: true});
      if (options.hooks) {
        return this.runHooks('beforeCount', options);
      }
    }).then(function() {
      var col = options.include ? this.name + '.' + this.primaryKeyField : '*';
      options.plain = !options.group;
      options.dataType = new DataTypes.INTEGER();
      options.includeIgnoreAttributes = false;
      options.limit = null;
      options.offset = null;
      options.order = null;
      return this.aggregate(col, 'count', options);
    });
  };
  Model.prototype.findAndCount = function(options) {
    if (options !== undefined && !_.isPlainObject(options)) {
      throw new Error('The argument passed to findAndCount must be an options object, use findById if you wish to pass a single primary key value');
    }
    var self = this;
    var countOptions = Utils.cloneDeep(options);
    if (countOptions.attributes) {
      countOptions.attributes = undefined;
    }
    return self.count(countOptions).then(function(count) {
      if (count === 0) {
        return {
          count: count || 0,
          rows: []
        };
      }
      return self.findAll(options).then(function(results) {
        return {
          count: count || 0,
          rows: results
        };
      });
    });
  };
  Model.prototype.findAndCountAll = Model.prototype.findAndCount;
  Model.prototype.max = function(field, options) {
    return this.aggregate(field, 'max', options);
  };
  Model.prototype.min = function(field, options) {
    return this.aggregate(field, 'min', options);
  };
  Model.prototype.sum = function(field, options) {
    return this.aggregate(field, 'sum', options);
  };
  Model.prototype.build = function(values, options) {
    if (Array.isArray(values)) {
      return this.bulkBuild(values, options);
    }
    options = _.extend({
      isNewRecord: true,
      $schema: this.$schema,
      $schemaDelimiter: this.$schemaDelimiter
    }, options || {});
    if (options.attributes) {
      options.attributes = options.attributes.map(function(attribute) {
        return Array.isArray(attribute) ? attribute[1] : attribute;
      });
    }
    if (!options.includeValidated) {
      conformOptions(options, this);
      if (options.include) {
        expandIncludeAll.call(this, options);
        validateIncludedElements.call(this, options);
      }
    }
    return new this.Instance(values, options);
  };
  Model.prototype.bulkBuild = function(valueSets, options) {
    options = _.extend({isNewRecord: true}, options || {});
    if (!options.includeValidated) {
      conformOptions(options, this);
      if (options.include) {
        expandIncludeAll.call(this, options);
        validateIncludedElements.call(this, options);
      }
    }
    if (options.attributes) {
      options.attributes = options.attributes.map(function(attribute) {
        return Array.isArray(attribute) ? attribute[1] : attribute;
      });
    }
    return valueSets.map(function(values) {
      return this.build(values, options);
    }.bind(this));
  };
  Model.prototype.create = function(values, options) {
    options = Utils.cloneDeep(options || {});
    return this.build(values, {
      isNewRecord: true,
      attributes: options.fields,
      include: options.include,
      raw: options.raw,
      silent: options.silent
    }).save(options);
  };
  Model.prototype.findOrInitialize = Model.prototype.findOrBuild = function(options) {
    if (!options || !options.where || arguments.length > 1) {
      throw new Error('Missing where attribute in the options parameter passed to findOrInitialize. ' + 'Please note that the API has changed, and is now options only (an object with where, defaults keys, transaction etc.)');
    }
    var self = this,
        values;
    return self.find(options).then(function(instance) {
      if (instance === null) {
        values = Utils._.clone(options.defaults) || {};
        if (Utils._.isPlainObject(options.where)) {
          values = Utils._.defaults(values, options.where);
        }
        instance = self.build(values);
        return Promise.resolve([instance, true]);
      }
      return Promise.resolve([instance, false]);
    });
  };
  Model.prototype.findOrCreate = function(options) {
    if (!options || !options.where || arguments.length > 1) {
      throw new Error('Missing where attribute in the options parameter passed to findOrCreate. ' + 'Please note that the API has changed, and is now options only (an object with where, defaults keys, transaction etc.)');
    }
    options = _.assign({}, options);
    if (options.transaction === undefined && this.sequelize.constructor.cls) {
      var t = this.sequelize.constructor.cls.get('transaction');
      if (t) {
        options.transaction = t;
      }
    }
    var self = this,
        internalTransaction = !options.transaction,
        values,
        whereFields = Object.keys(options.where),
        defaultFields,
        transaction;
    if (options.defaults)
      defaultFields = Object.keys(options.defaults);
    return self.sequelize.transaction(options).bind({}).then(function(t) {
      transaction = t;
      options.transaction = t;
      return self.findOne(_.defaults({transaction: transaction}, options));
    }).then(function(instance) {
      if (instance !== null) {
        return [instance, false];
      }
      values = Utils._.clone(options.defaults) || {};
      if (Utils._.isPlainObject(options.where)) {
        values = _.defaults(values, options.where);
      }
      options.exception = true;
      return self.create(values, options).bind(this).then(function(instance) {
        if (instance.get(self.primaryKeyAttribute, {raw: true}) === null) {
          throw new self.sequelize.UniqueConstraintError();
        }
        return [instance, true];
      }).catch(self.sequelize.UniqueConstraintError, function(err) {
        if (defaultFields) {
          if (!_.intersection(err.fields, whereFields).length && _.intersection(err.fields, defaultFields).length) {
            throw err;
          }
        }
        return self.findOne(_.defaults({transaction: internalTransaction ? null : transaction}, options)).then(function(instance) {
          if (instance === null)
            throw err;
          return [instance, false];
        });
      });
    }).finally(function() {
      if (internalTransaction && transaction) {
        return transaction.commit();
      }
    });
  };
  Model.prototype.findCreateFind = function(options) {
    if (!options || !options.where) {
      throw new Error('Missing where attribute in the options parameter passed to findOrCreate.');
    }
    var values = Utils._.clone(options.defaults) || {};
    if (Utils._.isPlainObject(options.where)) {
      values = _.defaults(values, options.where);
    }
    return this.findOne(options).bind(this).then(function(result) {
      if (result)
        return [result, false];
      return this.create(values, options).bind(this).then(function(result) {
        return [result, true];
      }).catch(this.sequelize.UniqueConstraintError, function(err) {
        return this.findOne(options).then(function(result) {
          return [result, false];
        });
      });
    });
  };
  Model.prototype.upsert = function(values, options) {
    options = Utils.cloneDeep(options) || {};
    if (!options.fields) {
      options.fields = Object.keys(this.attributes);
    }
    var createdAtAttr = this._timestampAttributes.createdAt,
        updatedAtAttr = this._timestampAttributes.updatedAt,
        hadPrimary = this.primaryKeyField in values || this.primaryKeyAttribute in values,
        instance = this.build(values);
    return instance.hookValidate(options).bind(this).then(function() {
      var updatedDataValues = _.pick(instance.dataValues, Object.keys(instance._changed)),
          insertValues = Utils.mapValueFieldNames(instance.dataValues, options.fields, this),
          updateValues = Utils.mapValueFieldNames(updatedDataValues, options.fields, this),
          now = Utils.now(this.sequelize.options.dialect);
      if (createdAtAttr && !updateValues[createdAtAttr]) {
        insertValues[createdAtAttr] = this.$getDefaultTimestamp(createdAtAttr) || now;
      }
      if (updatedAtAttr && !insertValues[updatedAtAttr]) {
        insertValues[updatedAtAttr] = updateValues[updatedAtAttr] = this.$getDefaultTimestamp(updatedAtAttr) || now;
      }
      if (!hadPrimary && this.primaryKeyAttribute && !this.rawAttributes[this.primaryKeyAttribute].defaultValue) {
        delete insertValues[this.primaryKeyField];
        delete updateValues[this.primaryKeyField];
      }
      return this.QueryInterface.upsert(this.getTableName(options), insertValues, updateValues, instance.where(), this, options);
    });
  };
  Model.prototype.insertOrUpdate = Model.prototype.upsert;
  Model.prototype.bulkCreate = function(records, options) {
    if (!records.length) {
      return Promise.resolve([]);
    }
    options = Utils._.extend({
      validate: false,
      hooks: true,
      individualHooks: false,
      ignoreDuplicates: false
    }, options || {});
    options.fields = options.fields || Object.keys(this.tableAttributes);
    options.model = this;
    var dialect = this.sequelize.options.dialect;
    if (options.ignoreDuplicates && ['postgres', 'mssql'].indexOf(dialect) !== -1) {
      return Promise.reject(new Error(dialect + ' does not support the \'ignoreDuplicates\' option.'));
    }
    if (options.updateOnDuplicate && ['mysql', 'mariadb'].indexOf(dialect) === -1) {
      return Promise.reject(new Error(dialect + ' does not support the \'updateOnDuplicate\' option.'));
    }
    if (options.updateOnDuplicate) {
      var updatableFields = Utils._.pull(Object.keys(this.tableAttributes), 'createdAt');
      if (Utils._.isArray(options.updateOnDuplicate) && !Utils._.isEmpty(options.updateOnDuplicate)) {
        updatableFields = Utils._.intersection(updatableFields, options.updateOnDuplicate);
      }
      options.updateOnDuplicate = updatableFields;
    }
    var self = this,
        createdAtAttr = this._timestampAttributes.createdAt,
        updatedAtAttr = this._timestampAttributes.updatedAt,
        now = Utils.now(self.modelManager.sequelize.options.dialect);
    var instances = records.map(function(values) {
      return self.build(values, {isNewRecord: true});
    });
    return Promise.try(function() {
      if (options.hooks) {
        return self.runHooks('beforeBulkCreate', instances, options);
      }
    }).then(function() {
      if (options.validate) {
        var errors = [];
        return Promise.map(instances, function(instance) {
          if (options.individualHooks) {
            return instance.hookValidate(options).catch(function(err) {
              if (err) {
                errors.push({
                  record: instance,
                  errors: err
                });
              }
            });
          } else {
            return instance.validate(options).then(function(err) {
              if (err) {
                errors.push({
                  record: instance,
                  errors: err
                });
              }
            });
          }
        }).then(function() {
          delete options.skip;
          if (errors.length) {
            return Promise.reject(errors);
          }
        });
      }
    }).then(function() {
      instances.forEach(function(instance) {
        var values = Utils.mapValueFieldNames(instance.dataValues, options.fields, self);
        if (createdAtAttr && !values[createdAtAttr]) {
          values[createdAtAttr] = now;
        }
        if (updatedAtAttr && !values[updatedAtAttr]) {
          values[updatedAtAttr] = now;
        }
        instance.dataValues = values;
      });
      if (options.individualHooks) {
        return Promise.map(instances, function(instance) {
          var individualOptions = Utils._.clone(options);
          delete individualOptions.fields;
          delete individualOptions.individualHooks;
          delete individualOptions.ignoreDuplicates;
          individualOptions.validate = false;
          individualOptions.hooks = true;
          return instance.save(individualOptions);
        }).then(function(_instances) {
          instances = _instances;
        });
      } else {
        records = instances.map(function(instance) {
          return Utils._.omit(instance.dataValues, self._virtualAttributes);
        });
        var attributes = {};
        for (var attr in self.tableAttributes) {
          attributes[attr] = self.rawAttributes[attr];
          if (self.rawAttributes[attr].field) {
            attributes[self.rawAttributes[attr].field] = self.rawAttributes[attr];
          }
        }
        return self.QueryInterface.bulkInsert(self.getTableName(options), records, options, attributes).then(function(results) {
          if (Array.isArray(results)) {
            results.forEach(function(result, i) {
              instances[i].set(self.primaryKeyAttribute, result[self.rawAttributes[self.primaryKeyAttribute].field], {raw: true});
              instances[i].isNewRecord = false;
            });
          }
          return results;
        });
      }
    }).then(function() {
      if (options.hooks) {
        return self.runHooks('afterBulkCreate', instances, options);
      }
    }).then(function() {
      return instances;
    });
  };
  Model.prototype.truncate = function(options) {
    options = Utils.cloneDeep(options) || {};
    options.truncate = true;
    return this.destroy(options);
  };
  Model.prototype.destroy = function(options) {
    var self = this,
        instances;
    if (!options || !(options.where || options.truncate)) {
      throw new Error('Missing where or truncate attribute in the options parameter of model.destroy.');
    }
    if (!options.truncate && !_.isPlainObject(options.where) && !_.isArray(options.where) && options.where._isSequelizeMethod !== true) {
      throw new Error('Expected plain object, array or sequelize method in the options.where parameter of model.destroy.');
    }
    options = Utils.cloneDeep(options);
    options = _.defaults(options, {
      hooks: true,
      individualHooks: false,
      force: false,
      cascade: false,
      restartIdentity: false
    });
    options.type = QueryTypes.BULKDELETE;
    this.$injectScope(options);
    Utils.mapOptionFieldNames(options, this);
    options.model = self;
    return Promise.try(function() {
      if (options.hooks) {
        return self.runHooks('beforeBulkDestroy', options);
      }
    }).then(function() {
      if (options.individualHooks) {
        return self.findAll({
          where: options.where,
          transaction: options.transaction,
          logging: options.logging,
          benchmark: options.benchmark
        }).map(function(instance) {
          return self.runHooks('beforeDestroy', instance, options).then(function() {
            return instance;
          });
        }).then(function(_instances) {
          instances = _instances;
        });
      }
    }).then(function() {
      if (self._timestampAttributes.deletedAt && !options.force) {
        var attrValueHash = {},
            deletedAtAttribute = self.rawAttributes[self._timestampAttributes.deletedAt],
            field = self.rawAttributes[self._timestampAttributes.deletedAt].field,
            where = {};
        where[field] = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;
        attrValueHash[field] = Utils.now(self.modelManager.sequelize.options.dialect);
        return self.QueryInterface.bulkUpdate(self.getTableName(options), attrValueHash, _.defaults(where, options.where), options, self.rawAttributes);
      } else {
        return self.QueryInterface.bulkDelete(self.getTableName(options), options.where, options, self);
      }
    }).tap(function() {
      if (options.individualHooks) {
        return Promise.map(instances, function(instance) {
          return self.runHooks('afterDestroy', instance, options);
        });
      }
    }).tap(function() {
      if (options.hooks) {
        return self.runHooks('afterBulkDestroy', options);
      }
    }).then(function(affectedRows) {
      return affectedRows;
    });
  };
  Model.prototype.restore = function(options) {
    if (!this._timestampAttributes.deletedAt)
      throw new Error('Model is not paranoid');
    options = Utils._.extend({
      hooks: true,
      individualHooks: false
    }, options || {});
    options.type = QueryTypes.RAW;
    options.model = this;
    var self = this,
        instances;
    Utils.mapOptionFieldNames(options, this);
    return Promise.try(function() {
      if (options.hooks) {
        return self.runHooks('beforeBulkRestore', options);
      }
    }).then(function() {
      if (options.individualHooks) {
        return self.findAll({
          where: options.where,
          transaction: options.transaction,
          logging: options.logging,
          benchmark: options.benchmark,
          paranoid: false
        }).map(function(instance) {
          return self.runHooks('beforeRestore', instance, options).then(function() {
            return instance;
          });
        }).then(function(_instances) {
          instances = _instances;
        });
      }
    }).then(function() {
      var attrValueHash = {},
          deletedAtCol = self._timestampAttributes.deletedAt,
          deletedAtAttribute = self.rawAttributes[deletedAtCol],
          deletedAtDefaultValue = deletedAtAttribute.hasOwnProperty('defaultValue') ? deletedAtAttribute.defaultValue : null;
      attrValueHash[deletedAtAttribute.field || deletedAtCol] = deletedAtDefaultValue;
      options.omitNull = false;
      return self.QueryInterface.bulkUpdate(self.getTableName(options), attrValueHash, options.where, options, self._timestampAttributes.deletedAt);
    }).tap(function() {
      if (options.individualHooks) {
        return Promise.map(instances, function(instance) {
          return self.runHooks('afterRestore', instance, options);
        });
      }
    }).tap(function() {
      if (options.hooks) {
        return self.runHooks('afterBulkRestore', options);
      }
    }).then(function(affectedRows) {
      return affectedRows;
    });
  };
  Model.prototype.update = function(values, options) {
    var self = this;
    if (!options || !options.where) {
      throw new Error('Missing where attribute in the options parameter passed to update.');
    }
    if (!_.isPlainObject(options.where) && !_.isArray(options.where) && options.where._isSequelizeMethod !== true) {
      throw new Error('Expected plain object, array or sequelize method in the options.where parameter of model.update.');
    }
    options = Utils.cloneDeep(options);
    options = _.defaults(options, {
      validate: true,
      hooks: true,
      individualHooks: false,
      returning: false,
      force: false,
      sideEffects: true
    });
    options.type = QueryTypes.BULKUPDATE;
    options.model = this;
    this.$injectScope(options);
    values = _.clone(values);
    if (options.fields && options.fields instanceof Array) {
      Object.keys(values).forEach(function(key) {
        if (options.fields.indexOf(key) < 0) {
          delete values[key];
        }
      });
    } else {
      var updatedAtAttr = this._timestampAttributes.updatedAt;
      options.fields = _.intersection(Object.keys(values), Object.keys(this.tableAttributes));
      if (updatedAtAttr && options.fields.indexOf(updatedAtAttr) === -1) {
        options.fields.push(updatedAtAttr);
      }
    }
    if (this._timestampAttributes.updatedAt && !options.silent) {
      values[this._timestampAttributes.updatedAt] = this.$getDefaultTimestamp(this._timestampAttributes.updatedAt) || Utils.now(this.sequelize.options.dialect);
    }
    var instances,
        valuesUse;
    return Promise.try(function() {
      if (options.validate) {
        var build = self.build(values);
        build.set(self._timestampAttributes.updatedAt, values[self._timestampAttributes.updatedAt], {raw: true});
        if (options.sideEffects) {
          values = Utils._.assign(values, Utils._.pick(build.get(), build.changed()));
          options.fields = Utils._.union(options.fields, Object.keys(values));
        }
        options.skip = Utils._.difference(Object.keys(self.attributes), Object.keys(values));
        return build.hookValidate(options).then(function(attributes) {
          options.skip = undefined;
          if (attributes && attributes.dataValues) {
            values = Utils._.pick(attributes.dataValues, Object.keys(values));
          }
        });
      }
      return null;
    }).then(function() {
      if (options.hooks) {
        options.attributes = values;
        return self.runHooks('beforeBulkUpdate', options).then(function() {
          values = options.attributes;
          delete options.attributes;
        });
      }
      return null;
    }).then(function() {
      valuesUse = values;
      if (options.individualHooks) {
        return self.findAll({
          where: options.where,
          transaction: options.transaction,
          logging: options.logging,
          benchmark: options.benchmark
        }).then(function(_instances) {
          instances = _instances;
          if (!instances.length) {
            return [];
          }
          var changedValues,
              different = false;
          return Promise.map(instances, function(instance) {
            Utils._.extend(instance.dataValues, values);
            Utils._.forIn(valuesUse, function(newValue, attr) {
              if (newValue !== instance._previousDataValues[attr]) {
                instance.setDataValue(attr, newValue);
              }
            });
            return self.runHooks('beforeUpdate', instance, options).then(function() {
              if (!different) {
                var thisChangedValues = {};
                Utils._.forIn(instance.dataValues, function(newValue, attr) {
                  if (newValue !== instance._previousDataValues[attr]) {
                    thisChangedValues[attr] = newValue;
                  }
                });
                if (!changedValues) {
                  changedValues = thisChangedValues;
                } else {
                  different = !Utils._.isEqual(changedValues, thisChangedValues);
                }
              }
              return instance;
            });
          }).then(function(_instances) {
            instances = _instances;
            if (!different) {
              var keys = Object.keys(changedValues);
              if (keys.length) {
                valuesUse = changedValues;
                options.fields = Utils._.union(options.fields, keys);
              }
              return;
            } else {
              return Promise.map(instances, function(instance) {
                var individualOptions = Utils._.clone(options);
                delete individualOptions.individualHooks;
                individualOptions.hooks = false;
                individualOptions.validate = false;
                return instance.save(individualOptions);
              }).tap(function(_instances) {
                instances = _instances;
              });
            }
          });
        });
      }
    }).then(function(results) {
      if (results) {
        return [results.length, results];
      }
      valuesUse = Utils.mapValueFieldNames(valuesUse, options.fields, self);
      options = Utils.mapOptionFieldNames(options, self);
      options.hasTrigger = self.options ? self.options.hasTrigger : false;
      return self.QueryInterface.bulkUpdate(self.getTableName(options), valuesUse, options.where, options, self.tableAttributes).then(function(affectedRows) {
        if (options.returning) {
          instances = affectedRows;
          return [affectedRows.length, affectedRows];
        }
        return [affectedRows];
      });
    }).tap(function(result) {
      if (options.individualHooks) {
        return Promise.map(instances, function(instance) {
          return self.runHooks('afterUpdate', instance, options);
        }).then(function() {
          result[1] = instances;
        });
      }
    }).tap(function() {
      if (options.hooks) {
        options.attributes = values;
        return self.runHooks('afterBulkUpdate', options).then(function() {
          delete options.attributes;
        });
      }
    }).then(function(result) {
      return result;
    });
  };
  Model.prototype.describe = function(schema, options) {
    return this.QueryInterface.describeTable(this.tableName, _.assign({schema: schema || this.$schema || undefined}, options));
  };
  Model.prototype.$getDefaultTimestamp = function(attr) {
    if (!!this.rawAttributes[attr] && !!this.rawAttributes[attr].defaultValue) {
      return Utils.toDefaultValue(this.rawAttributes[attr].defaultValue);
    }
    return undefined;
  };
  Model.prototype.$expandAttributes = function(options) {
    if (_.isPlainObject(options.attributes)) {
      var attributes = Object.keys(this.rawAttributes);
      if (options.attributes.exclude) {
        attributes = attributes.filter(function(elem) {
          return options.attributes.exclude.indexOf(elem) === -1;
        });
      }
      if (options.attributes.include) {
        attributes = attributes.concat(options.attributes.include);
      }
      options.attributes = attributes;
    }
  };
  Model.prototype.$injectScope = function(options) {
    var self = this;
    var scope = Utils.cloneDeep(this.$scope);
    var filteredScope = _.omit(scope, 'include');
    _.defaults(options, filteredScope);
    _.defaults(options.where, filteredScope.where);
    if (scope.include) {
      options.include = options.include || [];
      scope.include.reverse().forEach(function(scopeInclude) {
        if (scopeInclude.all || !options.include.some(function matchesModelAndAlias(item) {
          var isSameModel = item.model && item.model.name === scopeInclude.model.name;
          if (!isSameModel || !item.as)
            return isSameModel;
          if (scopeInclude.as) {
            return item.as === scopeInclude.as;
          } else {
            var association = scopeInclude.association || self.getAssociation(scopeInclude.model, scopeInclude.as);
            return association ? item.as === association.as : false;
          }
        })) {
          options.include.push(scopeInclude);
        }
      });
    }
  };
  Model.prototype.inspect = function() {
    return this.name;
  };
  Utils._.extend(Model.prototype, associationsMixin);
  Hooks.applyTo(Model);
  module.exports = Model;
})(require('buffer').Buffer);
