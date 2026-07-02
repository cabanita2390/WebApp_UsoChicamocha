# Convenciones de código — WebApp_UsoChicamocha

- **Tamaño de archivo**: 500-600 líneas es la señal de alerta para dividir un componente, no una ley. El criterio real es una responsabilidad por archivo. Una función > 40-50 líneas es candidata a extraer.
- **Anti-duplicación (la más importante en este repo)**: si dos pantallas/servicios comparten más del 50% del código, se extrae un componente/clase genérica ANTES de copiar. Toda la duplicación histórica de este repo nació de copiar `Vehicle*` para crear `Moto*` — no se repite el patrón.
- **Prohibido hardcodear URLs, credenciales o secretos**: siempre `import.meta.env.VITE_*`, nunca valores fijos en el código.
- **Descargas/exports**: usar `download()` de `stores/api.js` (reutiliza el refresh de token en 401), nunca `fetch` directo con `localStorage.getItem('accessToken')` a mano.
- **Logs**: usar `src/lib/logger.js` (`log`/`warn`, gateados por `import.meta.env.DEV`) para trazas de depuración. `console.error` sí se deja siempre visible.
- **Tests**: se actualizan en el mismo PR que cambia la UI. No se mergea con la suite en rojo (`npx vitest run`).
