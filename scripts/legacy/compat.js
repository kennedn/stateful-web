/* Browser API fallbacks for the ES5 build. ES standard-library shims load first. */
(function () {
  'use strict';
  try { new window.DOMException('test', 'AbortError'); } catch (error) {
    window.DOMException = function (message, name) { var e = new Error(message); e.name = name || 'Error'; return e; };
  }
  if (!window.performance) window.performance = {};
  if (!window.performance.now) { var start = Date.now(); window.performance.now = function () { return Date.now() - start; }; }
  if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback) { return setTimeout(function () { callback(performance.now()); }, 16); };
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = clearTimeout;
  if (!window.TextEncoder) window.TextEncoder = function () {};
  if (!window.TextEncoder.prototype.encode) window.TextEncoder.prototype.encode = function (text) {
    var bytes = unescape(encodeURIComponent(String(text))), result = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) result[i] = bytes.charCodeAt(i);
    return result;
  };
  if (!window.AbortController) {
    var Signal = function () { this.aborted = false; this.listeners = []; };
    Signal.prototype.addEventListener = function (type, callback, options) { if (type === 'abort') this.listeners.push({callback: callback, once: options && options.once}); };
    Signal.prototype.removeEventListener = function (type, callback) { if (type === 'abort') this.listeners = this.listeners.filter(function (entry) { return entry.callback !== callback; }); };
    Signal.prototype.throwIfAborted = function () { if (this.aborted) throw this.reason; };
    window.AbortSignal = Signal;
    window.AbortController = function () { this.signal = new Signal(); };
    window.AbortController.prototype.abort = function (reason) {
      var signal = this.signal;
      if (signal.aborted) return;
      signal.aborted = true; signal.reason = reason || new DOMException('Aborted', 'AbortError');
      signal.listeners.slice().forEach(function (entry) {
        if (entry.once) signal.removeEventListener('abort', entry.callback);
        entry.callback.call(signal, {type: 'abort', target: signal});
      });
      if (typeof signal.onabort === 'function') signal.onabort({type: 'abort', target: signal});
    };
  }
  if (!window.AbortSignal.timeout) window.AbortSignal.timeout = function (ms) { var controller = new AbortController(); setTimeout(function () { controller.abort(); }, ms); return controller.signal; };
  // Use the abortable XHR transport even on old engines with an incomplete native fetch.
  window.fetch = undefined;
  var probe = document.createElement('div');
  probe.classList.toggle('probe', false);
  if (probe.classList.contains('probe') && window.DOMTokenList) {
    var originalToggle = DOMTokenList.prototype.toggle;
    DOMTokenList.prototype.toggle = function (token, force) {
      if (arguments.length > 1) { if (force) this.add(token); else this.remove(token); return !!force; }
      return originalToggle.call(this, token);
    };
  }
  function validInput(input) {
    if (input.required && input.value === '') return false;
    if (input.type === 'number' && input.value !== '') {
      var value = Number(input.value), min = input.getAttribute('min'), max = input.getAttribute('max'), step = input.getAttribute('step');
      if (!isFinite(value) || (min !== null && value < Number(min)) || (max !== null && value > Number(max))) return false;
      if (step && step !== 'any' && Number(step) > 0) {
        var quotient = (value - (min === null ? 0 : Number(min))) / Number(step);
        if (Math.abs(quotient - Math.round(quotient)) > 0.0000001) return false;
      }
    }
    return true;
  }
  if (!HTMLInputElement.prototype.checkValidity) HTMLInputElement.prototype.checkValidity = function () { return validInput(this); };
  if (!HTMLInputElement.prototype.reportValidity) HTMLInputElement.prototype.reportValidity = function () {
    var valid = validInput(this) && this.checkValidity();
    if (!valid) {
      this.focus(); this.setAttribute('aria-invalid', 'true');
      var tile = this.closest('.device-tile'), message = tile && tile.querySelector('.device-feedback');
      if (!message) message = document.getElementById('device-dialog-feedback');
      if (message) message.textContent = this.validationMessage || 'Enter a valid value in the allowed range.';
    } else this.removeAttribute('aria-invalid');
    return valid;
  };
  var prototype = Element.prototype;
  if (!prototype.matches) prototype.matches = prototype.webkitMatchesSelector || function (selector) {
    var matches = (this.ownerDocument || document).querySelectorAll(selector);
    for (var i = 0; i < matches.length; i++) if (matches[i] === this) return true;
    return false;
  };
  if (!prototype.closest) prototype.closest = function (selector) { var node = this; while (node && node.nodeType === 1) { if (node.matches(selector)) return node; node = node.parentElement; } return null; };
  function fragment(owner, args) {
    var result = owner.createDocumentFragment();
    for (var i = 0; i < args.length; i++) result.appendChild(args[i] && args[i].nodeType ? args[i] : owner.createTextNode(String(args[i])));
    return result;
  }
  if (!prototype.append) prototype.append = function () { this.appendChild(fragment(this.ownerDocument, arguments)); };
  if (!prototype.prepend) prototype.prepend = function () { this.insertBefore(fragment(this.ownerDocument, arguments), this.firstChild); };
  if (!prototype.replaceChildren) prototype.replaceChildren = function () { while (this.firstChild) this.removeChild(this.firstChild); this.appendChild(fragment(this.ownerDocument, arguments)); };
  if (!prototype.remove) prototype.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };

  // Safari 8 has no modal dialog API. Keep stacked dialogs and keyboard focus contained.
  var dialogs = [], lockedScroll = null, backdrop = document.createElement('div');
  backdrop.className = 'legacy-backdrop'; backdrop.hidden = true; document.body.appendChild(backdrop);
  backdrop.addEventListener('touchmove', function (event) { event.preventDefault(); });
  function syncDialogs() {
    backdrop.hidden = dialogs.length === 0;
    if (dialogs.length) {
      backdrop.style.zIndex = 1000 + (dialogs.length - 1) * 2;
      if (!lockedScroll) { lockedScroll = {x: window.pageXOffset, y: window.pageYOffset, top: document.body.style.top}; document.body.style.top = -lockedScroll.y + 'px'; }
      document.documentElement.classList.add('legacy-modal-open');
    } else {
      document.documentElement.classList.remove('legacy-modal-open');
      if (lockedScroll) { var savedScroll = lockedScroll; lockedScroll = null; document.body.style.top = savedScroll.top; window.scrollTo(savedScroll.x, savedScroll.y); }
    }
    for (var i = 0; i < dialogs.length; i++) {
      dialogs[i].style.zIndex = 1001 + i * 2;
      dialogs[i].style.maxHeight = Math.max(160, window.innerHeight - 32) + 'px';
      dialogs[i].setAttribute('aria-hidden', i === dialogs.length - 1 ? 'false' : 'true');
    }
  }
  function focusable(dialog) { return Array.from(dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')).filter(function (node) { return !node.disabled && node.offsetWidth && node.offsetHeight && node.tabIndex >= 0; }); }
  Array.from(document.querySelectorAll('dialog')).forEach(function (dialog) {
    Object.defineProperty(dialog, 'open', {configurable: true, get: function () { return this.hasAttribute('open'); }, set: function (value) { if (value) this.setAttribute('open', ''); else this.removeAttribute('open'); }});
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.showModal = function () {
      if (dialog.open) return;
      dialog._previousFocus = document.activeElement; dialog.open = true; dialogs.push(dialog); syncDialogs();
      var controls = focusable(dialog); if (controls.length) controls[0].focus();
    };
    dialog.close = function () {
      if (!dialog.open) return;
      dialog.open = false; var index = dialogs.indexOf(dialog); if (index !== -1) dialogs.splice(index, 1); syncDialogs();
      if (dialog._previousFocus && document.documentElement.contains(dialog._previousFocus)) dialog._previousFocus.focus();
      var event = document.createEvent('Event'); event.initEvent('close', false, false); dialog.dispatchEvent(event);
    };
  });
  document.addEventListener('keydown', function (event) {
    if (!dialogs.length) return;
    var dialog = dialogs[dialogs.length - 1];
    if (event.key === 'Escape' || event.keyCode === 27) {
      var cancel = document.createEvent('Event'); cancel.initEvent('cancel', false, true); dialog.dispatchEvent(cancel);
      if (!cancel.defaultPrevented) dialog.close(); event.preventDefault();
    } else if (event.key === 'Tab' || event.keyCode === 9) {
      var nodes = focusable(dialog); if (!nodes.length) { event.preventDefault(); return; }
      var index = nodes.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { nodes[nodes.length - 1].focus(); event.preventDefault(); }
      else if (!event.shiftKey && (index < 0 || index === nodes.length - 1)) { nodes[0].focus(); event.preventDefault(); }
    }
  });
  window.addEventListener('resize', syncDialogs);
  // Native details is present on iOS 8, but provide a fallback for other old engines.
  if (!('open' in document.createElement('details'))) Array.from(document.querySelectorAll('details')).forEach(function (details) {
    Object.defineProperty(details, 'open', {get: function () { return this.hasAttribute('open'); }, set: function (value) { if (value) this.setAttribute('open', ''); else this.removeAttribute('open'); }});
    var summary = details.querySelector('summary');
    if (summary) { summary.tabIndex = 0; summary.setAttribute('role', 'button'); summary.addEventListener('click', function () { details.open = !details.open; summary.setAttribute('aria-expanded', String(details.open)); }); summary.addEventListener('keydown', function (event) { if (event.keyCode === 13 || event.keyCode === 32) { event.preventDefault(); summary.click(); } }); }
  });
  window.KennednLegacyUI = {
    updateTile: function (card, height) {
      card.style.height = height + 'px'; card.style.minHeight = height + 'px';
      var svg = card.querySelector('.legacy-border');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'legacy-border'); svg.setAttribute('aria-hidden', 'true');
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        var animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate'); animate.setAttribute('attributeName', 'stroke-dashoffset'); animate.setAttribute('from', '0'); animate.setAttribute('repeatCount', 'indefinite');
        rect.appendChild(animate); svg.appendChild(rect); card.appendChild(svg);
      }
      var width = card.offsetWidth, perimeter = 2 * (width + height - 4), shape = svg.firstChild;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      shape.setAttribute('x', '1'); shape.setAttribute('y', '1'); shape.setAttribute('width', Math.max(0, width - 2)); shape.setAttribute('height', Math.max(0, height - 2));
      shape.setAttribute('stroke-dasharray', (perimeter * 0.65) + ' ' + (perimeter * 0.35));
      shape.firstChild.setAttribute('to', String(-perimeter)); shape.firstChild.setAttribute('dur', window.KennednLegacyConfig.borderDuration);
    }
  };
})();
