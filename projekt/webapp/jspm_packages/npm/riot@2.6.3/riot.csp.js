/* */ 
"format cjs";
(function(process) {
  (function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (factory((global.cspTmpl = global.cspTmpl || {})));
  }(this, (function(exports) {
    'use strict';
    function InfiniteChecker(maxIterations) {
      if (this instanceof InfiniteChecker) {
        this.maxIterations = maxIterations;
        this.count = 0;
      } else {
        return new InfiniteChecker(maxIterations);
      }
    }
    InfiniteChecker.prototype.check = function() {
      this.count += 1;
      if (this.count > this.maxIterations) {
        throw new Error('Infinite loop detected - reached max iterations');
      }
    };
    function getGlobal(str) {
      var ctx = (typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
      return typeof str !== 'undefined' ? ctx[str] : ctx;
    }
    var names = ['Object', 'String', 'Boolean', 'Number', 'RegExp', 'Date', 'Array'];
    var immutable = {
      string: 'String',
      boolean: 'Boolean',
      number: 'Number'
    };
    var primitives = names.map(getGlobal);
    var protos = primitives.map(getProto);
    function Primitives(context) {
      if (this instanceof Primitives) {
        this.context = context;
        for (var i = 0; i < names.length; i++) {
          if (!this.context[names[i]]) {
            this.context[names[i]] = wrap(primitives[i]);
          }
        }
      } else {
        return new Primitives(context);
      }
    }
    Primitives.prototype.replace = function(value) {
      var primIndex = primitives.indexOf(value),
          protoIndex = protos.indexOf(value),
          name;
      if (~primIndex) {
        name = names[primIndex];
        return this.context[name];
      } else if (~protoIndex) {
        name = names[protoIndex];
        return this.context[name].prototype;
      }
      return value;
    };
    Primitives.prototype.getPropertyObject = function(object, property) {
      if (immutable[typeof object]) {
        return this.getPrototypeOf(object);
      }
      return object;
    };
    Primitives.prototype.isPrimitive = function(value) {
      return !!~primitives.indexOf(value) || !!~protos.indexOf(value);
    };
    Primitives.prototype.getPrototypeOf = function(value) {
      if (value == null) {
        return value;
      }
      var immutableType = immutable[typeof value],
          proto;
      if (immutableType) {
        proto = this.context[immutableType].prototype;
      } else {
        proto = Object.getPrototypeOf(value);
      }
      if (!proto || proto === Object.prototype) {
        return null;
      }
      var replacement = this.replace(proto);
      if (replacement === value) {
        replacement = this.replace(Object.prototype);
      }
      return replacement;
    };
    Primitives.prototype.applyNew = function(func, args) {
      if (func.wrapped) {
        var prim = Object.getPrototypeOf(func);
        var instance = new (Function.prototype.bind.apply(prim, arguments));
        setProto(instance, func.prototype);
        return instance;
      }
      return new (Function.prototype.bind.apply(func, arguments));
    };
    function getProto(func) {
      return func.prototype;
    }
    function setProto(obj, proto) {
      obj.__proto__ = proto;
    }
    function wrap(prim) {
      var proto = Object.create(prim.prototype);
      var result = function() {
        if (this instanceof result) {
          prim.apply(this, arguments);
        } else {
          var instance = prim.apply(null, arguments);
          setProto(instance, proto);
          return instance;
        }
      };
      setProto(result, prim);
      result.prototype = proto;
      result.wrapped = true;
      return result;
    }
    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
    function interopDefault(ex) {
      return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
    }
    function createCommonjsModule(fn, module) {
      return module = {exports: {}}, fn(module, module.exports), module.exports;
    }
    var esprima = createCommonjsModule(function(module, exports) {
      (function(root, factory) {
        'use strict';
        if (typeof define === 'function' && define.amd) {
          define(['exports'], factory);
        } else if (typeof exports !== 'undefined') {
          factory(exports);
        } else {
          factory((root.esprima = {}));
        }
      }(commonjsGlobal, function(exports) {
        'use strict';
        var Token,
            TokenName,
            FnExprTokens,
            Syntax,
            PlaceHolders,
            Messages,
            Regex,
            source,
            strict,
            index,
            lineNumber,
            lineStart,
            hasLineTerminator,
            lastIndex,
            lastLineNumber,
            lastLineStart,
            startIndex,
            startLineNumber,
            startLineStart,
            scanning,
            length,
            lookahead,
            state,
            extra,
            isBindingElement,
            isAssignmentTarget,
            firstCoverInitializedNameError;
        Token = {
          BooleanLiteral: 1,
          EOF: 2,
          Identifier: 3,
          Keyword: 4,
          NullLiteral: 5,
          NumericLiteral: 6,
          Punctuator: 7,
          StringLiteral: 8,
          RegularExpression: 9,
          Template: 10
        };
        TokenName = {};
        TokenName[Token.BooleanLiteral] = 'Boolean';
        TokenName[Token.EOF] = '<end>';
        TokenName[Token.Identifier] = 'Identifier';
        TokenName[Token.Keyword] = 'Keyword';
        TokenName[Token.NullLiteral] = 'Null';
        TokenName[Token.NumericLiteral] = 'Numeric';
        TokenName[Token.Punctuator] = 'Punctuator';
        TokenName[Token.StringLiteral] = 'String';
        TokenName[Token.RegularExpression] = 'RegularExpression';
        TokenName[Token.Template] = 'Template';
        FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new', 'return', 'case', 'delete', 'throw', 'void', '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', ',', '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&', '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=', '<=', '<', '>', '!=', '!=='];
        Syntax = {
          AssignmentExpression: 'AssignmentExpression',
          AssignmentPattern: 'AssignmentPattern',
          ArrayExpression: 'ArrayExpression',
          ArrayPattern: 'ArrayPattern',
          ArrowFunctionExpression: 'ArrowFunctionExpression',
          BlockStatement: 'BlockStatement',
          BinaryExpression: 'BinaryExpression',
          BreakStatement: 'BreakStatement',
          CallExpression: 'CallExpression',
          CatchClause: 'CatchClause',
          ClassBody: 'ClassBody',
          ClassDeclaration: 'ClassDeclaration',
          ClassExpression: 'ClassExpression',
          ConditionalExpression: 'ConditionalExpression',
          ContinueStatement: 'ContinueStatement',
          DoWhileStatement: 'DoWhileStatement',
          DebuggerStatement: 'DebuggerStatement',
          EmptyStatement: 'EmptyStatement',
          ExportAllDeclaration: 'ExportAllDeclaration',
          ExportDefaultDeclaration: 'ExportDefaultDeclaration',
          ExportNamedDeclaration: 'ExportNamedDeclaration',
          ExportSpecifier: 'ExportSpecifier',
          ExpressionStatement: 'ExpressionStatement',
          ForStatement: 'ForStatement',
          ForOfStatement: 'ForOfStatement',
          ForInStatement: 'ForInStatement',
          FunctionDeclaration: 'FunctionDeclaration',
          FunctionExpression: 'FunctionExpression',
          Identifier: 'Identifier',
          IfStatement: 'IfStatement',
          ImportDeclaration: 'ImportDeclaration',
          ImportDefaultSpecifier: 'ImportDefaultSpecifier',
          ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
          ImportSpecifier: 'ImportSpecifier',
          Literal: 'Literal',
          LabeledStatement: 'LabeledStatement',
          LogicalExpression: 'LogicalExpression',
          MemberExpression: 'MemberExpression',
          MetaProperty: 'MetaProperty',
          MethodDefinition: 'MethodDefinition',
          NewExpression: 'NewExpression',
          ObjectExpression: 'ObjectExpression',
          ObjectPattern: 'ObjectPattern',
          Program: 'Program',
          Property: 'Property',
          RestElement: 'RestElement',
          ReturnStatement: 'ReturnStatement',
          SequenceExpression: 'SequenceExpression',
          SpreadElement: 'SpreadElement',
          Super: 'Super',
          SwitchCase: 'SwitchCase',
          SwitchStatement: 'SwitchStatement',
          TaggedTemplateExpression: 'TaggedTemplateExpression',
          TemplateElement: 'TemplateElement',
          TemplateLiteral: 'TemplateLiteral',
          ThisExpression: 'ThisExpression',
          ThrowStatement: 'ThrowStatement',
          TryStatement: 'TryStatement',
          UnaryExpression: 'UnaryExpression',
          UpdateExpression: 'UpdateExpression',
          VariableDeclaration: 'VariableDeclaration',
          VariableDeclarator: 'VariableDeclarator',
          WhileStatement: 'WhileStatement',
          WithStatement: 'WithStatement',
          YieldExpression: 'YieldExpression'
        };
        PlaceHolders = {ArrowParameterPlaceHolder: 'ArrowParameterPlaceHolder'};
        Messages = {
          UnexpectedToken: 'Unexpected token %0',
          UnexpectedNumber: 'Unexpected number',
          UnexpectedString: 'Unexpected string',
          UnexpectedIdentifier: 'Unexpected identifier',
          UnexpectedReserved: 'Unexpected reserved word',
          UnexpectedTemplate: 'Unexpected quasi %0',
          UnexpectedEOS: 'Unexpected end of input',
          NewlineAfterThrow: 'Illegal newline after throw',
          InvalidRegExp: 'Invalid regular expression',
          UnterminatedRegExp: 'Invalid regular expression: missing /',
          InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
          InvalidLHSInForIn: 'Invalid left-hand side in for-in',
          InvalidLHSInForLoop: 'Invalid left-hand side in for-loop',
          MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
          NoCatchOrFinally: 'Missing catch or finally after try',
          UnknownLabel: 'Undefined label \'%0\'',
          Redeclaration: '%0 \'%1\' has already been declared',
          IllegalContinue: 'Illegal continue statement',
          IllegalBreak: 'Illegal break statement',
          IllegalReturn: 'Illegal return statement',
          StrictModeWith: 'Strict mode code may not include a with statement',
          StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
          StrictVarName: 'Variable name may not be eval or arguments in strict mode',
          StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
          StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
          StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
          StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
          StrictDelete: 'Delete of an unqualified identifier in strict mode.',
          StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
          StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
          StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
          StrictReservedWord: 'Use of future reserved word in strict mode',
          TemplateOctalLiteral: 'Octal literals are not allowed in template strings.',
          ParameterAfterRestParameter: 'Rest parameter must be last formal parameter',
          DefaultRestParameter: 'Unexpected token =',
          ObjectPatternAsRestParameter: 'Unexpected token {',
          DuplicateProtoProperty: 'Duplicate __proto__ fields are not allowed in object literals',
          ConstructorSpecialMethod: 'Class constructor may not be an accessor',
          DuplicateConstructor: 'A class may only have one constructor',
          StaticPrototype: 'Classes may not have static property named prototype',
          MissingFromClause: 'Unexpected token',
          NoAsAfterImportNamespace: 'Unexpected token',
          InvalidModuleSpecifier: 'Unexpected token',
          IllegalImportDeclaration: 'Unexpected token',
          IllegalExportDeclaration: 'Unexpected token',
          DuplicateBinding: 'Duplicate binding %0'
        };
        Regex = {
          NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDE00-\uDE11\uDE13-\uDE2B\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDE00-\uDE2F\uDE44\uDE80-\uDEAA]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]/,
          NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDD0-\uDDDA\uDE00-\uDE11\uDE13-\uDE37\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF01-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
        };
        function assert(condition, message) {
          if (!condition) {
            throw new Error('ASSERT: ' + message);
          }
        }
        function isDecimalDigit(ch) {
          return (ch >= 0x30 && ch <= 0x39);
        }
        function isHexDigit(ch) {
          return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
        }
        function isOctalDigit(ch) {
          return '01234567'.indexOf(ch) >= 0;
        }
        function octalToDecimal(ch) {
          var octal = (ch !== '0'),
              code = '01234567'.indexOf(ch);
          if (index < length && isOctalDigit(source[index])) {
            octal = true;
            code = code * 8 + '01234567'.indexOf(source[index++]);
            if ('0123'.indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
              code = code * 8 + '01234567'.indexOf(source[index++]);
            }
          }
          return {
            code: code,
            octal: octal
          };
        }
        function isWhiteSpace(ch) {
          return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) || (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
        }
        function isLineTerminator(ch) {
          return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
        }
        function fromCodePoint(cp) {
          return (cp < 0x10000) ? String.fromCharCode(cp) : String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10)) + String.fromCharCode(0xDC00 + ((cp - 0x10000) & 1023));
        }
        function isIdentifierStart(ch) {
          return (ch === 0x24) || (ch === 0x5F) || (ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A) || (ch === 0x5C) || ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch)));
        }
        function isIdentifierPart(ch) {
          return (ch === 0x24) || (ch === 0x5F) || (ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A) || (ch >= 0x30 && ch <= 0x39) || (ch === 0x5C) || ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch)));
        }
        function isFutureReservedWord(id) {
          switch (id) {
            case 'enum':
            case 'export':
            case 'import':
            case 'super':
              return true;
            default:
              return false;
          }
        }
        function isStrictModeReservedWord(id) {
          switch (id) {
            case 'implements':
            case 'interface':
            case 'package':
            case 'private':
            case 'protected':
            case 'public':
            case 'static':
            case 'yield':
            case 'let':
              return true;
            default:
              return false;
          }
        }
        function isRestrictedWord(id) {
          return id === 'eval' || id === 'arguments';
        }
        function isKeyword(id) {
          switch (id.length) {
            case 2:
              return (id === 'if') || (id === 'in') || (id === 'do');
            case 3:
              return (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try') || (id === 'let');
            case 4:
              return (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with') || (id === 'enum');
            case 5:
              return (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw') || (id === 'const') || (id === 'yield') || (id === 'class') || (id === 'super');
            case 6:
              return (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch') || (id === 'export') || (id === 'import');
            case 7:
              return (id === 'default') || (id === 'finally') || (id === 'extends');
            case 8:
              return (id === 'function') || (id === 'continue') || (id === 'debugger');
            case 10:
              return (id === 'instanceof');
            default:
              return false;
          }
        }
        function addComment(type, value, start, end, loc) {
          var comment;
          assert(typeof start === 'number', 'Comment must have valid position');
          state.lastCommentStart = start;
          comment = {
            type: type,
            value: value
          };
          if (extra.range) {
            comment.range = [start, end];
          }
          if (extra.loc) {
            comment.loc = loc;
          }
          extra.comments.push(comment);
          if (extra.attachComment) {
            extra.leadingComments.push(comment);
            extra.trailingComments.push(comment);
          }
          if (extra.tokenize) {
            comment.type = comment.type + 'Comment';
            if (extra.delegate) {
              comment = extra.delegate(comment);
            }
            extra.tokens.push(comment);
          }
        }
        function skipSingleLineComment(offset) {
          var start,
              loc,
              ch,
              comment;
          start = index - offset;
          loc = {start: {
              line: lineNumber,
              column: index - lineStart - offset
            }};
          while (index < length) {
            ch = source.charCodeAt(index);
            ++index;
            if (isLineTerminator(ch)) {
              hasLineTerminator = true;
              if (extra.comments) {
                comment = source.slice(start + offset, index - 1);
                loc.end = {
                  line: lineNumber,
                  column: index - lineStart - 1
                };
                addComment('Line', comment, start, index - 1, loc);
              }
              if (ch === 13 && source.charCodeAt(index) === 10) {
                ++index;
              }
              ++lineNumber;
              lineStart = index;
              return;
            }
          }
          if (extra.comments) {
            comment = source.slice(start + offset, index);
            loc.end = {
              line: lineNumber,
              column: index - lineStart
            };
            addComment('Line', comment, start, index, loc);
          }
        }
        function skipMultiLineComment() {
          var start,
              loc,
              ch,
              comment;
          if (extra.comments) {
            start = index - 2;
            loc = {start: {
                line: lineNumber,
                column: index - lineStart - 2
              }};
          }
          while (index < length) {
            ch = source.charCodeAt(index);
            if (isLineTerminator(ch)) {
              if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
                ++index;
              }
              hasLineTerminator = true;
              ++lineNumber;
              ++index;
              lineStart = index;
            } else if (ch === 0x2A) {
              if (source.charCodeAt(index + 1) === 0x2F) {
                ++index;
                ++index;
                if (extra.comments) {
                  comment = source.slice(start + 2, index - 2);
                  loc.end = {
                    line: lineNumber,
                    column: index - lineStart
                  };
                  addComment('Block', comment, start, index, loc);
                }
                return;
              }
              ++index;
            } else {
              ++index;
            }
          }
          if (extra.comments) {
            loc.end = {
              line: lineNumber,
              column: index - lineStart
            };
            comment = source.slice(start + 2, index);
            addComment('Block', comment, start, index, loc);
          }
          tolerateUnexpectedToken();
        }
        function skipComment() {
          var ch,
              start;
          hasLineTerminator = false;
          start = (index === 0);
          while (index < length) {
            ch = source.charCodeAt(index);
            if (isWhiteSpace(ch)) {
              ++index;
            } else if (isLineTerminator(ch)) {
              hasLineTerminator = true;
              ++index;
              if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                ++index;
              }
              ++lineNumber;
              lineStart = index;
              start = true;
            } else if (ch === 0x2F) {
              ch = source.charCodeAt(index + 1);
              if (ch === 0x2F) {
                ++index;
                ++index;
                skipSingleLineComment(2);
                start = true;
              } else if (ch === 0x2A) {
                ++index;
                ++index;
                skipMultiLineComment();
              } else {
                break;
              }
            } else if (start && ch === 0x2D) {
              if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
                index += 3;
                skipSingleLineComment(3);
              } else {
                break;
              }
            } else if (ch === 0x3C) {
              if (source.slice(index + 1, index + 4) === '!--') {
                ++index;
                ++index;
                ++index;
                ++index;
                skipSingleLineComment(4);
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
        function scanHexEscape(prefix) {
          var i,
              len,
              ch,
              code = 0;
          len = (prefix === 'u') ? 4 : 2;
          for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
              ch = source[index++];
              code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
              return '';
            }
          }
          return String.fromCharCode(code);
        }
        function scanUnicodeCodePointEscape() {
          var ch,
              code;
          ch = source[index];
          code = 0;
          if (ch === '}') {
            throwUnexpectedToken();
          }
          while (index < length) {
            ch = source[index++];
            if (!isHexDigit(ch)) {
              break;
            }
            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
          }
          if (code > 0x10FFFF || ch !== '}') {
            throwUnexpectedToken();
          }
          return fromCodePoint(code);
        }
        function codePointAt(i) {
          var cp,
              first,
              second;
          cp = source.charCodeAt(i);
          if (cp >= 0xD800 && cp <= 0xDBFF) {
            second = source.charCodeAt(i + 1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
              first = cp;
              cp = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            }
          }
          return cp;
        }
        function getComplexIdentifier() {
          var cp,
              ch,
              id;
          cp = codePointAt(index);
          id = fromCodePoint(cp);
          index += id.length;
          if (cp === 0x5C) {
            if (source.charCodeAt(index) !== 0x75) {
              throwUnexpectedToken();
            }
            ++index;
            if (source[index] === '{') {
              ++index;
              ch = scanUnicodeCodePointEscape();
            } else {
              ch = scanHexEscape('u');
              cp = ch.charCodeAt(0);
              if (!ch || ch === '\\' || !isIdentifierStart(cp)) {
                throwUnexpectedToken();
              }
            }
            id = ch;
          }
          while (index < length) {
            cp = codePointAt(index);
            if (!isIdentifierPart(cp)) {
              break;
            }
            ch = fromCodePoint(cp);
            id += ch;
            index += ch.length;
            if (cp === 0x5C) {
              id = id.substr(0, id.length - 1);
              if (source.charCodeAt(index) !== 0x75) {
                throwUnexpectedToken();
              }
              ++index;
              if (source[index] === '{') {
                ++index;
                ch = scanUnicodeCodePointEscape();
              } else {
                ch = scanHexEscape('u');
                cp = ch.charCodeAt(0);
                if (!ch || ch === '\\' || !isIdentifierPart(cp)) {
                  throwUnexpectedToken();
                }
              }
              id += ch;
            }
          }
          return id;
        }
        function getIdentifier() {
          var start,
              ch;
          start = index++;
          while (index < length) {
            ch = source.charCodeAt(index);
            if (ch === 0x5C) {
              index = start;
              return getComplexIdentifier();
            } else if (ch >= 0xD800 && ch < 0xDFFF) {
              index = start;
              return getComplexIdentifier();
            }
            if (isIdentifierPart(ch)) {
              ++index;
            } else {
              break;
            }
          }
          return source.slice(start, index);
        }
        function scanIdentifier() {
          var start,
              id,
              type;
          start = index;
          id = (source.charCodeAt(index) === 0x5C) ? getComplexIdentifier() : getIdentifier();
          if (id.length === 1) {
            type = Token.Identifier;
          } else if (isKeyword(id)) {
            type = Token.Keyword;
          } else if (id === 'null') {
            type = Token.NullLiteral;
          } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
          } else {
            type = Token.Identifier;
          }
          return {
            type: type,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function scanPunctuator() {
          var token,
              str;
          token = {
            type: Token.Punctuator,
            value: '',
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: index,
            end: index
          };
          str = source[index];
          switch (str) {
            case '(':
              if (extra.tokenize) {
                extra.openParenToken = extra.tokenValues.length;
              }
              ++index;
              break;
            case '{':
              if (extra.tokenize) {
                extra.openCurlyToken = extra.tokenValues.length;
              }
              state.curlyStack.push('{');
              ++index;
              break;
            case '.':
              ++index;
              if (source[index] === '.' && source[index + 1] === '.') {
                index += 2;
                str = '...';
              }
              break;
            case '}':
              ++index;
              state.curlyStack.pop();
              break;
            case ')':
            case ';':
            case ',':
            case '[':
            case ']':
            case ':':
            case '?':
            case '~':
              ++index;
              break;
            default:
              str = source.substr(index, 4);
              if (str === '>>>=') {
                index += 4;
              } else {
                str = str.substr(0, 3);
                if (str === '===' || str === '!==' || str === '>>>' || str === '<<=' || str === '>>=') {
                  index += 3;
                } else {
                  str = str.substr(0, 2);
                  if (str === '&&' || str === '||' || str === '==' || str === '!=' || str === '+=' || str === '-=' || str === '*=' || str === '/=' || str === '++' || str === '--' || str === '<<' || str === '>>' || str === '&=' || str === '|=' || str === '^=' || str === '%=' || str === '<=' || str === '>=' || str === '=>') {
                    index += 2;
                  } else {
                    str = source[index];
                    if ('<>=!+-*%&|^/'.indexOf(str) >= 0) {
                      ++index;
                    }
                  }
                }
              }
          }
          if (index === token.start) {
            throwUnexpectedToken();
          }
          token.end = index;
          token.value = str;
          return token;
        }
        function scanHexLiteral(start) {
          var number = '';
          while (index < length) {
            if (!isHexDigit(source[index])) {
              break;
            }
            number += source[index++];
          }
          if (number.length === 0) {
            throwUnexpectedToken();
          }
          if (isIdentifierStart(source.charCodeAt(index))) {
            throwUnexpectedToken();
          }
          return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + number, 16),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function scanBinaryLiteral(start) {
          var ch,
              number;
          number = '';
          while (index < length) {
            ch = source[index];
            if (ch !== '0' && ch !== '1') {
              break;
            }
            number += source[index++];
          }
          if (number.length === 0) {
            throwUnexpectedToken();
          }
          if (index < length) {
            ch = source.charCodeAt(index);
            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
              throwUnexpectedToken();
            }
          }
          return {
            type: Token.NumericLiteral,
            value: parseInt(number, 2),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function scanOctalLiteral(prefix, start) {
          var number,
              octal;
          if (isOctalDigit(prefix)) {
            octal = true;
            number = '0' + source[index++];
          } else {
            octal = false;
            ++index;
            number = '';
          }
          while (index < length) {
            if (!isOctalDigit(source[index])) {
              break;
            }
            number += source[index++];
          }
          if (!octal && number.length === 0) {
            throwUnexpectedToken();
          }
          if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
            throwUnexpectedToken();
          }
          return {
            type: Token.NumericLiteral,
            value: parseInt(number, 8),
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function isImplicitOctalLiteral() {
          var i,
              ch;
          for (i = index + 1; i < length; ++i) {
            ch = source[i];
            if (ch === '8' || ch === '9') {
              return false;
            }
            if (!isOctalDigit(ch)) {
              return true;
            }
          }
          return true;
        }
        function scanNumericLiteral() {
          var number,
              start,
              ch;
          ch = source[index];
          assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'), 'Numeric literal must start with a decimal digit or a decimal point');
          start = index;
          number = '';
          if (ch !== '.') {
            number = source[index++];
            ch = source[index];
            if (number === '0') {
              if (ch === 'x' || ch === 'X') {
                ++index;
                return scanHexLiteral(start);
              }
              if (ch === 'b' || ch === 'B') {
                ++index;
                return scanBinaryLiteral(start);
              }
              if (ch === 'o' || ch === 'O') {
                return scanOctalLiteral(ch, start);
              }
              if (isOctalDigit(ch)) {
                if (isImplicitOctalLiteral()) {
                  return scanOctalLiteral(ch, start);
                }
              }
            }
            while (isDecimalDigit(source.charCodeAt(index))) {
              number += source[index++];
            }
            ch = source[index];
          }
          if (ch === '.') {
            number += source[index++];
            while (isDecimalDigit(source.charCodeAt(index))) {
              number += source[index++];
            }
            ch = source[index];
          }
          if (ch === 'e' || ch === 'E') {
            number += source[index++];
            ch = source[index];
            if (ch === '+' || ch === '-') {
              number += source[index++];
            }
            if (isDecimalDigit(source.charCodeAt(index))) {
              while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
              }
            } else {
              throwUnexpectedToken();
            }
          }
          if (isIdentifierStart(source.charCodeAt(index))) {
            throwUnexpectedToken();
          }
          return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function scanStringLiteral() {
          var str = '',
              quote,
              start,
              ch,
              unescaped,
              octToDec,
              octal = false;
          quote = source[index];
          assert((quote === '\'' || quote === '"'), 'String literal must starts with a quote');
          start = index;
          ++index;
          while (index < length) {
            ch = source[index++];
            if (ch === quote) {
              quote = '';
              break;
            } else if (ch === '\\') {
              ch = source[index++];
              if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                switch (ch) {
                  case 'u':
                  case 'x':
                    if (source[index] === '{') {
                      ++index;
                      str += scanUnicodeCodePointEscape();
                    } else {
                      unescaped = scanHexEscape(ch);
                      if (!unescaped) {
                        throw throwUnexpectedToken();
                      }
                      str += unescaped;
                    }
                    break;
                  case 'n':
                    str += '\n';
                    break;
                  case 'r':
                    str += '\r';
                    break;
                  case 't':
                    str += '\t';
                    break;
                  case 'b':
                    str += '\b';
                    break;
                  case 'f':
                    str += '\f';
                    break;
                  case 'v':
                    str += '\x0B';
                    break;
                  case '8':
                  case '9':
                    str += ch;
                    tolerateUnexpectedToken();
                    break;
                  default:
                    if (isOctalDigit(ch)) {
                      octToDec = octalToDecimal(ch);
                      octal = octToDec.octal || octal;
                      str += String.fromCharCode(octToDec.code);
                    } else {
                      str += ch;
                    }
                    break;
                }
              } else {
                ++lineNumber;
                if (ch === '\r' && source[index] === '\n') {
                  ++index;
                }
                lineStart = index;
              }
            } else if (isLineTerminator(ch.charCodeAt(0))) {
              break;
            } else {
              str += ch;
            }
          }
          if (quote !== '') {
            index = start;
            throwUnexpectedToken();
          }
          return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: startLineNumber,
            lineStart: startLineStart,
            start: start,
            end: index
          };
        }
        function scanTemplate() {
          var cooked = '',
              ch,
              start,
              rawOffset,
              terminated,
              head,
              tail,
              restore,
              unescaped;
          terminated = false;
          tail = false;
          start = index;
          head = (source[index] === '`');
          rawOffset = 2;
          ++index;
          while (index < length) {
            ch = source[index++];
            if (ch === '`') {
              rawOffset = 1;
              tail = true;
              terminated = true;
              break;
            } else if (ch === '$') {
              if (source[index] === '{') {
                state.curlyStack.push('${');
                ++index;
                terminated = true;
                break;
              }
              cooked += ch;
            } else if (ch === '\\') {
              ch = source[index++];
              if (!isLineTerminator(ch.charCodeAt(0))) {
                switch (ch) {
                  case 'n':
                    cooked += '\n';
                    break;
                  case 'r':
                    cooked += '\r';
                    break;
                  case 't':
                    cooked += '\t';
                    break;
                  case 'u':
                  case 'x':
                    if (source[index] === '{') {
                      ++index;
                      cooked += scanUnicodeCodePointEscape();
                    } else {
                      restore = index;
                      unescaped = scanHexEscape(ch);
                      if (unescaped) {
                        cooked += unescaped;
                      } else {
                        index = restore;
                        cooked += ch;
                      }
                    }
                    break;
                  case 'b':
                    cooked += '\b';
                    break;
                  case 'f':
                    cooked += '\f';
                    break;
                  case 'v':
                    cooked += '\v';
                    break;
                  default:
                    if (ch === '0') {
                      if (isDecimalDigit(source.charCodeAt(index))) {
                        throwError(Messages.TemplateOctalLiteral);
                      }
                      cooked += '\0';
                    } else if (isOctalDigit(ch)) {
                      throwError(Messages.TemplateOctalLiteral);
                    } else {
                      cooked += ch;
                    }
                    break;
                }
              } else {
                ++lineNumber;
                if (ch === '\r' && source[index] === '\n') {
                  ++index;
                }
                lineStart = index;
              }
            } else if (isLineTerminator(ch.charCodeAt(0))) {
              ++lineNumber;
              if (ch === '\r' && source[index] === '\n') {
                ++index;
              }
              lineStart = index;
              cooked += '\n';
            } else {
              cooked += ch;
            }
          }
          if (!terminated) {
            throwUnexpectedToken();
          }
          if (!head) {
            state.curlyStack.pop();
          }
          return {
            type: Token.Template,
            value: {
              cooked: cooked,
              raw: source.slice(start + 1, index - rawOffset)
            },
            head: head,
            tail: tail,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
          };
        }
        function testRegExp(pattern, flags) {
          var astralSubstitute = '\uFFFF',
              tmp = pattern;
          if (flags.indexOf('u') >= 0) {
            tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function($0, $1, $2) {
              var codePoint = parseInt($1 || $2, 16);
              if (codePoint > 0x10FFFF) {
                throwUnexpectedToken(null, Messages.InvalidRegExp);
              }
              if (codePoint <= 0xFFFF) {
                return String.fromCharCode(codePoint);
              }
              return astralSubstitute;
            }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
          }
          try {
            RegExp(tmp);
          } catch (e) {
            throwUnexpectedToken(null, Messages.InvalidRegExp);
          }
          try {
            return new RegExp(pattern, flags);
          } catch (exception) {
            return null;
          }
        }
        function scanRegExpBody() {
          var ch,
              str,
              classMarker,
              terminated,
              body;
          ch = source[index];
          assert(ch === '/', 'Regular expression literal must start with a slash');
          str = source[index++];
          classMarker = false;
          terminated = false;
          while (index < length) {
            ch = source[index++];
            str += ch;
            if (ch === '\\') {
              ch = source[index++];
              if (isLineTerminator(ch.charCodeAt(0))) {
                throwUnexpectedToken(null, Messages.UnterminatedRegExp);
              }
              str += ch;
            } else if (isLineTerminator(ch.charCodeAt(0))) {
              throwUnexpectedToken(null, Messages.UnterminatedRegExp);
            } else if (classMarker) {
              if (ch === ']') {
                classMarker = false;
              }
            } else {
              if (ch === '/') {
                terminated = true;
                break;
              } else if (ch === '[') {
                classMarker = true;
              }
            }
          }
          if (!terminated) {
            throwUnexpectedToken(null, Messages.UnterminatedRegExp);
          }
          body = str.substr(1, str.length - 2);
          return {
            value: body,
            literal: str
          };
        }
        function scanRegExpFlags() {
          var ch,
              str,
              flags,
              restore;
          str = '';
          flags = '';
          while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch.charCodeAt(0))) {
              break;
            }
            ++index;
            if (ch === '\\' && index < length) {
              ch = source[index];
              if (ch === 'u') {
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                  flags += ch;
                  for (str += '\\u'; restore < index; ++restore) {
                    str += source[restore];
                  }
                } else {
                  index = restore;
                  flags += 'u';
                  str += '\\u';
                }
                tolerateUnexpectedToken();
              } else {
                str += '\\';
                tolerateUnexpectedToken();
              }
            } else {
              flags += ch;
              str += ch;
            }
          }
          return {
            value: flags,
            literal: str
          };
        }
        function scanRegExp() {
          var start,
              body,
              flags,
              value;
          scanning = true;
          lookahead = null;
          skipComment();
          start = index;
          body = scanRegExpBody();
          flags = scanRegExpFlags();
          value = testRegExp(body.value, flags.value);
          scanning = false;
          if (extra.tokenize) {
            return {
              type: Token.RegularExpression,
              value: value,
              regex: {
                pattern: body.value,
                flags: flags.value
              },
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
            };
          }
          return {
            literal: body.literal + flags.literal,
            value: value,
            regex: {
              pattern: body.value,
              flags: flags.value
            },
            start: start,
            end: index
          };
        }
        function collectRegex() {
          var pos,
              loc,
              regex,
              token;
          skipComment();
          pos = index;
          loc = {start: {
              line: lineNumber,
              column: index - lineStart
            }};
          regex = scanRegExp();
          loc.end = {
            line: lineNumber,
            column: index - lineStart
          };
          if (!extra.tokenize) {
            if (extra.tokens.length > 0) {
              token = extra.tokens[extra.tokens.length - 1];
              if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                  extra.tokens.pop();
                }
              }
            }
            extra.tokens.push({
              type: 'RegularExpression',
              value: regex.literal,
              regex: regex.regex,
              range: [pos, index],
              loc: loc
            });
          }
          return regex;
        }
        function isIdentifierName(token) {
          return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
        }
        function advanceSlash() {
          var regex,
              previous,
              check;
          function testKeyword(value) {
            return value && (value.length > 1) && (value[0] >= 'a') && (value[0] <= 'z');
          }
          previous = extra.tokenValues[extra.tokens.length - 1];
          regex = (previous !== null);
          switch (previous) {
            case 'this':
            case ']':
              regex = false;
              break;
            case ')':
              check = extra.tokenValues[extra.openParenToken - 1];
              regex = (check === 'if' || check === 'while' || check === 'for' || check === 'with');
              break;
            case '}':
              regex = false;
              if (testKeyword(extra.tokenValues[extra.openCurlyToken - 3])) {
                check = extra.tokenValues[extra.openCurlyToken - 4];
                regex = check ? (FnExprTokens.indexOf(check) < 0) : false;
              } else if (testKeyword(extra.tokenValues[extra.openCurlyToken - 4])) {
                check = extra.tokenValues[extra.openCurlyToken - 5];
                regex = check ? (FnExprTokens.indexOf(check) < 0) : true;
              }
          }
          return regex ? collectRegex() : scanPunctuator();
        }
        function advance() {
          var cp,
              token;
          if (index >= length) {
            return {
              type: Token.EOF,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: index,
              end: index
            };
          }
          cp = source.charCodeAt(index);
          if (isIdentifierStart(cp)) {
            token = scanIdentifier();
            if (strict && isStrictModeReservedWord(token.value)) {
              token.type = Token.Keyword;
            }
            return token;
          }
          if (cp === 0x28 || cp === 0x29 || cp === 0x3B) {
            return scanPunctuator();
          }
          if (cp === 0x27 || cp === 0x22) {
            return scanStringLiteral();
          }
          if (cp === 0x2E) {
            if (isDecimalDigit(source.charCodeAt(index + 1))) {
              return scanNumericLiteral();
            }
            return scanPunctuator();
          }
          if (isDecimalDigit(cp)) {
            return scanNumericLiteral();
          }
          if (extra.tokenize && cp === 0x2F) {
            return advanceSlash();
          }
          if (cp === 0x60 || (cp === 0x7D && state.curlyStack[state.curlyStack.length - 1] === '${')) {
            return scanTemplate();
          }
          if (cp >= 0xD800 && cp < 0xDFFF) {
            cp = codePointAt(index);
            if (isIdentifierStart(cp)) {
              return scanIdentifier();
            }
          }
          return scanPunctuator();
        }
        function collectToken() {
          var loc,
              token,
              value,
              entry;
          loc = {start: {
              line: lineNumber,
              column: index - lineStart
            }};
          token = advance();
          loc.end = {
            line: lineNumber,
            column: index - lineStart
          };
          if (token.type !== Token.EOF) {
            value = source.slice(token.start, token.end);
            entry = {
              type: TokenName[token.type],
              value: value,
              range: [token.start, token.end],
              loc: loc
            };
            if (token.regex) {
              entry.regex = {
                pattern: token.regex.pattern,
                flags: token.regex.flags
              };
            }
            if (extra.tokenValues) {
              extra.tokenValues.push((entry.type === 'Punctuator' || entry.type === 'Keyword') ? entry.value : null);
            }
            if (extra.tokenize) {
              if (!extra.range) {
                delete entry.range;
              }
              if (!extra.loc) {
                delete entry.loc;
              }
              if (extra.delegate) {
                entry = extra.delegate(entry);
              }
            }
            extra.tokens.push(entry);
          }
          return token;
        }
        function lex() {
          var token;
          scanning = true;
          lastIndex = index;
          lastLineNumber = lineNumber;
          lastLineStart = lineStart;
          skipComment();
          token = lookahead;
          startIndex = index;
          startLineNumber = lineNumber;
          startLineStart = lineStart;
          lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
          scanning = false;
          return token;
        }
        function peek() {
          scanning = true;
          skipComment();
          lastIndex = index;
          lastLineNumber = lineNumber;
          lastLineStart = lineStart;
          startIndex = index;
          startLineNumber = lineNumber;
          startLineStart = lineStart;
          lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
          scanning = false;
        }
        function Position() {
          this.line = startLineNumber;
          this.column = startIndex - startLineStart;
        }
        function SourceLocation() {
          this.start = new Position();
          this.end = null;
        }
        function WrappingSourceLocation(startToken) {
          this.start = {
            line: startToken.lineNumber,
            column: startToken.start - startToken.lineStart
          };
          this.end = null;
        }
        function Node() {
          if (extra.range) {
            this.range = [startIndex, 0];
          }
          if (extra.loc) {
            this.loc = new SourceLocation();
          }
        }
        function WrappingNode(startToken) {
          if (extra.range) {
            this.range = [startToken.start, 0];
          }
          if (extra.loc) {
            this.loc = new WrappingSourceLocation(startToken);
          }
        }
        WrappingNode.prototype = Node.prototype = {
          processComment: function() {
            var lastChild,
                innerComments,
                leadingComments,
                trailingComments,
                bottomRight = extra.bottomRightStack,
                i,
                comment,
                last = bottomRight[bottomRight.length - 1];
            if (this.type === Syntax.Program) {
              if (this.body.length > 0) {
                return;
              }
            }
            if (this.type === Syntax.BlockStatement && this.body.length === 0) {
              innerComments = [];
              for (i = extra.leadingComments.length - 1; i >= 0; --i) {
                comment = extra.leadingComments[i];
                if (this.range[1] >= comment.range[1]) {
                  innerComments.unshift(comment);
                  extra.leadingComments.splice(i, 1);
                  extra.trailingComments.splice(i, 1);
                }
              }
              if (innerComments.length) {
                this.innerComments = innerComments;
                return;
              }
            }
            if (extra.trailingComments.length > 0) {
              trailingComments = [];
              for (i = extra.trailingComments.length - 1; i >= 0; --i) {
                comment = extra.trailingComments[i];
                if (comment.range[0] >= this.range[1]) {
                  trailingComments.unshift(comment);
                  extra.trailingComments.splice(i, 1);
                }
              }
              extra.trailingComments = [];
            } else {
              if (last && last.trailingComments && last.trailingComments[0].range[0] >= this.range[1]) {
                trailingComments = last.trailingComments;
                delete last.trailingComments;
              }
            }
            while (last && last.range[0] >= this.range[0]) {
              lastChild = bottomRight.pop();
              last = bottomRight[bottomRight.length - 1];
            }
            if (lastChild) {
              if (lastChild.leadingComments) {
                leadingComments = [];
                for (i = lastChild.leadingComments.length - 1; i >= 0; --i) {
                  comment = lastChild.leadingComments[i];
                  if (comment.range[1] <= this.range[0]) {
                    leadingComments.unshift(comment);
                    lastChild.leadingComments.splice(i, 1);
                  }
                }
                if (!lastChild.leadingComments.length) {
                  lastChild.leadingComments = undefined;
                }
              }
            } else if (extra.leadingComments.length > 0) {
              leadingComments = [];
              for (i = extra.leadingComments.length - 1; i >= 0; --i) {
                comment = extra.leadingComments[i];
                if (comment.range[1] <= this.range[0]) {
                  leadingComments.unshift(comment);
                  extra.leadingComments.splice(i, 1);
                }
              }
            }
            if (leadingComments && leadingComments.length > 0) {
              this.leadingComments = leadingComments;
            }
            if (trailingComments && trailingComments.length > 0) {
              this.trailingComments = trailingComments;
            }
            bottomRight.push(this);
          },
          finish: function() {
            if (extra.range) {
              this.range[1] = lastIndex;
            }
            if (extra.loc) {
              this.loc.end = {
                line: lastLineNumber,
                column: lastIndex - lastLineStart
              };
              if (extra.source) {
                this.loc.source = extra.source;
              }
            }
            if (extra.attachComment) {
              this.processComment();
            }
          },
          finishArrayExpression: function(elements) {
            this.type = Syntax.ArrayExpression;
            this.elements = elements;
            this.finish();
            return this;
          },
          finishArrayPattern: function(elements) {
            this.type = Syntax.ArrayPattern;
            this.elements = elements;
            this.finish();
            return this;
          },
          finishArrowFunctionExpression: function(params, defaults, body, expression) {
            this.type = Syntax.ArrowFunctionExpression;
            this.id = null;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.generator = false;
            this.expression = expression;
            this.finish();
            return this;
          },
          finishAssignmentExpression: function(operator, left, right) {
            this.type = Syntax.AssignmentExpression;
            this.operator = operator;
            this.left = left;
            this.right = right;
            this.finish();
            return this;
          },
          finishAssignmentPattern: function(left, right) {
            this.type = Syntax.AssignmentPattern;
            this.left = left;
            this.right = right;
            this.finish();
            return this;
          },
          finishBinaryExpression: function(operator, left, right) {
            this.type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression : Syntax.BinaryExpression;
            this.operator = operator;
            this.left = left;
            this.right = right;
            this.finish();
            return this;
          },
          finishBlockStatement: function(body) {
            this.type = Syntax.BlockStatement;
            this.body = body;
            this.finish();
            return this;
          },
          finishBreakStatement: function(label) {
            this.type = Syntax.BreakStatement;
            this.label = label;
            this.finish();
            return this;
          },
          finishCallExpression: function(callee, args) {
            this.type = Syntax.CallExpression;
            this.callee = callee;
            this.arguments = args;
            this.finish();
            return this;
          },
          finishCatchClause: function(param, body) {
            this.type = Syntax.CatchClause;
            this.param = param;
            this.body = body;
            this.finish();
            return this;
          },
          finishClassBody: function(body) {
            this.type = Syntax.ClassBody;
            this.body = body;
            this.finish();
            return this;
          },
          finishClassDeclaration: function(id, superClass, body) {
            this.type = Syntax.ClassDeclaration;
            this.id = id;
            this.superClass = superClass;
            this.body = body;
            this.finish();
            return this;
          },
          finishClassExpression: function(id, superClass, body) {
            this.type = Syntax.ClassExpression;
            this.id = id;
            this.superClass = superClass;
            this.body = body;
            this.finish();
            return this;
          },
          finishConditionalExpression: function(test, consequent, alternate) {
            this.type = Syntax.ConditionalExpression;
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
            this.finish();
            return this;
          },
          finishContinueStatement: function(label) {
            this.type = Syntax.ContinueStatement;
            this.label = label;
            this.finish();
            return this;
          },
          finishDebuggerStatement: function() {
            this.type = Syntax.DebuggerStatement;
            this.finish();
            return this;
          },
          finishDoWhileStatement: function(body, test) {
            this.type = Syntax.DoWhileStatement;
            this.body = body;
            this.test = test;
            this.finish();
            return this;
          },
          finishEmptyStatement: function() {
            this.type = Syntax.EmptyStatement;
            this.finish();
            return this;
          },
          finishExpressionStatement: function(expression) {
            this.type = Syntax.ExpressionStatement;
            this.expression = expression;
            this.finish();
            return this;
          },
          finishForStatement: function(init, test, update, body) {
            this.type = Syntax.ForStatement;
            this.init = init;
            this.test = test;
            this.update = update;
            this.body = body;
            this.finish();
            return this;
          },
          finishForOfStatement: function(left, right, body) {
            this.type = Syntax.ForOfStatement;
            this.left = left;
            this.right = right;
            this.body = body;
            this.finish();
            return this;
          },
          finishForInStatement: function(left, right, body) {
            this.type = Syntax.ForInStatement;
            this.left = left;
            this.right = right;
            this.body = body;
            this.each = false;
            this.finish();
            return this;
          },
          finishFunctionDeclaration: function(id, params, defaults, body, generator) {
            this.type = Syntax.FunctionDeclaration;
            this.id = id;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.generator = generator;
            this.expression = false;
            this.finish();
            return this;
          },
          finishFunctionExpression: function(id, params, defaults, body, generator) {
            this.type = Syntax.FunctionExpression;
            this.id = id;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.generator = generator;
            this.expression = false;
            this.finish();
            return this;
          },
          finishIdentifier: function(name) {
            this.type = Syntax.Identifier;
            this.name = name;
            this.finish();
            return this;
          },
          finishIfStatement: function(test, consequent, alternate) {
            this.type = Syntax.IfStatement;
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
            this.finish();
            return this;
          },
          finishLabeledStatement: function(label, body) {
            this.type = Syntax.LabeledStatement;
            this.label = label;
            this.body = body;
            this.finish();
            return this;
          },
          finishLiteral: function(token) {
            this.type = Syntax.Literal;
            this.value = token.value;
            this.raw = source.slice(token.start, token.end);
            if (token.regex) {
              this.regex = token.regex;
            }
            this.finish();
            return this;
          },
          finishMemberExpression: function(accessor, object, property) {
            this.type = Syntax.MemberExpression;
            this.computed = accessor === '[';
            this.object = object;
            this.property = property;
            this.finish();
            return this;
          },
          finishMetaProperty: function(meta, property) {
            this.type = Syntax.MetaProperty;
            this.meta = meta;
            this.property = property;
            this.finish();
            return this;
          },
          finishNewExpression: function(callee, args) {
            this.type = Syntax.NewExpression;
            this.callee = callee;
            this.arguments = args;
            this.finish();
            return this;
          },
          finishObjectExpression: function(properties) {
            this.type = Syntax.ObjectExpression;
            this.properties = properties;
            this.finish();
            return this;
          },
          finishObjectPattern: function(properties) {
            this.type = Syntax.ObjectPattern;
            this.properties = properties;
            this.finish();
            return this;
          },
          finishPostfixExpression: function(operator, argument) {
            this.type = Syntax.UpdateExpression;
            this.operator = operator;
            this.argument = argument;
            this.prefix = false;
            this.finish();
            return this;
          },
          finishProgram: function(body, sourceType) {
            this.type = Syntax.Program;
            this.body = body;
            this.sourceType = sourceType;
            this.finish();
            return this;
          },
          finishProperty: function(kind, key, computed, value, method, shorthand) {
            this.type = Syntax.Property;
            this.key = key;
            this.computed = computed;
            this.value = value;
            this.kind = kind;
            this.method = method;
            this.shorthand = shorthand;
            this.finish();
            return this;
          },
          finishRestElement: function(argument) {
            this.type = Syntax.RestElement;
            this.argument = argument;
            this.finish();
            return this;
          },
          finishReturnStatement: function(argument) {
            this.type = Syntax.ReturnStatement;
            this.argument = argument;
            this.finish();
            return this;
          },
          finishSequenceExpression: function(expressions) {
            this.type = Syntax.SequenceExpression;
            this.expressions = expressions;
            this.finish();
            return this;
          },
          finishSpreadElement: function(argument) {
            this.type = Syntax.SpreadElement;
            this.argument = argument;
            this.finish();
            return this;
          },
          finishSwitchCase: function(test, consequent) {
            this.type = Syntax.SwitchCase;
            this.test = test;
            this.consequent = consequent;
            this.finish();
            return this;
          },
          finishSuper: function() {
            this.type = Syntax.Super;
            this.finish();
            return this;
          },
          finishSwitchStatement: function(discriminant, cases) {
            this.type = Syntax.SwitchStatement;
            this.discriminant = discriminant;
            this.cases = cases;
            this.finish();
            return this;
          },
          finishTaggedTemplateExpression: function(tag, quasi) {
            this.type = Syntax.TaggedTemplateExpression;
            this.tag = tag;
            this.quasi = quasi;
            this.finish();
            return this;
          },
          finishTemplateElement: function(value, tail) {
            this.type = Syntax.TemplateElement;
            this.value = value;
            this.tail = tail;
            this.finish();
            return this;
          },
          finishTemplateLiteral: function(quasis, expressions) {
            this.type = Syntax.TemplateLiteral;
            this.quasis = quasis;
            this.expressions = expressions;
            this.finish();
            return this;
          },
          finishThisExpression: function() {
            this.type = Syntax.ThisExpression;
            this.finish();
            return this;
          },
          finishThrowStatement: function(argument) {
            this.type = Syntax.ThrowStatement;
            this.argument = argument;
            this.finish();
            return this;
          },
          finishTryStatement: function(block, handler, finalizer) {
            this.type = Syntax.TryStatement;
            this.block = block;
            this.guardedHandlers = [];
            this.handlers = handler ? [handler] : [];
            this.handler = handler;
            this.finalizer = finalizer;
            this.finish();
            return this;
          },
          finishUnaryExpression: function(operator, argument) {
            this.type = (operator === '++' || operator === '--') ? Syntax.UpdateExpression : Syntax.UnaryExpression;
            this.operator = operator;
            this.argument = argument;
            this.prefix = true;
            this.finish();
            return this;
          },
          finishVariableDeclaration: function(declarations) {
            this.type = Syntax.VariableDeclaration;
            this.declarations = declarations;
            this.kind = 'var';
            this.finish();
            return this;
          },
          finishLexicalDeclaration: function(declarations, kind) {
            this.type = Syntax.VariableDeclaration;
            this.declarations = declarations;
            this.kind = kind;
            this.finish();
            return this;
          },
          finishVariableDeclarator: function(id, init) {
            this.type = Syntax.VariableDeclarator;
            this.id = id;
            this.init = init;
            this.finish();
            return this;
          },
          finishWhileStatement: function(test, body) {
            this.type = Syntax.WhileStatement;
            this.test = test;
            this.body = body;
            this.finish();
            return this;
          },
          finishWithStatement: function(object, body) {
            this.type = Syntax.WithStatement;
            this.object = object;
            this.body = body;
            this.finish();
            return this;
          },
          finishExportSpecifier: function(local, exported) {
            this.type = Syntax.ExportSpecifier;
            this.exported = exported || local;
            this.local = local;
            this.finish();
            return this;
          },
          finishImportDefaultSpecifier: function(local) {
            this.type = Syntax.ImportDefaultSpecifier;
            this.local = local;
            this.finish();
            return this;
          },
          finishImportNamespaceSpecifier: function(local) {
            this.type = Syntax.ImportNamespaceSpecifier;
            this.local = local;
            this.finish();
            return this;
          },
          finishExportNamedDeclaration: function(declaration, specifiers, src) {
            this.type = Syntax.ExportNamedDeclaration;
            this.declaration = declaration;
            this.specifiers = specifiers;
            this.source = src;
            this.finish();
            return this;
          },
          finishExportDefaultDeclaration: function(declaration) {
            this.type = Syntax.ExportDefaultDeclaration;
            this.declaration = declaration;
            this.finish();
            return this;
          },
          finishExportAllDeclaration: function(src) {
            this.type = Syntax.ExportAllDeclaration;
            this.source = src;
            this.finish();
            return this;
          },
          finishImportSpecifier: function(local, imported) {
            this.type = Syntax.ImportSpecifier;
            this.local = local || imported;
            this.imported = imported;
            this.finish();
            return this;
          },
          finishImportDeclaration: function(specifiers, src) {
            this.type = Syntax.ImportDeclaration;
            this.specifiers = specifiers;
            this.source = src;
            this.finish();
            return this;
          },
          finishYieldExpression: function(argument, delegate) {
            this.type = Syntax.YieldExpression;
            this.argument = argument;
            this.delegate = delegate;
            this.finish();
            return this;
          }
        };
        function recordError(error) {
          var e,
              existing;
          for (e = 0; e < extra.errors.length; e++) {
            existing = extra.errors[e];
            if (existing.index === error.index && existing.message === error.message) {
              return;
            }
          }
          extra.errors.push(error);
        }
        function constructError(msg, column) {
          var error = new Error(msg);
          try {
            throw error;
          } catch (base) {
            if (Object.create && Object.defineProperty) {
              error = Object.create(base);
              Object.defineProperty(error, 'column', {value: column});
            }
          } finally {
            return error;
          }
        }
        function createError(line, pos, description) {
          var msg,
              column,
              error;
          msg = 'Line ' + line + ': ' + description;
          column = pos - (scanning ? lineStart : lastLineStart) + 1;
          error = constructError(msg, column);
          error.lineNumber = line;
          error.description = description;
          error.index = pos;
          return error;
        }
        function throwError(messageFormat) {
          var args,
              msg;
          args = Array.prototype.slice.call(arguments, 1);
          msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
            assert(idx < args.length, 'Message reference must be in range');
            return args[idx];
          });
          throw createError(lastLineNumber, lastIndex, msg);
        }
        function tolerateError(messageFormat) {
          var args,
              msg,
              error;
          args = Array.prototype.slice.call(arguments, 1);
          msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
            assert(idx < args.length, 'Message reference must be in range');
            return args[idx];
          });
          error = createError(lineNumber, lastIndex, msg);
          if (extra.errors) {
            recordError(error);
          } else {
            throw error;
          }
        }
        function unexpectedTokenError(token, message) {
          var value,
              msg = message || Messages.UnexpectedToken;
          if (token) {
            if (!message) {
              msg = (token.type === Token.EOF) ? Messages.UnexpectedEOS : (token.type === Token.Identifier) ? Messages.UnexpectedIdentifier : (token.type === Token.NumericLiteral) ? Messages.UnexpectedNumber : (token.type === Token.StringLiteral) ? Messages.UnexpectedString : (token.type === Token.Template) ? Messages.UnexpectedTemplate : Messages.UnexpectedToken;
              if (token.type === Token.Keyword) {
                if (isFutureReservedWord(token.value)) {
                  msg = Messages.UnexpectedReserved;
                } else if (strict && isStrictModeReservedWord(token.value)) {
                  msg = Messages.StrictReservedWord;
                }
              }
            }
            value = (token.type === Token.Template) ? token.value.raw : token.value;
          } else {
            value = 'ILLEGAL';
          }
          msg = msg.replace('%0', value);
          return (token && typeof token.lineNumber === 'number') ? createError(token.lineNumber, token.start, msg) : createError(scanning ? lineNumber : lastLineNumber, scanning ? index : lastIndex, msg);
        }
        function throwUnexpectedToken(token, message) {
          throw unexpectedTokenError(token, message);
        }
        function tolerateUnexpectedToken(token, message) {
          var error = unexpectedTokenError(token, message);
          if (extra.errors) {
            recordError(error);
          } else {
            throw error;
          }
        }
        function expect(value) {
          var token = lex();
          if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpectedToken(token);
          }
        }
        function expectCommaSeparator() {
          var token;
          if (extra.errors) {
            token = lookahead;
            if (token.type === Token.Punctuator && token.value === ',') {
              lex();
            } else if (token.type === Token.Punctuator && token.value === ';') {
              lex();
              tolerateUnexpectedToken(token);
            } else {
              tolerateUnexpectedToken(token, Messages.UnexpectedToken);
            }
          } else {
            expect(',');
          }
        }
        function expectKeyword(keyword) {
          var token = lex();
          if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpectedToken(token);
          }
        }
        function match(value) {
          return lookahead.type === Token.Punctuator && lookahead.value === value;
        }
        function matchKeyword(keyword) {
          return lookahead.type === Token.Keyword && lookahead.value === keyword;
        }
        function matchContextualKeyword(keyword) {
          return lookahead.type === Token.Identifier && lookahead.value === keyword;
        }
        function matchAssign() {
          var op;
          if (lookahead.type !== Token.Punctuator) {
            return false;
          }
          op = lookahead.value;
          return op === '=' || op === '*=' || op === '/=' || op === '%=' || op === '+=' || op === '-=' || op === '<<=' || op === '>>=' || op === '>>>=' || op === '&=' || op === '^=' || op === '|=';
        }
        function consumeSemicolon() {
          if (source.charCodeAt(startIndex) === 0x3B || match(';')) {
            lex();
            return;
          }
          if (hasLineTerminator) {
            return;
          }
          lastIndex = startIndex;
          lastLineNumber = startLineNumber;
          lastLineStart = startLineStart;
          if (lookahead.type !== Token.EOF && !match('}')) {
            throwUnexpectedToken(lookahead);
          }
        }
        function isolateCoverGrammar(parser) {
          var oldIsBindingElement = isBindingElement,
              oldIsAssignmentTarget = isAssignmentTarget,
              oldFirstCoverInitializedNameError = firstCoverInitializedNameError,
              result;
          isBindingElement = true;
          isAssignmentTarget = true;
          firstCoverInitializedNameError = null;
          result = parser();
          if (firstCoverInitializedNameError !== null) {
            throwUnexpectedToken(firstCoverInitializedNameError);
          }
          isBindingElement = oldIsBindingElement;
          isAssignmentTarget = oldIsAssignmentTarget;
          firstCoverInitializedNameError = oldFirstCoverInitializedNameError;
          return result;
        }
        function inheritCoverGrammar(parser) {
          var oldIsBindingElement = isBindingElement,
              oldIsAssignmentTarget = isAssignmentTarget,
              oldFirstCoverInitializedNameError = firstCoverInitializedNameError,
              result;
          isBindingElement = true;
          isAssignmentTarget = true;
          firstCoverInitializedNameError = null;
          result = parser();
          isBindingElement = isBindingElement && oldIsBindingElement;
          isAssignmentTarget = isAssignmentTarget && oldIsAssignmentTarget;
          firstCoverInitializedNameError = oldFirstCoverInitializedNameError || firstCoverInitializedNameError;
          return result;
        }
        function parseArrayPattern(params, kind) {
          var node = new Node(),
              elements = [],
              rest,
              restNode;
          expect('[');
          while (!match(']')) {
            if (match(',')) {
              lex();
              elements.push(null);
            } else {
              if (match('...')) {
                restNode = new Node();
                lex();
                params.push(lookahead);
                rest = parseVariableIdentifier(kind);
                elements.push(restNode.finishRestElement(rest));
                break;
              } else {
                elements.push(parsePatternWithDefault(params, kind));
              }
              if (!match(']')) {
                expect(',');
              }
            }
          }
          expect(']');
          return node.finishArrayPattern(elements);
        }
        function parsePropertyPattern(params, kind) {
          var node = new Node(),
              key,
              keyToken,
              computed = match('['),
              init;
          if (lookahead.type === Token.Identifier) {
            keyToken = lookahead;
            key = parseVariableIdentifier();
            if (match('=')) {
              params.push(keyToken);
              lex();
              init = parseAssignmentExpression();
              return node.finishProperty('init', key, false, new WrappingNode(keyToken).finishAssignmentPattern(key, init), false, true);
            } else if (!match(':')) {
              params.push(keyToken);
              return node.finishProperty('init', key, false, key, false, true);
            }
          } else {
            key = parseObjectPropertyKey();
          }
          expect(':');
          init = parsePatternWithDefault(params, kind);
          return node.finishProperty('init', key, computed, init, false, false);
        }
        function parseObjectPattern(params, kind) {
          var node = new Node(),
              properties = [];
          expect('{');
          while (!match('}')) {
            properties.push(parsePropertyPattern(params, kind));
            if (!match('}')) {
              expect(',');
            }
          }
          lex();
          return node.finishObjectPattern(properties);
        }
        function parsePattern(params, kind) {
          if (match('[')) {
            return parseArrayPattern(params, kind);
          } else if (match('{')) {
            return parseObjectPattern(params, kind);
          } else if (matchKeyword('let')) {
            if (kind === 'const' || kind === 'let') {
              tolerateUnexpectedToken(lookahead, Messages.UnexpectedToken);
            }
          }
          params.push(lookahead);
          return parseVariableIdentifier(kind);
        }
        function parsePatternWithDefault(params, kind) {
          var startToken = lookahead,
              pattern,
              previousAllowYield,
              right;
          pattern = parsePattern(params, kind);
          if (match('=')) {
            lex();
            previousAllowYield = state.allowYield;
            state.allowYield = true;
            right = isolateCoverGrammar(parseAssignmentExpression);
            state.allowYield = previousAllowYield;
            pattern = new WrappingNode(startToken).finishAssignmentPattern(pattern, right);
          }
          return pattern;
        }
        function parseArrayInitializer() {
          var elements = [],
              node = new Node(),
              restSpread;
          expect('[');
          while (!match(']')) {
            if (match(',')) {
              lex();
              elements.push(null);
            } else if (match('...')) {
              restSpread = new Node();
              lex();
              restSpread.finishSpreadElement(inheritCoverGrammar(parseAssignmentExpression));
              if (!match(']')) {
                isAssignmentTarget = isBindingElement = false;
                expect(',');
              }
              elements.push(restSpread);
            } else {
              elements.push(inheritCoverGrammar(parseAssignmentExpression));
              if (!match(']')) {
                expect(',');
              }
            }
          }
          lex();
          return node.finishArrayExpression(elements);
        }
        function parsePropertyFunction(node, paramInfo, isGenerator) {
          var previousStrict,
              body;
          isAssignmentTarget = isBindingElement = false;
          previousStrict = strict;
          body = isolateCoverGrammar(parseFunctionSourceElements);
          if (strict && paramInfo.firstRestricted) {
            tolerateUnexpectedToken(paramInfo.firstRestricted, paramInfo.message);
          }
          if (strict && paramInfo.stricted) {
            tolerateUnexpectedToken(paramInfo.stricted, paramInfo.message);
          }
          strict = previousStrict;
          return node.finishFunctionExpression(null, paramInfo.params, paramInfo.defaults, body, isGenerator);
        }
        function parsePropertyMethodFunction() {
          var params,
              method,
              node = new Node(),
              previousAllowYield = state.allowYield;
          state.allowYield = false;
          params = parseParams();
          state.allowYield = previousAllowYield;
          state.allowYield = false;
          method = parsePropertyFunction(node, params, false);
          state.allowYield = previousAllowYield;
          return method;
        }
        function parseObjectPropertyKey() {
          var token,
              node = new Node(),
              expr;
          token = lex();
          switch (token.type) {
            case Token.StringLiteral:
            case Token.NumericLiteral:
              if (strict && token.octal) {
                tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
              }
              return node.finishLiteral(token);
            case Token.Identifier:
            case Token.BooleanLiteral:
            case Token.NullLiteral:
            case Token.Keyword:
              return node.finishIdentifier(token.value);
            case Token.Punctuator:
              if (token.value === '[') {
                expr = isolateCoverGrammar(parseAssignmentExpression);
                expect(']');
                return expr;
              }
              break;
          }
          throwUnexpectedToken(token);
        }
        function lookaheadPropertyName() {
          switch (lookahead.type) {
            case Token.Identifier:
            case Token.StringLiteral:
            case Token.BooleanLiteral:
            case Token.NullLiteral:
            case Token.NumericLiteral:
            case Token.Keyword:
              return true;
            case Token.Punctuator:
              return lookahead.value === '[';
          }
          return false;
        }
        function tryParseMethodDefinition(token, key, computed, node) {
          var value,
              options,
              methodNode,
              params,
              previousAllowYield = state.allowYield;
          if (token.type === Token.Identifier) {
            if (token.value === 'get' && lookaheadPropertyName()) {
              computed = match('[');
              key = parseObjectPropertyKey();
              methodNode = new Node();
              expect('(');
              expect(')');
              state.allowYield = false;
              value = parsePropertyFunction(methodNode, {
                params: [],
                defaults: [],
                stricted: null,
                firstRestricted: null,
                message: null
              }, false);
              state.allowYield = previousAllowYield;
              return node.finishProperty('get', key, computed, value, false, false);
            } else if (token.value === 'set' && lookaheadPropertyName()) {
              computed = match('[');
              key = parseObjectPropertyKey();
              methodNode = new Node();
              expect('(');
              options = {
                params: [],
                defaultCount: 0,
                defaults: [],
                firstRestricted: null,
                paramSet: {}
              };
              if (match(')')) {
                tolerateUnexpectedToken(lookahead);
              } else {
                state.allowYield = false;
                parseParam(options);
                state.allowYield = previousAllowYield;
                if (options.defaultCount === 0) {
                  options.defaults = [];
                }
              }
              expect(')');
              state.allowYield = false;
              value = parsePropertyFunction(methodNode, options, false);
              state.allowYield = previousAllowYield;
              return node.finishProperty('set', key, computed, value, false, false);
            }
          } else if (token.type === Token.Punctuator && token.value === '*' && lookaheadPropertyName()) {
            computed = match('[');
            key = parseObjectPropertyKey();
            methodNode = new Node();
            state.allowYield = true;
            params = parseParams();
            state.allowYield = previousAllowYield;
            state.allowYield = false;
            value = parsePropertyFunction(methodNode, params, true);
            state.allowYield = previousAllowYield;
            return node.finishProperty('init', key, computed, value, true, false);
          }
          if (key && match('(')) {
            value = parsePropertyMethodFunction();
            return node.finishProperty('init', key, computed, value, true, false);
          }
          return null;
        }
        function parseObjectProperty(hasProto) {
          var token = lookahead,
              node = new Node(),
              computed,
              key,
              maybeMethod,
              proto,
              value;
          computed = match('[');
          if (match('*')) {
            lex();
          } else {
            key = parseObjectPropertyKey();
          }
          maybeMethod = tryParseMethodDefinition(token, key, computed, node);
          if (maybeMethod) {
            return maybeMethod;
          }
          if (!key) {
            throwUnexpectedToken(lookahead);
          }
          if (!computed) {
            proto = (key.type === Syntax.Identifier && key.name === '__proto__') || (key.type === Syntax.Literal && key.value === '__proto__');
            if (hasProto.value && proto) {
              tolerateError(Messages.DuplicateProtoProperty);
            }
            hasProto.value |= proto;
          }
          if (match(':')) {
            lex();
            value = inheritCoverGrammar(parseAssignmentExpression);
            return node.finishProperty('init', key, computed, value, false, false);
          }
          if (token.type === Token.Identifier) {
            if (match('=')) {
              firstCoverInitializedNameError = lookahead;
              lex();
              value = isolateCoverGrammar(parseAssignmentExpression);
              return node.finishProperty('init', key, computed, new WrappingNode(token).finishAssignmentPattern(key, value), false, true);
            }
            return node.finishProperty('init', key, computed, key, false, true);
          }
          throwUnexpectedToken(lookahead);
        }
        function parseObjectInitializer() {
          var properties = [],
              hasProto = {value: false},
              node = new Node();
          expect('{');
          while (!match('}')) {
            properties.push(parseObjectProperty(hasProto));
            if (!match('}')) {
              expectCommaSeparator();
            }
          }
          expect('}');
          return node.finishObjectExpression(properties);
        }
        function reinterpretExpressionAsPattern(expr) {
          var i;
          switch (expr.type) {
            case Syntax.Identifier:
            case Syntax.MemberExpression:
            case Syntax.RestElement:
            case Syntax.AssignmentPattern:
              break;
            case Syntax.SpreadElement:
              expr.type = Syntax.RestElement;
              reinterpretExpressionAsPattern(expr.argument);
              break;
            case Syntax.ArrayExpression:
              expr.type = Syntax.ArrayPattern;
              for (i = 0; i < expr.elements.length; i++) {
                if (expr.elements[i] !== null) {
                  reinterpretExpressionAsPattern(expr.elements[i]);
                }
              }
              break;
            case Syntax.ObjectExpression:
              expr.type = Syntax.ObjectPattern;
              for (i = 0; i < expr.properties.length; i++) {
                reinterpretExpressionAsPattern(expr.properties[i].value);
              }
              break;
            case Syntax.AssignmentExpression:
              expr.type = Syntax.AssignmentPattern;
              reinterpretExpressionAsPattern(expr.left);
              break;
            default:
              break;
          }
        }
        function parseTemplateElement(option) {
          var node,
              token;
          if (lookahead.type !== Token.Template || (option.head && !lookahead.head)) {
            throwUnexpectedToken();
          }
          node = new Node();
          token = lex();
          return node.finishTemplateElement({
            raw: token.value.raw,
            cooked: token.value.cooked
          }, token.tail);
        }
        function parseTemplateLiteral() {
          var quasi,
              quasis,
              expressions,
              node = new Node();
          quasi = parseTemplateElement({head: true});
          quasis = [quasi];
          expressions = [];
          while (!quasi.tail) {
            expressions.push(parseExpression());
            quasi = parseTemplateElement({head: false});
            quasis.push(quasi);
          }
          return node.finishTemplateLiteral(quasis, expressions);
        }
        function parseGroupExpression() {
          var expr,
              expressions,
              startToken,
              i,
              params = [];
          expect('(');
          if (match(')')) {
            lex();
            if (!match('=>')) {
              expect('=>');
            }
            return {
              type: PlaceHolders.ArrowParameterPlaceHolder,
              params: [],
              rawParams: []
            };
          }
          startToken = lookahead;
          if (match('...')) {
            expr = parseRestElement(params);
            expect(')');
            if (!match('=>')) {
              expect('=>');
            }
            return {
              type: PlaceHolders.ArrowParameterPlaceHolder,
              params: [expr]
            };
          }
          isBindingElement = true;
          expr = inheritCoverGrammar(parseAssignmentExpression);
          if (match(',')) {
            isAssignmentTarget = false;
            expressions = [expr];
            while (startIndex < length) {
              if (!match(',')) {
                break;
              }
              lex();
              if (match('...')) {
                if (!isBindingElement) {
                  throwUnexpectedToken(lookahead);
                }
                expressions.push(parseRestElement(params));
                expect(')');
                if (!match('=>')) {
                  expect('=>');
                }
                isBindingElement = false;
                for (i = 0; i < expressions.length; i++) {
                  reinterpretExpressionAsPattern(expressions[i]);
                }
                return {
                  type: PlaceHolders.ArrowParameterPlaceHolder,
                  params: expressions
                };
              }
              expressions.push(inheritCoverGrammar(parseAssignmentExpression));
            }
            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
          }
          expect(')');
          if (match('=>')) {
            if (expr.type === Syntax.Identifier && expr.name === 'yield') {
              return {
                type: PlaceHolders.ArrowParameterPlaceHolder,
                params: [expr]
              };
            }
            if (!isBindingElement) {
              throwUnexpectedToken(lookahead);
            }
            if (expr.type === Syntax.SequenceExpression) {
              for (i = 0; i < expr.expressions.length; i++) {
                reinterpretExpressionAsPattern(expr.expressions[i]);
              }
            } else {
              reinterpretExpressionAsPattern(expr);
            }
            expr = {
              type: PlaceHolders.ArrowParameterPlaceHolder,
              params: expr.type === Syntax.SequenceExpression ? expr.expressions : [expr]
            };
          }
          isBindingElement = false;
          return expr;
        }
        function parsePrimaryExpression() {
          var type,
              token,
              expr,
              node;
          if (match('(')) {
            isBindingElement = false;
            return inheritCoverGrammar(parseGroupExpression);
          }
          if (match('[')) {
            return inheritCoverGrammar(parseArrayInitializer);
          }
          if (match('{')) {
            return inheritCoverGrammar(parseObjectInitializer);
          }
          type = lookahead.type;
          node = new Node();
          if (type === Token.Identifier) {
            if (state.sourceType === 'module' && lookahead.value === 'await') {
              tolerateUnexpectedToken(lookahead);
            }
            expr = node.finishIdentifier(lex().value);
          } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            isAssignmentTarget = isBindingElement = false;
            if (strict && lookahead.octal) {
              tolerateUnexpectedToken(lookahead, Messages.StrictOctalLiteral);
            }
            expr = node.finishLiteral(lex());
          } else if (type === Token.Keyword) {
            if (!strict && state.allowYield && matchKeyword('yield')) {
              return parseNonComputedProperty();
            }
            if (!strict && matchKeyword('let')) {
              return node.finishIdentifier(lex().value);
            }
            isAssignmentTarget = isBindingElement = false;
            if (matchKeyword('function')) {
              return parseFunctionExpression();
            }
            if (matchKeyword('this')) {
              lex();
              return node.finishThisExpression();
            }
            if (matchKeyword('class')) {
              return parseClassExpression();
            }
            throwUnexpectedToken(lex());
          } else if (type === Token.BooleanLiteral) {
            isAssignmentTarget = isBindingElement = false;
            token = lex();
            token.value = (token.value === 'true');
            expr = node.finishLiteral(token);
          } else if (type === Token.NullLiteral) {
            isAssignmentTarget = isBindingElement = false;
            token = lex();
            token.value = null;
            expr = node.finishLiteral(token);
          } else if (match('/') || match('/=')) {
            isAssignmentTarget = isBindingElement = false;
            index = startIndex;
            if (typeof extra.tokens !== 'undefined') {
              token = collectRegex();
            } else {
              token = scanRegExp();
            }
            lex();
            expr = node.finishLiteral(token);
          } else if (type === Token.Template) {
            expr = parseTemplateLiteral();
          } else {
            throwUnexpectedToken(lex());
          }
          return expr;
        }
        function parseArguments() {
          var args = [],
              expr;
          expect('(');
          if (!match(')')) {
            while (startIndex < length) {
              if (match('...')) {
                expr = new Node();
                lex();
                expr.finishSpreadElement(isolateCoverGrammar(parseAssignmentExpression));
              } else {
                expr = isolateCoverGrammar(parseAssignmentExpression);
              }
              args.push(expr);
              if (match(')')) {
                break;
              }
              expectCommaSeparator();
            }
          }
          expect(')');
          return args;
        }
        function parseNonComputedProperty() {
          var token,
              node = new Node();
          token = lex();
          if (!isIdentifierName(token)) {
            throwUnexpectedToken(token);
          }
          return node.finishIdentifier(token.value);
        }
        function parseNonComputedMember() {
          expect('.');
          return parseNonComputedProperty();
        }
        function parseComputedMember() {
          var expr;
          expect('[');
          expr = isolateCoverGrammar(parseExpression);
          expect(']');
          return expr;
        }
        function parseNewExpression() {
          var callee,
              args,
              node = new Node();
          expectKeyword('new');
          if (match('.')) {
            lex();
            if (lookahead.type === Token.Identifier && lookahead.value === 'target') {
              if (state.inFunctionBody) {
                lex();
                return node.finishMetaProperty('new', 'target');
              }
            }
            throwUnexpectedToken(lookahead);
          }
          callee = isolateCoverGrammar(parseLeftHandSideExpression);
          args = match('(') ? parseArguments() : [];
          isAssignmentTarget = isBindingElement = false;
          return node.finishNewExpression(callee, args);
        }
        function parseLeftHandSideExpressionAllowCall() {
          var quasi,
              expr,
              args,
              property,
              startToken,
              previousAllowIn = state.allowIn;
          startToken = lookahead;
          state.allowIn = true;
          if (matchKeyword('super') && state.inFunctionBody) {
            expr = new Node();
            lex();
            expr = expr.finishSuper();
            if (!match('(') && !match('.') && !match('[')) {
              throwUnexpectedToken(lookahead);
            }
          } else {
            expr = inheritCoverGrammar(matchKeyword('new') ? parseNewExpression : parsePrimaryExpression);
          }
          for (; ; ) {
            if (match('.')) {
              isBindingElement = false;
              isAssignmentTarget = true;
              property = parseNonComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
            } else if (match('(')) {
              isBindingElement = false;
              isAssignmentTarget = false;
              args = parseArguments();
              expr = new WrappingNode(startToken).finishCallExpression(expr, args);
            } else if (match('[')) {
              isBindingElement = false;
              isAssignmentTarget = true;
              property = parseComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
            } else if (lookahead.type === Token.Template && lookahead.head) {
              quasi = parseTemplateLiteral();
              expr = new WrappingNode(startToken).finishTaggedTemplateExpression(expr, quasi);
            } else {
              break;
            }
          }
          state.allowIn = previousAllowIn;
          return expr;
        }
        function parseLeftHandSideExpression() {
          var quasi,
              expr,
              property,
              startToken;
          assert(state.allowIn, 'callee of new expression always allow in keyword.');
          startToken = lookahead;
          if (matchKeyword('super') && state.inFunctionBody) {
            expr = new Node();
            lex();
            expr = expr.finishSuper();
            if (!match('[') && !match('.')) {
              throwUnexpectedToken(lookahead);
            }
          } else {
            expr = inheritCoverGrammar(matchKeyword('new') ? parseNewExpression : parsePrimaryExpression);
          }
          for (; ; ) {
            if (match('[')) {
              isBindingElement = false;
              isAssignmentTarget = true;
              property = parseComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
            } else if (match('.')) {
              isBindingElement = false;
              isAssignmentTarget = true;
              property = parseNonComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
            } else if (lookahead.type === Token.Template && lookahead.head) {
              quasi = parseTemplateLiteral();
              expr = new WrappingNode(startToken).finishTaggedTemplateExpression(expr, quasi);
            } else {
              break;
            }
          }
          return expr;
        }
        function parsePostfixExpression() {
          var expr,
              token,
              startToken = lookahead;
          expr = inheritCoverGrammar(parseLeftHandSideExpressionAllowCall);
          if (!hasLineTerminator && lookahead.type === Token.Punctuator) {
            if (match('++') || match('--')) {
              if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                tolerateError(Messages.StrictLHSPostfix);
              }
              if (!isAssignmentTarget) {
                tolerateError(Messages.InvalidLHSInAssignment);
              }
              isAssignmentTarget = isBindingElement = false;
              token = lex();
              expr = new WrappingNode(startToken).finishPostfixExpression(token.value, expr);
            }
          }
          return expr;
        }
        function parseUnaryExpression() {
          var token,
              expr,
              startToken;
          if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
            expr = parsePostfixExpression();
          } else if (match('++') || match('--')) {
            startToken = lookahead;
            token = lex();
            expr = inheritCoverGrammar(parseUnaryExpression);
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
              tolerateError(Messages.StrictLHSPrefix);
            }
            if (!isAssignmentTarget) {
              tolerateError(Messages.InvalidLHSInAssignment);
            }
            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
            isAssignmentTarget = isBindingElement = false;
          } else if (match('+') || match('-') || match('~') || match('!')) {
            startToken = lookahead;
            token = lex();
            expr = inheritCoverGrammar(parseUnaryExpression);
            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
            isAssignmentTarget = isBindingElement = false;
          } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            startToken = lookahead;
            token = lex();
            expr = inheritCoverGrammar(parseUnaryExpression);
            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
              tolerateError(Messages.StrictDelete);
            }
            isAssignmentTarget = isBindingElement = false;
          } else {
            expr = parsePostfixExpression();
          }
          return expr;
        }
        function binaryPrecedence(token, allowIn) {
          var prec = 0;
          if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return 0;
          }
          switch (token.value) {
            case '||':
              prec = 1;
              break;
            case '&&':
              prec = 2;
              break;
            case '|':
              prec = 3;
              break;
            case '^':
              prec = 4;
              break;
            case '&':
              prec = 5;
              break;
            case '==':
            case '!=':
            case '===':
            case '!==':
              prec = 6;
              break;
            case '<':
            case '>':
            case '<=':
            case '>=':
            case 'instanceof':
              prec = 7;
              break;
            case 'in':
              prec = allowIn ? 7 : 0;
              break;
            case '<<':
            case '>>':
            case '>>>':
              prec = 8;
              break;
            case '+':
            case '-':
              prec = 9;
              break;
            case '*':
            case '/':
            case '%':
              prec = 11;
              break;
            default:
              break;
          }
          return prec;
        }
        function parseBinaryExpression() {
          var marker,
              markers,
              expr,
              token,
              prec,
              stack,
              right,
              operator,
              left,
              i;
          marker = lookahead;
          left = inheritCoverGrammar(parseUnaryExpression);
          token = lookahead;
          prec = binaryPrecedence(token, state.allowIn);
          if (prec === 0) {
            return left;
          }
          isAssignmentTarget = isBindingElement = false;
          token.prec = prec;
          lex();
          markers = [marker, lookahead];
          right = isolateCoverGrammar(parseUnaryExpression);
          stack = [left, token, right];
          while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {
            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
              right = stack.pop();
              operator = stack.pop().value;
              left = stack.pop();
              markers.pop();
              expr = new WrappingNode(markers[markers.length - 1]).finishBinaryExpression(operator, left, right);
              stack.push(expr);
            }
            token = lex();
            token.prec = prec;
            stack.push(token);
            markers.push(lookahead);
            expr = isolateCoverGrammar(parseUnaryExpression);
            stack.push(expr);
          }
          i = stack.length - 1;
          expr = stack[i];
          markers.pop();
          while (i > 1) {
            expr = new WrappingNode(markers.pop()).finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
            i -= 2;
          }
          return expr;
        }
        function parseConditionalExpression() {
          var expr,
              previousAllowIn,
              consequent,
              alternate,
              startToken;
          startToken = lookahead;
          expr = inheritCoverGrammar(parseBinaryExpression);
          if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = isolateCoverGrammar(parseAssignmentExpression);
            state.allowIn = previousAllowIn;
            expect(':');
            alternate = isolateCoverGrammar(parseAssignmentExpression);
            expr = new WrappingNode(startToken).finishConditionalExpression(expr, consequent, alternate);
            isAssignmentTarget = isBindingElement = false;
          }
          return expr;
        }
        function parseConciseBody() {
          if (match('{')) {
            return parseFunctionSourceElements();
          }
          return isolateCoverGrammar(parseAssignmentExpression);
        }
        function checkPatternParam(options, param) {
          var i;
          switch (param.type) {
            case Syntax.Identifier:
              validateParam(options, param, param.name);
              break;
            case Syntax.RestElement:
              checkPatternParam(options, param.argument);
              break;
            case Syntax.AssignmentPattern:
              checkPatternParam(options, param.left);
              break;
            case Syntax.ArrayPattern:
              for (i = 0; i < param.elements.length; i++) {
                if (param.elements[i] !== null) {
                  checkPatternParam(options, param.elements[i]);
                }
              }
              break;
            case Syntax.YieldExpression:
              break;
            default:
              assert(param.type === Syntax.ObjectPattern, 'Invalid type');
              for (i = 0; i < param.properties.length; i++) {
                checkPatternParam(options, param.properties[i].value);
              }
              break;
          }
        }
        function reinterpretAsCoverFormalsList(expr) {
          var i,
              len,
              param,
              params,
              defaults,
              defaultCount,
              options,
              token;
          defaults = [];
          defaultCount = 0;
          params = [expr];
          switch (expr.type) {
            case Syntax.Identifier:
              break;
            case PlaceHolders.ArrowParameterPlaceHolder:
              params = expr.params;
              break;
            default:
              return null;
          }
          options = {paramSet: {}};
          for (i = 0, len = params.length; i < len; i += 1) {
            param = params[i];
            switch (param.type) {
              case Syntax.AssignmentPattern:
                params[i] = param.left;
                if (param.right.type === Syntax.YieldExpression) {
                  if (param.right.argument) {
                    throwUnexpectedToken(lookahead);
                  }
                  param.right.type = Syntax.Identifier;
                  param.right.name = 'yield';
                  delete param.right.argument;
                  delete param.right.delegate;
                }
                defaults.push(param.right);
                ++defaultCount;
                checkPatternParam(options, param.left);
                break;
              default:
                checkPatternParam(options, param);
                params[i] = param;
                defaults.push(null);
                break;
            }
          }
          if (strict || !state.allowYield) {
            for (i = 0, len = params.length; i < len; i += 1) {
              param = params[i];
              if (param.type === Syntax.YieldExpression) {
                throwUnexpectedToken(lookahead);
              }
            }
          }
          if (options.message === Messages.StrictParamDupe) {
            token = strict ? options.stricted : options.firstRestricted;
            throwUnexpectedToken(token, options.message);
          }
          if (defaultCount === 0) {
            defaults = [];
          }
          return {
            params: params,
            defaults: defaults,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
          };
        }
        function parseArrowFunctionExpression(options, node) {
          var previousStrict,
              previousAllowYield,
              body;
          if (hasLineTerminator) {
            tolerateUnexpectedToken(lookahead);
          }
          expect('=>');
          previousStrict = strict;
          previousAllowYield = state.allowYield;
          state.allowYield = true;
          body = parseConciseBody();
          if (strict && options.firstRestricted) {
            throwUnexpectedToken(options.firstRestricted, options.message);
          }
          if (strict && options.stricted) {
            tolerateUnexpectedToken(options.stricted, options.message);
          }
          strict = previousStrict;
          state.allowYield = previousAllowYield;
          return node.finishArrowFunctionExpression(options.params, options.defaults, body, body.type !== Syntax.BlockStatement);
        }
        function parseYieldExpression() {
          var argument,
              expr,
              delegate,
              previousAllowYield;
          argument = null;
          expr = new Node();
          delegate = false;
          expectKeyword('yield');
          if (!hasLineTerminator) {
            previousAllowYield = state.allowYield;
            state.allowYield = false;
            delegate = match('*');
            if (delegate) {
              lex();
              argument = parseAssignmentExpression();
            } else {
              if (!match(';') && !match('}') && !match(')') && lookahead.type !== Token.EOF) {
                argument = parseAssignmentExpression();
              }
            }
            state.allowYield = previousAllowYield;
          }
          return expr.finishYieldExpression(argument, delegate);
        }
        function parseAssignmentExpression() {
          var token,
              expr,
              right,
              list,
              startToken;
          startToken = lookahead;
          token = lookahead;
          if (!state.allowYield && matchKeyword('yield')) {
            return parseYieldExpression();
          }
          expr = parseConditionalExpression();
          if (expr.type === PlaceHolders.ArrowParameterPlaceHolder || match('=>')) {
            isAssignmentTarget = isBindingElement = false;
            list = reinterpretAsCoverFormalsList(expr);
            if (list) {
              firstCoverInitializedNameError = null;
              return parseArrowFunctionExpression(list, new WrappingNode(startToken));
            }
            return expr;
          }
          if (matchAssign()) {
            if (!isAssignmentTarget) {
              tolerateError(Messages.InvalidLHSInAssignment);
            }
            if (strict && expr.type === Syntax.Identifier) {
              if (isRestrictedWord(expr.name)) {
                tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
              }
              if (isStrictModeReservedWord(expr.name)) {
                tolerateUnexpectedToken(token, Messages.StrictReservedWord);
              }
            }
            if (!match('=')) {
              isAssignmentTarget = isBindingElement = false;
            } else {
              reinterpretExpressionAsPattern(expr);
            }
            token = lex();
            right = isolateCoverGrammar(parseAssignmentExpression);
            expr = new WrappingNode(startToken).finishAssignmentExpression(token.value, expr, right);
            firstCoverInitializedNameError = null;
          }
          return expr;
        }
        function parseExpression() {
          var expr,
              startToken = lookahead,
              expressions;
          expr = isolateCoverGrammar(parseAssignmentExpression);
          if (match(',')) {
            expressions = [expr];
            while (startIndex < length) {
              if (!match(',')) {
                break;
              }
              lex();
              expressions.push(isolateCoverGrammar(parseAssignmentExpression));
            }
            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
          }
          return expr;
        }
        function parseStatementListItem() {
          if (lookahead.type === Token.Keyword) {
            switch (lookahead.value) {
              case 'export':
                if (state.sourceType !== 'module') {
                  tolerateUnexpectedToken(lookahead, Messages.IllegalExportDeclaration);
                }
                return parseExportDeclaration();
              case 'import':
                if (state.sourceType !== 'module') {
                  tolerateUnexpectedToken(lookahead, Messages.IllegalImportDeclaration);
                }
                return parseImportDeclaration();
              case 'const':
                return parseLexicalDeclaration({inFor: false});
              case 'function':
                return parseFunctionDeclaration(new Node());
              case 'class':
                return parseClassDeclaration();
            }
          }
          if (matchKeyword('let') && isLexicalDeclaration()) {
            return parseLexicalDeclaration({inFor: false});
          }
          return parseStatement();
        }
        function parseStatementList() {
          var list = [];
          while (startIndex < length) {
            if (match('}')) {
              break;
            }
            list.push(parseStatementListItem());
          }
          return list;
        }
        function parseBlock() {
          var block,
              node = new Node();
          expect('{');
          block = parseStatementList();
          expect('}');
          return node.finishBlockStatement(block);
        }
        function parseVariableIdentifier(kind) {
          var token,
              node = new Node();
          token = lex();
          if (token.type === Token.Keyword && token.value === 'yield') {
            if (strict) {
              tolerateUnexpectedToken(token, Messages.StrictReservedWord);
            }
            if (!state.allowYield) {
              throwUnexpectedToken(token);
            }
          } else if (token.type !== Token.Identifier) {
            if (strict && token.type === Token.Keyword && isStrictModeReservedWord(token.value)) {
              tolerateUnexpectedToken(token, Messages.StrictReservedWord);
            } else {
              if (strict || token.value !== 'let' || kind !== 'var') {
                throwUnexpectedToken(token);
              }
            }
          } else if (state.sourceType === 'module' && token.type === Token.Identifier && token.value === 'await') {
            tolerateUnexpectedToken(token);
          }
          return node.finishIdentifier(token.value);
        }
        function parseVariableDeclaration(options) {
          var init = null,
              id,
              node = new Node(),
              params = [];
          id = parsePattern(params, 'var');
          if (strict && isRestrictedWord(id.name)) {
            tolerateError(Messages.StrictVarName);
          }
          if (match('=')) {
            lex();
            init = isolateCoverGrammar(parseAssignmentExpression);
          } else if (id.type !== Syntax.Identifier && !options.inFor) {
            expect('=');
          }
          return node.finishVariableDeclarator(id, init);
        }
        function parseVariableDeclarationList(options) {
          var opt,
              list;
          opt = {inFor: options.inFor};
          list = [parseVariableDeclaration(opt)];
          while (match(',')) {
            lex();
            list.push(parseVariableDeclaration(opt));
          }
          return list;
        }
        function parseVariableStatement(node) {
          var declarations;
          expectKeyword('var');
          declarations = parseVariableDeclarationList({inFor: false});
          consumeSemicolon();
          return node.finishVariableDeclaration(declarations);
        }
        function parseLexicalBinding(kind, options) {
          var init = null,
              id,
              node = new Node(),
              params = [];
          id = parsePattern(params, kind);
          if (strict && id.type === Syntax.Identifier && isRestrictedWord(id.name)) {
            tolerateError(Messages.StrictVarName);
          }
          if (kind === 'const') {
            if (!matchKeyword('in') && !matchContextualKeyword('of')) {
              expect('=');
              init = isolateCoverGrammar(parseAssignmentExpression);
            }
          } else if ((!options.inFor && id.type !== Syntax.Identifier) || match('=')) {
            expect('=');
            init = isolateCoverGrammar(parseAssignmentExpression);
          }
          return node.finishVariableDeclarator(id, init);
        }
        function parseBindingList(kind, options) {
          var list = [parseLexicalBinding(kind, options)];
          while (match(',')) {
            lex();
            list.push(parseLexicalBinding(kind, options));
          }
          return list;
        }
        function tokenizerState() {
          return {
            index: index,
            lineNumber: lineNumber,
            lineStart: lineStart,
            hasLineTerminator: hasLineTerminator,
            lastIndex: lastIndex,
            lastLineNumber: lastLineNumber,
            lastLineStart: lastLineStart,
            startIndex: startIndex,
            startLineNumber: startLineNumber,
            startLineStart: startLineStart,
            lookahead: lookahead,
            tokenCount: extra.tokens ? extra.tokens.length : 0
          };
        }
        function resetTokenizerState(ts) {
          index = ts.index;
          lineNumber = ts.lineNumber;
          lineStart = ts.lineStart;
          hasLineTerminator = ts.hasLineTerminator;
          lastIndex = ts.lastIndex;
          lastLineNumber = ts.lastLineNumber;
          lastLineStart = ts.lastLineStart;
          startIndex = ts.startIndex;
          startLineNumber = ts.startLineNumber;
          startLineStart = ts.startLineStart;
          lookahead = ts.lookahead;
          if (extra.tokens) {
            extra.tokens.splice(ts.tokenCount, extra.tokens.length);
          }
        }
        function isLexicalDeclaration() {
          var lexical,
              ts;
          ts = tokenizerState();
          lex();
          lexical = (lookahead.type === Token.Identifier) || match('[') || match('{') || matchKeyword('let') || matchKeyword('yield');
          resetTokenizerState(ts);
          return lexical;
        }
        function parseLexicalDeclaration(options) {
          var kind,
              declarations,
              node = new Node();
          kind = lex().value;
          assert(kind === 'let' || kind === 'const', 'Lexical declaration must be either let or const');
          declarations = parseBindingList(kind, options);
          consumeSemicolon();
          return node.finishLexicalDeclaration(declarations, kind);
        }
        function parseRestElement(params) {
          var param,
              node = new Node();
          lex();
          if (match('{')) {
            throwError(Messages.ObjectPatternAsRestParameter);
          }
          params.push(lookahead);
          param = parseVariableIdentifier();
          if (match('=')) {
            throwError(Messages.DefaultRestParameter);
          }
          if (!match(')')) {
            throwError(Messages.ParameterAfterRestParameter);
          }
          return node.finishRestElement(param);
        }
        function parseEmptyStatement(node) {
          expect(';');
          return node.finishEmptyStatement();
        }
        function parseExpressionStatement(node) {
          var expr = parseExpression();
          consumeSemicolon();
          return node.finishExpressionStatement(expr);
        }
        function parseIfStatement(node) {
          var test,
              consequent,
              alternate;
          expectKeyword('if');
          expect('(');
          test = parseExpression();
          expect(')');
          consequent = parseStatement();
          if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
          } else {
            alternate = null;
          }
          return node.finishIfStatement(test, consequent, alternate);
        }
        function parseDoWhileStatement(node) {
          var body,
              test,
              oldInIteration;
          expectKeyword('do');
          oldInIteration = state.inIteration;
          state.inIteration = true;
          body = parseStatement();
          state.inIteration = oldInIteration;
          expectKeyword('while');
          expect('(');
          test = parseExpression();
          expect(')');
          if (match(';')) {
            lex();
          }
          return node.finishDoWhileStatement(body, test);
        }
        function parseWhileStatement(node) {
          var test,
              body,
              oldInIteration;
          expectKeyword('while');
          expect('(');
          test = parseExpression();
          expect(')');
          oldInIteration = state.inIteration;
          state.inIteration = true;
          body = parseStatement();
          state.inIteration = oldInIteration;
          return node.finishWhileStatement(test, body);
        }
        function parseForStatement(node) {
          var init,
              forIn,
              initSeq,
              initStartToken,
              test,
              update,
              left,
              right,
              kind,
              declarations,
              body,
              oldInIteration,
              previousAllowIn = state.allowIn;
          init = test = update = null;
          forIn = true;
          expectKeyword('for');
          expect('(');
          if (match(';')) {
            lex();
          } else {
            if (matchKeyword('var')) {
              init = new Node();
              lex();
              state.allowIn = false;
              declarations = parseVariableDeclarationList({inFor: true});
              state.allowIn = previousAllowIn;
              if (declarations.length === 1 && matchKeyword('in')) {
                init = init.finishVariableDeclaration(declarations);
                lex();
                left = init;
                right = parseExpression();
                init = null;
              } else if (declarations.length === 1 && declarations[0].init === null && matchContextualKeyword('of')) {
                init = init.finishVariableDeclaration(declarations);
                lex();
                left = init;
                right = parseAssignmentExpression();
                init = null;
                forIn = false;
              } else {
                init = init.finishVariableDeclaration(declarations);
                expect(';');
              }
            } else if (matchKeyword('const') || matchKeyword('let')) {
              init = new Node();
              kind = lex().value;
              if (!strict && lookahead.value === 'in') {
                init = init.finishIdentifier(kind);
                lex();
                left = init;
                right = parseExpression();
                init = null;
              } else {
                state.allowIn = false;
                declarations = parseBindingList(kind, {inFor: true});
                state.allowIn = previousAllowIn;
                if (declarations.length === 1 && declarations[0].init === null && matchKeyword('in')) {
                  init = init.finishLexicalDeclaration(declarations, kind);
                  lex();
                  left = init;
                  right = parseExpression();
                  init = null;
                } else if (declarations.length === 1 && declarations[0].init === null && matchContextualKeyword('of')) {
                  init = init.finishLexicalDeclaration(declarations, kind);
                  lex();
                  left = init;
                  right = parseAssignmentExpression();
                  init = null;
                  forIn = false;
                } else {
                  consumeSemicolon();
                  init = init.finishLexicalDeclaration(declarations, kind);
                }
              }
            } else {
              initStartToken = lookahead;
              state.allowIn = false;
              init = inheritCoverGrammar(parseAssignmentExpression);
              state.allowIn = previousAllowIn;
              if (matchKeyword('in')) {
                if (!isAssignmentTarget) {
                  tolerateError(Messages.InvalidLHSInForIn);
                }
                lex();
                reinterpretExpressionAsPattern(init);
                left = init;
                right = parseExpression();
                init = null;
              } else if (matchContextualKeyword('of')) {
                if (!isAssignmentTarget) {
                  tolerateError(Messages.InvalidLHSInForLoop);
                }
                lex();
                reinterpretExpressionAsPattern(init);
                left = init;
                right = parseAssignmentExpression();
                init = null;
                forIn = false;
              } else {
                if (match(',')) {
                  initSeq = [init];
                  while (match(',')) {
                    lex();
                    initSeq.push(isolateCoverGrammar(parseAssignmentExpression));
                  }
                  init = new WrappingNode(initStartToken).finishSequenceExpression(initSeq);
                }
                expect(';');
              }
            }
          }
          if (typeof left === 'undefined') {
            if (!match(';')) {
              test = parseExpression();
            }
            expect(';');
            if (!match(')')) {
              update = parseExpression();
            }
          }
          expect(')');
          oldInIteration = state.inIteration;
          state.inIteration = true;
          body = isolateCoverGrammar(parseStatement);
          state.inIteration = oldInIteration;
          return (typeof left === 'undefined') ? node.finishForStatement(init, test, update, body) : forIn ? node.finishForInStatement(left, right, body) : node.finishForOfStatement(left, right, body);
        }
        function parseContinueStatement(node) {
          var label = null,
              key;
          expectKeyword('continue');
          if (source.charCodeAt(startIndex) === 0x3B) {
            lex();
            if (!state.inIteration) {
              throwError(Messages.IllegalContinue);
            }
            return node.finishContinueStatement(null);
          }
          if (hasLineTerminator) {
            if (!state.inIteration) {
              throwError(Messages.IllegalContinue);
            }
            return node.finishContinueStatement(null);
          }
          if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();
            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
              throwError(Messages.UnknownLabel, label.name);
            }
          }
          consumeSemicolon();
          if (label === null && !state.inIteration) {
            throwError(Messages.IllegalContinue);
          }
          return node.finishContinueStatement(label);
        }
        function parseBreakStatement(node) {
          var label = null,
              key;
          expectKeyword('break');
          if (source.charCodeAt(lastIndex) === 0x3B) {
            lex();
            if (!(state.inIteration || state.inSwitch)) {
              throwError(Messages.IllegalBreak);
            }
            return node.finishBreakStatement(null);
          }
          if (hasLineTerminator) {
            if (!(state.inIteration || state.inSwitch)) {
              throwError(Messages.IllegalBreak);
            }
          } else if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();
            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
              throwError(Messages.UnknownLabel, label.name);
            }
          }
          consumeSemicolon();
          if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError(Messages.IllegalBreak);
          }
          return node.finishBreakStatement(label);
        }
        function parseReturnStatement(node) {
          var argument = null;
          expectKeyword('return');
          if (!state.inFunctionBody) {
            tolerateError(Messages.IllegalReturn);
          }
          if (source.charCodeAt(lastIndex) === 0x20) {
            if (isIdentifierStart(source.charCodeAt(lastIndex + 1))) {
              argument = parseExpression();
              consumeSemicolon();
              return node.finishReturnStatement(argument);
            }
          }
          if (hasLineTerminator) {
            return node.finishReturnStatement(null);
          }
          if (!match(';')) {
            if (!match('}') && lookahead.type !== Token.EOF) {
              argument = parseExpression();
            }
          }
          consumeSemicolon();
          return node.finishReturnStatement(argument);
        }
        function parseWithStatement(node) {
          var object,
              body;
          if (strict) {
            tolerateError(Messages.StrictModeWith);
          }
          expectKeyword('with');
          expect('(');
          object = parseExpression();
          expect(')');
          body = parseStatement();
          return node.finishWithStatement(object, body);
        }
        function parseSwitchCase() {
          var test,
              consequent = [],
              statement,
              node = new Node();
          if (matchKeyword('default')) {
            lex();
            test = null;
          } else {
            expectKeyword('case');
            test = parseExpression();
          }
          expect(':');
          while (startIndex < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
              break;
            }
            statement = parseStatementListItem();
            consequent.push(statement);
          }
          return node.finishSwitchCase(test, consequent);
        }
        function parseSwitchStatement(node) {
          var discriminant,
              cases,
              clause,
              oldInSwitch,
              defaultFound;
          expectKeyword('switch');
          expect('(');
          discriminant = parseExpression();
          expect(')');
          expect('{');
          cases = [];
          if (match('}')) {
            lex();
            return node.finishSwitchStatement(discriminant, cases);
          }
          oldInSwitch = state.inSwitch;
          state.inSwitch = true;
          defaultFound = false;
          while (startIndex < length) {
            if (match('}')) {
              break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
              if (defaultFound) {
                throwError(Messages.MultipleDefaultsInSwitch);
              }
              defaultFound = true;
            }
            cases.push(clause);
          }
          state.inSwitch = oldInSwitch;
          expect('}');
          return node.finishSwitchStatement(discriminant, cases);
        }
        function parseThrowStatement(node) {
          var argument;
          expectKeyword('throw');
          if (hasLineTerminator) {
            throwError(Messages.NewlineAfterThrow);
          }
          argument = parseExpression();
          consumeSemicolon();
          return node.finishThrowStatement(argument);
        }
        function parseCatchClause() {
          var param,
              params = [],
              paramMap = {},
              key,
              i,
              body,
              node = new Node();
          expectKeyword('catch');
          expect('(');
          if (match(')')) {
            throwUnexpectedToken(lookahead);
          }
          param = parsePattern(params);
          for (i = 0; i < params.length; i++) {
            key = '$' + params[i].value;
            if (Object.prototype.hasOwnProperty.call(paramMap, key)) {
              tolerateError(Messages.DuplicateBinding, params[i].value);
            }
            paramMap[key] = true;
          }
          if (strict && isRestrictedWord(param.name)) {
            tolerateError(Messages.StrictCatchVariable);
          }
          expect(')');
          body = parseBlock();
          return node.finishCatchClause(param, body);
        }
        function parseTryStatement(node) {
          var block,
              handler = null,
              finalizer = null;
          expectKeyword('try');
          block = parseBlock();
          if (matchKeyword('catch')) {
            handler = parseCatchClause();
          }
          if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
          }
          if (!handler && !finalizer) {
            throwError(Messages.NoCatchOrFinally);
          }
          return node.finishTryStatement(block, handler, finalizer);
        }
        function parseDebuggerStatement(node) {
          expectKeyword('debugger');
          consumeSemicolon();
          return node.finishDebuggerStatement();
        }
        function parseStatement() {
          var type = lookahead.type,
              expr,
              labeledBody,
              key,
              node;
          if (type === Token.EOF) {
            throwUnexpectedToken(lookahead);
          }
          if (type === Token.Punctuator && lookahead.value === '{') {
            return parseBlock();
          }
          isAssignmentTarget = isBindingElement = true;
          node = new Node();
          if (type === Token.Punctuator) {
            switch (lookahead.value) {
              case ';':
                return parseEmptyStatement(node);
              case '(':
                return parseExpressionStatement(node);
              default:
                break;
            }
          } else if (type === Token.Keyword) {
            switch (lookahead.value) {
              case 'break':
                return parseBreakStatement(node);
              case 'continue':
                return parseContinueStatement(node);
              case 'debugger':
                return parseDebuggerStatement(node);
              case 'do':
                return parseDoWhileStatement(node);
              case 'for':
                return parseForStatement(node);
              case 'function':
                return parseFunctionDeclaration(node);
              case 'if':
                return parseIfStatement(node);
              case 'return':
                return parseReturnStatement(node);
              case 'switch':
                return parseSwitchStatement(node);
              case 'throw':
                return parseThrowStatement(node);
              case 'try':
                return parseTryStatement(node);
              case 'var':
                return parseVariableStatement(node);
              case 'while':
                return parseWhileStatement(node);
              case 'with':
                return parseWithStatement(node);
              default:
                break;
            }
          }
          expr = parseExpression();
          if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();
            key = '$' + expr.name;
            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
              throwError(Messages.Redeclaration, 'Label', expr.name);
            }
            state.labelSet[key] = true;
            labeledBody = parseStatement();
            delete state.labelSet[key];
            return node.finishLabeledStatement(expr, labeledBody);
          }
          consumeSemicolon();
          return node.finishExpressionStatement(expr);
        }
        function parseFunctionSourceElements() {
          var statement,
              body = [],
              token,
              directive,
              firstRestricted,
              oldLabelSet,
              oldInIteration,
              oldInSwitch,
              oldInFunctionBody,
              node = new Node();
          expect('{');
          while (startIndex < length) {
            if (lookahead.type !== Token.StringLiteral) {
              break;
            }
            token = lookahead;
            statement = parseStatementListItem();
            body.push(statement);
            if (statement.expression.type !== Syntax.Literal) {
              break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
              strict = true;
              if (firstRestricted) {
                tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
              }
            } else {
              if (!firstRestricted && token.octal) {
                firstRestricted = token;
              }
            }
          }
          oldLabelSet = state.labelSet;
          oldInIteration = state.inIteration;
          oldInSwitch = state.inSwitch;
          oldInFunctionBody = state.inFunctionBody;
          state.labelSet = {};
          state.inIteration = false;
          state.inSwitch = false;
          state.inFunctionBody = true;
          while (startIndex < length) {
            if (match('}')) {
              break;
            }
            body.push(parseStatementListItem());
          }
          expect('}');
          state.labelSet = oldLabelSet;
          state.inIteration = oldInIteration;
          state.inSwitch = oldInSwitch;
          state.inFunctionBody = oldInFunctionBody;
          return node.finishBlockStatement(body);
        }
        function validateParam(options, param, name) {
          var key = '$' + name;
          if (strict) {
            if (isRestrictedWord(name)) {
              options.stricted = param;
              options.message = Messages.StrictParamName;
            }
            if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
              options.stricted = param;
              options.message = Messages.StrictParamDupe;
            }
          } else if (!options.firstRestricted) {
            if (isRestrictedWord(name)) {
              options.firstRestricted = param;
              options.message = Messages.StrictParamName;
            } else if (isStrictModeReservedWord(name)) {
              options.firstRestricted = param;
              options.message = Messages.StrictReservedWord;
            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
              options.stricted = param;
              options.message = Messages.StrictParamDupe;
            }
          }
          options.paramSet[key] = true;
        }
        function parseParam(options) {
          var token,
              param,
              params = [],
              i,
              def;
          token = lookahead;
          if (token.value === '...') {
            param = parseRestElement(params);
            validateParam(options, param.argument, param.argument.name);
            options.params.push(param);
            options.defaults.push(null);
            return false;
          }
          param = parsePatternWithDefault(params);
          for (i = 0; i < params.length; i++) {
            validateParam(options, params[i], params[i].value);
          }
          if (param.type === Syntax.AssignmentPattern) {
            def = param.right;
            param = param.left;
            ++options.defaultCount;
          }
          options.params.push(param);
          options.defaults.push(def);
          return !match(')');
        }
        function parseParams(firstRestricted) {
          var options;
          options = {
            params: [],
            defaultCount: 0,
            defaults: [],
            firstRestricted: firstRestricted
          };
          expect('(');
          if (!match(')')) {
            options.paramSet = {};
            while (startIndex < length) {
              if (!parseParam(options)) {
                break;
              }
              expect(',');
            }
          }
          expect(')');
          if (options.defaultCount === 0) {
            options.defaults = [];
          }
          return {
            params: options.params,
            defaults: options.defaults,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
          };
        }
        function parseFunctionDeclaration(node, identifierIsOptional) {
          var id = null,
              params = [],
              defaults = [],
              body,
              token,
              stricted,
              tmp,
              firstRestricted,
              message,
              previousStrict,
              isGenerator,
              previousAllowYield;
          previousAllowYield = state.allowYield;
          expectKeyword('function');
          isGenerator = match('*');
          if (isGenerator) {
            lex();
          }
          if (!identifierIsOptional || !match('(')) {
            token = lookahead;
            id = parseVariableIdentifier();
            if (strict) {
              if (isRestrictedWord(token.value)) {
                tolerateUnexpectedToken(token, Messages.StrictFunctionName);
              }
            } else {
              if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
              } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
              }
            }
          }
          state.allowYield = !isGenerator;
          tmp = parseParams(firstRestricted);
          params = tmp.params;
          defaults = tmp.defaults;
          stricted = tmp.stricted;
          firstRestricted = tmp.firstRestricted;
          if (tmp.message) {
            message = tmp.message;
          }
          previousStrict = strict;
          body = parseFunctionSourceElements();
          if (strict && firstRestricted) {
            throwUnexpectedToken(firstRestricted, message);
          }
          if (strict && stricted) {
            tolerateUnexpectedToken(stricted, message);
          }
          strict = previousStrict;
          state.allowYield = previousAllowYield;
          return node.finishFunctionDeclaration(id, params, defaults, body, isGenerator);
        }
        function parseFunctionExpression() {
          var token,
              id = null,
              stricted,
              firstRestricted,
              message,
              tmp,
              params = [],
              defaults = [],
              body,
              previousStrict,
              node = new Node(),
              isGenerator,
              previousAllowYield;
          previousAllowYield = state.allowYield;
          expectKeyword('function');
          isGenerator = match('*');
          if (isGenerator) {
            lex();
          }
          state.allowYield = !isGenerator;
          if (!match('(')) {
            token = lookahead;
            id = (!strict && !isGenerator && matchKeyword('yield')) ? parseNonComputedProperty() : parseVariableIdentifier();
            if (strict) {
              if (isRestrictedWord(token.value)) {
                tolerateUnexpectedToken(token, Messages.StrictFunctionName);
              }
            } else {
              if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
              } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
              }
            }
          }
          tmp = parseParams(firstRestricted);
          params = tmp.params;
          defaults = tmp.defaults;
          stricted = tmp.stricted;
          firstRestricted = tmp.firstRestricted;
          if (tmp.message) {
            message = tmp.message;
          }
          previousStrict = strict;
          body = parseFunctionSourceElements();
          if (strict && firstRestricted) {
            throwUnexpectedToken(firstRestricted, message);
          }
          if (strict && stricted) {
            tolerateUnexpectedToken(stricted, message);
          }
          strict = previousStrict;
          state.allowYield = previousAllowYield;
          return node.finishFunctionExpression(id, params, defaults, body, isGenerator);
        }
        function parseClassBody() {
          var classBody,
              token,
              isStatic,
              hasConstructor = false,
              body,
              method,
              computed,
              key;
          classBody = new Node();
          expect('{');
          body = [];
          while (!match('}')) {
            if (match(';')) {
              lex();
            } else {
              method = new Node();
              token = lookahead;
              isStatic = false;
              computed = match('[');
              if (match('*')) {
                lex();
              } else {
                key = parseObjectPropertyKey();
                if (key.name === 'static' && (lookaheadPropertyName() || match('*'))) {
                  token = lookahead;
                  isStatic = true;
                  computed = match('[');
                  if (match('*')) {
                    lex();
                  } else {
                    key = parseObjectPropertyKey();
                  }
                }
              }
              method = tryParseMethodDefinition(token, key, computed, method);
              if (method) {
                method['static'] = isStatic;
                if (method.kind === 'init') {
                  method.kind = 'method';
                }
                if (!isStatic) {
                  if (!method.computed && (method.key.name || method.key.value.toString()) === 'constructor') {
                    if (method.kind !== 'method' || !method.method || method.value.generator) {
                      throwUnexpectedToken(token, Messages.ConstructorSpecialMethod);
                    }
                    if (hasConstructor) {
                      throwUnexpectedToken(token, Messages.DuplicateConstructor);
                    } else {
                      hasConstructor = true;
                    }
                    method.kind = 'constructor';
                  }
                } else {
                  if (!method.computed && (method.key.name || method.key.value.toString()) === 'prototype') {
                    throwUnexpectedToken(token, Messages.StaticPrototype);
                  }
                }
                method.type = Syntax.MethodDefinition;
                delete method.method;
                delete method.shorthand;
                body.push(method);
              } else {
                throwUnexpectedToken(lookahead);
              }
            }
          }
          lex();
          return classBody.finishClassBody(body);
        }
        function parseClassDeclaration(identifierIsOptional) {
          var id = null,
              superClass = null,
              classNode = new Node(),
              classBody,
              previousStrict = strict;
          strict = true;
          expectKeyword('class');
          if (!identifierIsOptional || lookahead.type === Token.Identifier) {
            id = parseVariableIdentifier();
          }
          if (matchKeyword('extends')) {
            lex();
            superClass = isolateCoverGrammar(parseLeftHandSideExpressionAllowCall);
          }
          classBody = parseClassBody();
          strict = previousStrict;
          return classNode.finishClassDeclaration(id, superClass, classBody);
        }
        function parseClassExpression() {
          var id = null,
              superClass = null,
              classNode = new Node(),
              classBody,
              previousStrict = strict;
          strict = true;
          expectKeyword('class');
          if (lookahead.type === Token.Identifier) {
            id = parseVariableIdentifier();
          }
          if (matchKeyword('extends')) {
            lex();
            superClass = isolateCoverGrammar(parseLeftHandSideExpressionAllowCall);
          }
          classBody = parseClassBody();
          strict = previousStrict;
          return classNode.finishClassExpression(id, superClass, classBody);
        }
        function parseModuleSpecifier() {
          var node = new Node();
          if (lookahead.type !== Token.StringLiteral) {
            throwError(Messages.InvalidModuleSpecifier);
          }
          return node.finishLiteral(lex());
        }
        function parseExportSpecifier() {
          var exported,
              local,
              node = new Node(),
              def;
          if (matchKeyword('default')) {
            def = new Node();
            lex();
            local = def.finishIdentifier('default');
          } else {
            local = parseVariableIdentifier();
          }
          if (matchContextualKeyword('as')) {
            lex();
            exported = parseNonComputedProperty();
          }
          return node.finishExportSpecifier(local, exported);
        }
        function parseExportNamedDeclaration(node) {
          var declaration = null,
              isExportFromIdentifier,
              src = null,
              specifiers = [];
          if (lookahead.type === Token.Keyword) {
            switch (lookahead.value) {
              case 'let':
              case 'const':
                declaration = parseLexicalDeclaration({inFor: false});
                return node.finishExportNamedDeclaration(declaration, specifiers, null);
              case 'var':
              case 'class':
              case 'function':
                declaration = parseStatementListItem();
                return node.finishExportNamedDeclaration(declaration, specifiers, null);
            }
          }
          expect('{');
          while (!match('}')) {
            isExportFromIdentifier = isExportFromIdentifier || matchKeyword('default');
            specifiers.push(parseExportSpecifier());
            if (!match('}')) {
              expect(',');
              if (match('}')) {
                break;
              }
            }
          }
          expect('}');
          if (matchContextualKeyword('from')) {
            lex();
            src = parseModuleSpecifier();
            consumeSemicolon();
          } else if (isExportFromIdentifier) {
            throwError(lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
          } else {
            consumeSemicolon();
          }
          return node.finishExportNamedDeclaration(declaration, specifiers, src);
        }
        function parseExportDefaultDeclaration(node) {
          var declaration = null,
              expression = null;
          expectKeyword('default');
          if (matchKeyword('function')) {
            declaration = parseFunctionDeclaration(new Node(), true);
            return node.finishExportDefaultDeclaration(declaration);
          }
          if (matchKeyword('class')) {
            declaration = parseClassDeclaration(true);
            return node.finishExportDefaultDeclaration(declaration);
          }
          if (matchContextualKeyword('from')) {
            throwError(Messages.UnexpectedToken, lookahead.value);
          }
          if (match('{')) {
            expression = parseObjectInitializer();
          } else if (match('[')) {
            expression = parseArrayInitializer();
          } else {
            expression = parseAssignmentExpression();
          }
          consumeSemicolon();
          return node.finishExportDefaultDeclaration(expression);
        }
        function parseExportAllDeclaration(node) {
          var src;
          expect('*');
          if (!matchContextualKeyword('from')) {
            throwError(lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
          }
          lex();
          src = parseModuleSpecifier();
          consumeSemicolon();
          return node.finishExportAllDeclaration(src);
        }
        function parseExportDeclaration() {
          var node = new Node();
          if (state.inFunctionBody) {
            throwError(Messages.IllegalExportDeclaration);
          }
          expectKeyword('export');
          if (matchKeyword('default')) {
            return parseExportDefaultDeclaration(node);
          }
          if (match('*')) {
            return parseExportAllDeclaration(node);
          }
          return parseExportNamedDeclaration(node);
        }
        function parseImportSpecifier() {
          var local,
              imported,
              node = new Node();
          imported = parseNonComputedProperty();
          if (matchContextualKeyword('as')) {
            lex();
            local = parseVariableIdentifier();
          }
          return node.finishImportSpecifier(local, imported);
        }
        function parseNamedImports() {
          var specifiers = [];
          expect('{');
          while (!match('}')) {
            specifiers.push(parseImportSpecifier());
            if (!match('}')) {
              expect(',');
              if (match('}')) {
                break;
              }
            }
          }
          expect('}');
          return specifiers;
        }
        function parseImportDefaultSpecifier() {
          var local,
              node = new Node();
          local = parseNonComputedProperty();
          return node.finishImportDefaultSpecifier(local);
        }
        function parseImportNamespaceSpecifier() {
          var local,
              node = new Node();
          expect('*');
          if (!matchContextualKeyword('as')) {
            throwError(Messages.NoAsAfterImportNamespace);
          }
          lex();
          local = parseNonComputedProperty();
          return node.finishImportNamespaceSpecifier(local);
        }
        function parseImportDeclaration() {
          var specifiers = [],
              src,
              node = new Node();
          if (state.inFunctionBody) {
            throwError(Messages.IllegalImportDeclaration);
          }
          expectKeyword('import');
          if (lookahead.type === Token.StringLiteral) {
            src = parseModuleSpecifier();
          } else {
            if (match('{')) {
              specifiers = specifiers.concat(parseNamedImports());
            } else if (match('*')) {
              specifiers.push(parseImportNamespaceSpecifier());
            } else if (isIdentifierName(lookahead) && !matchKeyword('default')) {
              specifiers.push(parseImportDefaultSpecifier());
              if (match(',')) {
                lex();
                if (match('*')) {
                  specifiers.push(parseImportNamespaceSpecifier());
                } else if (match('{')) {
                  specifiers = specifiers.concat(parseNamedImports());
                } else {
                  throwUnexpectedToken(lookahead);
                }
              }
            } else {
              throwUnexpectedToken(lex());
            }
            if (!matchContextualKeyword('from')) {
              throwError(lookahead.value ? Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
            }
            lex();
            src = parseModuleSpecifier();
          }
          consumeSemicolon();
          return node.finishImportDeclaration(specifiers, src);
        }
        function parseScriptBody() {
          var statement,
              body = [],
              token,
              directive,
              firstRestricted;
          while (startIndex < length) {
            token = lookahead;
            if (token.type !== Token.StringLiteral) {
              break;
            }
            statement = parseStatementListItem();
            body.push(statement);
            if (statement.expression.type !== Syntax.Literal) {
              break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
              strict = true;
              if (firstRestricted) {
                tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
              }
            } else {
              if (!firstRestricted && token.octal) {
                firstRestricted = token;
              }
            }
          }
          while (startIndex < length) {
            statement = parseStatementListItem();
            if (typeof statement === 'undefined') {
              break;
            }
            body.push(statement);
          }
          return body;
        }
        function parseProgram() {
          var body,
              node;
          peek();
          node = new Node();
          body = parseScriptBody();
          return node.finishProgram(body, state.sourceType);
        }
        function filterTokenLocation() {
          var i,
              entry,
              token,
              tokens = [];
          for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
              type: entry.type,
              value: entry.value
            };
            if (entry.regex) {
              token.regex = {
                pattern: entry.regex.pattern,
                flags: entry.regex.flags
              };
            }
            if (extra.range) {
              token.range = entry.range;
            }
            if (extra.loc) {
              token.loc = entry.loc;
            }
            tokens.push(token);
          }
          extra.tokens = tokens;
        }
        function tokenize(code, options, delegate) {
          var toString,
              tokens;
          toString = String;
          if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
          }
          source = code;
          index = 0;
          lineNumber = (source.length > 0) ? 1 : 0;
          lineStart = 0;
          startIndex = index;
          startLineNumber = lineNumber;
          startLineStart = lineStart;
          length = source.length;
          lookahead = null;
          state = {
            allowIn: true,
            allowYield: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1,
            curlyStack: []
          };
          extra = {};
          options = options || {};
          options.tokens = true;
          extra.tokens = [];
          extra.tokenValues = [];
          extra.tokenize = true;
          extra.delegate = delegate;
          extra.openParenToken = -1;
          extra.openCurlyToken = -1;
          extra.range = (typeof options.range === 'boolean') && options.range;
          extra.loc = (typeof options.loc === 'boolean') && options.loc;
          if (typeof options.comment === 'boolean' && options.comment) {
            extra.comments = [];
          }
          if (typeof options.tolerant === 'boolean' && options.tolerant) {
            extra.errors = [];
          }
          try {
            peek();
            if (lookahead.type === Token.EOF) {
              return extra.tokens;
            }
            lex();
            while (lookahead.type !== Token.EOF) {
              try {
                lex();
              } catch (lexError) {
                if (extra.errors) {
                  recordError(lexError);
                  break;
                } else {
                  throw lexError;
                }
              }
            }
            tokens = extra.tokens;
            if (typeof extra.errors !== 'undefined') {
              tokens.errors = extra.errors;
            }
          } catch (e) {
            throw e;
          } finally {
            extra = {};
          }
          return tokens;
        }
        function parse(code, options) {
          var program,
              toString;
          toString = String;
          if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
          }
          source = code;
          index = 0;
          lineNumber = (source.length > 0) ? 1 : 0;
          lineStart = 0;
          startIndex = index;
          startLineNumber = lineNumber;
          startLineStart = lineStart;
          length = source.length;
          lookahead = null;
          state = {
            allowIn: true,
            allowYield: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1,
            curlyStack: [],
            sourceType: 'script'
          };
          strict = false;
          extra = {};
          if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;
            if (extra.loc && options.source !== null && options.source !== undefined) {
              extra.source = toString(options.source);
            }
            if (typeof options.tokens === 'boolean' && options.tokens) {
              extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
              extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
              extra.errors = [];
            }
            if (extra.attachComment) {
              extra.range = true;
              extra.comments = [];
              extra.bottomRightStack = [];
              extra.trailingComments = [];
              extra.leadingComments = [];
            }
            if (options.sourceType === 'module') {
              state.sourceType = options.sourceType;
              strict = true;
            }
          }
          try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
              program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
              filterTokenLocation();
              program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
              program.errors = extra.errors;
            }
          } catch (e) {
            throw e;
          } finally {
            extra = {};
          }
          return program;
        }
        exports.version = '2.7.2';
        exports.tokenize = tokenize;
        exports.parse = parse;
        exports.Syntax = (function() {
          var name,
              types = {};
          if (typeof Object.create === 'function') {
            types = Object.create(null);
          }
          for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
              types[name] = Syntax[name];
            }
          }
          if (typeof Object.freeze === 'function') {
            Object.freeze(types);
          }
          return types;
        }());
      }));
    });
    var esprima$1 = interopDefault(esprima);
    var index = createCommonjsModule(function(module) {
      module.exports = hoist;
      function hoist(ast) {
        var parentStack = [];
        var variables = [];
        var functions = [];
        if (Array.isArray(ast)) {
          walkAll(ast);
          prependScope(ast, variables, functions);
        } else {
          walk(ast);
        }
        return ast;
        function walkAll(nodes) {
          var result = null;
          for (var i = 0; i < nodes.length; i++) {
            var childNode = nodes[i];
            if (childNode.type === 'EmptyStatement')
              continue;
            var result = walk(childNode);
            if (result === 'remove') {
              nodes.splice(i--, 1);
            }
          }
        }
        function walk(node) {
          var parent = parentStack[parentStack.length - 1];
          var remove = false;
          parentStack.push(node);
          var excludeBody = false;
          if (shouldScope(node, parent)) {
            hoist(node.body);
            excludeBody = true;
          }
          if (node.type === 'VariableDeclarator') {
            variables.push(node);
          }
          if (node.type === 'FunctionDeclaration') {
            functions.push(node);
            remove = true;
          }
          for (var key in node) {
            if (key === 'type' || (excludeBody && key === 'body'))
              continue;
            if (key in node && node[key] && typeof node[key] == 'object') {
              if (node[key].type) {
                walk(node[key]);
              } else if (Array.isArray(node[key])) {
                walkAll(node[key]);
              }
            }
          }
          parentStack.pop();
          if (remove) {
            return 'remove';
          }
        }
      }
      function shouldScope(node, parent) {
        if (node.type === 'Program') {
          return true;
        } else if (node.type === 'BlockStatement') {
          if (parent && (parent.type === 'FunctionExpression' || parent.type === 'FunctionDeclaration')) {
            return true;
          }
        }
      }
      function prependScope(nodes, variables, functions) {
        if (variables && variables.length) {
          var declarations = [];
          for (var i = 0; i < variables.length; i++) {
            declarations.push({
              type: 'VariableDeclarator',
              id: variables[i].id,
              init: null
            });
          }
          nodes.unshift({
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: declarations
          });
        }
        if (functions && functions.length) {
          for (var i = 0; i < functions.length; i++) {
            nodes.unshift(functions[i]);
          }
        }
      }
    });
    var hoist = interopDefault(index);
    var maxIterations = 1000000;
    var parse = esprima$1.parse;
    function safeEval(src, parentContext) {
      var tree = prepareAst(src);
      var context = Object.create(parentContext || {});
      return finalValue(evaluateAst(tree, context));
    }
    safeEval.func = FunctionFactory();
    function FunctionFactory(parentContext) {
      var context = Object.create(parentContext || {});
      return function Function() {
        var args = Array.prototype.slice.call(arguments);
        var src = args.slice(-1)[0];
        args = args.slice(0, -1);
        if (typeof src === 'string') {
          src = parse('function a(){ ' + src + '}').body[0].body;
        }
        var tree = prepareAst(src);
        return getFunction(tree, args, context);
      };
    }
    function prepareAst(src) {
      var tree = (typeof src === 'string') ? parse(src) : src;
      return hoist(tree);
    }
    function evaluateAst(tree, context) {
      var safeFunction = FunctionFactory(context);
      var primitives = Primitives(context);
      var blockContext = context;
      return walk(tree);
      function walkAll(nodes) {
        var result = undefined;
        for (var i = 0; i < nodes.length; i++) {
          var childNode = nodes[i];
          if (childNode.type === 'EmptyStatement')
            continue;
          result = walk(childNode);
          if (result instanceof ReturnValue) {
            return result;
          }
        }
        return result;
      }
      function walk(node) {
        if (!node)
          return;
        switch (node.type) {
          case 'Program':
            return walkAll(node.body);
          case 'BlockStatement':
            enterBlock();
            var result = walkAll(node.body);
            leaveBlock();
            return result;
          case 'SequenceExpression':
            return walkAll(node.expressions);
          case 'FunctionDeclaration':
            var params = node.params.map(getName);
            var value = getFunction(node.body, params, blockContext);
            return context[node.id.name] = value;
          case 'FunctionExpression':
            var params = node.params.map(getName);
            return getFunction(node.body, params, blockContext);
          case 'ReturnStatement':
            var value = walk(node.argument);
            return new ReturnValue('return', value);
          case 'BreakStatement':
            return new ReturnValue('break');
          case 'ContinueStatement':
            return new ReturnValue('continue');
          case 'ExpressionStatement':
            return walk(node.expression);
          case 'AssignmentExpression':
            return setValue(blockContext, node.left, node.right, node.operator);
          case 'UpdateExpression':
            return setValue(blockContext, node.argument, null, node.operator);
          case 'VariableDeclaration':
            node.declarations.forEach(function(declaration) {
              var target = node.kind === 'let' ? blockContext : context;
              if (declaration.init) {
                target[declaration.id.name] = walk(declaration.init);
              } else {
                target[declaration.id.name] = undefined;
              }
            });
            break;
          case 'SwitchStatement':
            var defaultHandler = null;
            var matched = false;
            var value = walk(node.discriminant);
            var result = undefined;
            enterBlock();
            var i = 0;
            while (result == null) {
              if (i < node.cases.length) {
                if (node.cases[i].test) {
                  matched = matched || (walk(node.cases[i].test) === value);
                } else if (defaultHandler == null) {
                  defaultHandler = i;
                }
                if (matched) {
                  var r = walkAll(node.cases[i].consequent);
                  if (r instanceof ReturnValue) {
                    if (r.type == 'break')
                      break;
                    result = r;
                  }
                }
                i += 1;
              } else if (!matched && defaultHandler != null) {
                i = defaultHandler;
                matched = true;
              } else {
                break;
              }
            }
            leaveBlock();
            return result;
          case 'IfStatement':
            if (walk(node.test)) {
              return walk(node.consequent);
            } else if (node.alternate) {
              return walk(node.alternate);
            }
          case 'ForStatement':
            var infinite = InfiniteChecker(maxIterations);
            var result = undefined;
            enterBlock();
            for (walk(node.init); walk(node.test); walk(node.update)) {
              var r = walk(node.body);
              if (r instanceof ReturnValue) {
                if (r.type == 'continue')
                  continue;
                if (r.type == 'break')
                  break;
                result = r;
                break;
              }
              infinite.check();
            }
            leaveBlock();
            return result;
          case 'ForInStatement':
            var infinite = InfiniteChecker(maxIterations);
            var result = undefined;
            var value = walk(node.right);
            var property = node.left;
            var target = context;
            enterBlock();
            if (property.type == 'VariableDeclaration') {
              walk(property);
              property = property.declarations[0].id;
              if (property.kind === 'let') {
                target = blockContext;
              }
            }
            for (var key in value) {
              setValue(target, property, {
                type: 'Literal',
                value: key
              });
              var r = walk(node.body);
              if (r instanceof ReturnValue) {
                if (r.type == 'continue')
                  continue;
                if (r.type == 'break')
                  break;
                result = r;
                break;
              }
              infinite.check();
            }
            leaveBlock();
            return result;
          case 'WhileStatement':
            var infinite = InfiniteChecker(maxIterations);
            while (walk(node.test)) {
              walk(node.body);
              infinite.check();
            }
            break;
          case 'TryStatement':
            try {
              walk(node.block);
            } catch (error) {
              enterBlock();
              var catchClause = node.handlers[0];
              if (catchClause) {
                blockContext[catchClause.param.name] = error;
                walk(catchClause.body);
              }
              leaveBlock();
            } finally {
              if (node.finalizer) {
                walk(node.finalizer);
              }
            }
            break;
          case 'Literal':
            return node.value;
          case 'UnaryExpression':
            var val = walk(node.argument);
            switch (node.operator) {
              case '+':
                return +val;
              case '-':
                return -val;
              case '~':
                return ~val;
              case '!':
                return !val;
              case 'void':
                return void val;
              case 'typeof':
                return typeof val;
              default:
                return unsupportedExpression(node);
            }
          case 'ArrayExpression':
            var obj = blockContext['Array']();
            for (var i = 0; i < node.elements.length; i++) {
              obj.push(walk(node.elements[i]));
            }
            return obj;
          case 'ObjectExpression':
            var obj = blockContext['Object']();
            for (var i = 0; i < node.properties.length; i++) {
              var prop = node.properties[i];
              var value = (prop.value === null) ? prop.value : walk(prop.value);
              obj[prop.key.value || prop.key.name] = value;
            }
            return obj;
          case 'NewExpression':
            var args = node.arguments.map(function(arg) {
              return walk(arg);
            });
            var target = walk(node.callee);
            return primitives.applyNew(target, args);
          case 'BinaryExpression':
            var l = walk(node.left);
            var r = walk(node.right);
            switch (node.operator) {
              case '==':
                return l === r;
              case '===':
                return l === r;
              case '!=':
                return l != r;
              case '!==':
                return l !== r;
              case '+':
                return l + r;
              case '-':
                return l - r;
              case '*':
                return l * r;
              case '/':
                return l / r;
              case '%':
                return l % r;
              case '<':
                return l < r;
              case '<=':
                return l <= r;
              case '>':
                return l > r;
              case '>=':
                return l >= r;
              case '|':
                return l | r;
              case '&':
                return l & r;
              case '^':
                return l ^ r;
              case 'in':
                return l in r;
              case 'instanceof':
                return l instanceof r;
              default:
                return unsupportedExpression(node);
            }
          case 'LogicalExpression':
            switch (node.operator) {
              case '&&':
                return walk(node.left) && walk(node.right);
              case '||':
                return walk(node.left) || walk(node.right);
              default:
                return unsupportedExpression(node);
            }
          case 'ThisExpression':
            return blockContext['this'];
          case 'Identifier':
            if (node.name === 'undefined') {
              return undefined;
            } else if (hasProperty(blockContext, node.name, primitives)) {
              return finalValue(blockContext[node.name]);
            } else {
              throw new ReferenceError(node.name + ' is not defined');
            }
          case 'CallExpression':
            var args = node.arguments.map(function(arg) {
              return walk(arg);
            });
            var object = null;
            var target = walk(node.callee);
            if (node.callee.type === 'MemberExpression') {
              object = walk(node.callee.object);
            }
            return target.apply(object, args);
          case 'MemberExpression':
            var obj = walk(node.object);
            if (node.computed) {
              var prop = walk(node.property);
            } else {
              var prop = node.property.name;
            }
            obj = primitives.getPropertyObject(obj, prop);
            return checkValue(obj[prop]);
          case 'ConditionalExpression':
            var val = walk(node.test);
            return val ? walk(node.consequent) : walk(node.alternate);
          case 'EmptyStatement':
            return;
          default:
            return unsupportedExpression(node);
        }
      }
      function checkValue(value) {
        if (value === Function) {
          value = safeFunction;
        }
        return finalValue(value);
      }
      function enterBlock() {
        blockContext = Object.create(blockContext);
      }
      function leaveBlock() {
        blockContext = Object.getPrototypeOf(blockContext);
      }
      function setValue(object, left, right, operator) {
        var name = null;
        if (left.type === 'Identifier') {
          name = left.name;
          object = objectForKey(object, name, primitives);
        } else if (left.type === 'MemberExpression') {
          if (left.computed) {
            name = walk(left.property);
          } else {
            name = left.property.name;
          }
          object = walk(left.object);
        }
        if (canSetProperty(object, name, primitives)) {
          switch (operator) {
            case undefined:
              return object[name] = walk(right);
            case '=':
              return object[name] = walk(right);
            case '+=':
              return object[name] += walk(right);
            case '-=':
              return object[name] -= walk(right);
            case '++':
              return object[name]++;
            case '--':
              return object[name]--;
          }
        }
      }
    }
    function unsupportedExpression(node) {
      console.error(node);
      var err = new Error('Unsupported expression: ' + node.type);
      err.node = node;
      throw err;
    }
    function objectForKey(object, key, primitives) {
      var proto = primitives.getPrototypeOf(object);
      if (!proto || hasOwnProperty(object, key)) {
        return object;
      } else {
        return objectForKey(proto, key, primitives);
      }
    }
    function hasProperty(object, key, primitives) {
      var proto = primitives.getPrototypeOf(object);
      var hasOwn = hasOwnProperty(object, key);
      if (object[key] !== undefined) {
        return true;
      } else if (!proto || hasOwn) {
        return hasOwn;
      } else {
        return hasProperty(proto, key, primitives);
      }
    }
    function hasOwnProperty(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }
    function propertyIsEnumerable(object, key) {
      return Object.prototype.propertyIsEnumerable.call(object, key);
    }
    function canSetProperty(object, property, primitives) {
      if (property === '__proto__' || primitives.isPrimitive(object)) {
        return false;
      } else if (object != null) {
        if (hasOwnProperty(object, property)) {
          if (propertyIsEnumerable(object, property)) {
            return true;
          } else {
            return false;
          }
        } else {
          return canSetProperty(primitives.getPrototypeOf(object), property, primitives);
        }
      } else {
        return true;
      }
    }
    function getFunction(body, params, parentContext) {
      return function() {
        var context = Object.create(parentContext),
            g = getGlobal();
        context['window'] = context['global'] = g;
        if (this == g) {
          context['this'] = null;
        } else {
          context['this'] = this;
        }
        var args = Array.prototype.slice.call(arguments);
        context['arguments'] = arguments;
        args.forEach(function(arg, idx) {
          var param = params[idx];
          if (param) {
            context[param] = arg;
          }
        });
        var result = evaluateAst(body, context);
        if (result instanceof ReturnValue) {
          return result.value;
        }
      };
    }
    function finalValue(value) {
      if (value instanceof ReturnValue) {
        return value.value;
      }
      return value;
    }
    function getName(identifier) {
      return identifier.name;
    }
    function ReturnValue(type, value) {
      this.type = type;
      this.value = value;
    }
    var brackets = (function(UNDEF) {
      var REGLOB = 'g',
          R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,
          R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'/g,
          S_QBLOCKS = R_STRINGS.source + '|' + /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' + /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/.source,
          UNSUPPORTED = RegExp('[\\' + 'x00-\\x1F<>a-zA-Z0-9\'",;\\\\]'),
          NEED_ESCAPE = /(?=[[\]()*+?.^$|])/g,
          FINDBRACES = {
            '(': RegExp('([()])|' + S_QBLOCKS, REGLOB),
            '[': RegExp('([[\\]])|' + S_QBLOCKS, REGLOB),
            '{': RegExp('([{}])|' + S_QBLOCKS, REGLOB)
          },
          DEFAULT = '{ }';
      var _pairs = ['{', '}', '{', '}', /{[^}]*}/, /\\([{}])/g, /\\({)|{/g, RegExp('\\\\(})|([[({])|(})|' + S_QBLOCKS, REGLOB), DEFAULT, /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/, /(^|[^\\]){=[\S\s]*?}/];
      var cachedBrackets = UNDEF,
          _regex,
          _cache = [],
          _settings;
      function _loopback(re) {
        return re;
      }
      function _rewrite(re, bp) {
        if (!bp)
          bp = _cache;
        return new RegExp(re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : '');
      }
      function _create(pair) {
        if (pair === DEFAULT)
          return _pairs;
        var arr = pair.split(' ');
        if (arr.length !== 2 || UNSUPPORTED.test(pair)) {
          throw new Error('Unsupported brackets "' + pair + '"');
        }
        arr = arr.concat(pair.replace(NEED_ESCAPE, '\\').split(' '));
        arr[4] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[4], arr);
        arr[5] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[5], arr);
        arr[6] = _rewrite(_pairs[6], arr);
        arr[7] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCKS, REGLOB);
        arr[8] = pair;
        return arr;
      }
      function _brackets(reOrIdx) {
        return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx];
      }
      _brackets.split = function split(str, tmpl, _bp) {
        if (!_bp)
          _bp = _cache;
        var parts = [],
            match,
            isexpr,
            start,
            pos,
            re = _bp[6];
        isexpr = start = re.lastIndex = 0;
        while ((match = re.exec(str))) {
          pos = match.index;
          if (isexpr) {
            if (match[2]) {
              re.lastIndex = skipBraces(str, match[2], re.lastIndex);
              continue;
            }
            if (!match[3]) {
              continue;
            }
          }
          if (!match[1]) {
            unescapeStr(str.slice(start, pos));
            start = re.lastIndex;
            re = _bp[6 + (isexpr ^= 1)];
            re.lastIndex = start;
          }
        }
        if (str && start < str.length) {
          unescapeStr(str.slice(start));
        }
        return parts;
        function unescapeStr(s) {
          if (tmpl || isexpr) {
            parts.push(s && s.replace(_bp[5], '$1'));
          } else {
            parts.push(s);
          }
        }
        function skipBraces(s, ch, ix) {
          var match,
              recch = FINDBRACES[ch];
          recch.lastIndex = ix;
          ix = 1;
          while ((match = recch.exec(s))) {
            if (match[1] && !(match[1] === ch ? ++ix : --ix))
              break;
          }
          return ix ? s.length : recch.lastIndex;
        }
      };
      _brackets.hasExpr = function hasExpr(str) {
        return _cache[4].test(str);
      };
      _brackets.loopKeys = function loopKeys(expr) {
        var m = expr.match(_cache[9]);
        return m ? {
          key: m[1],
          pos: m[2],
          val: _cache[0] + m[3].trim() + _cache[1]
        } : {val: expr.trim()};
      };
      _brackets.array = function array(pair) {
        return pair ? _create(pair) : _cache;
      };
      function _reset(pair) {
        if ((pair || (pair = DEFAULT)) !== _cache[8]) {
          _cache = _create(pair);
          _regex = pair === DEFAULT ? _loopback : _rewrite;
          _cache[9] = _regex(_pairs[9]);
        }
        cachedBrackets = pair;
      }
      function _setSettings(o) {
        var b;
        o = o || {};
        b = o.brackets;
        Object.defineProperty(o, 'brackets', {
          set: _reset,
          get: function() {
            return cachedBrackets;
          },
          enumerable: true
        });
        _settings = o;
        _reset(b);
      }
      Object.defineProperty(_brackets, 'settings', {
        set: _setSettings,
        get: function() {
          return _settings;
        }
      });
      _brackets.settings = typeof riot !== 'undefined' && riot.settings || {};
      _brackets.set = _reset;
      _brackets.R_STRINGS = R_STRINGS;
      _brackets.R_MLCOMMS = R_MLCOMMS;
      _brackets.S_QBLOCKS = S_QBLOCKS;
      return _brackets;
    })();
    var tmpl = (function() {
      var _cache = {};
      function _tmpl(str, data) {
        if (!str)
          return str;
        return (_cache[str] || (_cache[str] = _create(str))).call(data, _logErr);
      }
      _tmpl.haveRaw = brackets.hasRaw;
      _tmpl.hasExpr = brackets.hasExpr;
      _tmpl.loopKeys = brackets.loopKeys;
      _tmpl.clearCache = function() {
        _cache = {};
      };
      _tmpl.errorHandler = null;
      function _logErr(err, ctx) {
        if (_tmpl.errorHandler) {
          err.riotData = {
            tagName: ctx && ctx.root && ctx.root.tagName,
            _riot_id: ctx && ctx._riot_id
          };
          _tmpl.errorHandler(err);
        }
      }
      function _create(str) {
        var expr = _getTmpl(str);
        if (expr.slice(0, 11) !== 'try{return ')
          expr = 'return ' + expr;
        return safeEval.func('E', expr + ';');
      }
      var CH_IDEXPR = '\u2057',
          RE_CSNAME = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\u2057(\d+)~):/,
          RE_QBLOCK = RegExp(brackets.S_QBLOCKS, 'g'),
          RE_DQUOTE = /\u2057/g,
          RE_QBMARK = /\u2057(\d+)~/g;
      function _getTmpl(str) {
        var qstr = [],
            expr,
            parts = brackets.split(str.replace(RE_DQUOTE, '"'), 1);
        if (parts.length > 2 || parts[0]) {
          var i,
              j,
              list = [];
          for (i = j = 0; i < parts.length; ++i) {
            expr = parts[i];
            if (expr && (expr = i & 1 ? _parseExpr(expr, 1, qstr) : '"' + expr.replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/"/g, '\\"') + '"'))
              list[j++] = expr;
          }
          expr = j < 2 ? list[0] : '[' + list.join(',') + '].join("")';
        } else {
          expr = _parseExpr(parts[1], 0, qstr);
        }
        if (qstr[0]) {
          expr = expr.replace(RE_QBMARK, function(_, pos) {
            return qstr[pos].replace(/\r/g, '\\r').replace(/\n/g, '\\n');
          });
        }
        return expr;
      }
      var RE_BREND = {
        '(': /[()]/g,
        '[': /[[\]]/g,
        '{': /[{}]/g
      };
      function _parseExpr(expr, asText, qstr) {
        expr = expr.replace(RE_QBLOCK, function(s, div) {
          return s.length > 2 && !div ? CH_IDEXPR + (qstr.push(s) - 1) + '~' : s;
        }).replace(/\s+/g, ' ').trim().replace(/\ ?([[\({},?\.:])\ ?/g, '$1');
        if (expr) {
          var list = [],
              cnt = 0,
              match;
          while (expr && (match = expr.match(RE_CSNAME)) && !match.index) {
            var key,
                jsb,
                re = /,|([[{(])|$/g;
            expr = RegExp.rightContext;
            key = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1];
            while (jsb = (match = re.exec(expr))[1])
              skipBraces(jsb, re);
            jsb = expr.slice(0, match.index);
            expr = RegExp.rightContext;
            list[cnt++] = _wrapExpr(jsb, 1, key);
          }
          expr = !cnt ? _wrapExpr(expr, asText) : cnt > 1 ? '[' + list.join(',') + '].join(" ").trim()' : list[0];
        }
        return expr;
        function skipBraces(ch, re) {
          var mm,
              lv = 1,
              ir = RE_BREND[ch];
          ir.lastIndex = re.lastIndex;
          while (mm = ir.exec(expr)) {
            if (mm[0] === ch)
              ++lv;
            else if (!--lv)
              break;
          }
          re.lastIndex = lv ? expr.length : ir.lastIndex;
        }
      }
      var JS_CONTEXT = '"in this?this:' + (typeof window !== 'object' ? 'global' : 'window') + ').',
          JS_VARNAME = /[,{][$\w]+(?=:)|(^ *|[^$\w\.])(?!(?:typeof|true|false|null|undefined|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g,
          JS_NOPROPS = /^(?=(\.[$\w]+))\1(?:[^.[(]|$)/;
      function _wrapExpr(expr, asText, key) {
        var tb;
        expr = expr.replace(JS_VARNAME, function(match, p, mvar, pos, s) {
          if (mvar) {
            pos = tb ? 0 : pos + match.length;
            if (mvar !== 'this' && mvar !== 'global' && mvar !== 'window') {
              match = p + '("' + mvar + JS_CONTEXT + mvar;
              if (pos)
                tb = (s = s[pos]) === '.' || s === '(' || s === '[';
            } else if (pos) {
              tb = !JS_NOPROPS.test(s.slice(pos));
            }
          }
          return match;
        });
        if (tb) {
          expr = 'try{return ' + expr + '}catch(e){E(e,this)}';
        }
        if (key) {
          expr = (tb ? 'function(){' + expr + '}.call(this)' : '(' + expr + ')') + '?"' + key + '":""';
        } else if (asText) {
          expr = 'function(v){' + (tb ? expr.replace('return ', 'v=') : 'v=(' + expr + ')') + ';return v||v===0?v:""}.call(this)';
        }
        return expr;
      }
      _tmpl.version = brackets.version = 'v2.4.1';
      return _tmpl;
    })();
    exports.brackets = brackets;
    exports.tmpl = tmpl;
    Object.defineProperty(exports, '__esModule', {value: true});
  })));
  ;
  (function(window, undefined) {
    'use strict';
    var tmpl = cspTmpl.tmpl,
        brackets = cspTmpl.brackets;
    var riot = {
      version: 'v2.6.3',
      settings: {}
    },
        __uid = 0,
        __virtualDom = [],
        __tagImpl = {},
        GLOBAL_MIXIN = '__global_mixin',
        RIOT_PREFIX = 'riot-',
        RIOT_TAG = RIOT_PREFIX + 'tag',
        RIOT_TAG_IS = 'data-is',
        T_STRING = 'string',
        T_OBJECT = 'object',
        T_UNDEF = 'undefined',
        T_FUNCTION = 'function',
        XLINK_NS = 'http://www.w3.org/1999/xlink',
        XLINK_REGEX = /^xlink:(\w+)/,
        SPECIAL_TAGS_REGEX = /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?|opt(?:ion|group))$/,
        RESERVED_WORDS_BLACKLIST = /^(?:_(?:item|id|parent)|update|root|(?:un)?mount|mixin|is(?:Mounted|Loop)|tags|parent|opts|trigger|o(?:n|ff|ne))$/,
        SVG_TAGS_LIST = ['altGlyph', 'animate', 'animateColor', 'circle', 'clipPath', 'defs', 'ellipse', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feFlood', 'feGaussianBlur', 'feImage', 'feMerge', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile', 'feTurbulence', 'filter', 'font', 'foreignObject', 'g', 'glyph', 'glyphRef', 'image', 'line', 'linearGradient', 'marker', 'mask', 'missing-glyph', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'stop', 'svg', 'switch', 'symbol', 'text', 'textPath', 'tref', 'tspan', 'use'],
        IE_VERSION = (window && window.document || {}).documentMode | 0,
        FIREFOX = window && !!window.InstallTrigger;
    riot.observable = function(el) {
      el = el || {};
      var callbacks = {},
          slice = Array.prototype.slice;
      function onEachEvent(e, fn) {
        var es = e.split(' '),
            l = es.length,
            i = 0;
        for (; i < l; i++) {
          var name = es[i];
          if (name)
            fn(name, i);
        }
      }
      Object.defineProperties(el, {
        on: {
          value: function(events, fn) {
            if (typeof fn != 'function')
              return el;
            onEachEvent(events, function(name, pos) {
              (callbacks[name] = callbacks[name] || []).push(fn);
              fn.typed = pos > 0;
            });
            return el;
          },
          enumerable: false,
          writable: false,
          configurable: false
        },
        off: {
          value: function(events, fn) {
            if (events == '*' && !fn)
              callbacks = {};
            else {
              onEachEvent(events, function(name, pos) {
                if (fn) {
                  var arr = callbacks[name];
                  for (var i = 0,
                      cb; cb = arr && arr[i]; ++i) {
                    if (cb == fn)
                      arr.splice(i--, 1);
                  }
                } else
                  delete callbacks[name];
              });
            }
            return el;
          },
          enumerable: false,
          writable: false,
          configurable: false
        },
        one: {
          value: function(events, fn) {
            function on() {
              el.off(events, on);
              fn.apply(el, arguments);
            }
            return el.on(events, on);
          },
          enumerable: false,
          writable: false,
          configurable: false
        },
        trigger: {
          value: function(events) {
            var arglen = arguments.length - 1,
                args = new Array(arglen),
                fns;
            for (var i = 0; i < arglen; i++) {
              args[i] = arguments[i + 1];
            }
            onEachEvent(events, function(name, pos) {
              fns = slice.call(callbacks[name] || [], 0);
              for (var i = 0,
                  fn; fn = fns[i]; ++i) {
                if (fn.busy)
                  continue;
                fn.busy = 1;
                fn.apply(el, fn.typed ? [name].concat(args) : args);
                if (fns[i] !== fn) {
                  i--;
                }
                fn.busy = 0;
              }
              if (callbacks['*'] && name != '*')
                el.trigger.apply(el, ['*', name].concat(args));
            });
            return el;
          },
          enumerable: false,
          writable: false,
          configurable: false
        }
      });
      return el;
    };
    ;
    (function(riot) {
      var RE_ORIGIN = /^.+?\/\/+[^\/]+/,
          EVENT_LISTENER = 'EventListener',
          REMOVE_EVENT_LISTENER = 'remove' + EVENT_LISTENER,
          ADD_EVENT_LISTENER = 'add' + EVENT_LISTENER,
          HAS_ATTRIBUTE = 'hasAttribute',
          REPLACE = 'replace',
          POPSTATE = 'popstate',
          HASHCHANGE = 'hashchange',
          TRIGGER = 'trigger',
          MAX_EMIT_STACK_LEVEL = 3,
          win = typeof window != 'undefined' && window,
          doc = typeof document != 'undefined' && document,
          hist = win && history,
          loc = win && (hist.location || win.location),
          prot = Router.prototype,
          clickEvent = doc && doc.ontouchstart ? 'touchstart' : 'click',
          started = false,
          central = riot.observable(),
          routeFound = false,
          debouncedEmit,
          base,
          current,
          parser,
          secondParser,
          emitStack = [],
          emitStackLevel = 0;
      function DEFAULT_PARSER(path) {
        return path.split(/[/?#]/);
      }
      function DEFAULT_SECOND_PARSER(path, filter) {
        var re = new RegExp('^' + filter[REPLACE](/\*/g, '([^/?#]+?)')[REPLACE](/\.\./, '.*') + '$'),
            args = path.match(re);
        if (args)
          return args.slice(1);
      }
      function debounce(fn, delay) {
        var t;
        return function() {
          clearTimeout(t);
          t = setTimeout(fn, delay);
        };
      }
      function start(autoExec) {
        debouncedEmit = debounce(emit, 1);
        win[ADD_EVENT_LISTENER](POPSTATE, debouncedEmit);
        win[ADD_EVENT_LISTENER](HASHCHANGE, debouncedEmit);
        doc[ADD_EVENT_LISTENER](clickEvent, click);
        if (autoExec)
          emit(true);
      }
      function Router() {
        this.$ = [];
        riot.observable(this);
        central.on('stop', this.s.bind(this));
        central.on('emit', this.e.bind(this));
      }
      function normalize(path) {
        return path[REPLACE](/^\/|\/$/, '');
      }
      function isString(str) {
        return typeof str == 'string';
      }
      function getPathFromRoot(href) {
        return (href || loc.href)[REPLACE](RE_ORIGIN, '');
      }
      function getPathFromBase(href) {
        return base[0] == '#' ? (href || loc.href || '').split(base)[1] || '' : (loc ? getPathFromRoot(href) : href || '')[REPLACE](base, '');
      }
      function emit(force) {
        var isRoot = emitStackLevel == 0,
            first;
        if (MAX_EMIT_STACK_LEVEL <= emitStackLevel)
          return;
        emitStackLevel++;
        emitStack.push(function() {
          var path = getPathFromBase();
          if (force || path != current) {
            central[TRIGGER]('emit', path);
            current = path;
          }
        });
        if (isRoot) {
          while (first = emitStack.shift())
            first();
          emitStackLevel = 0;
        }
      }
      function click(e) {
        if (e.which != 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented)
          return;
        var el = e.target;
        while (el && el.nodeName != 'A')
          el = el.parentNode;
        if (!el || el.nodeName != 'A' || el[HAS_ATTRIBUTE]('download') || !el[HAS_ATTRIBUTE]('href') || el.target && el.target != '_self' || el.href.indexOf(loc.href.match(RE_ORIGIN)[0]) == -1)
          return;
        if (el.href != loc.href && (el.href.split('#')[0] == loc.href.split('#')[0] || base[0] != '#' && getPathFromRoot(el.href).indexOf(base) !== 0 || base[0] == '#' && el.href.split(base)[0] != loc.href.split(base)[0] || !go(getPathFromBase(el.href), el.title || doc.title)))
          return;
        e.preventDefault();
      }
      function go(path, title, shouldReplace) {
        if (!hist)
          return central[TRIGGER]('emit', getPathFromBase(path));
        path = base + normalize(path);
        title = title || doc.title;
        shouldReplace ? hist.replaceState(null, title, path) : hist.pushState(null, title, path);
        doc.title = title;
        routeFound = false;
        emit();
        return routeFound;
      }
      prot.m = function(first, second, third) {
        if (isString(first) && (!second || isString(second)))
          go(first, second, third || false);
        else if (second)
          this.r(first, second);
        else
          this.r('@', first);
      };
      prot.s = function() {
        this.off('*');
        this.$ = [];
      };
      prot.e = function(path) {
        this.$.concat('@').some(function(filter) {
          var args = (filter == '@' ? parser : secondParser)(normalize(path), normalize(filter));
          if (typeof args != 'undefined') {
            this[TRIGGER].apply(null, [filter].concat(args));
            return routeFound = true;
          }
        }, this);
      };
      prot.r = function(filter, action) {
        if (filter != '@') {
          filter = '/' + normalize(filter);
          this.$.push(filter);
        }
        this.on(filter, action);
      };
      var mainRouter = new Router();
      var route = mainRouter.m.bind(mainRouter);
      route.create = function() {
        var newSubRouter = new Router();
        var router = newSubRouter.m.bind(newSubRouter);
        router.stop = newSubRouter.s.bind(newSubRouter);
        return router;
      };
      route.base = function(arg) {
        base = arg || '#';
        current = getPathFromBase();
      };
      route.exec = function() {
        emit(true);
      };
      route.parser = function(fn, fn2) {
        if (!fn && !fn2) {
          parser = DEFAULT_PARSER;
          secondParser = DEFAULT_SECOND_PARSER;
        }
        if (fn)
          parser = fn;
        if (fn2)
          secondParser = fn2;
      };
      route.query = function() {
        var q = {};
        var href = loc.href || current;
        href[REPLACE](/[?&](.+?)=([^&]*)/g, function(_, k, v) {
          q[k] = v;
        });
        return q;
      };
      route.stop = function() {
        if (started) {
          if (win) {
            win[REMOVE_EVENT_LISTENER](POPSTATE, debouncedEmit);
            win[REMOVE_EVENT_LISTENER](HASHCHANGE, debouncedEmit);
            doc[REMOVE_EVENT_LISTENER](clickEvent, click);
          }
          central[TRIGGER]('stop');
          started = false;
        }
      };
      route.start = function(autoExec) {
        if (!started) {
          if (win) {
            if (document.readyState == 'complete')
              start(autoExec);
            else
              win[ADD_EVENT_LISTENER]('load', function() {
                setTimeout(function() {
                  start(autoExec);
                }, 1);
              });
          }
          started = true;
        }
      };
      route.base();
      route.parser();
      riot.route = route;
    })(riot);
    var mkdom = (function _mkdom() {
      var reHasYield = /<yield\b/i,
          reYieldAll = /<yield\s*(?:\/>|>([\S\s]*?)<\/yield\s*>|>)/ig,
          reYieldSrc = /<yield\s+to=['"]([^'">]*)['"]\s*>([\S\s]*?)<\/yield\s*>/ig,
          reYieldDest = /<yield\s+from=['"]?([-\w]+)['"]?\s*(?:\/>|>([\S\s]*?)<\/yield\s*>)/ig;
      var rootEls = {
        tr: 'tbody',
        th: 'tr',
        td: 'tr',
        col: 'colgroup'
      },
          tblTags = IE_VERSION && IE_VERSION < 10 ? SPECIAL_TAGS_REGEX : /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?)$/;
      function _mkdom(templ, html) {
        var match = templ && templ.match(/^\s*<([-\w]+)/),
            tagName = match && match[1].toLowerCase(),
            el = mkEl('div', isSVGTag(tagName));
        templ = replaceYield(templ, html);
        if (tblTags.test(tagName))
          el = specialTags(el, templ, tagName);
        else
          setInnerHTML(el, templ);
        el.stub = true;
        return el;
      }
      function specialTags(el, templ, tagName) {
        var select = tagName[0] === 'o',
            parent = select ? 'select>' : 'table>';
        el.innerHTML = '<' + parent + templ.trim() + '</' + parent;
        parent = el.firstChild;
        if (select) {
          parent.selectedIndex = -1;
        } else {
          var tname = rootEls[tagName];
          if (tname && parent.childElementCount === 1)
            parent = $(tname, parent);
        }
        return parent;
      }
      function replaceYield(templ, html) {
        if (!reHasYield.test(templ))
          return templ;
        var src = {};
        html = html && html.replace(reYieldSrc, function(_, ref, text) {
          src[ref] = src[ref] || text;
          return '';
        }).trim();
        return templ.replace(reYieldDest, function(_, ref, def) {
          return src[ref] || def || '';
        }).replace(reYieldAll, function(_, def) {
          return html || def || '';
        });
      }
      return _mkdom;
    })();
    function mkitem(expr, key, val) {
      var item = {};
      item[expr.key] = key;
      if (expr.pos)
        item[expr.pos] = val;
      return item;
    }
    function unmountRedundant(items, tags) {
      var i = tags.length,
          j = items.length,
          t;
      while (i > j) {
        t = tags[--i];
        tags.splice(i, 1);
        t.unmount();
      }
    }
    function moveNestedTags(child, i) {
      Object.keys(child.tags).forEach(function(tagName) {
        var tag = child.tags[tagName];
        if (isArray(tag))
          each(tag, function(t) {
            moveChildTag(t, tagName, i);
          });
        else
          moveChildTag(tag, tagName, i);
      });
    }
    function addVirtual(tag, src, target) {
      var el = tag._root,
          sib;
      tag._virts = [];
      while (el) {
        sib = el.nextSibling;
        if (target)
          src.insertBefore(el, target._root);
        else
          src.appendChild(el);
        tag._virts.push(el);
        el = sib;
      }
    }
    function moveVirtual(tag, src, target, len) {
      var el = tag._root,
          sib,
          i = 0;
      for (; i < len; i++) {
        sib = el.nextSibling;
        src.insertBefore(el, target._root);
        el = sib;
      }
    }
    function _each(dom, parent, expr) {
      remAttr(dom, 'each');
      var mustReorder = typeof getAttr(dom, 'no-reorder') !== T_STRING || remAttr(dom, 'no-reorder'),
          tagName = getTagName(dom),
          impl = __tagImpl[tagName] || {tmpl: getOuterHTML(dom)},
          useRoot = SPECIAL_TAGS_REGEX.test(tagName),
          root = dom.parentNode,
          ref = document.createTextNode(''),
          child = getTag(dom),
          isOption = tagName.toLowerCase() === 'option',
          tags = [],
          oldItems = [],
          hasKeys,
          isVirtual = dom.tagName == 'VIRTUAL';
      expr = tmpl.loopKeys(expr);
      root.insertBefore(ref, dom);
      parent.one('before-mount', function() {
        dom.parentNode.removeChild(dom);
        if (root.stub)
          root = parent.root;
      }).on('update', function() {
        var items = tmpl(expr.val, parent),
            frag = document.createDocumentFragment();
        if (!isArray(items)) {
          hasKeys = items || false;
          items = hasKeys ? Object.keys(items).map(function(key) {
            return mkitem(expr, key, items[key]);
          }) : [];
        }
        var i = 0,
            itemsLength = items.length;
        for (; i < itemsLength; i++) {
          var item = items[i],
              _mustReorder = mustReorder && typeof item == T_OBJECT && !hasKeys,
              oldPos = oldItems.indexOf(item),
              pos = ~oldPos && _mustReorder ? oldPos : i,
              tag = tags[pos];
          item = !hasKeys && expr.key ? mkitem(expr, item, i) : item;
          if (!_mustReorder && !tag || _mustReorder && !~oldPos || !tag) {
            tag = new Tag(impl, {
              parent: parent,
              isLoop: true,
              hasImpl: !!__tagImpl[tagName],
              root: useRoot ? root : dom.cloneNode(),
              item: item
            }, dom.innerHTML);
            tag.mount();
            if (isVirtual)
              tag._root = tag.root.firstChild;
            if (i == tags.length || !tags[i]) {
              if (isVirtual)
                addVirtual(tag, frag);
              else
                frag.appendChild(tag.root);
            } else {
              if (isVirtual)
                addVirtual(tag, root, tags[i]);
              else
                root.insertBefore(tag.root, tags[i].root);
              oldItems.splice(i, 0, item);
            }
            tags.splice(i, 0, tag);
            pos = i;
          } else
            tag.update(item, true);
          if (pos !== i && _mustReorder && tags[i]) {
            if (isVirtual)
              moveVirtual(tag, root, tags[i], dom.childNodes.length);
            else if (tags[i].root.parentNode)
              root.insertBefore(tag.root, tags[i].root);
            if (expr.pos)
              tag[expr.pos] = i;
            tags.splice(i, 0, tags.splice(pos, 1)[0]);
            oldItems.splice(i, 0, oldItems.splice(pos, 1)[0]);
            if (!child && tag.tags)
              moveNestedTags(tag, i);
          }
          tag._item = item;
          defineProperty(tag, '_parent', parent);
        }
        unmountRedundant(items, tags);
        root.insertBefore(frag, ref);
        if (isOption) {
          if (FIREFOX && !root.multiple) {
            for (var n = 0; n < root.length; n++) {
              if (root[n].__riot1374) {
                root.selectedIndex = n;
                delete root[n].__riot1374;
                break;
              }
            }
          }
        }
        if (child)
          parent.tags[tagName] = tags;
        oldItems = items.slice();
      });
    }
    var styleManager = (function(_riot) {
      if (!window)
        return {
          add: function() {},
          inject: function() {}
        };
      var styleNode = (function() {
        var newNode = mkEl('style');
        setAttr(newNode, 'type', 'text/css');
        var userNode = $('style[type=riot]');
        if (userNode) {
          if (userNode.id)
            newNode.id = userNode.id;
          userNode.parentNode.replaceChild(newNode, userNode);
        } else
          document.getElementsByTagName('head')[0].appendChild(newNode);
        return newNode;
      })();
      var cssTextProp = styleNode.styleSheet,
          stylesToInject = '';
      Object.defineProperty(_riot, 'styleNode', {
        value: styleNode,
        writable: true
      });
      return {
        add: function(css) {
          stylesToInject += css;
        },
        inject: function() {
          if (stylesToInject) {
            if (cssTextProp)
              cssTextProp.cssText += stylesToInject;
            else
              styleNode.innerHTML += stylesToInject;
            stylesToInject = '';
          }
        }
      };
    })(riot);
    function parseNamedElements(root, tag, childTags, forceParsingNamed) {
      walk(root, function(dom) {
        if (dom.nodeType == 1) {
          dom.isLoop = dom.isLoop || (dom.parentNode && dom.parentNode.isLoop || getAttr(dom, 'each')) ? 1 : 0;
          if (childTags) {
            var child = getTag(dom);
            if (child && !dom.isLoop)
              childTags.push(initChildTag(child, {
                root: dom,
                parent: tag
              }, dom.innerHTML, tag));
          }
          if (!dom.isLoop || forceParsingNamed)
            setNamed(dom, tag, []);
        }
      });
    }
    function parseExpressions(root, tag, expressions) {
      function addExpr(dom, val, extra) {
        if (tmpl.hasExpr(val)) {
          expressions.push(extend({
            dom: dom,
            expr: val
          }, extra));
        }
      }
      walk(root, function(dom) {
        var type = dom.nodeType,
            attr;
        if (type == 3 && dom.parentNode.tagName != 'STYLE')
          addExpr(dom, dom.nodeValue);
        if (type != 1)
          return;
        attr = getAttr(dom, 'each');
        if (attr) {
          _each(dom, tag, attr);
          return false;
        }
        each(dom.attributes, function(attr) {
          var name = attr.name,
              bool = name.split('__')[1];
          addExpr(dom, attr.value, {
            attr: bool || name,
            bool: bool
          });
          if (bool) {
            remAttr(dom, name);
            return false;
          }
        });
        if (getTag(dom))
          return false;
      });
    }
    function Tag(impl, conf, innerHTML) {
      var self = riot.observable(this),
          opts = inherit(conf.opts) || {},
          parent = conf.parent,
          isLoop = conf.isLoop,
          hasImpl = conf.hasImpl,
          item = cleanUpData(conf.item),
          expressions = [],
          childTags = [],
          root = conf.root,
          tagName = root.tagName.toLowerCase(),
          attr = {},
          propsInSyncWithParent = [],
          dom;
      if (impl.name && root._tag)
        root._tag.unmount(true);
      this.isMounted = false;
      root.isLoop = isLoop;
      root._tag = this;
      defineProperty(this, '_riot_id', ++__uid);
      extend(this, {
        parent: parent,
        root: root,
        opts: opts
      }, item);
      defineProperty(this, 'tags', {});
      each(root.attributes, function(el) {
        var val = el.value;
        if (tmpl.hasExpr(val))
          attr[el.name] = val;
      });
      dom = mkdom(impl.tmpl, innerHTML);
      function updateOpts() {
        var ctx = hasImpl && isLoop ? self : parent || self;
        each(root.attributes, function(el) {
          var val = el.value;
          opts[toCamel(el.name)] = tmpl.hasExpr(val) ? tmpl(val, ctx) : val;
        });
        each(Object.keys(attr), function(name) {
          opts[toCamel(name)] = tmpl(attr[name], ctx);
        });
      }
      function normalizeData(data) {
        for (var key in item) {
          if (typeof self[key] !== T_UNDEF && isWritable(self, key))
            self[key] = data[key];
        }
      }
      function inheritFrom(target) {
        each(Object.keys(target), function(k) {
          var mustSync = !RESERVED_WORDS_BLACKLIST.test(k) && contains(propsInSyncWithParent, k);
          if (typeof self[k] === T_UNDEF || mustSync) {
            if (!mustSync)
              propsInSyncWithParent.push(k);
            self[k] = target[k];
          }
        });
      }
      defineProperty(this, 'update', function(data, isInherited) {
        data = cleanUpData(data);
        if (isLoop) {
          inheritFrom(self.parent);
        }
        if (data && isObject(item)) {
          normalizeData(data);
          item = data;
        }
        extend(self, data);
        updateOpts();
        self.trigger('update', data);
        update(expressions, self);
        if (isInherited && self.parent)
          self.parent.one('updated', function() {
            self.trigger('updated');
          });
        else
          rAF(function() {
            self.trigger('updated');
          });
        return this;
      });
      defineProperty(this, 'mixin', function() {
        each(arguments, function(mix) {
          var instance,
              props = [],
              obj;
          mix = typeof mix === T_STRING ? riot.mixin(mix) : mix;
          if (isFunction(mix)) {
            instance = new mix();
          } else
            instance = mix;
          var proto = Object.getPrototypeOf(instance);
          do
            props = props.concat(Object.getOwnPropertyNames(obj || instance));
 while (obj = Object.getPrototypeOf(obj || instance));
          each(props, function(key) {
            if (key != 'init') {
              var descriptor = Object.getOwnPropertyDescriptor(instance, key) || Object.getOwnPropertyDescriptor(proto, key);
              var hasGetterSetter = descriptor && (descriptor.get || descriptor.set);
              if (!self.hasOwnProperty(key) && hasGetterSetter) {
                Object.defineProperty(self, key, descriptor);
              } else {
                self[key] = isFunction(instance[key]) ? instance[key].bind(self) : instance[key];
              }
            }
          });
          if (instance.init)
            instance.init.bind(self)();
        });
        return this;
      });
      defineProperty(this, 'mount', function() {
        updateOpts();
        var globalMixin = riot.mixin(GLOBAL_MIXIN);
        if (globalMixin)
          for (var i in globalMixin)
            if (globalMixin.hasOwnProperty(i))
              self.mixin(globalMixin[i]);
        if (self._parent && self._parent.root.isLoop) {
          inheritFrom(self._parent);
        }
        if (impl.fn)
          impl.fn.call(self, opts);
        parseExpressions(dom, self, expressions);
        toggle(true);
        if (impl.attrs)
          walkAttributes(impl.attrs, function(k, v) {
            setAttr(root, k, v);
          });
        if (impl.attrs || hasImpl)
          parseExpressions(self.root, self, expressions);
        if (!self.parent || isLoop)
          self.update(item);
        self.trigger('before-mount');
        if (isLoop && !hasImpl) {
          root = dom.firstChild;
        } else {
          while (dom.firstChild)
            root.appendChild(dom.firstChild);
          if (root.stub)
            root = parent.root;
        }
        defineProperty(self, 'root', root);
        if (isLoop)
          parseNamedElements(self.root, self.parent, null, true);
        if (!self.parent || self.parent.isMounted) {
          self.isMounted = true;
          self.trigger('mount');
        } else
          self.parent.one('mount', function() {
            if (!isInStub(self.root)) {
              self.parent.isMounted = self.isMounted = true;
              self.trigger('mount');
            }
          });
      });
      defineProperty(this, 'unmount', function(keepRootTag) {
        var el = root,
            p = el.parentNode,
            ptag,
            tagIndex = __virtualDom.indexOf(self);
        self.trigger('before-unmount');
        if (~tagIndex)
          __virtualDom.splice(tagIndex, 1);
        if (p) {
          if (parent) {
            ptag = getImmediateCustomParentTag(parent);
            if (isArray(ptag.tags[tagName]))
              each(ptag.tags[tagName], function(tag, i) {
                if (tag._riot_id == self._riot_id)
                  ptag.tags[tagName].splice(i, 1);
              });
            else
              ptag.tags[tagName] = undefined;
          } else
            while (el.firstChild)
              el.removeChild(el.firstChild);
          if (!keepRootTag)
            p.removeChild(el);
          else {
            remAttr(p, RIOT_TAG_IS);
            remAttr(p, RIOT_TAG);
          }
        }
        if (this._virts) {
          each(this._virts, function(v) {
            if (v.parentNode)
              v.parentNode.removeChild(v);
          });
        }
        self.trigger('unmount');
        toggle();
        self.off('*');
        self.isMounted = false;
        delete root._tag;
      });
      function onChildUpdate(data) {
        self.update(data, true);
      }
      function toggle(isMount) {
        each(childTags, function(child) {
          child[isMount ? 'mount' : 'unmount']();
        });
        if (!parent)
          return;
        var evt = isMount ? 'on' : 'off';
        if (isLoop)
          parent[evt]('unmount', self.unmount);
        else {
          parent[evt]('update', onChildUpdate)[evt]('unmount', self.unmount);
        }
      }
      parseNamedElements(dom, this, childTags);
    }
    function setEventHandler(name, handler, dom, tag) {
      dom[name] = function(e) {
        var ptag = tag._parent,
            item = tag._item,
            el;
        if (!item)
          while (ptag && !item) {
            item = ptag._item;
            ptag = ptag._parent;
          }
        e = e || window.event;
        if (isWritable(e, 'currentTarget'))
          e.currentTarget = dom;
        if (isWritable(e, 'target'))
          e.target = e.srcElement;
        if (isWritable(e, 'which'))
          e.which = e.charCode || e.keyCode;
        e.item = item;
        if (handler.call(tag, e) !== true && !/radio|check/.test(dom.type)) {
          if (e.preventDefault)
            e.preventDefault();
          e.returnValue = false;
        }
        if (!e.preventUpdate) {
          el = item ? getImmediateCustomParentTag(ptag) : tag;
          el.update();
        }
      };
    }
    function insertTo(root, node, before) {
      if (!root)
        return;
      root.insertBefore(before, node);
      root.removeChild(node);
    }
    function update(expressions, tag) {
      each(expressions, function(expr, i) {
        var dom = expr.dom,
            attrName = expr.attr,
            value = tmpl(expr.expr, tag),
            parent = expr.parent || expr.dom.parentNode;
        if (expr.bool) {
          value = !!value;
        } else if (value == null) {
          value = '';
        }
        if (expr.value === value) {
          return;
        }
        expr.value = value;
        if (!attrName) {
          value += '';
          if (parent) {
            expr.parent = parent;
            if (parent.tagName === 'TEXTAREA') {
              parent.value = value;
              if (!IE_VERSION)
                dom.nodeValue = value;
            } else
              dom.nodeValue = value;
          }
          return;
        }
        if (attrName === 'value') {
          if (dom.value !== value) {
            dom.value = value;
            setAttr(dom, attrName, value);
          }
          return;
        } else {
          remAttr(dom, attrName);
        }
        if (isFunction(value)) {
          setEventHandler(attrName, value, dom, tag);
        } else if (attrName == 'if') {
          var stub = expr.stub,
              add = function() {
                insertTo(stub.parentNode, stub, dom);
              },
              remove = function() {
                insertTo(dom.parentNode, dom, stub);
              };
          if (value) {
            if (stub) {
              add();
              dom.inStub = false;
              if (!isInStub(dom)) {
                walk(dom, function(el) {
                  if (el._tag && !el._tag.isMounted)
                    el._tag.isMounted = !!el._tag.trigger('mount');
                });
              }
            }
          } else {
            stub = expr.stub = stub || document.createTextNode('');
            if (dom.parentNode)
              remove();
            else
              (tag.parent || tag).one('updated', remove);
            dom.inStub = true;
          }
        } else if (attrName === 'show') {
          dom.style.display = value ? '' : 'none';
        } else if (attrName === 'hide') {
          dom.style.display = value ? 'none' : '';
        } else if (expr.bool) {
          dom[attrName] = value;
          if (value)
            setAttr(dom, attrName, attrName);
          if (FIREFOX && attrName === 'selected' && dom.tagName === 'OPTION') {
            dom.__riot1374 = value;
          }
        } else if (value === 0 || value && typeof value !== T_OBJECT) {
          if (startsWith(attrName, RIOT_PREFIX) && attrName != RIOT_TAG) {
            attrName = attrName.slice(RIOT_PREFIX.length);
          }
          setAttr(dom, attrName, value);
        }
      });
    }
    function each(els, fn) {
      var len = els ? els.length : 0;
      for (var i = 0,
          el; i < len; i++) {
        el = els[i];
        if (el != null && fn(el, i) === false)
          i--;
      }
      return els;
    }
    function isFunction(v) {
      return typeof v === T_FUNCTION || false;
    }
    function getOuterHTML(el) {
      if (el.outerHTML)
        return el.outerHTML;
      else {
        var container = mkEl('div');
        container.appendChild(el.cloneNode(true));
        return container.innerHTML;
      }
    }
    function setInnerHTML(container, html) {
      if (typeof container.innerHTML != T_UNDEF)
        container.innerHTML = html;
      else {
        var doc = new DOMParser().parseFromString(html, 'application/xml');
        container.appendChild(container.ownerDocument.importNode(doc.documentElement, true));
      }
    }
    function isSVGTag(name) {
      return ~SVG_TAGS_LIST.indexOf(name);
    }
    function isObject(v) {
      return v && typeof v === T_OBJECT;
    }
    function remAttr(dom, name) {
      dom.removeAttribute(name);
    }
    function toCamel(string) {
      return string.replace(/-(\w)/g, function(_, c) {
        return c.toUpperCase();
      });
    }
    function getAttr(dom, name) {
      return dom.getAttribute(name);
    }
    function setAttr(dom, name, val) {
      var xlink = XLINK_REGEX.exec(name);
      if (xlink && xlink[1])
        dom.setAttributeNS(XLINK_NS, xlink[1], val);
      else
        dom.setAttribute(name, val);
    }
    function getTag(dom) {
      return dom.tagName && __tagImpl[getAttr(dom, RIOT_TAG_IS) || getAttr(dom, RIOT_TAG) || dom.tagName.toLowerCase()];
    }
    function addChildTag(tag, tagName, parent) {
      var cachedTag = parent.tags[tagName];
      if (cachedTag) {
        if (!isArray(cachedTag))
          if (cachedTag !== tag)
            parent.tags[tagName] = [cachedTag];
        if (!contains(parent.tags[tagName], tag))
          parent.tags[tagName].push(tag);
      } else {
        parent.tags[tagName] = tag;
      }
    }
    function moveChildTag(tag, tagName, newPos) {
      var parent = tag.parent,
          tags;
      if (!parent)
        return;
      tags = parent.tags[tagName];
      if (isArray(tags))
        tags.splice(newPos, 0, tags.splice(tags.indexOf(tag), 1)[0]);
      else
        addChildTag(tag, tagName, parent);
    }
    function initChildTag(child, opts, innerHTML, parent) {
      var tag = new Tag(child, opts, innerHTML),
          tagName = getTagName(opts.root),
          ptag = getImmediateCustomParentTag(parent);
      tag.parent = ptag;
      tag._parent = parent;
      addChildTag(tag, tagName, ptag);
      if (ptag !== parent)
        addChildTag(tag, tagName, parent);
      opts.root.innerHTML = '';
      return tag;
    }
    function getImmediateCustomParentTag(tag) {
      var ptag = tag;
      while (!getTag(ptag.root)) {
        if (!ptag.parent)
          break;
        ptag = ptag.parent;
      }
      return ptag;
    }
    function defineProperty(el, key, value, options) {
      Object.defineProperty(el, key, extend({
        value: value,
        enumerable: false,
        writable: false,
        configurable: true
      }, options));
      return el;
    }
    function getTagName(dom) {
      var child = getTag(dom),
          namedTag = getAttr(dom, 'name'),
          tagName = namedTag && !tmpl.hasExpr(namedTag) ? namedTag : child ? child.name : dom.tagName.toLowerCase();
      return tagName;
    }
    function extend(src) {
      var obj,
          args = arguments;
      for (var i = 1; i < args.length; ++i) {
        if (obj = args[i]) {
          for (var key in obj) {
            if (isWritable(src, key))
              src[key] = obj[key];
          }
        }
      }
      return src;
    }
    function contains(arr, item) {
      return ~arr.indexOf(item);
    }
    function isArray(a) {
      return Array.isArray(a) || a instanceof Array;
    }
    function isWritable(obj, key) {
      var props = Object.getOwnPropertyDescriptor(obj, key);
      return typeof obj[key] === T_UNDEF || props && props.writable;
    }
    function cleanUpData(data) {
      if (!(data instanceof Tag) && !(data && typeof data.trigger == T_FUNCTION))
        return data;
      var o = {};
      for (var key in data) {
        if (!RESERVED_WORDS_BLACKLIST.test(key))
          o[key] = data[key];
      }
      return o;
    }
    function walk(dom, fn) {
      if (dom) {
        if (fn(dom) === false)
          return;
        else {
          dom = dom.firstChild;
          while (dom) {
            walk(dom, fn);
            dom = dom.nextSibling;
          }
        }
      }
    }
    function walkAttributes(html, fn) {
      var m,
          re = /([-\w]+) ?= ?(?:"([^"]*)|'([^']*)|({[^}]*}))/g;
      while (m = re.exec(html)) {
        fn(m[1].toLowerCase(), m[2] || m[3] || m[4]);
      }
    }
    function isInStub(dom) {
      while (dom) {
        if (dom.inStub)
          return true;
        dom = dom.parentNode;
      }
      return false;
    }
    function mkEl(name, isSvg) {
      return isSvg ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : document.createElement(name);
    }
    function $$(selector, ctx) {
      return (ctx || document).querySelectorAll(selector);
    }
    function $(selector, ctx) {
      return (ctx || document).querySelector(selector);
    }
    function inherit(parent) {
      return Object.create(parent || null);
    }
    function getNamedKey(dom) {
      return getAttr(dom, 'id') || getAttr(dom, 'name');
    }
    function setNamed(dom, parent, keys) {
      var key = getNamedKey(dom),
          isArr,
          add = function(value) {
            if (contains(keys, key))
              return;
            isArr = isArray(value);
            if (!value)
              parent[key] = dom;
            else if (!isArr || isArr && !contains(value, dom)) {
              if (isArr)
                value.push(dom);
              else
                parent[key] = [value, dom];
            }
          };
      if (!key)
        return;
      if (tmpl.hasExpr(key))
        parent.one('mount', function() {
          key = getNamedKey(dom);
          add(parent[key]);
        });
      else
        add(parent[key]);
    }
    function startsWith(src, str) {
      return src.slice(0, str.length) === str;
    }
    var rAF = (function(w) {
      var raf = w.requestAnimationFrame || w.mozRequestAnimationFrame || w.webkitRequestAnimationFrame;
      if (!raf || /iP(ad|hone|od).*OS 6/.test(w.navigator.userAgent)) {
        var lastTime = 0;
        raf = function(cb) {
          var nowtime = Date.now(),
              timeout = Math.max(16 - (nowtime - lastTime), 0);
          setTimeout(function() {
            cb(lastTime = nowtime + timeout);
          }, timeout);
        };
      }
      return raf;
    })(window || {});
    function mountTo(root, tagName, opts) {
      var tag = __tagImpl[tagName],
          innerHTML = root._innerHTML = root._innerHTML || root.innerHTML;
      root.innerHTML = '';
      if (tag && root)
        tag = new Tag(tag, {
          root: root,
          opts: opts
        }, innerHTML);
      if (tag && tag.mount) {
        tag.mount();
        if (!contains(__virtualDom, tag))
          __virtualDom.push(tag);
      }
      return tag;
    }
    riot.util = {
      brackets: brackets,
      tmpl: tmpl
    };
    riot.mixin = (function() {
      var mixins = {},
          globals = mixins[GLOBAL_MIXIN] = {},
          _id = 0;
      return function(name, mixin, g) {
        if (isObject(name)) {
          riot.mixin('__unnamed_' + _id++, name, true);
          return;
        }
        var store = g ? globals : mixins;
        if (!mixin) {
          if (typeof store[name] === T_UNDEF) {
            throw new Error('Unregistered mixin: ' + name);
          }
          return store[name];
        }
        if (isFunction(mixin)) {
          extend(mixin.prototype, store[name] || {});
          store[name] = mixin;
        } else {
          store[name] = extend(store[name] || {}, mixin);
        }
      };
    })();
    riot.tag = function(name, html, css, attrs, fn) {
      if (isFunction(attrs)) {
        fn = attrs;
        if (/^[\w\-]+\s?=/.test(css)) {
          attrs = css;
          css = '';
        } else
          attrs = '';
      }
      if (css) {
        if (isFunction(css))
          fn = css;
        else
          styleManager.add(css);
      }
      name = name.toLowerCase();
      __tagImpl[name] = {
        name: name,
        tmpl: html,
        attrs: attrs,
        fn: fn
      };
      return name;
    };
    riot.tag2 = function(name, html, css, attrs, fn) {
      if (css)
        styleManager.add(css);
      __tagImpl[name] = {
        name: name,
        tmpl: html,
        attrs: attrs,
        fn: fn
      };
      return name;
    };
    riot.mount = function(selector, tagName, opts) {
      var els,
          allTags,
          tags = [];
      function addRiotTags(arr) {
        var list = '';
        each(arr, function(e) {
          if (!/[^-\w]/.test(e)) {
            e = e.trim().toLowerCase();
            list += ',[' + RIOT_TAG_IS + '="' + e + '"],[' + RIOT_TAG + '="' + e + '"]';
          }
        });
        return list;
      }
      function selectAllTags() {
        var keys = Object.keys(__tagImpl);
        return keys + addRiotTags(keys);
      }
      function pushTags(root) {
        if (root.tagName) {
          var riotTag = getAttr(root, RIOT_TAG_IS) || getAttr(root, RIOT_TAG);
          if (tagName && riotTag !== tagName) {
            riotTag = tagName;
            setAttr(root, RIOT_TAG_IS, tagName);
            setAttr(root, RIOT_TAG, tagName);
          }
          var tag = mountTo(root, riotTag || root.tagName.toLowerCase(), opts);
          if (tag)
            tags.push(tag);
        } else if (root.length) {
          each(root, pushTags);
        }
      }
      styleManager.inject();
      if (isObject(tagName)) {
        opts = tagName;
        tagName = 0;
      }
      if (typeof selector === T_STRING) {
        if (selector === '*')
          selector = allTags = selectAllTags();
        else
          selector += addRiotTags(selector.split(/, */));
        els = selector ? $$(selector) : [];
      } else
        els = selector;
      if (tagName === '*') {
        tagName = allTags || selectAllTags();
        if (els.tagName)
          els = $$(tagName, els);
        else {
          var nodeList = [];
          each(els, function(_el) {
            nodeList.push($$(tagName, _el));
          });
          els = nodeList;
        }
        tagName = 0;
      }
      pushTags(els);
      return tags;
    };
    riot.update = function() {
      return each(__virtualDom, function(tag) {
        tag.update();
      });
    };
    riot.vdom = __virtualDom;
    riot.Tag = Tag;
    if (typeof exports === T_OBJECT)
      module.exports = riot;
    else if (typeof define === T_FUNCTION && typeof define.amd !== T_UNDEF)
      define(function() {
        return riot;
      });
    else
      window.riot = riot;
  })(typeof window != 'undefined' ? window : void 0);
})(require('process'));
