/**
 * Polyfill for Promise.try (ES2024)
 *
 * Promise.try() is a new JavaScript feature added in ES2024 that executes a callback
 * and returns a Promise. This polyfill provides compatibility for environments that
 * don't support it yet.
 *
 * Reference: https://github.com/tc39/proposal-promise-try
 */

if (typeof Promise.try !== 'function') {
  Promise.try = function promiseTry(callback) {
    return new Promise((resolve) => {
      resolve(callback());
    });
  };
}
