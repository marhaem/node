/* */ 
'use strict';
const Hoek = require('hoek');
const Any = require('./any');
const Cast = require('./cast');
const Ref = require('./ref');
const internals = {};
internals.Alternatives = function() {
  Any.call(this);
  this._type = 'alternatives';
  this._invalids.remove(null);
  this._inner.matches = [];
};
Hoek.inherits(internals.Alternatives, Any);
internals.Alternatives.prototype._base = function(value, state, options) {
  let errors = [];
  const il = this._inner.matches.length;
  const baseType = this._settings && this._settings.baseType;
  for (let i = 0; i < il; ++i) {
    const item = this._inner.matches[i];
    const schema = item.schema;
    if (!schema) {
      const failed = item.is._validate(item.ref(state.parent, options), null, options, state.parent).errors;
      if (failed) {
        if (item.otherwise) {
          return item.otherwise._validate(value, state, options);
        } else if (baseType && i === (il - 1)) {
          return baseType._validate(value, state, options);
        }
      } else if (item.then || baseType) {
        return (item.then || baseType)._validate(value, state, options);
      }
      continue;
    }
    const result = schema._validate(value, state, options);
    if (!result.errors) {
      return result;
    }
    errors = errors.concat(result.errors);
  }
  return {errors: errors.length ? errors : this.createError('alternatives.base', null, state, options)};
};
internals.Alternatives.prototype.try = function() {
  const schemas = Hoek.flatten(Array.prototype.slice.call(arguments));
  Hoek.assert(schemas.length, 'Cannot add other alternatives without at least one schema');
  const obj = this.clone();
  for (let i = 0; i < schemas.length; ++i) {
    const cast = Cast.schema(schemas[i]);
    if (cast._refs.length) {
      obj._refs = obj._refs.concat(cast._refs);
    }
    obj._inner.matches.push({schema: cast});
  }
  return obj;
};
internals.Alternatives.prototype.when = function(ref, options) {
  Hoek.assert(Ref.isRef(ref) || typeof ref === 'string', 'Invalid reference:', ref);
  Hoek.assert(options, 'Missing options');
  Hoek.assert(typeof options === 'object', 'Invalid options');
  Hoek.assert(options.hasOwnProperty('is'), 'Missing "is" directive');
  Hoek.assert(options.then !== undefined || options.otherwise !== undefined, 'options must have at least one of "then" or "otherwise"');
  const obj = this.clone();
  let is = Cast.schema(options.is);
  if (options.is === null || !options.is.isJoi) {
    is = is.required();
  }
  const item = {
    ref: Cast.ref(ref),
    is,
    then: options.then !== undefined ? Cast.schema(options.then) : undefined,
    otherwise: options.otherwise !== undefined ? Cast.schema(options.otherwise) : undefined
  };
  if (obj._settings && obj._settings.baseType) {
    item.then = item.then && obj._settings.baseType.concat(item.then);
    item.otherwise = item.otherwise && obj._settings.baseType.concat(item.otherwise);
  }
  Ref.push(obj._refs, item.ref);
  obj._refs = obj._refs.concat(item.is._refs);
  if (item.then && item.then._refs) {
    obj._refs = obj._refs.concat(item.then._refs);
  }
  if (item.otherwise && item.otherwise._refs) {
    obj._refs = obj._refs.concat(item.otherwise._refs);
  }
  obj._inner.matches.push(item);
  return obj;
};
internals.Alternatives.prototype.describe = function() {
  const description = Any.prototype.describe.call(this);
  const alternatives = [];
  for (let i = 0; i < this._inner.matches.length; ++i) {
    const item = this._inner.matches[i];
    if (item.schema) {
      alternatives.push(item.schema.describe());
    } else {
      const when = {
        ref: item.ref.toString(),
        is: item.is.describe()
      };
      if (item.then) {
        when.then = item.then.describe();
      }
      if (item.otherwise) {
        when.otherwise = item.otherwise.describe();
      }
      alternatives.push(when);
    }
  }
  description.alternatives = alternatives;
  return description;
};
module.exports = new internals.Alternatives();
