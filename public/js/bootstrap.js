/* ES5-only entry point: old Safari must never parse the modern application files. */
(function () {
  'use strict';
  var base = document.body.getAttribute('data-script-base');
  var forced = /(?:\?|&)legacy=1(?:&|$)/.test(window.location.search) || window.__KENNEDN_FORCE_LEGACY;
  var modern = !forced && window.CSS && CSS.supports && CSS.supports('display', 'grid') && CSS.supports('color', 'var(--test)') && CSS.registerProperty && window.fetch && window.Promise && window.AbortController && window.AbortSignal && AbortSignal.timeout && window.URLSearchParams && window.TextEncoder && window.HTMLDialogElement && HTMLDialogElement.prototype.showModal && Array.prototype.at && Element.prototype.replaceChildren;
  function failed() {
    var notice = document.getElementById('notice');
    notice.textContent = 'The controls could not load. Reload the page to try again.';
    notice.hidden = false;
  }
  function load(files) {
    if (!files.length) return;
    var script = document.createElement('script');
    script.src = base + files.shift(); script.async = false;
    script.onload = function () { load(files); };
    script.onerror = failed;
    document.head.appendChild(script);
  }
  if (modern) load(['device-status.js', 'status-updates.js', 'app.js']);
  else {
    window.KennednLegacy = true;
    document.documentElement.className += ' legacy-browser';
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + '../css/legacy.css';
    // Measure only after the compatible layout stylesheet is applied.
    css.onload = function () { load(['vendor/core-js-3.26.1.min.js', 'legacy/compat.js', 'vendor/fetch-3.6.20.js', 'legacy/app.js']); };
    css.onerror = failed;
    document.head.appendChild(css);
  }
})();
