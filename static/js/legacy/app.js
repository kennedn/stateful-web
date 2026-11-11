/* Interpret only known status fields. Never infer state from a sent command. */
'use strict';

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
window.DeviceStatus = function () {
  var number = function number(value) {
    return value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
  };
  var power = function power(value) {
    return [1, '1', true, 'on'].includes(value) ? 'on' : [0, '0', false, 'off'].includes(value) ? 'off' : null;
  };
  var metric = function metric(label, value) {
    var unit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    var digits = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
    var n = number(value);
    return n === null ? null : {
      label: label,
      value: n.toLocaleString('en-GB', {
        maximumFractionDigits: digits
      }),
      unit: unit
    };
  };
  function parse(service, node, payload) {
    var code = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'status';
    var data = payload && _typeof(payload) === 'object' && 'data' in payload ? payload.data : payload;
    var state = {
      partial: null,
      power: null,
      online: null,
      heating: null,
      color: null,
      brightness: null,
      value: null,
      selection: null,
      metrics: [],
      flags: [],
      known: false
    };
    if (payload !== null && payload !== void 0 && payload.message && payload.message !== 'OK') return state;
    var add = function add(entry) {
      if (entry) state.metrics.push(entry);
    };
    if (service === 'radiator' && code === 'battery') {
      state.partial = 'battery';
      var readings = Array.isArray(data) ? data : [data];
      var _iterator = _createForOfIteratorHelper(readings),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var reading = _step.value;
          var value = number(reading === null || reading === void 0 ? void 0 : reading.value);
          if (value === null || value < 0 || value > 100) continue;
          var prefix = readings.length > 1 ? String(reading.id || 'Radiator') + ' · ' : '';
          var entry = metric(prefix + 'Battery', value, '%', 0);
          entry.key = 'battery:' + String(reading.id || 'device');
          add(entry);
          if (value <= 20) state.flags.push(prefix + 'Low battery');
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } else if (['thermostat', 'radiator'].includes(service)) {
      var _readings = Array.isArray(data) ? data : [data];
      _readings.forEach(function (reading, index) {
        var _reading$temperature2, _reading$temperature3, _reading$temperature4;
        if (!reading || _typeof(reading) !== 'object') return;
        if (index === 0) {
          var _reading$temperature;
          state.power = power(reading.onoff);
          state.online = power(reading.online);
          state.heating = typeof ((_reading$temperature = reading.temperature) === null || _reading$temperature === void 0 ? void 0 : _reading$temperature.heating) === 'boolean' ? reading.temperature.heating : null;
        }
        var prefix = _readings.length > 1 ? String(reading.id || index + 1) + ' · ' : '';
        // Heating services return temperatures in tenths of a degree Celsius.
        if (number((_reading$temperature2 = reading.temperature) === null || _reading$temperature2 === void 0 ? void 0 : _reading$temperature2.current) !== null) add(metric(prefix + 'Room', Number(reading.temperature.current) / 10, '°C'));
        if (number((_reading$temperature3 = reading.temperature) === null || _reading$temperature3 === void 0 ? void 0 : _reading$temperature3.target) !== null) add(metric(prefix + 'Target', Number(reading.temperature.target) / 10, '°C'));
        if (((_reading$temperature4 = reading.temperature) === null || _reading$temperature4 === void 0 ? void 0 : _reading$temperature4.openWindow) === true) state.flags.push(prefix + 'Window open');
      });
    } else if (data && _typeof(data) === 'object' && !Array.isArray(data)) {
      state.power = power(data.onoff);
      if ('online' in data) state.online = power(data.online);
      if (service === 'meross') {
        var rgb = number(data.rgb),
          brightness = number(data.luminance);
        if (rgb !== null && Number.isInteger(rgb) && rgb >= 0 && rgb <= 0xffffff) state.color = '#' + rgb.toString(16).padStart(6, '0');
        if (brightness !== null && brightness >= 0 && brightness <= 100) {
          state.brightness = brightness;
        }
      }
      if (service === 'bthome') {
        add(metric('Temperature', data.temperature, '°C'));
        add(metric('Humidity', data.humidity, '%'));
        add(metric('Battery', data.battery, '%', 0));
        if (number(data.battery) !== null && Number(data.battery) <= 20) state.flags.push('Low battery');
      }
      if (service === 'snowdon' && typeof data.input === 'string' && data.input !== 'off') state.flags.push('Input · ' + data.input);
    } else if (service === 'wol' || service === 'tvcom' && ['power', 'screen_mute', 'volume_mute', 'remote_lock', 'osd_select'].includes(node.name)) {
      state.power = power(data);
    }
    if (service === 'tvcom' && (typeof data === 'string' || typeof data === 'number')) {
      var n = number(data);
      if (n !== null && node.commands.includes(String(data))) {
        state.value = n;
        add(metric(node.name === 'volume' ? 'Volume' : node.name.replace(/_/g, ' '), n, '', 0));
      } else if (typeof data === 'string' && node.commands.includes(data)) state.selection = state.power === null ? data : null;
    }
    state.known = state.power !== null || state.online !== null || state.heating !== null || state.metrics.length > 0 || state.flags.length > 0 || state.selection !== null || state.color !== null;
    return state;
  }
  function merge(previous, incoming) {
    if (!(previous !== null && previous !== void 0 && previous.known)) return incoming;
    var isBattery = function isBattery(metric) {
      var _metric$key;
      return (_metric$key = metric.key) === null || _metric$key === void 0 ? void 0 : _metric$key.startsWith('battery:');
    };
    var isLowBattery = function isLowBattery(flag) {
      return flag.endsWith('Low battery');
    };
    if (incoming.partial === 'battery') {
      return _objectSpread(_objectSpread({}, previous), {}, {
        metrics: [].concat(_toConsumableArray(previous.metrics.filter(function (metric) {
          return !isBattery(metric);
        })), _toConsumableArray(incoming.metrics)),
        flags: [].concat(_toConsumableArray(previous.flags.filter(function (flag) {
          return !isLowBattery(flag);
        })), _toConsumableArray(incoming.flags))
      });
    }
    return _objectSpread(_objectSpread({}, incoming), {}, {
      metrics: [].concat(_toConsumableArray(incoming.metrics), _toConsumableArray(previous.metrics.filter(isBattery))),
      flags: [].concat(_toConsumableArray(incoming.flags), _toConsumableArray(previous.flags.filter(isLowBattery)))
    });
  }
  return {
    parse: parse,
    merge: merge
  };
}();
/* Bounded, cancellable status reads. Action requests are never retried here. */
'use strict';

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, catch: function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
window.StatusUpdates = function () {
  var abortError = function abortError() {
    return new DOMException('Status refresh cancelled', 'AbortError');
  };
  var Queue = /*#__PURE__*/function () {
    function Queue() {
      var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3;
      _classCallCheck(this, Queue);
      this.limit = limit;
      this.active = 0;
      this.pending = [];
      this.jobs = new Map();
    }
    _createClass(Queue, [{
      key: "cancel",
      value: function cancel(key) {
        var _this$jobs$get;
        (_this$jobs$get = this.jobs.get(key)) === null || _this$jobs$get === void 0 ? void 0 : _this$jobs$get.controller.abort();
      }
    }, {
      key: "cancelAll",
      value: function cancelAll() {
        var _iterator = _createForOfIteratorHelper(this.jobs.values()),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var job = _step.value;
            job.controller.abort();
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
    }, {
      key: "run",
      value: function run(key, work) {
        var _this = this;
        var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
          signal = _ref.signal,
          _ref$deadline = _ref.deadline,
          deadline = _ref$deadline === void 0 ? Infinity : _ref$deadline;
        this.cancel(key);
        var controller = new AbortController();
        var cancel = function cancel() {
          return controller.abort();
        };
        return new Promise(function (resolve, reject) {
          var job = {
            key: key,
            work: work,
            controller: controller,
            resolve: resolve,
            reject: reject,
            started: false
          };
          var timer = Number.isFinite(deadline) ? setTimeout(cancel, Math.max(0, deadline - performance.now())) : null;
          job.finish = function () {
            clearTimeout(timer);
            signal === null || signal === void 0 ? void 0 : signal.removeEventListener('abort', cancel);
            if (_this.jobs.get(key) === job) _this.jobs.delete(key);
          };
          controller.signal.addEventListener('abort', function () {
            if (!job.started) {
              job.finish();
              reject(abortError());
            }
          }, {
            once: true
          });
          signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', cancel, {
            once: true
          });
          _this.jobs.set(key, job);
          if (signal !== null && signal !== void 0 && signal.aborted || deadline <= performance.now()) {
            cancel();
            return;
          }
          _this.pending.push(job);
          _this.pump();
        });
      }
    }, {
      key: "pump",
      value: function pump() {
        var _this2 = this;
        var _loop = function _loop() {
          var job = _this2.pending.shift();
          if (job.controller.signal.aborted) return "continue";
          job.started = true;
          _this2.active++;
          Promise.resolve().then(function () {
            if (job.controller.signal.aborted) throw abortError();
            return job.work(job.controller.signal);
          }).then(job.resolve, job.reject).finally(function () {
            job.finish();
            _this2.active--;
            _this2.pump();
          });
        };
        while (this.active < this.limit && this.pending.length) {
          var _ret = _loop();
          if (_ret === "continue") continue;
        }
      }
    }]);
    return Queue;
  }();
  var Poller = /*#__PURE__*/function () {
    function Poller() {
      _classCallCheck(this, Poller);
      this.jobs = new Map();
    }
    _createClass(Poller, [{
      key: "cancel",
      value: function cancel(key) {
        var _this$jobs$get2;
        (_this$jobs$get2 = this.jobs.get(key)) === null || _this$jobs$get2 === void 0 ? void 0 : _this$jobs$get2.abort();
      }
    }, {
      key: "cancelAll",
      value: function cancelAll() {
        var _iterator2 = _createForOfIteratorHelper(this.jobs.values()),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var job = _step2.value;
            job.abort();
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }
    }, {
      key: "start",
      value: function start(key, work) {
        var _this3 = this;
        this.cancel(key);
        var controller = new AbortController();
        this.jobs.set(key, controller);
        var started = performance.now(),
          deadline = started + 10000;
        var cutoff = setTimeout(function () {
          return controller.abort();
        }, 10000);
        var pause = function pause(ms) {
          return new Promise(function (resolve, reject) {
            if (controller.signal.aborted) {
              reject(abortError());
              return;
            }
            var cancel = function cancel() {
              clearTimeout(timer);
              reject(abortError());
            };
            var timer = setTimeout(function () {
              controller.signal.removeEventListener('abort', cancel);
              resolve();
            }, ms);
            controller.signal.addEventListener('abort', cancel, {
              once: true
            });
          });
        };
        var done = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          var _i, _arr, offset, result;
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _i = 0, _arr = [100, 250, 500, 850, 1300, 1900, 2700, 3700, 4900, 6300, 7900, 9500];
              case 2:
                if (!(_i < _arr.length)) {
                  _context.next = 16;
                  break;
                }
                offset = _arr[_i];
                _context.next = 6;
                return pause(Math.max(0, started + offset - performance.now()));
              case 6:
                if (!(controller.signal.aborted || performance.now() >= deadline)) {
                  _context.next = 8;
                  break;
                }
                return _context.abrupt("break", 16);
              case 8:
                _context.next = 10;
                return work({
                  signal: controller.signal,
                  deadline: deadline
                });
              case 10:
                result = _context.sent;
                if (!(result !== null && result !== void 0 && result.settled || [401, 403].includes(result === null || result === void 0 ? void 0 : result.status))) {
                  _context.next = 13;
                  break;
                }
                return _context.abrupt("break", 16);
              case 13:
                _i++;
                _context.next = 2;
                break;
              case 16:
                _context.next = 21;
                break;
              case 18:
                _context.prev = 18;
                _context.t0 = _context["catch"](0);
                if (_context.t0.name !== 'AbortError') console.warn('Status follow-up stopped:', _context.t0.message);
              case 21:
                _context.prev = 21;
                clearTimeout(cutoff);
                if (_this3.jobs.get(key) === controller) _this3.jobs.delete(key);
                return _context.finish(21);
              case 25:
              case "end":
                return _context.stop();
            }
          }, _callee, null, [[0, 18, 21, 25]]);
        }))();
        return done;
      }
    }]);
    return Poller;
  }();
  return {
    Queue: Queue,
    Poller: Poller
  };
}();
/* Static discovery catalog + live, user-initiated API calls. No dependencies. */
'use strict';

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, catch: function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i.return && (_r = _i.return(), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
(function () {
  var $ = function $(id) {
    return document.getElementById(id);
  };
  var el = function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  var catalog,
    selected,
    credentials = null,
    controller = null,
    responseText = '';
  var expanded = new Set();
  var colors = ['#1c817e', '#dd2164', '#6e04a9'];
  var configuredBase = document.body.dataset.apiBase;
  var apiBase = configuredBase === '' ? location.origin : configuredBase.replace(/\/$/, '');
  var authStorageKey = 'kennedn-api-auth-v1:' + new URL(apiBase).origin;
  var credentialUsername = '';
  function clearSavedAuth() {
    var cleared = true;
    for (var _i = 0, _arr = ['localStorage', 'sessionStorage']; _i < _arr.length; _i++) {
      var type = _arr[_i];
      try {
        window[type].removeItem(authStorageKey);
      } catch (_unused) {
        cleared = false;
      }
    }
    return cleared;
  }
  function forgetAuth() {
    credentials = null;
    credentialUsername = '';
    $('remember-auth').checked = false;
    $('auth-button').textContent = 'Sign in';
    return clearSavedAuth();
  }
  function restoreAuth() {
    for (var _i2 = 0, _arr2 = ['localStorage', 'sessionStorage']; _i2 < _arr2.length; _i2++) {
      var type = _arr2[_i2];
      try {
        var raw = window[type].getItem(authStorageKey);
        if (!raw) continue;
        var saved = JSON.parse(raw);
        if (typeof saved.username !== 'string' || typeof saved.authorization !== 'string' || !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(saved.authorization)) {
          window[type].removeItem(authStorageKey);
          continue;
        }
        credentials = saved.authorization;
        credentialUsername = saved.username;
        $('username').value = saved.username;
        $('remember-auth').checked = type === 'localStorage';
        $('auth-button').textContent = 'Account';
        return;
      } catch (_unused2) {/* Unavailable or invalid browser storage does not stop the panel. */}
    }
  }
  function saveAuth(username, authorization, remember) {
    var target = remember ? 'localStorage' : 'sessionStorage';
    var other = remember ? 'sessionStorage' : 'localStorage';
    try {
      window[other].removeItem(authStorageKey);
      window[target].setItem(authStorageKey, JSON.stringify({
        username: username,
        authorization: authorization
      }));
      return true;
    } catch (_unused3) {
      return false;
    }
  }
  restoreAuth();
  function apiURL(path) {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\#\s]/.test(path)) {
      throw new Error('Enter an absolute API path, such as /v2/meross/office. Encode spaces and omit fragments.');
    }
    var origin = new URL(apiBase).origin;
    var url = new URL(path, origin);
    if (url.origin !== origin || url.username || url.password) throw new Error('Requests must stay on the configured API origin.');
    return url;
  }
  function basicAuth(username, password) {
    if (username.includes(':')) throw new Error('A Basic authentication username cannot contain a colon.');
    return 'Basic ' + btoa(Array.from(new TextEncoder().encode(username + ':' + password), function (byte) {
      return String.fromCharCode(byte);
    }).join(''));
  }
  function apiFetch(_x) {
    return _apiFetch.apply(this, arguments);
  }
  function _apiFetch() {
    _apiFetch = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(url) {
      var options,
        auth,
        headers,
        response,
        _args2 = arguments;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            options = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : {};
            auth = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : credentials;
            headers = new Headers(options.headers);
            if (!headers.has('Authorization')) {
              _context2.next = 5;
              break;
            }
            throw new Error('Use Sign in to set the Authorization header.');
          case 5:
            if (!auth) {
              _context2.next = 9;
              break;
            }
            if (!(new URL(url).protocol !== 'https:')) {
              _context2.next = 8;
              break;
            }
            throw new Error('Sign in requires an HTTPS API connection.');
          case 8:
            headers.set('Authorization', auth);
          case 9:
            _context2.next = 11;
            return fetch(url, _objectSpread(_objectSpread({}, options), {}, {
              headers: headers,
              credentials: 'omit',
              redirect: 'error',
              cache: 'no-store'
            }));
          case 11:
            response = _context2.sent;
            if (response.status === 401 && auth && auth === credentials) forgetAuth();
            return _context2.abrupt("return", response);
          case 14:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    return _apiFetch.apply(this, arguments);
  }
  function networkMessage(error) {
    if (error.name === 'AbortError') return 'Request cancelled or timed out. A sent command may still have executed on the device.';
    if (error instanceof TypeError) return 'No readable response. The command may already have executed; CORS can block the response after a POST is sent. Check the browser console to distinguish CORS from a network failure. Do not retry a toggle just to get a response.';
    return error.message;
  }
  function openAuth() {
    $('auth-error').hidden = true;
    if (!$('auth-dialog').open) $('auth-dialog').showModal();
  }
  function connectionError() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    $('connection-strip').hidden = !message;
    $('connection').textContent = message;
  }
  function checkConnection() {
    return _checkConnection.apply(this, arguments);
  }
  function _checkConnection() {
    _checkConnection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      var response;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            connectionError();
            $('notice').hidden = true;
            _context3.prev = 2;
            _context3.next = 5;
            return apiFetch(apiURL(catalog.root), {
              signal: AbortSignal.timeout(12000)
            });
          case 5:
            response = _context3.sent;
            if (!(response.status === 401)) {
              _context3.next = 11;
              break;
            }
            connectionError('Sign in required');
            openAuth();
            _context3.next = 16;
            break;
          case 11:
            if (response.ok) {
              _context3.next = 15;
              break;
            }
            throw new Error('API returned HTTP ' + response.status + '.');
          case 15:
            connectionError();
          case 16:
            _context3.next = 23;
            break;
          case 18:
            _context3.prev = 18;
            _context3.t0 = _context3["catch"](2);
            connectionError('Responses unavailable');
            $('notice').textContent = _context3.t0 instanceof TypeError ? 'The browser cannot read API responses. Quick actions may still execute. Until responses are fixed, device state cannot be confirmed here.' : networkMessage(_context3.t0);
            $('notice').hidden = false;
          case 23:
          case "end":
            return _context3.stop();
        }
      }, _callee3, null, [[2, 18]]);
    }));
    return _checkConnection.apply(this, arguments);
  }
  function title(name) {
    return name.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (letter) {
      return letter.toUpperCase();
    });
  }
  function treeEntry(path) {
    var node = catalog.nodes[path];
    var group = el('div');
    var row = el('div', 'tree-row');
    var toggle = el('button', 'tree-toggle', node.children.length ? expanded.has(path) ? '▾' : '▸' : '·');
    toggle.type = 'button';
    if (node.children.length) {
      toggle.setAttribute('aria-label', (expanded.has(path) ? 'Collapse ' : 'Expand ') + node.name);
      toggle.setAttribute('aria-expanded', String(expanded.has(path)));
      toggle.addEventListener('click', function () {
        if (expanded.has(path)) expanded.delete(path);else expanded.add(path);
        renderTree();
      });
    } else {
      toggle.disabled = true;
      toggle.setAttribute('aria-hidden', 'true');
      toggle.tabIndex = -1;
    }
    var button = el('button', 'tree-link' + (selected === path ? ' active' : ''));
    button.type = 'button';
    if (selected === path) button.setAttribute('aria-current', 'page');
    button.append(el('span', '', node.children.length ? '▧' : '◇'), el('span', '', node.name));
    button.addEventListener('click', function () {
      return navigate(path);
    });
    row.append(toggle, button);
    group.append(row);
    if (expanded.has(path)) {
      var children = el('div', 'tree-child');
      var _iterator = _createForOfIteratorHelper(node.children),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var child = _step.value;
          children.append(treeEntry(child));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      group.append(children);
    }
    return group;
  }
  function renderTree() {
    $('tree').replaceChildren();
    var search = $('search').value.trim().toLowerCase();
    if (search) {
      var count = 0;
      var _loop = function _loop() {
        var node = _Object$values[_i3];
        var commandMatches = node.commands.filter(function (command) {
          return command.toLowerCase().includes(search);
        });
        if (!node.path.toLowerCase().includes(search) && !commandMatches.length) return "continue";
        var button = el('button', 'tree-search-result', title(node.name));
        button.type = 'button';
        button.append(el('small', '', node.path));
        if (commandMatches.length) button.append(el('small', '', 'Commands: ' + commandMatches.slice(0, 4).join(', ')));
        button.addEventListener('click', function () {
          return navigate(node.path);
        });
        $('tree').append(button);
        count++;
      };
      for (var _i3 = 0, _Object$values = Object.values(catalog.nodes); _i3 < _Object$values.length; _i3++) {
        var _ret = _loop();
        if (_ret === "continue") continue;
      }
      if (!count) $('tree').append(el('p', 'help', 'No devices or commands match your search.'));
      return;
    }
    $('tree').append(treeEntry(catalog.root));
  }
  function navigate(path) {
    var push = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (!catalog.nodes[path]) path = catalog.root;
    selected = path;
    var ancestor = path;
    while (ancestor.startsWith(catalog.root)) {
      expanded.add(ancestor);
      ancestor = ancestor.slice(0, ancestor.lastIndexOf('/'));
    }
    if (push) location.hash = path;
    renderTree();
    renderNode();
  }
  function prepareCommand(code) {
    $('method').value = 'POST';
    $('request-path').value = selected;
    $('code').value = code;
    $('query').value = '';
    $('body').value = '';
    $('headers').value = '';
    updatePreview();
  }
  function renderCommands(node) {
    var container = $('commands');
    container.replaceChildren();
    var numbers = node.commands.filter(function (code) {
      return /^(0|[1-9]\d*)$/.test(code);
    }).map(Number).sort(function (a, b) {
      return a - b;
    });
    var isRange = numbers.length >= 10 && numbers.every(function (n, index) {
      return n === numbers[0] + index;
    });
    if (isRange) {
      var label = el('label', 'range-control', 'Code ' + numbers[0] + '–' + numbers.at(-1));
      var range = el('input');
      range.type = 'range';
      range.min = numbers[0];
      range.max = numbers.at(-1);
      range.step = 1;
      range.value = numbers[0];
      range.setAttribute('aria-label', 'Command code slider');
      var numeric = el('input');
      numeric.type = 'number';
      numeric.min = range.min;
      numeric.max = range.max;
      numeric.step = 1;
      numeric.value = range.value;
      numeric.setAttribute('aria-label', 'Numeric command code');
      range.addEventListener('input', function () {
        numeric.value = range.value;
        prepareCommand(range.value);
      });
      numeric.addEventListener('input', function () {
        if (numeric.value !== '' && numeric.checkValidity()) {
          range.value = numeric.value;
          prepareCommand(numeric.value);
        }
      });
      var use = el('button', 'outline', 'Use code');
      use.type = 'button';
      use.addEventListener('click', function () {
        if (numeric.reportValidity() && numeric.value !== '') prepareCommand(numeric.value);
      });
      label.append(range, numeric, use);
      container.append(label);
    }
    var _iterator2 = _createForOfIteratorHelper(node.commands),
      _step2;
    try {
      var _loop2 = function _loop2() {
        var code = _step2.value;
        if (isRange && /^(0|[1-9]\d*)$/.test(code)) return "continue";
        var button = el('button', 'command', code);
        button.type = 'button';
        button.dataset.code = code;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', function () {
          return prepareCommand(code);
        });
        container.append(button);
      };
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _ret2 = _loop2();
        if (_ret2 === "continue") continue;
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
  function renderNode() {
    var node = catalog.nodes[selected];
    $('breadcrumbs').replaceChildren();
    var segments = selected.split('/').filter(Boolean);
    segments.forEach(function (segment, index) {
      if (index) $('breadcrumbs').append(el('span', '', '/'));
      var path = '/' + segments.slice(0, index + 1).join('/');
      if (catalog.nodes[path]) {
        var button = el('button', '', decodeURIComponent(segment));
        button.type = 'button';
        button.addEventListener('click', function () {
          return navigate(path);
        });
        $('breadcrumbs').append(button);
      } else $('breadcrumbs').append(el('span', '', segment));
    });
    $('node-kind').textContent = selected === catalog.root ? 'API ROOT' : node.children.length ? 'BRANCH / ' + node.children.length + ' ENDPOINTS' : 'ENDPOINT / ' + node.commands.length + ' COMMANDS';
    $('node-title').textContent = selected === catalog.root ? 'Available services' : title(node.name);
    $('node-path').textContent = selected;
    $('node-warning').hidden = !node.error;
    $('node-warning').textContent = node.error ? 'Discovery incomplete: ' + node.error + '. Use the request builder if you know the calling convention.' : '';
    $('branches').replaceChildren();
    node.children.forEach(function (path, index) {
      var child = catalog.nodes[path];
      var button = el('button', 'branch');
      button.type = 'button';
      if (!window.KennednLegacy) button.style.setProperty('--tile', colors[index % colors.length]);
      button.append(el('span', 'branch-icon', child.children.length ? '▧' : '◇'), el('span', 'branch-name', title(child.name)), el('small', '', child.error ? 'Discovery unavailable' : child.children.length ? child.children.length + ' endpoints' : child.commands.length + (child.commands.length === 1 ? ' command' : ' commands')), el('span', 'branch-arrow', '↗'));
      button.addEventListener('click', function () {
        return navigate(path);
      });
      $('branches').append(button);
    });
    $('commands-section').hidden = !node.commands.length;
    $('command-count').textContent = node.commands.length;
    renderCommands(node);
    $('convention').textContent = node.commands.length ? 'Commands use the POST ?code=… convention. GET does not declare methods or argument schemas; add any required parameters below.' : 'Edit the method, API path, query parameters and optional body to make an arbitrary call.';
    $('method').value = 'GET';
    $('request-path').value = selected;
    $('code').value = '';
    $('query').value = '';
    $('body').value = '';
    $('headers').value = '';
    $('validation').hidden = true;
    updatePreview();
  }
  function getRequest() {
    var method = $('method').value;
    var url = apiURL($('request-path').value.trim());
    var _iterator3 = _createForOfIteratorHelper(new URLSearchParams($('query').value.replace(/^\?/, ''))),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _step3$value = _slicedToArray(_step3.value, 2),
          key = _step3$value[0],
          value = _step3$value[1];
        url.searchParams.append(key, value);
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
    if ($('code').value !== '') url.searchParams.set('code', $('code').value);
    var headers = {};
    if ($('headers').value.trim()) {
      headers = JSON.parse($('headers').value);
      if (!headers || Array.isArray(headers) || _typeof(headers) !== 'object' || Object.values(headers).some(function (value) {
        return typeof value !== 'string';
      })) throw new Error('Additional headers must be a JSON object with string values.');
    }
    var requestHeaders = new Headers(headers);
    if (requestHeaders.has('Authorization')) throw new Error('Use Sign in to set the Authorization header.');
    var body = $('body').value.trim();
    if (body) {
      if (method === 'GET' || method === 'HEAD') throw new Error(method + ' requests cannot contain a body.');
      JSON.parse(body);
      if (!requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
    }
    return {
      url: url,
      options: _objectSpread({
        method: method,
        headers: requestHeaders
      }, body ? {
        body: body
      } : {})
    };
  }
  function updatePreview() {
    var _iterator4 = _createForOfIteratorHelper($('commands').querySelectorAll('[data-code]')),
      _step4;
    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var button = _step4.value;
        var active = button.dataset.code === $('code').value && $('method').value === 'POST';
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }
    try {
      var _getRequest = getRequest(),
        url = _getRequest.url,
        options = _getRequest.options;
      $('request-preview').textContent = options.method + ' ' + url.pathname + url.search;
    } catch (_unused4) {
      $('request-preview').textContent = 'Complete the request fields to preview.';
    }
  }
  function sendRequest(_x2) {
    return _sendRequest.apply(this, arguments);
  }
  function _sendRequest() {
    _sendRequest = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(request) {
      var _catalog;
      var node, code, context, result, requestController, timer, start, response, formatted;
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            if (!controller) {
              _context5.next = 2;
              break;
            }
            return _context5.abrupt("return");
          case 2:
            node = (_catalog = catalog) === null || _catalog === void 0 ? void 0 : _catalog.nodes[request.url.pathname];
            code = request.url.searchParams.get('code');
            if (!code && request.options.body) {
              try {
                code = JSON.parse(request.options.body).code;
              } catch (_unused8) {}
            }
            context = node && !['GET', 'HEAD', 'OPTIONS'].includes(request.options.method) ? beginDeviceOperation(node, String(code || '')) : null;
            if (context) foregroundDevices.add(node.path);
            $('validation').hidden = true;
            controller = new AbortController();
            requestController = controller;
            timer = setTimeout(function () {
              return requestController.abort();
            }, 30000);
            $('send').disabled = true;
            $('cancel').hidden = false;
            document.querySelectorAll('.quick-action').forEach(function (button) {
              button.disabled = true;
            });
            $('response-meta').textContent = 'Sending…';
            $('response-request').textContent = request.options.method + ' ' + request.url.href;
            $('response-request').hidden = false;
            start = performance.now();
            _context5.prev = 18;
            _context5.next = 21;
            return apiFetch(request.url, _objectSpread(_objectSpread({}, request.options), {}, {
              signal: requestController.signal
            }));
          case 21:
            response = _context5.sent;
            _context5.next = 24;
            return response.text();
          case 24:
            responseText = _context5.sent;
            formatted = responseText || '(empty response)';
            try {
              formatted = JSON.stringify(JSON.parse(responseText), null, 2);
            } catch (_unused9) {}
            $('response').textContent = formatted;
            $('response-meta').textContent = response.status + ' ' + response.statusText + ' · ' + Math.round(performance.now() - start) + ' ms';
            $('response-headers').textContent = Array.from(response.headers, function (_ref2) {
              var _ref3 = _slicedToArray(_ref2, 2),
                key = _ref3[0],
                value = _ref3[1];
              return key + ': ' + value;
            }).join('\n');
            $('response-header-details').hidden = false;
            if (response.status === 401) {
              connectionError('Sign in required');
              openAuth();
            }
            if (response.ok) {
              connectionError();
              $('notice').hidden = true;
            }
            result = {
              ok: response.ok,
              status: response.status,
              body: formatted
            };
            _context5.next = 43;
            break;
          case 36:
            _context5.prev = 36;
            _context5.t0 = _context5["catch"](18);
            responseText = networkMessage(_context5.t0);
            $('response').textContent = responseText;
            $('response-meta').textContent = 'Response unavailable · result unconfirmed';
            $('response-header-details').hidden = true;
            result = {
              ok: false,
              status: 0,
              body: responseText
            };
          case 43:
            _context5.prev = 43;
            clearTimeout(timer);
            controller = null;
            $('send').disabled = false;
            $('cancel').hidden = true;
            document.querySelectorAll('.quick-action').forEach(function (button) {
              button.disabled = false;
            });
            if (context) foregroundDevices.delete(node.path);
            return _context5.finish(43);
          case 51:
            if (context && deviceVersions.get(node.path) === context.version) {
              acceptDeviceResult(node, context.code, result);
              if (context.mutation && ![401, 403].includes(result.status) && node.commands.includes('status')) {
                pendingStatusChecks.add(node.path);
                void statusPoller.start(node.path, /*#__PURE__*/function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(options) {
                    var _reading$model;
                    var reading, known, confirmed;
                    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
                      while (1) switch (_context4.prev = _context4.next) {
                        case 0:
                          _context4.next = 2;
                          return readDevice(node, _objectSpread(_objectSpread({}, options), {}, {
                            version: context.version
                          }));
                        case 2:
                          reading = _context4.sent;
                          known = (reading === null || reading === void 0 ? void 0 : reading.ok) && ((_reading$model = reading.model) === null || _reading$model === void 0 ? void 0 : _reading$model.known);
                          confirmed = known && (!context.expected || Object.entries(context.expected).every(function (_ref5) {
                            var _ref6 = _slicedToArray(_ref5, 2),
                              key = _ref6[0],
                              value = _ref6[1];
                            return reading.model[key] === value;
                          }));
                          if (confirmed && deviceVersions.get(node.path) === context.version) {
                            pendingStatusChecks.delete(node.path);
                            renderDeviceFeedback(node);
                          }
                          // With no inferable target, keep quiet background checks for delayed updates.
                          return _context4.abrupt("return", _objectSpread(_objectSpread({}, reading), {}, {
                            settled: !!context.expected && confirmed
                          }));
                        case 7:
                        case "end":
                          return _context4.stop();
                      }
                    }, _callee4);
                  }));
                  return function (_x10) {
                    return _ref4.apply(this, arguments);
                  };
                }()).then(function () {
                  if (deviceVersions.get(node.path) === context.version) pendingStatusChecks.delete(node.path);
                  renderDeviceFeedback(node);
                });
                renderDeviceFeedback(node);
              } else if (context.code === 'status' && result.ok && node.commands.includes('battery')) {
                void readDevice(node, {
                  code: 'battery',
                  version: context.version
                });
              }
            }
            return _context5.abrupt("return", result);
          case 53:
          case "end":
            return _context5.stop();
        }
      }, _callee5, null, [[18, 36, 43, 51]]);
    }));
    return _sendRequest.apply(this, arguments);
  }
  function copy(_x3, _x4) {
    return _copy.apply(this, arguments);
  }
  function _copy() {
    _copy = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(text, button) {
      var original;
      return _regeneratorRuntime().wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            original = button.textContent;
            _context6.prev = 1;
            _context6.next = 4;
            return navigator.clipboard.writeText(text);
          case 4:
            button.textContent = 'Copied';
            _context6.next = 11;
            break;
          case 7:
            _context6.prev = 7;
            _context6.t0 = _context6["catch"](1);
            $('copy-text').value = text;
            if (!$('copy-dialog').open) $('copy-dialog').showModal();
          case 11:
            setTimeout(function () {
              button.textContent = original;
            }, 1600);
          case 12:
          case "end":
            return _context6.stop();
        }
      }, _callee6, null, [[1, 7]]);
    }));
    return _copy.apply(this, arguments);
  }
  var shellQuote = function shellQuote(value) {
    return "'" + value.replace(/'/g, "'\\''") + "'";
  };
  $('search').addEventListener('input', function () {
    if (catalog) renderTree();
  });
  for (var _i4 = 0, _arr3 = ['method', 'request-path', 'code', 'query', 'body', 'headers']; _i4 < _arr3.length; _i4++) {
    var id = _arr3[_i4];
    $(id).addEventListener('input', updatePreview);
  }
  $('request-form').addEventListener('submit', function (event) {
    event.preventDefault();
    try {
      void sendRequest(getRequest());
    } catch (error) {
      $('validation').textContent = error.message;
      $('validation').hidden = false;
    }
  });
  $('cancel').addEventListener('click', function () {
    var _controller;
    return (_controller = controller) === null || _controller === void 0 ? void 0 : _controller.abort();
  });
  $('inspect').addEventListener('click', function () {
    if (controller) return;
    $('method').value = 'GET';
    $('request-path').value = selected;
    $('code').value = '';
    $('query').value = '';
    $('body').value = '';
    $('headers').value = '';
    updatePreview();
    void sendRequest(getRequest());
  });
  $('reconnect').addEventListener('click', function () {
    if (catalog) void checkConnection();
  });
  $('auth-button').addEventListener('click', openAuth);
  $('auth-close').addEventListener('click', function () {
    $('password').value = '';
    $('auth-dialog').close();
  });
  $('auth-dialog').addEventListener('cancel', function () {
    $('password').value = '';
  });
  $('sign-out').addEventListener('click', function () {
    cancelStatusWork();
    var cleared = forgetAuth();
    $('username').value = '';
    $('password').value = '';
    $('auth-dialog').close();
    if (catalog) void checkConnection().then(function () {
      if (!cleared) {
        $('notice').textContent = 'Browser storage could not be cleared. Remove this site’s saved data in your browser settings.';
        $('notice').hidden = false;
      }
    });
  });
  $('remember-auth').addEventListener('change', function () {
    if (!credentials) return;
    var saved = saveAuth(credentialUsername, credentials, $('remember-auth').checked);
    $('auth-error').hidden = saved;
    if (!saved) $('auth-error').textContent = 'Browser storage is unavailable. The remember setting could not be saved.';
  });
  $('auth-form').addEventListener('submit', /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(event) {
      var candidate, response, saved;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            event.preventDefault();
            $('auth-error').hidden = true;
            $('login').disabled = true;
            _context.prev = 3;
            if (!(!$('username').value || !$('password').value)) {
              _context.next = 6;
              break;
            }
            throw new Error('Enter your username and password.');
          case 6:
            candidate = basicAuth($('username').value, $('password').value);
            _context.next = 9;
            return apiFetch(apiURL(catalog.root), {
              signal: AbortSignal.timeout(12000)
            }, candidate);
          case 9:
            response = _context.sent;
            if (response.ok) {
              _context.next = 12;
              break;
            }
            throw new Error(response.status === 401 ? 'Username or password was rejected.' : 'API returned HTTP ' + response.status + '.');
          case 12:
            saved = saveAuth($('username').value, candidate, $('remember-auth').checked);
            credentials = candidate;
            credentialUsername = $('username').value;
            $('password').value = '';
            $('auth-button').textContent = 'Account';
            $('auth-dialog').close();
            connectionError();
            $('notice').hidden = saved;
            if (!saved) $('notice').textContent = 'Connected, but browser storage is unavailable. This sign-in will be lost when the page reloads.';
            _context.next = 27;
            break;
          case 23:
            _context.prev = 23;
            _context.t0 = _context["catch"](3);
            $('auth-error').textContent = networkMessage(_context.t0);
            $('auth-error').hidden = false;
          case 27:
            _context.prev = 27;
            $('login').disabled = false;
            return _context.finish(27);
          case 30:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[3, 23, 27, 30]]);
    }));
    return function (_x5) {
      return _ref.apply(this, arguments);
    };
  }());
  $('copy-request').addEventListener('click', function () {
    try {
      var _getRequest2 = getRequest(),
        url = _getRequest2.url,
        options = _getRequest2.options;
      var command = 'curl -X ' + options.method + ' ' + shellQuote(url.href);
      var _iterator5 = _createForOfIteratorHelper(options.headers),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var _step5$value = _slicedToArray(_step5.value, 2),
            key = _step5$value[0],
            value = _step5$value[1];
          command += ' -H ' + shellQuote(key + ': ' + value);
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
      if (options.body) command += ' --data-raw ' + shellQuote(options.body);
      // Never include session credentials in the clipboard.
      void copy(command, $('copy-request'));
    } catch (error) {
      $('validation').textContent = error.message;
      $('validation').hidden = false;
    }
  });
  $('copy-close').addEventListener('click', function () {
    return $('copy-dialog').close();
  });
  $('copy-select').addEventListener('click', function () {
    $('copy-text').focus();
    $('copy-text').select();
    $('copy-text').setSelectionRange(0, $('copy-text').value.length);
  });
  $('copy-response').addEventListener('click', function () {
    void copy(responseText, $('copy-response'));
  });
  window.addEventListener('hashchange', function () {
    if (catalog && location.hash.slice(1) !== selected) navigate(location.hash.slice(1), false);
  });

  // Device controls are built from the discovery map; browsing does not make API calls.
  var activeService = 'all',
    activeDevice = null;
  var favorites = new Set();
  try {
    favorites = new Set(JSON.parse(localStorage.getItem('kennedn-control-favorites') || '[]'));
  } catch (_unused5) {/* Storage is optional. */}
  if (favorites.size) activeService = 'favorites';
  var deviceResults = new Map();
  var deviceStates = new Map();
  var deviceColors = new Map();
  var serviceNames = {
    meross: 'Lights & plugs',
    thermostat: 'Thermostat',
    radiator: 'Radiators',
    snowdon: 'Soundbar',
    tvcom: 'Television',
    wol: 'Computers',
    hikvision: 'Cameras',
    bthome: 'Sensors',
    bins: 'Bins',
    alert: 'Alerts'
  };
  var serviceOrder = ['meross', 'thermostat', 'radiator', 'snowdon', 'tvcom', 'wol', 'hikvision', 'bthome', 'bins', 'alert'];
  var needsArguments = new Set(['rgb', 'fade', 'heatTemp', 'adjust', 'boost', 'schedule', 'temperature', 'luminance', 'mode']);
  var actionLabels = {
    toggle: 'Toggle',
    status: 'Status',
    power: 'Power',
    on: 'On',
    off: 'Off',
    heatTemp: 'Heat temperature',
    luminance: 'Brightness',
    rgb: 'Colour',
    play_pause: 'Play / pause',
    volume_up: 'Volume +',
    volume_down: 'Volume −',
    bass_up: 'Bass +',
    bass_down: 'Bass −',
    treble_up: 'Treble +',
    treble_down: 'Treble −'
  };
  var serviceOf = function serviceOf(node) {
    return node.path.slice(catalog.root.length + 1).split('/')[0];
  };
  var deviceNodes = function deviceNodes() {
    return Object.values(catalog.nodes).filter(function (node) {
      return node.commands.length && !node.error;
    });
  };
  var labelAction = function labelAction(code) {
    return actionLabels[code] || title(code);
  };
  var statusQueue = new window.StatusUpdates.Queue(3);
  var statusPoller = new window.StatusUpdates.Poller();
  var deviceVersions = new Map();
  var pendingStatusChecks = new Set();
  var foregroundDevices = new Set();
  var bulkController = null;
  function beginDeviceOperation(node, code) {
    statusPoller.cancel(node.path);
    pendingStatusChecks.delete(node.path);
    statusQueue.cancel(node.path);
    var version = (deviceVersions.get(node.path) || 0) + 1;
    deviceVersions.set(node.path, version);
    var previous = deviceStates.get(node.path);
    return {
      code: code,
      version: version,
      mutation: !['status', 'battery'].includes(code),
      expected: expectedState(node, code, previous !== null && previous !== void 0 && previous.stale ? null : previous === null || previous === void 0 ? void 0 : previous.model)
    };
  }
  function expectedState(node, code, before) {
    if (['on', 'off'].includes(code)) return {
      power: code
    };
    if (serviceOf(node) === 'wol' && code === 'power') return {
      power: 'on'
    };
    if ((code === 'toggle' || serviceOf(node) === 'snowdon' && code === 'power') && before !== null && before !== void 0 && before.power) {
      return {
        power: before.power === 'on' ? 'off' : 'on'
      };
    }
    if (serviceOf(node) === 'tvcom') {
      if (numericRange(node) && /^\d+$/.test(code)) return {
        value: Number(code)
      };
      if (node.commands.includes(code) && !['status', 'battery'].includes(code)) return {
        selection: code
      };
    }
    return null;
  }
  function acceptDeviceResult(node, code, result) {
    var _model2;
    var model;
    if (result.ok) {
      var _model;
      try {
        model = window.DeviceStatus.parse(serviceOf(node), node, JSON.parse(result.body), code);
      } catch (_unused6) {}
      if ((_model = model) !== null && _model !== void 0 && _model.known) {
        var _deviceStates$get, _deviceStates$get2;
        var merged = window.DeviceStatus.merge((_deviceStates$get = deviceStates.get(node.path)) === null || _deviceStates$get === void 0 ? void 0 : _deviceStates$get.model, model);
        deviceStates.set(node.path, {
          model: merged,
          stale: model.partial === 'battery' ? ((_deviceStates$get2 = deviceStates.get(node.path)) === null || _deviceStates$get2 === void 0 ? void 0 : _deviceStates$get2.stale) || false : false
        });
      } else if (!['status', 'battery'].includes(code) && deviceStates.has(node.path)) deviceStates.get(node.path).stale = true;
    } else if (deviceStates.has(node.path)) deviceStates.get(node.path).stale = true;
    var label = result.ok ? ['status', 'battery'].includes(code) ? (_model2 = model) !== null && _model2 !== void 0 && _model2.known ? '' : labelAction(code) + ' received · details in panel.' : labelAction(code) + ' · response received' : result.status === 401 ? 'Sign in required · then refresh status.' : result.status ? 'API returned HTTP ' + result.status : ['status', 'battery'].includes(code) ? 'No readable response · state unconfirmed.' : 'No readable response · action may have run.';
    deviceResults.set(node.path, {
      kind: result.ok ? 'success' : result.status ? 'error' : 'unconfirmed',
      label: label,
      body: result.body
    });
    renderDeviceFeedback(node);
    return model;
  }
  function readDevice(_x6) {
    return _readDevice.apply(this, arguments);
  }
  function _readDevice() {
    _readDevice = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(node) {
      var _ref7,
        _ref7$code,
        code,
        _ref7$version,
        version,
        signal,
        _ref7$deadline,
        deadline,
        _ref7$includeBattery,
        includeBattery,
        _args9 = arguments;
      return _regeneratorRuntime().wrap(function _callee8$(_context9) {
        while (1) switch (_context9.prev = _context9.next) {
          case 0:
            _ref7 = _args9.length > 1 && _args9[1] !== undefined ? _args9[1] : {}, _ref7$code = _ref7.code, code = _ref7$code === void 0 ? 'status' : _ref7$code, _ref7$version = _ref7.version, version = _ref7$version === void 0 ? deviceVersions.get(node.path) || 0 : _ref7$version, signal = _ref7.signal, _ref7$deadline = _ref7.deadline, deadline = _ref7$deadline === void 0 ? Infinity : _ref7$deadline, _ref7$includeBattery = _ref7.includeBattery, includeBattery = _ref7$includeBattery === void 0 ? false : _ref7$includeBattery;
            _context9.prev = 1;
            _context9.next = 4;
            return statusQueue.run(node.path, /*#__PURE__*/function () {
              var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(jobSignal) {
                var last, _loop6, _i6, _arr5, _ret4;
                return _regeneratorRuntime().wrap(function _callee7$(_context8) {
                  while (1) switch (_context8.prev = _context8.next) {
                    case 0:
                      if (!(foregroundDevices.has(node.path) || (deviceVersions.get(node.path) || 0) !== version)) {
                        _context8.next = 2;
                        break;
                      }
                      return _context8.abrupt("return", {
                        skipped: true
                      });
                    case 2:
                      _loop6 = /*#__PURE__*/_regeneratorRuntime().mark(function _loop6() {
                        var command, readController, abort, timeout, url, response, raw, body, _bulkController3;
                        return _regeneratorRuntime().wrap(function _loop6$(_context7) {
                          while (1) switch (_context7.prev = _context7.next) {
                            case 0:
                              command = _arr5[_i6];
                              if (!(jobSignal.aborted || performance.now() >= deadline)) {
                                _context7.next = 3;
                                break;
                              }
                              throw new DOMException('Cancelled', 'AbortError');
                            case 3:
                              readController = new AbortController();
                              abort = function abort() {
                                return readController.abort();
                              };
                              jobSignal.addEventListener('abort', abort, {
                                once: true
                              });
                              timeout = setTimeout(abort, Math.max(1, Math.min(2500, deadline - performance.now())));
                              _context7.prev = 7;
                              url = apiURL(node.path);
                              url.searchParams.set('code', command);
                              _context7.next = 12;
                              return apiFetch(url, {
                                method: 'POST',
                                signal: readController.signal
                              });
                            case 12:
                              response = _context7.sent;
                              _context7.next = 15;
                              return response.text();
                            case 15:
                              raw = _context7.sent;
                              body = raw || '(empty response)';
                              try {
                                body = JSON.stringify(JSON.parse(raw), null, 2);
                              } catch (_unused11) {}
                              if (!(jobSignal.aborted || (deviceVersions.get(node.path) || 0) !== version)) {
                                _context7.next = 20;
                                break;
                              }
                              throw new DOMException('Superseded', 'AbortError');
                            case 20:
                              last = {
                                ok: response.ok,
                                status: response.status,
                                body: body
                              };
                              if (!jobSignal.aborted && (deviceVersions.get(node.path) || 0) === version) last.model = acceptDeviceResult(node, command, last);
                              if (![401, 403].includes(last.status)) {
                                _context7.next = 27;
                                break;
                              }
                              connectionError(last.status === 401 ? 'Sign in required' : 'Access denied');
                              (_bulkController3 = bulkController) === null || _bulkController3 === void 0 ? void 0 : _bulkController3.abort();
                              if (last.status === 401) openAuth();
                              return _context7.abrupt("return", {
                                v: last
                              });
                            case 27:
                              if (response.ok) {
                                _context7.next = 29;
                                break;
                              }
                              return _context7.abrupt("return", {
                                v: last
                              });
                            case 29:
                              _context7.next = 38;
                              break;
                            case 31:
                              _context7.prev = 31;
                              _context7.t0 = _context7["catch"](7);
                              if (!jobSignal.aborted) {
                                _context7.next = 35;
                                break;
                              }
                              throw _context7.t0;
                            case 35:
                              last = {
                                ok: false,
                                status: 0,
                                body: _context7.t0.name === 'AbortError' ? 'Status read timed out. Previous readings are unconfirmed.' : 'Status response unavailable. Check the network and CORS; previous readings are unconfirmed.'
                              };
                              if ((deviceVersions.get(node.path) || 0) === version) acceptDeviceResult(node, command, last);
                              return _context7.abrupt("return", {
                                v: last
                              });
                            case 38:
                              _context7.prev = 38;
                              clearTimeout(timeout);
                              jobSignal.removeEventListener('abort', abort);
                              return _context7.finish(38);
                            case 42:
                            case "end":
                              return _context7.stop();
                          }
                        }, _loop6, null, [[7, 31, 38, 42]]);
                      });
                      _i6 = 0, _arr5 = [code].concat(_toConsumableArray(includeBattery && code === 'status' && node.commands.includes('battery') ? ['battery'] : []));
                    case 4:
                      if (!(_i6 < _arr5.length)) {
                        _context8.next = 12;
                        break;
                      }
                      return _context8.delegateYield(_loop6(), "t0", 6);
                    case 6:
                      _ret4 = _context8.t0;
                      if (!(_typeof(_ret4) === "object")) {
                        _context8.next = 9;
                        break;
                      }
                      return _context8.abrupt("return", _ret4.v);
                    case 9:
                      _i6++;
                      _context8.next = 4;
                      break;
                    case 12:
                      return _context8.abrupt("return", last);
                    case 13:
                    case "end":
                      return _context8.stop();
                  }
                }, _callee7);
              }));
              return function (_x11) {
                return _ref8.apply(this, arguments);
              };
            }(), {
              signal: signal,
              deadline: deadline
            });
          case 4:
            return _context9.abrupt("return", _context9.sent);
          case 7:
            _context9.prev = 7;
            _context9.t0 = _context9["catch"](1);
            if (!(_context9.t0.name === 'AbortError')) {
              _context9.next = 11;
              break;
            }
            return _context9.abrupt("return", {
              skipped: true
            });
          case 11:
            throw _context9.t0;
          case 12:
          case "end":
            return _context9.stop();
        }
      }, _callee8, null, [[1, 7]]);
    }));
    return _readDevice.apply(this, arguments);
  }
  function refreshDevices(_x7) {
    return _refreshDevices.apply(this, arguments);
  }
  function _refreshDevices() {
    _refreshDevices = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(nodes) {
      var targets, batch, completed, failed, skipped, progress;
      return _regeneratorRuntime().wrap(function _callee10$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
            if (!bulkController) {
              _context11.next = 2;
              break;
            }
            return _context11.abrupt("return");
          case 2:
            targets = nodes.filter(function (node) {
              return node.commands.includes('status');
            });
            if (targets.length) {
              _context11.next = 5;
              break;
            }
            return _context11.abrupt("return");
          case 5:
            batch = new AbortController();
            bulkController = batch;
            completed = 0, failed = 0, skipped = 0;
            progress = function progress() {
              $('bulk-progress').textContent = "".concat(completed, "/").concat(targets.length, " refreshed").concat(failed ? ' · ' + failed + ' failed' : '').concat(skipped ? ' · ' + skipped + ' skipped' : '');
            };
            $('bulk-toolbar').hidden = false;
            $('cancel-refresh').hidden = false;
            document.querySelectorAll('.refresh-category, #refresh-all').forEach(function (button) {
              button.disabled = true;
            });
            progress();
            _context11.prev = 13;
            _context11.next = 16;
            return Promise.all(targets.map( /*#__PURE__*/function () {
              var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(node) {
                var result;
                return _regeneratorRuntime().wrap(function _callee9$(_context10) {
                  while (1) switch (_context10.prev = _context10.next) {
                    case 0:
                      statusPoller.cancel(node.path);
                      pendingStatusChecks.delete(node.path);
                      _context10.next = 4;
                      return readDevice(node, {
                        signal: batch.signal,
                        includeBattery: true
                      });
                    case 4:
                      result = _context10.sent;
                      if (result !== null && result !== void 0 && result.skipped) skipped++;else if (result !== null && result !== void 0 && result.ok) completed++;else failed++;
                      progress();
                      renderDeviceFeedback(node);
                    case 8:
                    case "end":
                      return _context10.stop();
                  }
                }, _callee9);
              }));
              return function (_x12) {
                return _ref9.apply(this, arguments);
              };
            }()));
          case 16:
            _context11.prev = 16;
            if (batch.signal.aborted) $('bulk-progress').textContent += ' · stopped';
            bulkController = null;
            $('cancel-refresh').hidden = true;
            document.querySelectorAll('.refresh-category').forEach(function (button) {
              button.disabled = false;
            });
            $('refresh-all').disabled = !deviceNodes().some(function (node) {
              return node.commands.includes('status');
            });
            return _context11.finish(16);
          case 23:
          case "end":
            return _context11.stop();
        }
      }, _callee10, null, [[13,, 16, 23]]);
    }));
    return _refreshDevices.apply(this, arguments);
  }
  function cancelStatusWork() {
    var _bulkController, _controller2;
    (_bulkController = bulkController) === null || _bulkController === void 0 ? void 0 : _bulkController.abort();
    statusPoller.cancelAll();
    pendingStatusChecks.clear();
    statusQueue.cancelAll();
    var _iterator6 = _createForOfIteratorHelper(deviceVersions),
      _step6;
    try {
      for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
        var _step6$value = _slicedToArray(_step6.value, 2),
          path = _step6$value[0],
          version = _step6$value[1];
        deviceVersions.set(path, version + 1);
      }
    } catch (err) {
      _iterator6.e(err);
    } finally {
      _iterator6.f();
    }
    (_controller2 = controller) === null || _controller2 === void 0 ? void 0 : _controller2.abort();
  }
  function deviceIcon(service) {
    var paths = {
      meross: ['M9 18h6M10 21h4M8.5 14.5a6 6 0 1 1 7 0C14.5 15.3 15 17 15 18H9c0-1 .5-2.7-.5-3.5Z'],
      radiator: ['M5 7v12M9 7v12M13 7v12M17 7v12M3 9h16M3 17h16M19 12h3M21 10v4M6 3v1M12 3v1M17 3v1'],
      thermostat: ['M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0ZM12 9v8M17 5h3M17 9h2'],
      snowdon: ['M5 9h3l5-4v14l-5-4H5ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14'],
      tvcom: ['M3 5h18v13H3ZM8 22h8M12 18v4'],
      wol: ['M3 3h18v14H3ZM8 22h8M12 17v5M7 13h10'],
      hikvision: ['M3 7h13v11H3ZM16 10l6-3v11l-6-3M7 4h5'],
      bthome: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1'],
      bins: ['M5 6h14l-1 15H6ZM3 6h18M9 6V3h6v3M10 10v7M14 10v7']
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var _iterator7 = _createForOfIteratorHelper(paths[service] || ['M5 5h14v14H5ZM9 9h6v6H9']),
      _step7;
    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var d = _step7.value;
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        svg.append(path);
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }
    return svg;
  }
  function customFor(node) {
    var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    $('device-dialog').close();
    $('advanced-panel').open = true;
    navigate(node.path);
    if (code) prepareCommand(code);
    $('advanced-panel').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    $('request-path').focus({
      preventScroll: true
    });
  }
  function numericRange(node) {
    var numbers = node.commands.filter(function (code) {
      return /^(0|[1-9]\d*)$/.test(code);
    }).map(Number).sort(function (a, b) {
      return a - b;
    });
    return numbers.length >= 10 && numbers.every(function (n, i) {
      return n === numbers[0] + i;
    }) ? numbers : null;
  }
  function quickButton(node, code) {
    var primary = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var button = el('button', 'quick-action' + (primary ? ' main-action' : ''), labelAction(code) + (needsArguments.has(code) ? '…' : ''));
    button.type = 'button';
    button.dataset.action = code;
    button.dataset.device = node.path;
    button.setAttribute('aria-label', labelAction(code) + ' · ' + title(node.name));
    button.addEventListener('click', function () {
      return needsArguments.has(code) ? customFor(node, code) : runQuick(node, code);
    });
    button.disabled = !!controller;
    return button;
  }
  function deviceControls(node, compact) {
    var container = el('div', 'quick-controls');
    var numbers = numericRange(node);
    if (numbers) {
      var _deviceStates$get3;
      container.classList.add('numeric-controls');
      var group = el('div', 'device-range');
      var label = el('label', '', serviceOf(node) === 'tvcom' ? title(node.name) : 'Value');
      var row = el('div', 'range-row');
      var range = el('input');
      range.type = 'range';
      range.min = numbers[0];
      range.max = numbers.at(-1);
      range.step = '1';
      range.value = numbers[0];
      var currentValue = (_deviceStates$get3 = deviceStates.get(node.path)) === null || _deviceStates$get3 === void 0 ? void 0 : _deviceStates$get3.model.value;
      if (currentValue != null) range.value = currentValue;
      range.setAttribute('aria-label', title(node.name) + ' value');
      var number = el('input');
      number.type = 'number';
      number.min = range.min;
      number.max = range.max;
      number.step = '1';
      number.value = range.value;
      number.required = true;
      number.setAttribute('aria-label', title(node.name) + ' numeric value');
      range.addEventListener('input', function () {
        number.value = range.value;
        range.dataset.dirty = 'true';
        number.dataset.dirty = 'true';
      });
      number.addEventListener('input', function () {
        number.dataset.dirty = 'true';
        range.dataset.dirty = 'true';
        if (number.value && number.checkValidity()) range.value = number.value;
      });
      var apply = el('button', 'quick-action main-action', 'Apply');
      apply.type = 'button';
      apply.dataset.device = node.path;
      apply.disabled = !!controller;
      apply.addEventListener('click', function () {
        if (number.reportValidity()) runQuick(node, number.value);
      });
      row.append(range, number);
      group.append(label, row, apply);
      container.append(group);
      // Values are drafts, never a fabricated current device reading.
      container.append(el('small', 'range-hint', 'Choose a value, then apply.'));
    }
    var priority = ['toggle', 'on', 'off', 'power', 'play_pause', 'volume_down', 'volume_up', 'status'];
    var codes = node.commands.filter(function (code) {
      return !(numbers && /^(0|[1-9]\d*)$/.test(code));
    });
    codes.sort(function (a, b) {
      var ai = priority.indexOf(a),
        bi = priority.indexOf(b);
      return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
    });
    var shown;
    if (compact && serviceOf(node) === 'tvcom' && node.name === 'input_select') {
      shown = ['hdmi_1', 'hdmi_2', 'hdmi_3', 'status'].filter(function (code) {
        return node.commands.includes(code);
      });
    } else if (compact && serviceOf(node) === 'snowdon') {
      shown = ['power', 'input', 'status'].filter(function (code) {
        return node.commands.includes(code);
      });
    } else {
      shown = compact ? codes.filter(function (code) {
        return !needsArguments.has(code);
      }).slice(0, numbers ? 1 : 3) : codes;
    }
    var _iterator8 = _createForOfIteratorHelper(shown),
      _step8;
    try {
      for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
        var code = _step8.value;
        container.append(quickButton(node, code, code === 'toggle' || code === 'on' || code === 'power'));
      }
    } catch (err) {
      _iterator8.e(err);
    } finally {
      _iterator8.f();
    }
    return container;
  }
  function toggleFavorite(path) {
    if (favorites.has(path)) favorites.delete(path);else favorites.add(path);
    try {
      localStorage.setItem('kennedn-control-favorites', JSON.stringify(_toConsumableArray(favorites)));
    } catch (_unused7) {/* Memory still works. */}
    renderDashboard();
  }
  var tileSizeFrame;
  function updateTileSizes() {
    var board = $('device-grid');
    var groups = _toConsumableArray(board.querySelectorAll('.device-tiles'));
    if (!groups.length) return;
    // Measure real headings and controls with a fixed allowance for readings/messages.
    // This runs on filtering or viewport changes, never on polling/message updates.
    board.classList.add('measuring-tiles');
    var sizes = groups.map(function (group) {
      return {
        group: group,
        height: Math.ceil(Math.max.apply(Math, _toConsumableArray(_toConsumableArray(group.children).map(function (card) {
          return card.getBoundingClientRect().height;
        }))) / 4) * 4
      };
    });
    board.classList.remove('measuring-tiles');
    var minimum = window.KennednLegacy ? window.KennednLegacyConfig.tileMinHeight : parseFloat(getComputedStyle(board).getPropertyValue('--tile-min-height')) || 240;
    board.dataset.sizing = 'category';
    var _iterator9 = _createForOfIteratorHelper(sizes),
      _step9;
    try {
      for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
        var _step9$value = _step9.value,
          group = _step9$value.group,
          height = _step9$value.height;
        var fitted = Math.max(minimum, height);
        if (!window.KennednLegacy) group.style.setProperty('--tile-height', fitted + 'px');
        if (window.KennednLegacyUI) {
          var _iterator10 = _createForOfIteratorHelper(group.children),
            _step10;
          try {
            for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
              var card = _step10.value;
              window.KennednLegacyUI.updateTile(card, fitted);
            }
          } catch (err) {
            _iterator10.e(err);
          } finally {
            _iterator10.f();
          }
        }
      }
    } catch (err) {
      _iterator9.e(err);
    } finally {
      _iterator9.f();
    }
  }
  function scheduleTileSizing() {
    cancelAnimationFrame(tileSizeFrame);
    tileSizeFrame = requestAnimationFrame(updateTileSizes);
  }
  window.addEventListener('resize', scheduleTileSizing);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleTileSizing);else {
    window.addEventListener('load', scheduleTileSizing);
    setTimeout(scheduleTileSizing, 500);
  }
  function renderDashboard() {
    if (!bulkController) {
      $('bulk-progress').textContent = '';
      $('bulk-toolbar').hidden = true;
    }
    var nodes = deviceNodes();
    $('device-count').textContent = nodes.length + ' controls';
    $('service-filters').replaceChildren();
    var services = _toConsumableArray(new Set(nodes.map(serviceOf))).sort(function (a, b) {
      return serviceOrder.indexOf(a) - serviceOrder.indexOf(b);
    });
    var _loop3 = function _loop3() {
      var _arr4$_i = _slicedToArray(_arr4[_i5], 2),
        key = _arr4$_i[0],
        label = _arr4$_i[1];
      var button = el('button', 'service-filter' + (activeService === key ? ' active' : ''), label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(activeService === key));
      button.addEventListener('click', function () {
        activeService = key;
        renderDashboard();
      });
      $('service-filters').append(button);
    };
    for (var _i5 = 0, _arr4 = [['all', 'All devices'], ['favorites', '★ Favourites']].concat(_toConsumableArray(services.map(function (key) {
        return [key, serviceNames[key] || title(key)];
      }))); _i5 < _arr4.length; _i5++) {
      _loop3();
    }
    var search = $('device-search').value.trim().toLowerCase();
    var visible = nodes.filter(function (node) {
      return (activeService === 'all' || (activeService === 'favorites' ? favorites.has(node.path) : serviceOf(node) === activeService)) && (node.path + ' ' + title(node.name) + ' ' + node.commands.join(' ')).toLowerCase().includes(search);
    });
    $('refresh-all').disabled = !!bulkController || !nodes.some(function (node) {
      return node.commands.includes('status');
    });
    $('device-grid').replaceChildren();
    $('empty-devices').hidden = !!visible.length;
    $('empty-devices').textContent = activeService === 'favorites' && !favorites.size ? 'Pin the devices you use most with the star on each tile.' : 'No matching devices. Try another service or search.';
    var _iterator11 = _createForOfIteratorHelper(services),
      _step11;
    try {
      var _loop4 = function _loop4() {
        var service = _step11.value;
        var groupNodes = visible.filter(function (node) {
          return serviceOf(node) === service;
        }).sort(function (a, b) {
          return Number(favorites.has(b.path)) - Number(favorites.has(a.path)) || a.name.localeCompare(b.name);
        });
        if (!groupNodes.length) return "continue";
        var section = el('section', 'device-group');
        var heading = el('div', 'device-group-heading');
        heading.append(el('h2', '', serviceNames[service] || title(service)), el('span', '', groupNodes.length + (groupNodes.length === 1 ? ' control' : ' controls')));
        if (groupNodes.some(function (node) {
          return node.commands.includes('status');
        })) {
          var refresh = el('button', 'refresh-category icon-button', '↻');
          refresh.type = 'button';
          refresh.setAttribute('aria-label', 'Refresh status for ' + (serviceNames[service] || title(service)));
          refresh.title = 'Refresh ' + (serviceNames[service] || title(service)) + ' statuses';
          refresh.disabled = !!bulkController;
          refresh.addEventListener('click', function () {
            return refreshDevices(groupNodes);
          });
          heading.append(refresh);
        }
        var tiles = el('div', 'device-tiles');
        tiles.dataset.service = service;
        var _iterator12 = _createForOfIteratorHelper(groupNodes.entries()),
          _step12;
        try {
          var _loop5 = function _loop5() {
            var _deviceResults$get;
            var _step12$value = _slicedToArray(_step12.value, 2),
              tileIndex = _step12$value[0],
              node = _step12$value[1];
            var card = el('article', 'device-tile');
            card.dataset.path = node.path;
            var color = ['#c8225e', '#1d7775', '#66089b'][tileIndex % 3];
            if (!window.KennednLegacy) card.style.setProperty('--device-color', color);
            card.style.backgroundColor = color;
            card.dataset.tone = ['pink', 'teal', 'purple'][tileIndex % 3];
            deviceColors.set(node.path, color);
            var pin = el('button', 'favorite-button', favorites.has(node.path) ? '★' : '☆');
            pin.type = 'button';
            pin.setAttribute('aria-label', (favorites.has(node.path) ? 'Unpin ' : 'Pin ') + title(node.name));
            pin.setAttribute('aria-pressed', String(favorites.has(node.path)));
            pin.addEventListener('click', function () {
              return toggleFavorite(node.path);
            });
            var identity = el('div', 'device-identity');
            identity.append(deviceIcon(service), el('h3', '', title(node.name)));
            var feedback = el('p', 'device-feedback', ((_deviceResults$get = deviceResults.get(node.path)) === null || _deviceResults$get === void 0 ? void 0 : _deviceResults$get.label) || '');
            feedback.setAttribute('role', 'status');
            paintFeedback(feedback, node);
            var more = el('button', 'more-button', '⋯');
            more.type = 'button';
            more.setAttribute('aria-label', 'More controls for ' + title(node.name));
            more.setAttribute('aria-haspopup', 'dialog');
            more.addEventListener('click', function () {
              return openDevice(node);
            });
            var tools = el('div', 'tile-tools');
            tools.append(pin, more);
            var state = el('div', 'device-state');
            card.append(tools, identity, state, feedback, deviceControls(node, true));
            paintDeviceState(card, state, node);
            tiles.append(card);
          };
          for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
            _loop5();
          }
        } catch (err) {
          _iterator12.e(err);
        } finally {
          _iterator12.f();
        }
        section.append(heading, tiles);
        $('device-grid').append(section);
      };
      for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
        var _ret3 = _loop4();
        if (_ret3 === "continue") continue;
      }
    } catch (err) {
      _iterator11.e(err);
    } finally {
      _iterator11.f();
    }
    updateTileSizes();
  }
  function openDevice(node) {
    activeDevice = node;
    if (!window.KennednLegacy) $('device-dialog').style.setProperty('--device-color', deviceColors.get(node.path) || '#1c817e');
    $('device-dialog').style.backgroundColor = deviceColors.get(node.path) || '#1c817e';
    $('device-dialog-title').textContent = title(node.name);
    $('device-dialog-service').textContent = serviceNames[serviceOf(node)] || title(serviceOf(node));
    $('device-dialog-controls').replaceChildren(deviceControls(node, false));
    renderDeviceFeedback(node);
    if (!$('device-dialog').open) $('device-dialog').showModal();
  }
  function paintDeviceState(host, container, node) {
    var reading = deviceStates.get(node.path);
    var model = reading === null || reading === void 0 ? void 0 : reading.model;
    container.replaceChildren();
    host.dataset.power = (model === null || model === void 0 ? void 0 : model.power) || 'unknown';
    host.dataset.heating = (model === null || model === void 0 ? void 0 : model.heating) === true ? 'true' : 'false';
    host.dataset.online = (model === null || model === void 0 ? void 0 : model.online) || 'unknown';
    host.dataset.stale = reading !== null && reading !== void 0 && reading.stale ? 'true' : 'false';
    if (!window.KennednLegacy) host.style.setProperty('--light-color', (model === null || model === void 0 ? void 0 : model.color) || '#fff4b8');
    if (!window.KennednLegacy && (model === null || model === void 0 ? void 0 : model.brightness) != null) host.style.setProperty('--light-strength', Math.max(.15, model.brightness / 100));
    if (!model) return;
    var badges = el('div', 'state-badges');
    if (model.power !== null) badges.append(el('span', 'state-badge power-state', model.power === 'on' ? 'On' : 'Off'));
    if (model.online === 'off') badges.append(el('span', 'state-badge', 'Offline'));
    if (model.heating !== null) badges.append(el('span', 'state-badge heating-state', model.heating ? 'Heating' : 'Idle'));
    var _iterator13 = _createForOfIteratorHelper(model.flags),
      _step13;
    try {
      for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
        var flag = _step13.value;
        badges.append(el('span', 'state-badge', flag));
      }
    } catch (err) {
      _iterator13.e(err);
    } finally {
      _iterator13.f();
    }
    if (model.selection) badges.append(el('span', 'state-badge', title(model.selection)));
    if (reading.stale) badges.append(el('span', 'state-badge stale-state', 'Last known'));
    container.append(badges);
    if (model.metrics.length) {
      var metrics = el('dl', 'state-metrics');
      var _iterator14 = _createForOfIteratorHelper(model.metrics),
        _step14;
      try {
        for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
          var metric = _step14.value;
          var cell = el('div', 'state-metric');
          cell.append(el('dt', '', metric.label), el('dd', '', metric.value + metric.unit));
          metrics.append(cell);
        }
      } catch (err) {
        _iterator14.e(err);
      } finally {
        _iterator14.f();
      }
      container.append(metrics);
    }
    var _iterator15 = _createForOfIteratorHelper(host.querySelectorAll('[data-action=toggle]')),
      _step15;
    try {
      for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
        var button = _step15.value;
        if (model.power !== null) {
          button.textContent = reading.stale ? 'Toggle' : model.power === 'on' ? 'Turn off' : 'Turn on';
          button.setAttribute('aria-label', button.textContent + ' · ' + title(node.name));
          if (reading.stale) button.removeAttribute('aria-pressed');else button.setAttribute('aria-pressed', String(model.power === 'on'));
        }
      }
    } catch (err) {
      _iterator15.e(err);
    } finally {
      _iterator15.f();
    }
    var _iterator16 = _createForOfIteratorHelper(host.querySelectorAll('[data-action]')),
      _step16;
    try {
      for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
        var _button = _step16.value;
        var matches = _button.dataset.action === model.selection || ['on', 'off'].includes(_button.dataset.action) && _button.dataset.action === model.power;
        _button.classList.toggle('state-selected', matches);
        if (['on', 'off'].includes(_button.dataset.action)) _button.setAttribute('aria-pressed', String(matches));
      }
    } catch (err) {
      _iterator16.e(err);
    } finally {
      _iterator16.f();
    }
    if (model.value !== null) {
      var _iterator17 = _createForOfIteratorHelper(host.querySelectorAll('.device-range input')),
        _step17;
      try {
        for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
          var input = _step17.value;
          if (input.dataset.dirty !== 'true') input.value = model.value;
        }
      } catch (err) {
        _iterator17.e(err);
      } finally {
        _iterator17.f();
      }
    }
  }
  function paintFeedback(element, node) {
    var result = deviceResults.get(node.path);
    element.dataset.kind = (result === null || result === void 0 ? void 0 : result.kind) || '';
    element.replaceChildren();
    if (pendingStatusChecks.has(node.path) && !['pending', 'error', 'unconfirmed'].includes(result === null || result === void 0 ? void 0 : result.kind)) {
      element.append(el('span', 'polling-state', 'Updating status…'));
    } else element.textContent = (result === null || result === void 0 ? void 0 : result.label) || '';
  }
  function renderDeviceFeedback(node) {
    var _activeDevice;
    var result = deviceResults.get(node.path);
    var _iterator18 = _createForOfIteratorHelper($('device-grid').querySelectorAll('.device-tile')),
      _step18;
    try {
      for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
        var card = _step18.value;
        if (card.dataset.path === node.path) {
          var feedback = card.querySelector('.device-feedback');
          paintFeedback(feedback, node);
          paintDeviceState(card, card.querySelector('.device-state'), node);
        }
      }
    } catch (err) {
      _iterator18.e(err);
    } finally {
      _iterator18.f();
    }
    if (((_activeDevice = activeDevice) === null || _activeDevice === void 0 ? void 0 : _activeDevice.path) === node.path) {
      paintDeviceState($('device-dialog'), $('device-dialog-state'), node);
      paintFeedback($('device-dialog-feedback'), node);
      $('device-dialog-response').textContent = (result === null || result === void 0 ? void 0 : result.body) || 'No response yet.';
    }
  }
  function runQuick(_x8, _x9) {
    return _runQuick.apply(this, arguments);
  }
  function _runQuick() {
    _runQuick = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(node, code) {
      var url, result, _iterator19, _step19, _activeDevice2, input, owner;
      return _regeneratorRuntime().wrap(function _callee11$(_context12) {
        while (1) switch (_context12.prev = _context12.next) {
          case 0:
            if (!controller) {
              _context12.next = 2;
              break;
            }
            return _context12.abrupt("return");
          case 2:
            deviceResults.set(node.path, {
              kind: 'pending',
              label: labelAction(code) + ' · sending…'
            });
            renderDeviceFeedback(node);
            url = apiURL(node.path);
            url.searchParams.set('code', code);
            _context12.next = 8;
            return sendRequest({
              url: url,
              options: {
                method: 'POST'
              }
            });
          case 8:
            result = _context12.sent;
            if (result !== null && result !== void 0 && result.ok && /^\d+$/.test(code)) {
              _iterator19 = _createForOfIteratorHelper(document.querySelectorAll('.device-range input'));
              try {
                for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
                  input = _step19.value;
                  owner = input.closest('.device-tile');
                  if (((owner === null || owner === void 0 ? void 0 : owner.dataset.path) === node.path || !owner && ((_activeDevice2 = activeDevice) === null || _activeDevice2 === void 0 ? void 0 : _activeDevice2.path) === node.path) && input.value === code) delete input.dataset.dirty;
                }
              } catch (err) {
                _iterator19.e(err);
              } finally {
                _iterator19.f();
              }
              renderDeviceFeedback(node);
            }
          case 10:
          case "end":
            return _context12.stop();
        }
      }, _callee11);
    }));
    return _runQuick.apply(this, arguments);
  }
  $('refresh-all').addEventListener('click', function () {
    return refreshDevices(deviceNodes());
  });
  $('cancel-refresh').addEventListener('click', function () {
    var _bulkController2;
    return (_bulkController2 = bulkController) === null || _bulkController2 === void 0 ? void 0 : _bulkController2.abort();
  });
  window.addEventListener('pagehide', cancelStatusWork);
  $('device-search').addEventListener('input', function () {
    if (catalog) renderDashboard();
  });
  $('device-close').addEventListener('click', function () {
    return $('device-dialog').close();
  });
  $('device-custom').addEventListener('click', function () {
    if (activeDevice) customFor(activeDevice);
  });
  function init() {
    return _init.apply(this, arguments);
  }
  function _init() {
    _init = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
      var _catalog$nodes, response;
      return _regeneratorRuntime().wrap(function _callee12$(_context13) {
        while (1) switch (_context13.prev = _context13.next) {
          case 0:
            _context13.prev = 0;
            _context13.next = 3;
            return fetch(document.body.dataset.catalog);
          case 3:
            response = _context13.sent;
            if (response.ok) {
              _context13.next = 6;
              break;
            }
            throw new Error('Cannot load the generated API catalog (HTTP ' + response.status + '). Run make build.');
          case 6:
            _context13.next = 8;
            return response.json();
          case 8:
            catalog = _context13.sent;
            if ((_catalog$nodes = catalog.nodes) !== null && _catalog$nodes !== void 0 && _catalog$nodes[catalog.root]) {
              _context13.next = 11;
              break;
            }
            throw new Error('The API catalog is invalid. Run make build.');
          case 11:
            $('api-origin').textContent = apiBase;
            $('node-count').textContent = Object.keys(catalog.nodes).length;
            $('snapshot-date').textContent = new Date(catalog.generatedAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });
            expanded.add(catalog.root);
            navigate(location.hash.slice(1) || catalog.root, false);
            renderDashboard();
            if (location.hash.slice(1) && location.hash.slice(1) !== catalog.root) $('advanced-panel').open = true;
            void checkConnection();
            _context13.next = 29;
            break;
          case 21:
            _context13.prev = 21;
            _context13.t0 = _context13["catch"](0);
            $('notice').textContent = _context13.t0.message;
            $('notice').hidden = false;
            connectionError('Catalog unavailable');
            $('send').disabled = true;
            $('inspect').disabled = true;
            $('auth-button').disabled = true;
          case 29:
          case "end":
            return _context13.stop();
        }
      }, _callee12, null, [[0, 21]]);
    }));
    return _init.apply(this, arguments);
  }
  void init();
})();
