// lib/polyfills.js
// Polyfills para compatibilidad con librerías Node.js en el navegador

// Polyfill para 'global' - necesario para sockjs-client
if (typeof global === 'undefined') {
  global = globalThis;
}

// Polyfill para 'process' - algunas librerías lo necesitan
if (typeof process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (callback) => setTimeout(callback, 0),
    version: '',
    browser: true
  };
}

// Polyfill para 'Buffer' - algunas librerías lo usan
if (typeof Buffer === 'undefined') {
  global.Buffer = {
    from: (data) => ({ data }),
    alloc: (size) => new Array(size),
    isBuffer: () => false
  };
}

console.log('✅ Polyfills cargados para compatibilidad Node.js');