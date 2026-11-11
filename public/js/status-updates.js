/* Bounded, cancellable status reads. Action requests are never retried here. */
'use strict';
window.StatusUpdates = (() => {
  const abortError = () => new DOMException('Status refresh cancelled', 'AbortError');
  class Queue {
    constructor(limit = 3) { this.limit = limit; this.active = 0; this.pending = []; this.jobs = new Map(); }
    cancel(key) { this.jobs.get(key)?.controller.abort(); }
    cancelAll() { for (const job of this.jobs.values()) job.controller.abort(); }
    run(key, work, {signal, deadline = Infinity} = {}) {
      this.cancel(key);
      const controller = new AbortController();
      const cancel = () => controller.abort();
      return new Promise((resolve, reject) => {
        const job = {key, work, controller, resolve, reject, started: false};
        const timer = Number.isFinite(deadline) ? setTimeout(cancel, Math.max(0, deadline - performance.now())) : null;
        job.finish = () => {
          clearTimeout(timer); signal?.removeEventListener('abort', cancel);
          if (this.jobs.get(key) === job) this.jobs.delete(key);
        };
        controller.signal.addEventListener('abort', () => {
          if (!job.started) { job.finish(); reject(abortError()); }
        }, {once: true});
        signal?.addEventListener('abort', cancel, {once: true});
        this.jobs.set(key, job);
        if (signal?.aborted || deadline <= performance.now()) { cancel(); return; }
        this.pending.push(job); this.pump();
      });
    }
    pump() {
      while (this.active < this.limit && this.pending.length) {
        const job = this.pending.shift();
        if (job.controller.signal.aborted) continue;
        job.started = true; this.active++;
        Promise.resolve().then(() => {
          if (job.controller.signal.aborted) throw abortError();
          return job.work(job.controller.signal);
        }).then(job.resolve, job.reject).finally(() => { job.finish(); this.active--; this.pump(); });
      }
    }
  }
  class Poller {
    constructor() { this.jobs = new Map(); }
    cancel(key) { this.jobs.get(key)?.abort(); }
    cancelAll() { for (const job of this.jobs.values()) job.abort(); }
    start(key, work) {
      this.cancel(key);
      const controller = new AbortController();
      this.jobs.set(key, controller);
      const started = performance.now(), deadline = started + 10000;
      const cutoff = setTimeout(() => controller.abort(), 10000);
      const pause = (ms) => new Promise((resolve, reject) => {
        if (controller.signal.aborted) { reject(abortError()); return; }
        const cancel = () => { clearTimeout(timer); reject(abortError()); };
        const timer = setTimeout(() => { controller.signal.removeEventListener('abort', cancel); resolve(); }, ms);
        controller.signal.addEventListener('abort', cancel, {once: true});
      });
      const done = (async () => {
        try {
          // Absolute offsets: slow responses and queueing consume the same ten-second budget.
          for (const offset of [100, 250, 500, 850, 1300, 1900, 2700, 3700, 4900, 6300, 7900, 9500]) {
            await pause(Math.max(0, started + offset - performance.now()));
            if (controller.signal.aborted || performance.now() >= deadline) break;
            const result = await work({signal: controller.signal, deadline});
            if (result?.settled || [401, 403].includes(result?.status)) break;
          }
        } catch (error) {
          if (error.name !== 'AbortError') console.warn('Status follow-up stopped:', error.message);
        } finally {
          clearTimeout(cutoff);
          if (this.jobs.get(key) === controller) this.jobs.delete(key);
        }
      })();
      return done;
    }
  }
  return {Queue, Poller};
})();
