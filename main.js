// CARGAR POLYFILLS PRIMERO - antes de cualquier otra importación
import './src/lib/polyfills.js'

import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

export default app
