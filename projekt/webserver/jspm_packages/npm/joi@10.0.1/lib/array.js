/* */ 
'use strict';
const Any = require('./any');
const Cast = require('./cast');
const Hoek = require('hoek');
const internals = {};
internals.fastSplice = function(arr, i) {
  let pos = i;
  while (pos < arr.length) {
    arr[pos++] = arr[pos];
  }
  --arr.length;
};
internals.Array = class extends Any {
  constructor() {
    super();
    this._type = 'array';
    this._inner.items = [];
    this._inner.ordereds = [];
    this._inner.inclusions = [];
    this._inner.exclusions = [];
    this._inner.requireds = [];
    this._flags.sparse = false;
  }
  _base(value, state, options) {
    const result = {value};
    if (typeof value === 'string' && options.convert) {
      internals.safeParse(value, result);
    }
    let isArray = Array.isArray(result.value);
    const wasArray = isArray;
    if (options.convert && this._flags.single && !isArray) {
      result.value = [result.value];
      isArray = true;
    }
    if (!isArray) {
      result.errors = this.createError('array.base', null, state, options);
      return result;
    }
    if (this._inner.inclusions.length || this._inner.exclusions.length || this._inner.requireds.length || this._inner.ordereds.length || !this._flags.sparse) {
      if (wasArray) {
        result.value = result.value.slice(0);
      }
      result.errors = this._checkItems.call(this, result.value, wasArray, state, options);
      if (result.errors && wasArray && options.convert && this._flags.single) {
        const previousErrors = result.errors;
        result.value = [result.value];
        result.errors = this._checkItems.call(this, result.value, wasArray, state, options);
        if (result.errors) {
          result.errors = previousErrors;
          result.value = result.value[0];
        }
      }
    }
    return result;
  }
  _checkItems(items, wasArray, state, options) {
    const errors = [];
    let errored;
    const requireds = this._inner.requireds.slice();
    const ordereds = this._inner.ordereds.slice();
    const inclusions = this._inner.inclusions.concat(requireds);
    let il = items.length;
    for (let i = 0; i < il; ++i) {
      errored = false;
      const item = items[i];
      let isValid = false;
      const key = wasArray ? i : state.key;
      const path = wasArray ? (state.path ? state.path + '.' : '') + i : state.path;
      const localState = {
        key,
        path,
        parent: state.parent,
        reference: state.reference
      };
      let res;
      if (!this._flags.sparse && item === undefined) {
        errors.push(this.createError('array.sparse', null, {
          key: state.key,
          path: localState.path,
          pos: i
        }, options));
        if (options.abortEarly) {
          return errors;
        }
        continue;
      }
      for (let j = 0; j < this._inner.exclusions.length; ++j) {
        res = this._inner.exclusions[j]._validate(item, localState, {});
        if (!res.errors) {
          errors.push(this.createError(wasArray ? 'array.excludes' : 'array.excludesSingle', {
            pos: i,
            value: item
          }, {
            key: state.key,
            path: localState.path
          }, options));
          errored = true;
          if (options.abortEarly) {
            return errors;
          }
          break;
        }
      }
      if (errored) {
        continue;
      }
      if (this._inner.ordereds.length) {
        if (ordereds.length > 0) {
          const ordered = ordereds.shift();
          res = ordered._validate(item, localState, options);
          if (!res.errors) {
            if (ordered._flags.strip) {
              internals.fastSplice(items, i);
              --i;
              --il;
            } else if (!this._flags.sparse && res.value === undefined) {
              errors.push(this.createError('array.sparse', null, {
                key: state.key,
                path: localState.path,
                pos: i
              }, options));
              if (options.abortEarly) {
                return errors;
              }
              continue;
            } else {
              items[i] = res.value;
            }
          } else {
            errors.push(this.createError('array.ordered', {
              pos: i,
              reason: res.errors,
              value: item
            }, {
              key: state.key,
              path: localState.path
            }, options));
            if (options.abortEarly) {
              return errors;
            }
          }
          continue;
        } else if (!this._inner.items.length) {
          errors.push(this.createError('array.orderedLength', {
            pos: i,
            limit: this._inner.ordereds.length
          }, {
            key: state.key,
            path: localState.path
          }, options));
          if (options.abortEarly) {
            return errors;
          }
          continue;
        }
      }
      const requiredChecks = [];
      let jl = requireds.length;
      for (let j = 0; j < jl; ++j) {
        res = requiredChecks[j] = requireds[j]._validate(item, localState, options);
        if (!res.errors) {
          items[i] = res.value;
          isValid = true;
          internals.fastSplice(requireds, j);
          --j;
          --jl;
          if (!this._flags.sparse && res.value === undefined) {
            errors.push(this.createError('array.sparse', null, {
              key: state.key,
              path: localState.path,
              pos: i
            }, options));
            if (options.abortEarly) {
              return errors;
            }
          }
          break;
        }
      }
      if (isValid) {
        continue;
      }
      const stripUnknown = options.stripUnknown ? (options.stripUnknown === true ? true : !!options.stripUnknown.arrays) : false;
      jl = inclusions.length;
      for (let j = 0; j < jl; ++j) {
        const inclusion = inclusions[j];
        const previousCheck = requireds.indexOf(inclusion);
        if (previousCheck !== -1) {
          res = requiredChecks[previousCheck];
        } else {
          res = inclusion._validate(item, localState, options);
          if (!res.errors) {
            if (inclusion._flags.strip) {
              internals.fastSplice(items, i);
              --i;
              --il;
            } else if (!this._flags.sparse && res.value === undefined) {
              errors.push(this.createError('array.sparse', null, {
                key: state.key,
                path: localState.path,
                pos: i
              }, options));
              errored = true;
            } else {
              items[i] = res.value;
            }
            isValid = true;
            break;
          }
        }
        if (jl === 1) {
          if (stripUnknown) {
            internals.fastSplice(items, i);
            --i;
            --il;
            isValid = true;
            break;
          }
          errors.push(this.createError(wasArray ? 'array.includesOne' : 'array.includesOneSingle', {
            pos: i,
            reason: res.errors,
            value: item
          }, {
            key: state.key,
            path: localState.path
          }, options));
          errored = true;
          if (options.abortEarly) {
            return errors;
          }
          break;
        }
      }
      if (errored) {
        continue;
      }
      if (this._inner.inclusions.length && !isValid) {
        if (stripUnknown) {
          internals.fastSplice(items, i);
          --i;
          --il;
          continue;
        }
        errors.push(this.createError(wasArray ? 'array.includes' : 'array.includesSingle', {
          pos: i,
          value: item
        }, {
          key: state.key,
          path: localState.path
        }, options));
        if (options.abortEarly) {
          return errors;
        }
      }
    }
    if (requireds.length) {
      this._fillMissedErrors.call(this, errors, requireds, state, options);
    }
    if (ordereds.length) {
      this._fillOrderedErrors.call(this, errors, ordereds, state, options);
    }
    return errors.length ? errors : null;
  }
  describe() {
    const description = Any.prototype.describe.call(this);
    if (this._inner.ordereds.length) {
      description.orderedItems = [];
      for (let i = 0; i < this._inner.ordereds.length; ++i) {
        description.orderedItems.push(this._inner.ordereds[i].describe());
      }
    }
    if (this._inner.items.length) {
      description.items = [];
      for (let i = 0; i < this._inner.items.length; ++i) {
        description.items.push(this._inner.items[i].describe());
      }
    }
    return description;
  }
  items() {
    const obj = this.clone();
    Hoek.flatten(Array.prototype.slice.call(arguments)).forEach((type, index) => {
      try {
        type = Cast.schema(type);
      } catch (castErr) {
        if (castErr.hasOwnProperty('path')) {
          castErr.path = index + '.' + castErr.path;
        } else {
          castErr.path = index;
        }
        castErr.message = castErr.message + '(' + castErr.path + ')';
        throw castErr;
      }
      obj._inner.items.push(type);
      if (type._flags.presence === 'required') {
        obj._inner.requireds.push(type);
      } else if (type._flags.presence === 'forbidden') {
        obj._inner.exclusions.push(type.optional());
      } else {
        obj._inner.inclusions.push(type);
      }
    });
    return obj;
  }
  ordered() {
    const obj = this.clone();
    Hoek.flatten(Array.prototype.slice.call(arguments)).forEach((type, index) => {
      try {
        type = Cast.schema(type);
      } catch (castErr) {
        if (castErr.hasOwnProperty('path')) {
          castErr.path = index + '.' + castErr.path;
        } else {
          castErr.path = index;
        }
        castErr.message = castErr.message + '(' + castErr.path + ')';
        throw castErr;
      }
      obj._inner.ordereds.push(type);
    });
    return obj;
  }
  min(limit) {
    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    return this._test('min', limit, function(value, state, options) {
      if (value.length >= limit) {
        return value;
      }
      return this.createError('array.min', {
        limit,
        value
      }, state, options);
    });
  }
  max(limit) {
    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    return this._test('max', limit, function(value, state, options) {
      if (value.length <= limit) {
        return value;
      }
      return this.createError('array.max', {
        limit,
        value
      }, state, options);
    });
  }
  length(limit) {
    Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
    return this._test('length', limit, function(value, state, options) {
      if (value.length === limit) {
        return value;
      }
      return this.createError('array.length', {
        limit,
        value
      }, state, options);
    });
  }
  unique(comparator) {
    const isCustom = !!comparator;
    comparator = comparator || Hoek.deepEqual;
    Hoek.assert(typeof comparator === 'function', 'comparator must be a function');
    return this._test('unique', undefined, function(value, state, options) {
      const found = {
        string: {},
        number: {},
        undefined: {},
        boolean: {},
        object: [],
        function: [],
        custom: []
      };
      for (let i = 0; i < value.length; ++i) {
        const item = value[i];
        const type = typeof item;
        const records = isCustom ? found.custom : found[type];
        if (records) {
          if (Array.isArray(records)) {
            for (let j = 0; j < records.length; ++j) {
              if (comparator(records[j], item)) {
                return this.createError('array.unique', {
                  pos: i,
                  value: item
                }, state, options);
              }
            }
            records.push(item);
          } else {
            if (records[item]) {
              return this.createError('array.unique', {
                pos: i,
                value: item
              }, state, options);
            }
            records[item] = true;
          }
        }
      }
      return value;
    });
  }
  sparse(enabled) {
    const obj = this.clone();
    obj._flags.sparse = enabled === undefined ? true : !!enabled;
    return obj;
  }
  single(enabled) {
    const obj = this.clone();
    obj._flags.single = enabled === undefined ? true : !!enabled;
    return obj;
  }
  _fillMissedErrors(errors, requireds, state, options) {
    const knownMisses = [];
    let unknownMisses = 0;
    for (let i = 0; i < requireds.length; ++i) {
      const label = requireds[i]._getLabel();
      if (label) {
        knownMisses.push(label);
      } else {
        ++unknownMisses;
      }
    }
    if (knownMisses.length) {
      if (unknownMisses) {
        errors.push(this.createError('array.includesRequiredBoth', {
          knownMisses,
          unknownMisses
        }, {
          key: state.key,
          path: state.path
        }, options));
      } else {
        errors.push(this.createError('array.includesRequiredKnowns', {knownMisses}, {
          key: state.key,
          path: state.path
        }, options));
      }
    } else {
      errors.push(this.createError('array.includesRequiredUnknowns', {unknownMisses}, {
        key: state.key,
        path: state.path
      }, options));
    }
  }
  _fillOrderedErrors(errors, ordereds, state, options) {
    const requiredOrdereds = [];
    for (let i = 0; i < ordereds.length; ++i) {
      const presence = Hoek.reach(ordereds[i], '_flags.presence');
      if (presence === 'required') {
        requiredOrdereds.push(ordereds[i]);
      }
    }
    if (requiredOrdereds.length) {
      this._fillMissedErrors.call(this, errors, requiredOrdereds, state, options);
    }
  }
};
internals.safeParse = function(value, result) {
  try {
    const converted = JSON.parse(value);
    if (Array.isArray(converted)) {
      result.value = converted;
    }
  } catch (e) {}
};
module.exports = new internals.Array();
