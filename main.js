// CARGAR POLYFILLS PRIMERO - antes de cualquier otra importación
import './src/lib/polyfills.js'
import './styles/vehicle-modules.css'

import App from './App.svelte'

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('listener indicated an asynchronous response')) {
    event.preventDefault();
  }
});

const app = new App({
  target: document.getElementById('app'),
})

export default app
