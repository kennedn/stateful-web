/* Test harness only: remove modern APIs and route the XHR polyfill into mocked API responses. */
(function () {
  window.__KENNEDN_FORCE_LEGACY = true;
  var nativeSetProperty=CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty=function(name,value,priority){if(name.indexOf('--')===0)throw new Error('CSS variables unavailable');return nativeSetProperty.call(this,name,value,priority);};
  var mockFetch = window.fetch;
  var NativeAbortController = window.AbortController;
  var NativePromise = window.Promise;
  var NativeURL = window.URL;
  function FakeXHR() {
    this.headers = {}; this.readyState = 0; this.status = 0; this.responseType = '';
    this.onload = null; this.onerror = null; this.onabort = null;
  }
  FakeXHR.prototype.open = function (method, url) { this.method = method; this.url = new NativeURL(url, location.href).href; this.readyState = 1; };
  FakeXHR.prototype.setRequestHeader = function (key, value) { this.headers[key] = value; };
  FakeXHR.prototype.getAllResponseHeaders = function () { return this.rawHeaders || ''; };
  FakeXHR.prototype.getResponseHeader = function (key) { return this.receivedHeaders && this.receivedHeaders.get(key); };
  FakeXHR.prototype.send = function (body) {
    var self = this; self.controller = new NativeAbortController();
    NativePromise.resolve(mockFetch(self.url, {method: self.method, headers: self.headers, body: body || undefined, signal: self.controller.signal})).then(function (response) {
      return response.text().then(function (text) {
        if (self.finished) return;
        self.finished = true; self.readyState = 4; self.status = response.status; self.statusText = response.statusText;
        self.responseURL = self.url; self.response = text; self.responseText = text; self.receivedHeaders = response.headers;
        var headers = []; response.headers.forEach(function (value, key) { headers.push(key + ': ' + value); }); self.rawHeaders = headers.join('\r\n');
        if (self.onreadystatechange) self.onreadystatechange(); if (self.onload) self.onload();
      });
    }).catch(function () { if (!self.finished) { self.finished = true; if (self.onerror) self.onerror(); } });
  };
  FakeXHR.prototype.abort = function () { if (this.finished) return; this.finished = true; if (this.controller) this.controller.abort(); if (this.onabort) this.onabort(); };
  window.XMLHttpRequest = FakeXHR;
  ['fetch','Headers','Request','Response','Promise','Map','Set','WeakMap','WeakSet','Symbol','URL','URLSearchParams','TextEncoder','AbortController','AbortSignal','DOMException','HTMLDialogElement'].forEach(function (name) {
    Object.defineProperty(window, name, {value: undefined, configurable: true, writable: true});
  });
  ['append','prepend','replaceChildren','closest','matches'].forEach(function (name) { delete Element.prototype[name]; });
  delete NodeList.prototype.forEach;
  delete Array.prototype.at; delete Array.prototype.includes;
  delete Object.entries; delete Object.fromEntries;
  delete HTMLInputElement.prototype.reportValidity; delete HTMLInputElement.prototype.checkValidity;
  Object.defineProperty(document, 'fonts', {value: undefined, configurable: true});
  Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true});
})();
