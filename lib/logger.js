const isDev = import.meta.env.DEV;

export function log(...args) {
  if (isDev) console.log(...args);
}

export function warn(...args) {
  if (isDev) console.warn(...args);
}

export function debug(...args) {
  if (isDev) console.debug(...args);
}
