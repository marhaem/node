/* */ 
(function(process) {
  'use strict';
  const Events = require('events');
  const Url = require('url');
  const Accept = require('accept');
  const Boom = require('boom');
  const Hoek = require('hoek');
  const Items = require('items');
  const Peekaboo = require('peekaboo');
  const Cors = require('./cors');
  const Protect = require('./protect');
  const Response = require('./response');
  const Transmit = require('./transmit');
  const internals = {properties: ['connection', 'server', 'url', 'query', 'path', 'method', 'mime', 'setUrl', 'setMethod', 'headers', 'id', 'app', 'plugins', 'route', 'auth', 'pre', 'preResponses', 'info', 'orig', 'params', 'paramsArray', 'payload', 'state', 'jsonp', 'response', 'raw', 'tail', 'addTail', 'domain', 'log', 'getLog', 'generateResponse']};
  exports = module.exports = internals.Generator = function() {
    this._decorations = null;
  };
  internals.Generator.prototype.request = function(connection, req, res, options) {
    const request = new internals.Request(connection, req, res, options);
    if (this._decorations) {
      const properties = Object.keys(this._decorations);
      for (let i = 0; i < properties.length; ++i) {
        const property = properties[i];
        const assignment = this._decorations[property];
        request[property] = (assignment.apply ? assignment.method(request) : assignment.method);
      }
    }
    return request;
  };
  internals.Generator.prototype.decorate = function(property, method, options) {
    options = options || {};
    Hoek.assert(!this._decorations || this._decorations[property] === undefined, 'Request interface decoration already defined:', property);
    Hoek.assert(internals.properties.indexOf(property) === -1, 'Cannot override built-in request interface decoration:', property);
    this._decorations = this._decorations || {};
    this._decorations[property] = {
      method,
      apply: options.apply
    };
  };
  internals.Request = function(connection, req, res, options) {
    Events.EventEmitter.call(this);
    this._bench = new Hoek.Bench();
    const now = Date.now();
    this.connection = connection;
    this.server = connection.server;
    this.url = null;
    this.query = null;
    this.path = null;
    this.method = null;
    this.mime = null;
    this.setUrl = this._setUrl;
    this.setMethod = this._setMethod;
    this._setUrl(req.url, this.connection.settings.router.stripTrailingSlash);
    this._setMethod(req.method);
    this.headers = req.headers;
    this.id = now + ':' + connection.info.id + ':' + connection._requestCounter.value++;
    if (connection._requestCounter.value > connection._requestCounter.max) {
      connection._requestCounter.value = connection._requestCounter.min;
    }
    this.app = (options.app ? Hoek.shallow(options.app) : {});
    this.plugins = (options.plugins ? Hoek.shallow(options.plugins) : {});
    this._route = this.connection._router.specials.notFound.route;
    this.route = this._route.public;
    this.auth = {
      isAuthenticated: false,
      credentials: options.credentials || null,
      artifacts: options.artifacts || null,
      strategy: null,
      mode: null,
      error: null
    };
    this.pre = {};
    this.preResponses = {};
    this.info = {
      received: now,
      responded: 0,
      remoteAddress: req.connection.remoteAddress,
      remotePort: req.connection.remotePort || '',
      referrer: req.headers.referrer || req.headers.referer || '',
      host: req.headers.host ? req.headers.host.replace(/\s/g, '') : '',
      acceptEncoding: Accept.encoding(this.headers['accept-encoding'], ['identity', 'gzip', 'deflate'])
    };
    this.info.hostname = this.info.host.split(':')[0];
    this.orig = {};
    this.params = {};
    this.paramsArray = [];
    this.payload = null;
    this.state = null;
    this.jsonp = null;
    this.response = null;
    this.raw = {
      req: req,
      res: res
    };
    this.tail = this.addTail = this._addTail;
    this._states = {};
    this._logger = [];
    this._allowInternals = !!options.allowInternals;
    this._isPayloadPending = true;
    this._isBailed = false;
    this._isReplied = false;
    this._isFinalized = false;
    this._tails = {};
    this._tailIds = 0;
    this._protect = new Protect(this);
    this.domain = this._protect.domain;
    this._onEnd = () => {
      this._isPayloadPending = false;
    };
    this.raw.req.once('end', this._onEnd);
    this._onClose = () => {
      this._log(['request', 'closed', 'error']);
      this._isPayloadPending = false;
      this._isBailed = true;
    };
    this.raw.req.once('close', this._onClose);
    this._onError = (err) => {
      this._log(['request', 'error'], err);
      this._isPayloadPending = false;
    };
    this.raw.req.once('error', this._onError);
    const about = {
      method: this.method,
      url: this.url.href,
      agent: this.raw.req.headers['user-agent']
    };
    this._log(['received'], about, now);
  };
  Hoek.inherits(internals.Request, Events.EventEmitter);
  internals.Request.prototype._setUrl = function(url, stripTrailingSlash) {
    this.url = (typeof url === 'string' ? Url.parse(url, true) : url);
    this.query = this.url.query;
    this.path = this.url.pathname || '';
    if (stripTrailingSlash && this.path.length > 1 && this.path[this.path.length - 1] === '/') {
      this.path = this.path.slice(0, -1);
      this.url.pathname = this.path;
    }
    this.path = this.connection._router.normalize(this.path);
  };
  internals.Request.prototype._setMethod = function(method) {
    Hoek.assert(method && typeof method === 'string', 'Missing method');
    this.method = method.toLowerCase();
  };
  internals.Request.prototype.log = function(tags, data, timestamp, _internal) {
    tags = (Array.isArray(tags) ? tags : [tags]);
    const now = (timestamp ? (timestamp instanceof Date ? timestamp.getTime() : timestamp) : Date.now());
    const event = {
      request: this.id,
      timestamp: now,
      tags: tags,
      data: data,
      internal: !!_internal
    };
    const tagsMap = Hoek.mapToObject(event.tags);
    this._logger.push(event);
    this.connection.emit(_internal ? 'request-internal' : 'request', this, event, tagsMap);
    if (this.server._settings.debug && this.server._settings.debug.request && Hoek.intersect(tagsMap, this.server._settings.debug.request, true)) {
      console.error('Debug:', event.tags.join(', '), (data ? '\n    ' + (data.stack || (typeof data === 'object' ? Hoek.stringify(data) : data)) : ''));
    }
  };
  internals.Request.prototype._log = function(tags, data) {
    return this.log(tags, data, null, true);
  };
  internals.Request.prototype.getLog = function(tags, internal) {
    if (typeof tags === 'boolean') {
      internal = tags;
      tags = [];
    }
    tags = [].concat(tags || []);
    if (!tags.length && internal === undefined) {
      return this._logger;
    }
    const filter = tags.length ? Hoek.mapToObject(tags) : null;
    const result = [];
    for (let i = 0; i < this._logger.length; ++i) {
      const event = this._logger[i];
      if (internal === undefined || event.internal === internal) {
        if (filter) {
          for (let j = 0; j < event.tags.length; ++j) {
            const tag = event.tags[j];
            if (filter[tag]) {
              result.push(event);
              break;
            }
          }
        } else {
          result.push(event);
        }
      }
    }
    return result;
  };
  internals.Request.prototype._execute = function() {
    if (!this.connection._extensions.onRequest.nodes) {
      return this._lifecycle();
    }
    this._invoke(this.connection._extensions.onRequest, (err) => {
      return this._lifecycle(err);
    });
  };
  internals.Request.prototype._lifecycle = function(err) {
    this.setUrl = undefined;
    this.setMethod = undefined;
    if (err) {
      return this._reply(err);
    }
    if (!this.path || this.path[0] !== '/') {
      return this._reply(Boom.badRequest('Invalid path'));
    }
    const match = this.connection._router.route(this.method, this.path, this.info.hostname);
    if (!match.route.settings.isInternal || this._allowInternals) {
      this._route = match.route;
      this.route = this._route.public;
    }
    this.params = match.params || {};
    this.paramsArray = match.paramsArray || [];
    if (this.route.settings.cors) {
      this.info.cors = {isOriginMatch: Cors.matchOrigin(this.headers.origin, this.route.settings.cors)};
    }
    if (this.raw.req.socket && this.route.settings.timeout.socket !== undefined) {
      this.raw.req.socket.setTimeout(this.route.settings.timeout.socket || 0);
    }
    let serverTimeout = this.route.settings.timeout.server;
    if (serverTimeout) {
      serverTimeout = Math.floor(serverTimeout - this._bench.elapsed());
      const timeoutReply = () => {
        this._log(['request', 'server', 'timeout', 'error'], {
          timeout: serverTimeout,
          elapsed: this._bench.elapsed()
        });
        this._reply(Boom.serverTimeout());
      };
      if (serverTimeout <= 0) {
        return timeoutReply();
      }
      this._serverTimeoutId = setTimeout(timeoutReply, serverTimeout);
    }
    const each = (func, next) => {
      if (this._isReplied || this._isBailed) {
        return next(Boom.internal('Already closed'));
      }
      if (typeof func !== 'function') {
        return this._invoke(func, next);
      }
      return func(this, next);
    };
    Items.serial(this._route._cycle, each, (err) => {
      return this._reply(err);
    });
  };
  internals.Request.prototype._invoke = function(event, callback) {
    this._protect.run(callback, (exit) => {
      Items.serial(event.nodes, (ext, next) => {
        const reply = this.server._replier.interface(this, ext.plugin.realm, next);
        const bind = (ext.bind || ext.plugin.realm.settings.bind);
        ext.func.call(bind, this, reply);
      }, exit);
    });
  };
  internals.Request.prototype._reply = function(exit) {
    if (this._isReplied) {
      return;
    }
    this._isReplied = true;
    clearTimeout(this._serverTimeoutId);
    if (this._isBailed) {
      return this._finalize();
    }
    if (this.response && this.response.closed) {
      if (this.response.end) {
        this.raw.res.end();
      }
      return this._finalize();
    }
    if (exit) {
      this._setResponse(Response.wrap(exit, this));
    }
    this._protect.reset();
    const transmit = (err) => {
      if (err) {
        this._setResponse(Response.wrap(err, this));
      }
      Transmit.send(this, () => {
        return this._finalize();
      });
    };
    if (!this._route._extensions.onPreResponse.nodes) {
      return transmit();
    }
    this._invoke(this._route._extensions.onPreResponse, transmit);
  };
  internals.Request.prototype._finalize = function() {
    this.info.responded = Date.now();
    if (this.response && this.response.statusCode === 500 && this.response._error) {
      this.connection.emit('request-error', this, this.response._error);
      this._log(this.response._error.isDeveloperError ? ['internal', 'implementation', 'error'] : ['internal', 'error'], this.response._error);
    }
    this.connection.emit('response', this);
    this._isFinalized = true;
    this.addTail = undefined;
    this.tail = undefined;
    if (Object.keys(this._tails).length === 0) {
      this.connection.emit('tail', this);
    }
    this.raw.req.removeListener('end', this._onEnd);
    this.raw.req.removeListener('close', this._onClose);
    this.raw.req.removeListener('error', this._onError);
    if (this.response && this.response._close) {
      this.response._close();
    }
    this._protect.logger = this.server;
  };
  internals.Request.prototype._setResponse = function(response) {
    if (this.response && !this.response.isBoom && this.response !== response && (response.isBoom || this.response.source !== response.source)) {
      this.response._close();
    }
    if (this._isFinalized) {
      if (response._close) {
        response._close();
      }
      return;
    }
    this.response = response;
  };
  internals.Request.prototype._addTail = function(name) {
    name = name || 'unknown';
    const tailId = this._tailIds++;
    this._tails[tailId] = name;
    this._log(['tail', 'add'], {
      name: name,
      id: tailId
    });
    const drop = () => {
      if (!this._tails[tailId]) {
        this._log(['tail', 'remove', 'error'], {
          name: name,
          id: tailId
        });
        return;
      }
      delete this._tails[tailId];
      if (Object.keys(this._tails).length === 0 && this._isFinalized) {
        this._log(['tail', 'remove', 'last'], {
          name: name,
          id: tailId
        });
        this.connection.emit('tail', this);
      } else {
        this._log(['tail', 'remove'], {
          name: name,
          id: tailId
        });
      }
    };
    return drop;
  };
  internals.Request.prototype._setState = function(name, value, options) {
    const state = {
      name: name,
      value: value
    };
    if (options) {
      Hoek.assert(!options.autoValue, 'Cannot set autoValue directly in a response');
      state.options = Hoek.clone(options);
    }
    this._states[name] = state;
  };
  internals.Request.prototype._clearState = function(name, options) {
    const state = {name: name};
    state.options = Hoek.clone(options || {});
    state.options.ttl = 0;
    this._states[name] = state;
  };
  internals.Request.prototype._tap = function() {
    return (this.listeners('finish').length || this.listeners('peek').length ? new Peekaboo(this) : null);
  };
  internals.Request.prototype.generateResponse = function(source, options) {
    return new Response(source, this, options);
  };
})(require('process'));
