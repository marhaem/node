/* */ 
(function(process) {
  var Dns = require('dns');
  var internals = {
    defaultThreshold: 16,
    maxIPv6Groups: 8,
    categories: {
      valid: 1,
      dnsWarn: 7,
      rfc5321: 15,
      cfws: 31,
      deprecated: 63,
      rfc5322: 127,
      error: 255
    },
    diagnoses: {
      valid: 0,
      dnsWarnNoMXRecord: 5,
      dnsWarnNoRecord: 6,
      rfc5321TLD: 9,
      rfc5321TLDNumeric: 10,
      rfc5321QuotedString: 11,
      rfc5321AddressLiteral: 12,
      cfwsComment: 17,
      cfwsFWS: 18,
      deprecatedLocalPart: 33,
      deprecatedFWS: 34,
      deprecatedQTEXT: 35,
      deprecatedQP: 36,
      deprecatedComment: 37,
      deprecatedCTEXT: 38,
      deprecatedIPv6: 39,
      deprecatedCFWSNearAt: 49,
      rfc5322Domain: 65,
      rfc5322TooLong: 66,
      rfc5322LocalTooLong: 67,
      rfc5322DomainTooLong: 68,
      rfc5322LabelTooLong: 69,
      rfc5322DomainLiteral: 70,
      rfc5322DomainLiteralOBSDText: 71,
      rfc5322IPv6GroupCount: 72,
      rfc5322IPv62x2xColon: 73,
      rfc5322IPv6BadCharacter: 74,
      rfc5322IPv6MaxGroups: 75,
      rfc5322IPv6ColonStart: 76,
      rfc5322IPv6ColonEnd: 77,
      errExpectingDTEXT: 129,
      errNoLocalPart: 130,
      errNoDomain: 131,
      errConsecutiveDots: 132,
      errATEXTAfterCFWS: 133,
      errATEXTAfterQS: 134,
      errATEXTAfterDomainLiteral: 135,
      errExpectingQPair: 136,
      errExpectingATEXT: 137,
      errExpectingQTEXT: 138,
      errExpectingCTEXT: 139,
      errBackslashEnd: 140,
      errDotStart: 141,
      errDotEnd: 142,
      errDomainHyphenStart: 143,
      errDomainHyphenEnd: 144,
      errUnclosedQuotedString: 145,
      errUnclosedComment: 146,
      errUnclosedDomainLiteral: 147,
      errFWSCRLFx2: 148,
      errFWSCRLFEnd: 149,
      errCRNoLF: 150,
      errUnknownTLD: 160,
      errDomainTooShort: 161
    },
    components: {
      localpart: 0,
      domain: 1,
      literal: 2,
      contextComment: 3,
      contextFWS: 4,
      contextQuotedString: 5,
      contextQuotedPair: 6
    }
  };
  internals.defer = typeof process !== 'undefined' && process && typeof process.nextTick === 'function' ? process.nextTick.bind(process) : function(callback) {
    return setTimeout(callback, 0);
  };
  var SPECIALS = '()<>[]:;@\\,."';
  var optimizeLookup = function optimizeLookup(string) {
    var lookup = new Array(0x100);
    for (var i = 0xff; i >= 0; --i) {
      lookup[i] = false;
    }
    for (var il = string.length; i < il; ++i) {
      lookup[string.charCodeAt(i)] = true;
    }
    var body = 'return function (code) {\n';
    body += '  return lookup[code];\n';
    body += '}';
    return (new Function('lookup', body))(lookup);
  };
  var specialsLookup = optimizeLookup(SPECIALS);
  var IPv4_REGEX = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  var IPv6_REGEX = /^[a-fA-F\d]{0,4}$/;
  var IPv6_REGEX_TEST = IPv6_REGEX.test.bind(IPv6_REGEX);
  var hasOwn = Object.prototype.hasOwnProperty;
  var isEmail = function isEmail(email, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (!options) {
      options = {};
    }
    if (typeof callback !== 'function') {
      if (options.checkDNS) {
        throw new TypeError('expected callback function for checkDNS option');
      }
      callback = null;
    }
    var diagnose;
    var threshold;
    if (typeof options.errorLevel === 'number') {
      diagnose = true;
      threshold = options.errorLevel;
    } else {
      diagnose = !!options.errorLevel;
      threshold = internals.diagnoses.valid;
    }
    if (options.tldWhitelist) {
      if (typeof options.tldWhitelist === 'string') {
        options.tldWhitelist = [options.tldWhitelist];
      } else if (typeof options.tldWhitelist !== 'object') {
        throw new TypeError('expected array or object tldWhitelist');
      }
    }
    if (options.minDomainAtoms && (options.minDomainAtoms !== ((+options.minDomainAtoms) | 0) || options.minDomainAtoms < 0)) {
      throw new TypeError('expected positive integer minDomainAtoms');
    }
    var maxResult = internals.diagnoses.valid;
    var updateResult = function updateResult(value) {
      if (value > maxResult) {
        maxResult = value;
      }
    };
    var context = {
      now: internals.components.localpart,
      prev: internals.components.localpart,
      stack: [internals.components.localpart]
    };
    var token;
    var prevToken = '';
    var charCode = 0;
    var parseData = {
      local: '',
      domain: ''
    };
    var atomData = {
      locals: [''],
      domains: ['']
    };
    var elementCount = 0;
    var elementLength = 0;
    var crlfCount = 0;
    var hyphenFlag = false;
    var assertEnd = false;
    var emailLength = email.length;
    for (var i = 0,
        il = emailLength; i < il; ++i) {
      token = email[i];
      switch (context.now) {
        case internals.components.localpart:
          switch (token) {
            case '(':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.cfwsComment : internals.diagnoses.deprecatedComment);
              } else {
                updateResult(internals.diagnoses.cfwsComment);
                assertEnd = true;
              }
              context.stack.push(context.now);
              context.now = internals.components.contextComment;
              break;
            case '.':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.errDotStart : internals.diagnoses.errConsecutiveDots);
              } else {
                if (assertEnd) {
                  updateResult(internals.diagnoses.deprecatedLocalPart);
                }
                assertEnd = false;
                elementLength = 0;
                ++elementCount;
                parseData.local += token;
                atomData.locals[elementCount] = '';
              }
              break;
            case '"':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.rfc5321QuotedString : internals.diagnoses.deprecatedLocalPart);
                parseData.local += token;
                atomData.locals[elementCount] += token;
                ++elementLength;
                assertEnd = true;
                context.stack.push(context.now);
                context.now = internals.components.contextQuotedString;
              } else {
                updateResult(internals.diagnoses.errExpectingATEXT);
              }
              break;
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
                break;
              }
            case ' ':
            case '\t':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.cfwsFWS : internals.diagnoses.deprecatedFWS);
              } else {
                assertEnd = true;
              }
              context.stack.push(context.now);
              context.now = internals.components.contextFWS;
              prevToken = token;
              break;
            case '@':
              if (context.stack.length !== 1) {
                throw new Error('unexpected item on context stack');
              }
              if (parseData.local.length === 0) {
                updateResult(internals.diagnoses.errNoLocalPart);
              } else if (elementLength === 0) {
                updateResult(internals.diagnoses.errDotEnd);
              } else if (parseData.local.length > 64) {
                updateResult(internals.diagnoses.rfc5322LocalTooLong);
              } else if (context.prev === internals.components.contextComment || context.prev === internals.components.contextFWS) {
                updateResult(internals.diagnoses.deprecatedCFWSNearAt);
              }
              context.now = internals.components.domain;
              context.stack[0] = internals.components.domain;
              elementCount = 0;
              elementLength = 0;
              assertEnd = false;
              break;
            default:
              if (assertEnd) {
                switch (context.prev) {
                  case internals.components.contextComment:
                  case internals.components.contextFWS:
                    updateResult(internals.diagnoses.errATEXTAfterCFWS);
                    break;
                  case internals.components.contextQuotedString:
                    updateResult(internals.diagnoses.errATEXTAfterQS);
                    break;
                  default:
                    throw new Error('more atext found where none is allowed, but unrecognized prev context: ' + context.prev);
                }
              } else {
                context.prev = context.now;
                charCode = token.charCodeAt(0);
                if (charCode < 33 || charCode > 126 || specialsLookup(charCode)) {
                  updateResult(internals.diagnoses.errExpectingATEXT);
                }
                parseData.local += token;
                atomData.locals[elementCount] += token;
                ++elementLength;
              }
          }
          break;
        case internals.components.domain:
          switch (token) {
            case '(':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.deprecatedCFWSNearAt : internals.diagnoses.deprecatedComment);
              } else {
                assertEnd = true;
                updateResult(internals.diagnoses.cfwsComment);
              }
              context.stack.push(context.now);
              context.now = internals.components.contextComment;
              break;
            case '.':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.errDotStart : internals.diagnoses.errConsecutiveDots);
              } else if (hyphenFlag) {
                updateResult(internals.diagnoses.errDomainHyphenEnd);
              } else if (elementLength > 63) {
                updateResult(internals.diagnoses.rfc5322LabelTooLong);
              }
              assertEnd = false;
              elementLength = 0;
              ++elementCount;
              atomData.domains[elementCount] = '';
              parseData.domain += token;
              break;
            case '[':
              if (parseData.domain.length === 0) {
                assertEnd = true;
                ++elementLength;
                context.stack.push(context.now);
                context.now = internals.components.literal;
                parseData.domain += token;
                atomData.domains[elementCount] += token;
                parseData.literal = '';
              } else {
                updateResult(internals.diagnoses.errExpectingATEXT);
              }
              break;
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
                break;
              }
            case ' ':
            case '\t':
              if (elementLength === 0) {
                updateResult(elementCount === 0 ? internals.diagnoses.deprecatedCFWSNearAt : internals.diagnoses.deprecatedFWS);
              } else {
                updateResult(internals.diagnoses.cfwsFWS);
                assertEnd = true;
              }
              context.stack.push(context.now);
              context.now = internals.components.contextFWS;
              prevToken = token;
              break;
            default:
              if (assertEnd) {
                switch (context.prev) {
                  case internals.components.contextComment:
                  case internals.components.contextFWS:
                    updateResult(internals.diagnoses.errATEXTAfterCFWS);
                    break;
                  case internals.components.literal:
                    updateResult(internals.diagnoses.errATEXTAfterDomainLiteral);
                    break;
                  default:
                    throw new Error('more atext found where none is allowed, but unrecognized prev context: ' + context.prev);
                }
              }
              charCode = token.charCodeAt(0);
              hyphenFlag = false;
              if (charCode < 33 || charCode > 126 || specialsLookup(charCode)) {
                updateResult(internals.diagnoses.errExpectingATEXT);
              } else if (token === '-') {
                if (elementLength === 0) {
                  updateResult(internals.diagnoses.errDomainHyphenStart);
                }
                hyphenFlag = true;
              } else if (charCode < 48 || charCode > 122 || (charCode > 57 && charCode < 65) || (charCode > 90 && charCode < 97)) {
                updateResult(internals.diagnoses.rfc5322Domain);
              }
              parseData.domain += token;
              atomData.domains[elementCount] += token;
              ++elementLength;
          }
          break;
        case internals.components.literal:
          switch (token) {
            case ']':
              if (maxResult < internals.categories.deprecated) {
                var index = -1;
                var addressLiteral = parseData.literal;
                var matchesIP = IPv4_REGEX.exec(addressLiteral);
                if (matchesIP) {
                  index = matchesIP.index;
                  if (index !== 0) {
                    addressLiteral = addressLiteral.slice(0, index) + '0:0';
                  }
                }
                if (index === 0) {
                  updateResult(internals.diagnoses.rfc5321AddressLiteral);
                } else if (addressLiteral.slice(0, 5).toLowerCase() !== 'ipv6:') {
                  updateResult(internals.diagnoses.rfc5322DomainLiteral);
                } else {
                  var match = addressLiteral.slice(5);
                  var maxGroups = internals.maxIPv6Groups;
                  var groups = match.split(':');
                  index = match.indexOf('::');
                  if (!~index) {
                    if (groups.length !== maxGroups) {
                      updateResult(internals.diagnoses.rfc5322IPv6GroupCount);
                    }
                  } else if (index !== match.lastIndexOf('::')) {
                    updateResult(internals.diagnoses.rfc5322IPv62x2xColon);
                  } else {
                    if (index === 0 || index === match.length - 2) {
                      ++maxGroups;
                    }
                    if (groups.length > maxGroups) {
                      updateResult(internals.diagnoses.rfc5322IPv6MaxGroups);
                    } else if (groups.length === maxGroups) {
                      updateResult(internals.diagnoses.deprecatedIPv6);
                    }
                  }
                  if (match[0] === ':' && match[1] !== ':') {
                    updateResult(internals.diagnoses.rfc5322IPv6ColonStart);
                  } else if (match[match.length - 1] === ':' && match[match.length - 2] !== ':') {
                    updateResult(internals.diagnoses.rfc5322IPv6ColonEnd);
                  } else if (groups.every(IPv6_REGEX_TEST)) {
                    updateResult(internals.diagnoses.rfc5321AddressLiteral);
                  } else {
                    updateResult(internals.diagnoses.rfc5322IPv6BadCharacter);
                  }
                }
              } else {
                updateResult(internals.diagnoses.rfc5322DomainLiteral);
              }
              parseData.domain += token;
              atomData.domains[elementCount] += token;
              ++elementLength;
              context.prev = context.now;
              context.now = context.stack.pop();
              break;
            case '\\':
              updateResult(internals.diagnoses.rfc5322DomainLiteralOBSDText);
              context.stack.push(context.now);
              context.now = internals.components.contextQuotedPair;
              break;
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
                break;
              }
            case ' ':
            case '\t':
              updateResult(internals.diagnoses.cfwsFWS);
              context.stack.push(context.now);
              context.now = internals.components.contextFWS;
              prevToken = token;
              break;
            default:
              charCode = token.charCodeAt(0);
              if (charCode > 127 || charCode === 0 || token === '[') {
                updateResult(internals.diagnoses.errExpectingDTEXT);
                break;
              } else if (charCode < 33 || charCode === 127) {
                updateResult(internals.diagnoses.rfc5322DomainLiteralOBSDText);
              }
              parseData.literal += token;
              parseData.domain += token;
              atomData.domains[elementCount] += token;
              ++elementLength;
          }
          break;
        case internals.components.contextQuotedString:
          switch (token) {
            case '\\':
              context.stack.push(context.now);
              context.now = internals.components.contextQuotedPair;
              break;
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
                break;
              }
            case '\t':
              parseData.local += ' ';
              atomData.locals[elementCount] += ' ';
              ++elementLength;
              updateResult(internals.diagnoses.cfwsFWS);
              context.stack.push(context.now);
              context.now = internals.components.contextFWS;
              prevToken = token;
              break;
            case '"':
              parseData.local += token;
              atomData.locals[elementCount] += token;
              ++elementLength;
              context.prev = context.now;
              context.now = context.stack.pop();
              break;
            default:
              charCode = token.charCodeAt(0);
              if (charCode > 127 || charCode === 0 || charCode === 10) {
                updateResult(internals.diagnoses.errExpectingQTEXT);
              } else if (charCode < 32 || charCode === 127) {
                updateResult(internals.diagnoses.deprecatedQTEXT);
              }
              parseData.local += token;
              atomData.locals[elementCount] += token;
              ++elementLength;
          }
          break;
        case internals.components.contextQuotedPair:
          charCode = token.charCodeAt(0);
          if (charCode > 127) {
            updateResult(internals.diagnoses.errExpectingQPair);
          } else if ((charCode < 31 && charCode !== 9) || charCode === 127) {
            updateResult(internals.diagnoses.deprecatedQP);
          }
          context.prev = context.now;
          context.now = context.stack.pop();
          token = '\\' + token;
          switch (context.now) {
            case internals.components.contextComment:
              break;
            case internals.components.contextQuotedString:
              parseData.local += token;
              atomData.locals[elementCount] += token;
              elementLength += 2;
              break;
            case internals.components.literal:
              parseData.domain += token;
              atomData.domains[elementCount] += token;
              elementLength += 2;
              break;
            default:
              throw new Error('quoted pair logic invoked in an invalid context: ' + context.now);
          }
          break;
        case internals.components.contextComment:
          switch (token) {
            case '(':
              context.stack.push(context.now);
              context.now = internals.components.contextComment;
              break;
            case ')':
              context.prev = context.now;
              context.now = context.stack.pop();
              break;
            case '\\':
              context.stack.push(context.now);
              context.now = internals.components.contextQuotedPair;
              break;
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
                break;
              }
            case ' ':
            case '\t':
              updateResult(internals.diagnoses.cfwsFWS);
              context.stack.push(context.now);
              context.now = internals.components.contextFWS;
              prevToken = token;
              break;
            default:
              charCode = token.charCodeAt(0);
              if (charCode > 127 || charCode === 0 || charCode === 10) {
                updateResult(internals.diagnoses.errExpectingCTEXT);
                break;
              } else if (charCode < 32 || charCode === 127) {
                updateResult(internals.diagnoses.deprecatedCTEXT);
              }
          }
          break;
        case internals.components.contextFWS:
          if (prevToken === '\r') {
            if (token === '\r') {
              updateResult(internals.diagnoses.errFWSCRLFx2);
              break;
            }
            if (++crlfCount > 1) {
              updateResult(internals.diagnoses.deprecatedFWS);
            } else {
              crlfCount = 1;
            }
          }
          switch (token) {
            case '\r':
              if (emailLength === ++i || email[i] !== '\n') {
                updateResult(internals.diagnoses.errCRNoLF);
              }
              break;
            case ' ':
            case '\t':
              break;
            default:
              if (prevToken === '\r') {
                updateResult(internals.diagnoses.errFWSCRLFEnd);
              }
              crlfCount = 0;
              context.prev = context.now;
              context.now = context.stack.pop();
              --i;
          }
          prevToken = token;
          break;
        default:
          throw new Error('unknown context: ' + context.now);
      }
      if (maxResult > internals.categories.rfc5322) {
        break;
      }
    }
    if (maxResult < internals.categories.rfc5322) {
      if (context.now === internals.components.contextQuotedString) {
        updateResult(internals.diagnoses.errUnclosedQuotedString);
      } else if (context.now === internals.components.contextQuotedPair) {
        updateResult(internals.diagnoses.errBackslashEnd);
      } else if (context.now === internals.components.contextComment) {
        updateResult(internals.diagnoses.errUnclosedComment);
      } else if (context.now === internals.components.literal) {
        updateResult(internals.diagnoses.errUnclosedDomainLiteral);
      } else if (token === '\r') {
        updateResult(internals.diagnoses.errFWSCRLFEnd);
      } else if (parseData.domain.length === 0) {
        updateResult(internals.diagnoses.errNoDomain);
      } else if (elementLength === 0) {
        updateResult(internals.diagnoses.errDotEnd);
      } else if (hyphenFlag) {
        updateResult(internals.diagnoses.errDomainHyphenEnd);
      } else if (parseData.domain.length > 255) {
        updateResult(internals.diagnoses.rfc5322DomainTooLong);
      } else if (parseData.local.length + parseData.domain.length + 1 > 254) {
        updateResult(internals.diagnoses.rfc5322TooLong);
      } else if (elementLength > 63) {
        updateResult(internals.diagnoses.rfc5322LabelTooLong);
      } else if (options.minDomainAtoms && atomData.domains.length < options.minDomainAtoms) {
        updateResult(internals.diagnoses.errDomainTooShort);
      } else if (options.tldWhitelist) {
        var tldAtom = atomData.domains[elementCount];
        if (Array.isArray(options.tldWhitelist)) {
          var tldValid = false;
          for (i = 0, il = options.tldWhitelist.length; i < il; ++i) {
            if (tldAtom === options.tldWhitelist[i]) {
              tldValid = true;
              break;
            }
          }
          if (!tldValid) {
            updateResult(internals.diagnoses.errUnknownTLD);
          }
        } else if (!hasOwn.call(options.tldWhitelist, tldAtom)) {
          updateResult(internals.diagnoses.errUnknownTLD);
        }
      }
    }
    var dnsPositive = false;
    var finishImmediately = false;
    var finish = function finish() {
      if (!dnsPositive && maxResult < internals.categories.dnsWarn) {
        var code = atomData.domains[elementCount].charCodeAt(0);
        if (code <= 57) {
          updateResult(internals.diagnoses.rfc5321TLDNumeric);
        } else if (elementCount === 0) {
          updateResult(internals.diagnoses.rfc5321TLD);
        }
      }
      if (maxResult < threshold) {
        maxResult = internals.diagnoses.valid;
      }
      var finishResult = diagnose ? maxResult : maxResult < internals.defaultThreshold;
      if (callback) {
        if (finishImmediately) {
          callback(finishResult);
        } else {
          internals.defer(callback.bind(null, finishResult));
        }
      }
      return finishResult;
    };
    if (options.checkDNS && maxResult < internals.categories.dnsWarn) {
      if (elementCount === 0) {
        parseData.domain += '.';
      }
      var dnsDomain = parseData.domain;
      Dns.resolveMx(dnsDomain, function resolveDNS(err, mxRecords) {
        if (err && err.code !== Dns.NODATA) {
          updateResult(internals.diagnoses.dnsWarnNoRecord);
          return finish();
        }
        if (mxRecords && mxRecords.length) {
          dnsPositive = true;
          return finish();
        }
        var count = 3;
        var done = false;
        updateResult(internals.diagnoses.dnsWarnNoMXRecord);
        var handleRecords = function handleRecords(err, records) {
          if (done) {
            return;
          }
          --count;
          if (records && records.length) {
            done = true;
            return finish();
          }
          if (count === 0) {
            updateResult(internals.diagnoses.dnsWarnNoRecord);
            done = true;
            finish();
          }
        };
        Dns.resolveCname(dnsDomain, handleRecords);
        Dns.resolve4(dnsDomain, handleRecords);
        Dns.resolve6(dnsDomain, handleRecords);
      });
      finishImmediately = true;
    } else {
      var result = finish();
      finishImmediately = true;
      return result;
    }
  };
  isEmail.diagnoses = (function exportDiagnoses() {
    var diag = {};
    for (var key in internals.diagnoses) {
      diag[key] = internals.diagnoses[key];
    }
    return diag;
  })();
  module.exports = isEmail;
})(require('process'));
