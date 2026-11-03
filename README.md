# Maquinaria Dashboard

![Svelte](https://img.shields.io/badge/Svelte-4-FF3E00?logo=svelte&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-4-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)

Panel administrativo web del sistema de gestión de flota y maquinaria pesada de **Distrito de Riego Usochicamocha** (Colombia). Consume la API REST + WebSocket del [backend](https://github.com/cabanita2390/UsochimochaBackend).

## Tabla de contenido

- [Stack técnico](#stack-técnico)
- [Arquitectura](#arquitectura)
- [Prerequisitos](#prerequisitos)
- [Configuración](#configuración)
- [Ejecutar localmente](#ejecutar-localmente)
- [Testing](#testing)
- [Documentación](#documentación)
- [CI/CD](#cicd)
- [Build y despliegue manual](#build-y-despliegue-manual)

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework UI | Svelte 4 |
| Build tool | Vite 4 |
| Routing | `svelte-spa-router` |
| Tablas | `@tanstack/svelte-table` |
| Gráficas | ECharts |
| Tiempo real | WebSocket + STOMP (`@stomp/stompjs`) sobre SockJS |
| Auth | JWT (`jwt-decode`) |
| Íconos | `lucide-svelte` |
| Tests unitarios/componentes | Vitest + Testing Library |
| Tests E2E | Playwright |
| Documentación | VitePress |

## Arquitectura

```
App.svelte              # Router raíz (svelte-spa-router)
stores/                 # Estado global: auth.js (JWT+usuario), data.js (orquesta stores/data/*),
                         # api.js (base URL), ui.js (loader/toasts), websocket.js, fuelFilters.js
composables/            # useWebSocketNotifications.js (conexión STOMP), useAutoRefresh.js (polling fallback)
components/views/       # Un archivo por página/ruta
components/shared/      # Piezas reutilizables entre vistas (DataGrid, modales, selectores)
config/                 # Definiciones de columnas de tabla y títulos de página
```

## Prerequisitos

- Node 20+
- Backend corriendo (local o remoto) — ver `VITE_API_BASE_URL` abajo

## Configuración

Variables de entorno (`.env`, ver `.env.example`):

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API del backend |

Hay un `.env` por ambiente: `.env` (local/dev), `.env.test`, `.env.production` — cada uno se usa según el modo de build (ver [CI/CD](#cicd)).

## Ejecutar localmente

```bash
npm install
npm run dev          # Dev server en http://localhost:5173
```

## Testing

```bash
npm test              # Vitest — tests unitarios y de componentes
npm run test:ui       # Vitest con dashboard interactivo
npm run playwright:install   # Solo la primera vez, instala los navegadores de Playwright
npm run test:e2e      # Playwright — requiere el dev server corriendo
```

## Documentación

La documentación detallada (stores, vistas, componentes compartidos, tiempo real, cobertura de tests) vive en `docs/` y se navega como sitio con VitePress — no es solo texto suelto, es un sitio con nav lateral, búsqueda y todo.

**Cómo acceder:**

```bash
npm run docs:dev       # Levanta el sitio en http://localhost:5174/ con hot-reload
```

Con el comando corriendo, abre **http://localhost:5174/** en el navegador. Cualquier edición a un `.md` de `docs/` se refleja al instante.

Otros comandos:

```bash
npm run docs:build     # Genera el sitio estático en docs/.vitepress/dist
npm run docs:preview   # Sirve ese build generado, para verificarlo antes de publicar
```

> El sitio hoy es **solo local** — no está desplegado en ningún lado. La opción natural para publicarlo (gratis) es GitHub Pages, sirviendo `docs/.vitepress/dist` desde CI en cada push.

## CI/CD

Workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

| Job | Dispara en | Acción |
|---|---|---|
| `test` | Push a cualquier rama + PR hacia `main` | `npm test` + `npm run build` (build de verificación) |
| `deploy-test` | Push a `test` | `npm run build:test`, despliega `dist/` a `/var/www/test-admin-uso` en el VPS |
| `deploy-prod` | Push a `main` | `npm run build:prod`, despliega `dist/` a `/var/www/admin-uso` en el VPS |

Requiere Node 20 (`actions/setup-node@v4`, cache de npm) y los secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.

## Build y despliegue manual

```bash
npm run build         # Build genérico (modo development)
npm run build:test    # Build con .env.test — para el ambiente de QA
npm run build:prod    # Build con .env.production — para producción
npm run preview       # Sirve un build generado, para verificarlo localmente
```

El resultado queda en `dist/` — listo para servir como sitio estático (Nginx, etc.).
