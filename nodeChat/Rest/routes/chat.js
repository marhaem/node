/*global module, require */

(function () {
  'use strict';

  module.exports.get = function get() {
    return []
      .concat(require('./chat/v1').get());
  };
})();