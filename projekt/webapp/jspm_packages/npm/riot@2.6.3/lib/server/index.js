/* */ 
(function(process) {
  const path = require('path'),
      fs = require('fs'),
      riotPath = process.env.RIOT || path.resolve(__dirname, '../../riot'),
      riot = require(riotPath),
      sdom = require('./sdom'),
      Module = require('module'),
      compiler = require('riot-compiler');
  riot.settings.asyncRenderTimeout = 1000;
  function loadAndCompile(filename, opts, context) {
    const src = compiler.compile(fs.readFileSync(filename, 'utf8'), opts);
    const preTag = src.substring(0, src.indexOf('riot.tag'));
    const tagDefinition = src.substring(src.indexOf('riot.tag'));
    context._compile(['var riot = require("' + riotPath + '")', preTag, 'module.exports =' + tagDefinition].join('\n'), filename);
  }
  function riotRequire(filename, opts) {
    var module = new Module();
    module.id = module.filename = filename;
    loadAndCompile(filename, opts, module);
    return module.exports;
  }
  require.extensions['.tag'] = function(module, filename) {
    loadAndCompile(filename, {}, module);
  };
  function getTagHtml(tag) {
    return sdom.serialize(tag.root);
  }
  function render(tagName, opts) {
    var tag = render.tag(tagName, opts),
        html = getTagHtml(tag);
    tag.unmount();
    return html;
  }
  function renderAsync(tagName, opts) {
    return Promise.race([new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('Timeout error:: the tag "' + tagName + '" didn\'t trigger the "ready" event during the rendering process'));
      }, riot.settings.asyncRenderTimeout);
    }), new Promise(function(resolve) {
      var tag = render.tag(tagName, opts);
      tag.on('ready', function() {
        var html = getTagHtml(tag);
        tag.unmount();
        resolve(html);
      });
    })]);
  }
  render.dom = function(tagName, opts) {
    return riot.render.tag(tagName, opts).root;
  };
  render.tag = function(tagName, opts) {
    var root = document.createElement(tagName),
        tag = riot.mount(root, opts)[0];
    return tag;
  };
  module.exports = exports.default = Object.assign({
    compile: compiler.compile,
    parsers: compiler.parsers,
    require: riotRequire,
    render: render,
    renderAsync: renderAsync
  }, riot);
})(require('process'));
