/* */ 
'use strict';
const Fs = require('fs');
const Os = require('os');
const Querystring = require('querystring');
const Stream = require('stream');
const Zlib = require('zlib');
const Boom = require('boom');
const Content = require('content');
const Hoek = require('hoek');
const Pez = require('pez');
const Wreck = require('wreck');
const internals = {};
exports.parse = function(req, tap, options, next) {
  Hoek.assert(options, 'Missing options');
  Hoek.assert(options.parse !== undefined, 'Missing parse option setting');
  Hoek.assert(options.output !== undefined, 'Missing output option setting');
  const parser = new internals.Parser(req, tap, options, next);
  return parser.read();
};
internals.Parser = function(req, tap, options, next) {
  this.req = req;
  this.settings = options;
  this.tap = tap;
  this.result = {};
  this.next = (err) => {
    return next(err, this.result);
  };
};
internals.Parser.prototype.read = function() {
  const next = this.next;
  const req = this.req;
  const contentLength = req.headers['content-length'];
  if (this.settings.maxBytes !== undefined && contentLength && parseInt(contentLength, 10) > this.settings.maxBytes) {
    return next(Boom.badRequest('Payload content length greater than maximum allowed: ' + this.settings.maxBytes));
  }
  const contentType = Content.type(this.settings.override || req.headers['content-type'] || this.settings.defaultContentType || 'application/octet-stream');
  if (contentType.isBoom) {
    return next(contentType);
  }
  this.result.contentType = contentType;
  this.result.mime = contentType.mime;
  if (this.settings.allow && this.settings.allow.indexOf(contentType.mime) === -1) {
    return next(Boom.unsupportedMediaType());
  }
  if (this.settings.parse === true) {
    return this.parse(contentType);
  }
  return this.raw();
};
internals.Parser.prototype.parse = function(contentType) {
  let next = this.next;
  const output = this.settings.output;
  let source = this.req;
  const contentEncoding = source.headers['content-encoding'];
  if (contentEncoding === 'gzip' || contentEncoding === 'deflate') {
    const decoder = (contentEncoding === 'gzip' ? Zlib.createGunzip() : Zlib.createInflate());
    next = Hoek.once(next);
    this.next = next;
    decoder.once('error', (err) => {
      return next(Boom.badRequest('Invalid compressed payload', err));
    });
    source = source.pipe(decoder);
  }
  if (this.tap) {
    source = source.pipe(this.tap);
  }
  if (this.result.contentType.mime === 'multipart/form-data') {
    return this.multipart(source, contentType);
  }
  if (output === 'stream') {
    this.result.payload = source;
    return next();
  }
  if (output === 'file') {
    this.writeFile(source, (err, path, bytes) => {
      if (err) {
        return next(err);
      }
      this.result.payload = {
        path: path,
        bytes: bytes
      };
      return next();
    });
    return;
  }
  return Wreck.read(source, {
    timeout: this.settings.timeout,
    maxBytes: this.settings.maxBytes
  }, (err, payload) => {
    if (err) {
      return next(err);
    }
    internals.object(payload, this.result.contentType.mime, this.settings, (err, result) => {
      if (err) {
        this.result.payload = null;
        return next(err);
      }
      this.result.payload = result;
      return next();
    });
  });
};
internals.Parser.prototype.raw = function() {
  let next = this.next;
  const output = this.settings.output;
  let source = this.req;
  if (this.settings.parse === 'gunzip') {
    const contentEncoding = source.headers['content-encoding'];
    if (contentEncoding === 'gzip' || contentEncoding === 'deflate') {
      const decoder = (contentEncoding === 'gzip' ? Zlib.createGunzip() : Zlib.createInflate());
      next = Hoek.once(next);
      decoder.once('error', (err) => {
        return next(Boom.badRequest('Invalid compressed payload', err));
      });
      source = source.pipe(decoder);
    }
  }
  if (this.tap) {
    source = source.pipe(this.tap);
  }
  if (output === 'stream') {
    this.result.payload = source;
    return next();
  }
  if (output === 'file') {
    this.writeFile(source, (err, path, bytes) => {
      if (err) {
        return next(err);
      }
      this.result.payload = {
        path: path,
        bytes: bytes
      };
      return next();
    });
    return;
  }
  return Wreck.read(source, {
    timeout: this.settings.timeout,
    maxBytes: this.settings.maxBytes
  }, (err, payload) => {
    if (err) {
      return next(err);
    }
    this.result.payload = payload;
    return next();
  });
};
internals.object = function(payload, mime, options, next) {
  if (mime === 'application/octet-stream') {
    return next(null, payload.length ? payload : null);
  }
  if (mime.match(/^text\/.+$/)) {
    return next(null, payload.toString('utf8'));
  }
  if (/^application\/(?:.+\+)?json$/.test(mime)) {
    return internals.jsonParse(payload, next);
  }
  if (mime === 'application/x-www-form-urlencoded') {
    return next(null, payload.length ? Querystring.parse(payload.toString('utf8')) : {});
  }
  return next(Boom.unsupportedMediaType());
};
internals.jsonParse = function(payload, next) {
  if (!payload.length) {
    return next(null, null);
  }
  let parsed;
  try {
    parsed = JSON.parse(payload.toString('utf8'));
  } catch (err) {
    return next(Boom.badRequest('Invalid request payload JSON format', err));
  }
  return next(null, parsed);
};
internals.Parser.prototype.multipart = function(source, contentType) {
  let next = this.next;
  next = Hoek.once(next);
  this.next = next;
  const clientTimeout = this.settings.timeout;
  let clientTimeoutId = null;
  const dispenserOptions = Hoek.applyToDefaults(contentType, {maxBytes: this.settings.maxBytes});
  const dispenser = new Pez.Dispenser(dispenserOptions);
  const onError = (err) => {
    return next(Boom.badRequest('Invalid multipart payload format', err));
  };
  dispenser.once('error', onError);
  const data = {};
  const finalize = () => {
    clearTimeout(clientTimeoutId);
    dispenser.removeListener('error', onError);
    dispenser.removeListener('part', onPart);
    dispenser.removeListener('field', onField);
    dispenser.removeListener('close', onClose);
    this.result.payload = data;
    return next();
  };
  if (clientTimeout && clientTimeout > 0) {
    clientTimeoutId = setTimeout(() => {
      return next(Boom.clientTimeout());
    }, clientTimeout);
  }
  const set = (name, value) => {
    if (!data.hasOwnProperty(name)) {
      data[name] = value;
    } else if (Array.isArray(data[name])) {
      data[name].push(value);
    } else {
      data[name] = [data[name], value];
    }
  };
  const pendingFiles = {};
  let nextId = 0;
  let closed = false;
  const onPart = (part) => {
    if (this.settings.output === 'file') {
      const id = nextId++;
      pendingFiles[id] = true;
      this.writeFile(part, (err, path, bytes) => {
        delete pendingFiles[id];
        if (err) {
          return next(err);
        }
        const item = {
          filename: part.filename,
          path: path,
          headers: part.headers,
          bytes: bytes
        };
        set(part.name, item);
        if (closed && !Object.keys(pendingFiles).length) {
          return finalize(data);
        }
      });
    } else {
      Wreck.read(part, {}, (ignoreErr, payload) => {
        if (this.settings.output === 'stream') {
          const item = Wreck.toReadableStream(payload);
          item.hapi = {
            filename: part.filename,
            headers: part.headers
          };
          return set(part.name, item);
        }
        const ct = part.headers['content-type'] || '';
        const mime = ct.split(';')[0].trim().toLowerCase();
        if (!mime) {
          return set(part.name, payload);
        }
        if (!payload.length) {
          return set(part.name, {});
        }
        internals.object(payload, mime, this.settings, (err, result) => {
          return set(part.name, err ? payload : result);
        });
      });
    }
  };
  dispenser.on('part', onPart);
  const onField = (name, value) => {
    set(name, value);
  };
  dispenser.on('field', onField);
  const onClose = () => {
    if (Object.keys(pendingFiles).length) {
      closed = true;
      return;
    }
    return finalize(data);
  };
  dispenser.once('close', onClose);
  source.pipe(dispenser);
};
internals.Parser.prototype.writeFile = function(stream, callback) {
  const path = Hoek.uniqueFilename(this.settings.uploads || Os.tmpDir());
  const file = Fs.createWriteStream(path, {flags: 'wx'});
  const counter = new internals.Counter();
  const finalize = Hoek.once((err) => {
    this.req.removeListener('aborted', onAbort);
    file.removeListener('close', finalize);
    file.removeListener('error', finalize);
    if (!err) {
      return callback(null, path, counter.bytes);
    }
    file.destroy();
    Fs.unlink(path, () => {
      return callback(err);
    });
  });
  file.once('close', finalize);
  file.once('error', finalize);
  const onAbort = () => {
    return finalize(Boom.badRequest('Client connection aborted'));
  };
  this.req.once('aborted', onAbort);
  stream.pipe(counter).pipe(file);
};
internals.Counter = function() {
  Stream.Transform.call(this);
  this.bytes = 0;
};
Hoek.inherits(internals.Counter, Stream.Transform);
internals.Counter.prototype._transform = function(chunk, encoding, next) {
  this.bytes = this.bytes + chunk.length;
  return next(null, chunk);
};
