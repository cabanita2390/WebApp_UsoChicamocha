> **⚠️ SUPERADO PARCIALMENTE (28-29/07/2026):** el rediseño de la Fase 5 redujo el
> módulo de **6 pestañas a 3** (Suministro de Almacén y Control de Almacén quedaron
> ocultos, no borrados; Tanqueo y Distribución se fusionaron). Este documento sigue
> siendo la referencia histórica correcta de **cómo se construyó** cada componente
> (Tasks 17-24 completos y commiteados), pero el estado **actual** vive en
> `docs/superpowers/plans/2026-07-28-combustibles-fase-5-rediseno.md` — leer ese
> primero para saber qué hay hoy en pantalla.

# Combustibles — Fase 4 (Frontend Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`).

**Goal:** Construir la interfaz web del módulo `fuel`, consumiendo los 9 endpoints de backend ya implementados y probados (Fase 0-3): 6 pestañas replicando las páginas del BPMN, siguiendo los patrones ya establecidos en el proyecto — **no inventar un patrón nuevo**.

**Architecture:** Un `FuelTabbed.svelte` (patrón de `WorkOrdersTabbed.svelte` — un `TabPanel` + componentes hijos por pestaña, **no** el patrón de `ConsolidadoTabbed`/`MaintenanceTabbed`, que tienen markup duplicado y ya está documentado como deuda a no repetir). Cada pestaña reutiliza `DataGrid.svelte` para tablas y `stores/api.js#fetchWithAuth` para llamadas HTTP.

**Tech Stack:** Svelte 4 + Vite, `svelte-spa-router`, Vitest para tests.

**Fuente:** implementa la Fase 4 del roadmap de 7 fases (artifact `024e63c5-3400-431c-800c-e30f81d7aefb`, sección 07) contra el backend ya construido en `docs/superpowers/plans/2026-07-21-combustibles-fase-0-1.md` y `2026-07-22-combustibles-fase-2-3.md` (back). No reabre decisiones de negocio de esas fases.

---

## Decisión de esta fase (confirmada con el usuario 2026-07-22)

- **`stores/auth.js:143` se amplía para incluir `ALMACEN`** en `allowedRoles`. Es un cambio **global** (afecta el login de toda la web, no solo `fuel`) — ya lo pidió el usuario explícitamente sabiendo ese alcance.
- **Estilo visual de los reportes (Dashboard, Almacén, Rendimiento, Distribución): minimalista/moderno, NO el retro (bordes inset/outset, gradientes planos) del resto del sistema.** Decisión revisada en la práctica — se probó primero "retro refinado" (Task 20, primera pasada) y el usuario lo sintió "muy viejito, tipo XP"; el rediseño final usa tarjetas blancas con sombra suave, bordes redondeados, tipografía `system-ui`, siguiendo la skill de dataviz del proyecto para colores/contraste. Aplica a **las 4 pestañas de solo-lectura** (Dashboard, Almacén, Rendimiento, Distribución) — los formularios de registro (Tanqueo, Suministro, Reintegros, Config) siguen con el estilo retro existente del resto de la app (`create-grid`/`field`/bordes inset), sin cambios ahí.

---

## Global Constraints

- Todas las llamadas HTTP van por `fetchWithAuth(endpoint, options)` de `stores/api.js` (nunca `fetch` directo) — así se hereda manejo de 401/403, refresh de token y parseo de errores.
- Las respuestas paginadas de Spring (`{content, totalPages, ...}`) se normalizan con el mismo patrón que `data.js` ya usa (`unwrapEntityList` / los objetos `{data, totalPages, totalElements, currentPage, pageSize}` como `workOrders`).
- Toda tabla usa `DataGrid.svelte` con `columns` definidas en `config/table-definitions.js` (patrón `accessorKey`/`accessorFn`/`header`/`size`), nunca una tabla HTML propia.
- Formularios de creación (compra, tanqueo, reintegro, config) van con multipart (`FormData`) para los que llevan factura — replicar cómo `fetchWithAuth` ya detecta `FormData` y omite `Content-Type` (línea 47-51 de `api.js`).
- Gating por rol en cada vista: `$auth.currentUser.role`, mismo patrón que `MachineManagement.svelte` (`isAdmin`, `isSupervisorOperativo`, agregar `isAlmacen`).
- Cada componente nuevo con lógica no trivial lleva su test en `__tests__/views/`, mismo patrón que `WorkOrderManagement.test.js`.

---

## Task 17: Acceso al módulo — Sidebar, ruteo, auth.js, store base

**Files:**
- Modify: `stores/auth.js` (línea 143, agregar `'ALMACEN'` a `allowedRoles`)
- Modify: `components/shared/Sidebar.svelte` (nuevo `<a>` a `/fuel`)
- Modify: `App.svelte` (importar `FuelTabbed`, agregar ruta `/fuel`, caso en `routeLoaded()`)
- Modify: `config/page-titles.js` (título de la ruta `/fuel`)
- Modify: `stores/data.js` (nuevas claves de estado: `fuelTypes`, `fuelPurchases`, `fuelRefueling`, `fuelDashboard`, `fuelWarehouseBalance`, `fuelWarehouseMovements`, `fuelPerformance`, `fuelDistribution`, `fuelAssetConfig`)
- Test: `__tests__/auth.test.js` (agregar caso: rol `ALMACEN` sí puede loguear en web)

- [x] **Step 1: Escribir el test que falla** — login con rol `ALMACEN` debe permitir acceso (hoy da `success:false`).
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Agregar `'ALMACEN'` a `allowedRoles` en `auth.js:143`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [x] **Step 5: Agregar el link del Sidebar, la ruta en `App.svelte`, el título de página, y los slots vacíos en `data.js`** (sin lógica de fetch todavía, solo el estado inicial — las funciones `fetchX` se agregan en cada task siguiente junto con su vista).
- [ ] **Step 6: Levantar `npm run dev`, confirmar que el link "Combustibles" aparece en el Sidebar y navega a una página vacía sin errores de consola.**
- [ ] **Step 7: Commit** — `feat(front): acceso al módulo de combustibles (sidebar, ruta, rol ALMACEN)`

---

## Task 18: Tanqueo — historial + registro (BPMN pág. 1)

**Files:**
- Create: `components/views/RefuelingManagement.svelte`
- Modify: `config/table-definitions.js` (agregar `refuelingColumns`)
- Modify: `stores/data.js` (agregar `fetchRefueling(params)`, `createRefueling(formData)`)
- Test: `__tests__/views/RefuelingManagement.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/fuel/refueling` (paginado), `POST /api/v1/fuel/refueling` (multipart), `GET /api/v1/fuel/types` (para el selector de tipo de combustible).

**Reglas de UI (replican las del backend, no las reinventan):**
- Selector de elemento: tabs Maquinaria/Vehículo/Motocicleta (mismo patrón que ya usa `WorkOrdersTabbed` para distinguir moto de vehículo vía `idTipoVehiculo`).
- Selector de lugar (BOMBA/ALMACEN) cambia qué campos son obligatorios: BOMBA pide precio/factura, ALMACEN los oculta — replica el `mv_gw_lugar` del BPMN pág. 1.
- Rol: `OPERARIO`, `ALMACEN`, `SUPERVISOR_OPERATIVO`, `ADMIN` pueden registrar (coincide con `SecurityConfig` del backend); todos los roles autenticados pueden ver el historial.

- [x] **Step 1: Escribir el test que falla** — el formulario oculta precio/factura cuando `lugar=ALMACEN`; el submit arma un `FormData` con las partes correctas (nombres exactos que espera `RefuelingRecordController`: `vehicleId`/`machineId`, `lugar`, `areaCosto`, `fuelTypeId`, `cantidadGalones`, `horometroKm`, `esFull`, `precioUnitario`, `descuento`, `totalIngresado`, `origen`, `factura`).
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `RefuelingManagement.svelte`** (formulario + `DataGrid` con `refuelingColumns`, siguiendo el layout de `MachineManagement.svelte`).
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`** con un usuario real: registrar un tanqueo BOMBA y uno ALMACEN, confirmar que aparecen en el historial.
- [ ] **Step 6: Commit** — `feat(front): pestaña de tanqueo de combustible`

---

## Task 19: Suministro de Almacén — historial + registro de compras (BPMN pág. 2)

**Files:**
- Create: `components/views/FuelPurchaseManagement.svelte`
- Modify: `config/table-definitions.js` (agregar `fuelPurchaseColumns`)
- Modify: `stores/data.js` (agregar `fetchFuelPurchases(params)`, `createFuelPurchase(formData)`)
- Test: `__tests__/views/FuelPurchaseManagement.test.js`

**Interfaces:**
- Consumes: `GET/POST /api/v1/fuel/purchases` (multipart).

**Reglas de UI:**
- Total se autocalcula en el cliente (`cantidad * precioUnitario - descuento`) como preview, pero el valor real que manda el backend en `totalCalculado` es la fuente de verdad — mostrar `discrepanciaValor` en la tabla si el backend la marca `true` (bandera visual, no bloquea nada, igual que el backend).
- Rol: `SUPERVISOR_OPERATIVO`, `ADMIN` pueden registrar (fuera de alcance de `ALMACEN`, decisión ya cerrada en Fase 0-1); `ALMACEN` también puede ver el historial (rol `GET` ampliado).

- [x] **Step 1: Escribir el test que falla** — el formulario calcula el total en vivo; usuario con rol `OPERARIO` no ve el botón de registrar (gating de UI, aunque el backend igual lo bloquearía).
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `FuelPurchaseManagement.svelte`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`** con `SUPERVISOR_OPERATIVO`: registrar una compra, confirmar que aparece con su factura visible.
- [ ] **Step 6: Commit** — `feat(front): pestaña de suministro de almacén`

> **Nota de implementación:** se simplificó el punto de "factura visible" del step 5 original — la tabla de historial no renderiza la factura como enlace clickeable (igual que `createRefuelingColumns` en Task 18, que tampoco lo hace); requeriría agregar una nueva `meta.isFacturaAction` a `DataGrid.svelte`, fuera de alcance de esta tarea a menos que el usuario la pida.

---

## Task 20: Dashboard Financiero (BPMN pág. 3)

> **Nota de orden de construcción (usuario, 2026-07-22):** se adelanta antes que Task 19 — es lo primero que un usuario debe ver al entrar a `/fuel` (mismo criterio que `DashboardTabbed` en la raíz `/` del sistema), así que se prueba primero aunque muestre datos en cero hasta que Task 19 (Suministro) exista. El número de tarea no cambia, solo el orden en que se implementa.

**Files:**
- Create: `components/views/FuelFinancialDashboard.svelte`
- Modify: `stores/data.js` (agregar `fetchFuelDashboard(fechaInicio, fechaFin)`)
- Test: `__tests__/views/FuelFinancialDashboard.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/fuel/dashboard/financiero?fechaInicio&fechaFin`.

**Reglas de UI:**
- Filtro de rango de fechas (default: sin parámetros, el backend ya autogenera el mes actual).
- KPIs en tarjetas: `gastoBruto`, `gastoNeto`, `ahorro`.
- Gráfico simple de `galonesPorTipo` (barra o lista, sin librería de charts nueva si el proyecto no tiene una ya — revisar primero si existe alguna dependencia de gráficos antes de agregar una).
- Rol: `SUPERVISOR_OPERATIVO`, `ADMIN` (coincide con `SecurityConfig`).

- [x] **Step 1: Escribir el test que falla** — al cambiar el filtro de fechas, se vuelve a pedir el dashboard con los nuevos parámetros.
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `FuelFinancialDashboard.svelte`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`** con datos reales de Tasks 18-19 ya registrados, confirmar que los números cuadran con lo esperado.
- [ ] **Step 6: Commit** — `feat(front): dashboard financiero de combustibles`

---

## Task 21: Control de Almacén — saldos, conciliación y reintegros (BPMN pág. 4 + 6 parcial)

**Files:**
- Create: `components/views/FuelWarehouseControl.svelte`
- Modify: `config/table-definitions.js` (agregar `fuelWarehousePurchaseHistoryColumns`)
- Modify: `stores/data.js` (agregar `fetchFuelWarehouseBalance()`, `fetchFuelWarehouseMovements(fechaInicio, fechaFin)`, `createFuelReintegration(payload)`)
- Test: `__tests__/views/FuelWarehouseControl.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/fuel/almacen/saldos`, `GET /api/v1/fuel/almacen/movimientos`, `POST /api/v1/fuel/reintegros`.

**Reglas de UI:**
- Saldos: una tarjeta/barra por tipo de combustible y área de costo (dos inventarios independientes, no sumarlos).
- Conciliación: tabla saldo inicial/entradas/salidas/saldo final.
- Reintegro: formulario simple (`refuelingId`, `cantidadReintegrada`) — dado que no hay selector de tanqueo todavía en la UI, usar un campo numérico directo por ahora (buscar el id en el historial de Task 18); no construir un buscador complejo si no se pidió.
- Rol: `ALMACEN`, `SUPERVISOR_OPERATIVO`, `ADMIN` ven saldos/movimientos; reintegro solo `SUPERVISOR_OPERATIVO`, `ADMIN`.

- [x] **Step 1: Escribir el test que falla** — la conciliación se recalcula al cambiar fechas; el formulario de reintegro solo aparece para roles autorizados.
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `FuelWarehouseControl.svelte`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`.**
- [ ] **Step 6: Commit** — `feat(front): control de almacén y reintegros`

> **Nota de implementación:** saldos/conciliación/historial de compras usan el estilo moderno (mismas tarjetas/tabla que el Dashboard Financiero), consistente con la decisión de que las 4 pestañas de solo-lectura llevan ese estilo; el modal de reintegro usa el estilo retro existente, igual que Tanqueo/Suministro. No se creó `fuelWarehousePurchaseHistoryColumns` en `table-definitions.js` como decía el plan original — el historial de compras aquí es una tabla de solo-lectura simple (no un `DataGrid`), así que se construyó directo en el componente en vez de una factory de columnas separada.

---

## Task 22: Configuración de rendimiento estándar (prerrequisito de Task 23) + Rendimiento Operativo (BPMN pág. 5)

**Files:**
- Create: `components/views/AssetFuelConfigManagement.svelte` (solo `ADMIN`)
- Create: `components/views/FuelPerformance.svelte`
- Modify: `config/table-definitions.js` (agregar `fuelPerformanceColumns` con estilo condicional para `alerta=true`)
- Modify: `stores/data.js` (agregar `fetchAssetFuelConfig()`, `updateAssetFuelConfigVehicle(id, payload)`, `updateAssetFuelConfigMachine(id, payload)`, `fetchFuelPerformance(tipo, fechaInicio, fechaFin)`)
- Test: `__tests__/views/FuelPerformance.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/fuel/config`, `PUT /api/v1/fuel/config/vehicle/{id}`, `PUT /api/v1/fuel/config/machine/{id}`, `GET /api/v1/fuel/rendimiento?tipo&fechaInicio&fechaFin`.

**Reglas de UI:**
- Filtro por tipo (Maquinaria/Vehículo/Motocicleta), mismas 3 categorías del selector de Task 18.
- Fila roja (semáforo) cuando `alerta=true` — usar `accessorFn`/estilo condicional del `DataGrid`, revisar si `DataGrid.svelte` ya soporta clases de fila condicionales antes de modificarlo.
- Activos sin configuración no aparecen en el reporte — el vacío es intencional (documentado en backend), no un bug de la UI.
- Rol: config solo `ADMIN`; rendimiento `SUPERVISOR_OPERATIVO`, `ADMIN`.

- [x] **Step 1: Escribir el test que falla** — filas con `alerta=true` reciben la clase/estilo de advertencia.
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar ambos componentes.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`** — configurar una máquina, registrar dos tanqueos consecutivos (Task 18), confirmar que el reporte de rendimiento calcula la fila.
- [ ] **Step 6: Commit** — `feat(front): configuración de rendimiento estándar y reporte de rendimiento operativo`

> **Nota de implementación:** `AssetFuelConfigManagement` no quedó como pestaña propia — el plan pide 6 pestañas totales (Tasks 18-23) y Task 22 produce 2 componentes, así que Configuración quedó embebida dentro de la pestaña Rendimiento, detrás de un botón "Configurar consumo estándar" visible solo para `ADMIN`. `DataGrid.svelte` ya soportaba resaltado de fila condicional vía la prop `isAnomaly` (reusada de `anomaly-row`, sin tocar el componente) — las filas con `alerta=true` se marcan `isAnomaly: true` antes de pasarlas al grid.

---

## Task 23: Distribución Asociación/Distrito (BPMN pág. 6)

**Files:**
- Create: `components/views/FuelDistribution.svelte`
- Modify: `config/table-definitions.js` (agregar `fuelDistributionColumns`)
- Modify: `stores/data.js` (agregar `fetchFuelDistribution(area, fechaInicio, fechaFin)`)
- Test: `__tests__/views/FuelDistribution.test.js`

**Interfaces:**
- Consumes: `GET /api/v1/fuel/distribucion?area&fechaInicio&fechaFin`.

**Reglas de UI:**
- Selector de área (DISTRITO/ASOCIACION) + filtro de fechas.
- Tarjetas resumen: `totalGalonesDespachados`, `totalCostoDespachado`.
- Filas con `valorDespachado=null` (tanqueos ALMACEN) muestran "—" en vez de $0 — no confundir "no valorizado" con "valorizado en cero".
- Rol: `SUPERVISOR_OPERATIVO`, `ADMIN`.

- [x] **Step 1: Escribir el test que falla** — una fila con `valorDespachado=null` renderiza "—", no "$0".
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `FuelDistribution.svelte`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [ ] **Step 5: Probar en `npm run dev`.**
- [ ] **Step 6: Commit** — `feat(front): reporte de distribución por área de costo`

---

## Task 24: Ensamblar `FuelTabbed.svelte`

**Files:**
- Create: `components/views/FuelTabbed.svelte`
- Modify: `App.svelte` (cambiar la ruta `/fuel` de placeholder a `FuelTabbed`, si Task 17 dejó algo provisional)
- Test: `__tests__/views/FuelTabbed.test.js`

**Interfaces:**
- Ensambla los 6 componentes de Tasks 18-23 en un `TabPanel`, patrón `WorkOrdersTabbed.svelte` (Step 3 de esa referencia: un `TabPanel` + `{#if activeTab === ...}`, sin duplicar markup entre pestañas).
- `handleTabChange` dispara el fetch correspondiente solo si esa pestaña no tiene datos todavía (mismo patrón lazy-load que `WorkOrdersTabbed`).

- [x] **Step 1: Escribir el test que falla** — cambiar de pestaña renderiza el componente correcto en cada una de las 6.
- [x] **Step 2: Correr y confirmar que falla.**
- [x] **Step 3: Implementar `FuelTabbed.svelte`.**
- [x] **Step 4: Correr test, confirmar que pasa.**
- [x] **Step 5: Correr suite completa (`npm test`) para confirmar cero regresiones.**
- [ ] **Step 6: Probar manualmente en `npm run dev` el flujo completo de las 6 pestañas con un usuario `ADMIN` y uno `ALMACEN`.**
- [ ] **Step 7: Commit** — `feat(front): ensambla el módulo de combustibles (6 pestañas)`

> **Decisión revisada con el usuario (2026-07-23):** NO se replicó el patrón lazy-load "fetch solo si esa pestaña no tiene datos" de `WorkOrdersTabbed` — cada uno de los 6 componentes ya tenía su propio `onMount` self-fetch (establecido desde Task 18, y es lo que sus tests individuales asumen). Refactorizar los 6 para mover el fetch al padre habría sido churn contra componentes ya probados, y el usuario prefirió que cada pestaña se refresque sola al revisitarla — mejor para datos operativos (saldos, rendimiento) que cambian seguido. El test de Task 24 verifica en cambio que cada pestaña renderiza el componente correcto (routing), no el caching.

---

## Pendiente detectado en pruebas (usuario, 2026-07-22)

- **`ALMACEN` hoy ve todo el Sidebar**, no solo Combustibles — `Sidebar.svelte` solo restringe el link de Usuarios a `ADMIN`; ningún otro item está gateado por rol. El usuario decidió dejarlo así por ahora y afinar el acceso de `ALMACEN` (probablemente limitarlo solo a `/fuel` y ocultar el resto) **al final de Fase 4**, después de tener las 6 pestañas funcionando. Las 6 pestañas ya están ensambladas (Task 24) — **este es el único punto de la Fase 4 que sigue sin resolver**, pendiente de que el usuario lo pida explícitamente.

---

## Pulido post-Fase 4 (2026-07-23 — en curso, fuera de la numeración de tasks)

Con las 6 pestañas ya ensambladas, el usuario pasó a probar en `npm run dev` y pedir ajustes puntuales sobre lo ya construido. Cada uno se hizo con TDD (test → falla → implementa → pasa), suite completa + build + `graphify update` después de cada cambio, igual que en las Tasks 17-24. Nada de esto estaba en el plan original — se documenta aquí para no perder el rastro.

- [x] **Aclarar el campo "Total ingresado"** (Tanqueo y Suministro) — el usuario no entendía a qué se refería. Renombrado a "Total pagado (valor real)" con hint explicativo; se evitó que el label contuviera la palabra "factura" para no colisionar con el campo de subir el archivo en los tests de `getByLabelText`.
- [x] **Unidad de medida real por tipo de combustible (gas natural vehicular en m³, no en galones)** — pedido explícito de "modelo completo", confirmado en dos preguntas de alcance:
  - Backend: migración `V22` agrega `fuel_types.unidad_medida` (`GALON`/`M3`), amplía el CHECK de `asset_fuel_config.unidad_consumo` para aceptar `KM_POR_M3`/`M3_POR_HORA`. `AssetFuelConfigService` ahora exige la unidad correcta según tipo de activo **y** combustible elegido (antes solo miraba el tipo de activo). `FuelPerformanceService` generalizó el cálculo de rendimiento a cualquier unidad "por hora", no solo `GAL_POR_HORA`.
  - Frontend: Tanqueo, Suministro y Configuración muestran la unidad correcta (m³/gal) dinámicamente según el combustible seleccionado; tablas de historial y el gráfico "Cantidad por tipo de combustible" del Dashboard también la muestran por fila. Pendiente documentado y **no corregido**: la tendencia mensual del Dashboard sigue sumando todo en un solo total etiquetado "gal" — mezclaría unidades si algún mes hay tanqueos de gas junto con gasolina/diésel.
- [x] **Ocultar combustibles sin datos reales en Saldos/Conciliación** (Control de Almacén) — `fuel_inventory` se siembra para los 4 tipos del catálogo desde el inicio, los use o no la organización, así que antes siempre aparecían las 4 filas aunque solo manejaran 2. `FuelWarehouseService` ahora filtra a solo los tipos con al menos una compra o tanqueo alguna vez (`findDistinctFuelTypeIds()` en ambos repos). Decisión confirmada: los combos de "Combustible" en los formularios de registro (Tanqueo/Suministro/Configuración) **no** se filtran — deben seguir mostrando el catálogo completo para poder registrar la primera compra de un tipo nuevo.
- [x] **Rediseño de la tabla de Conciliación** — dos iteraciones. Primero se probó una "línea de flujo" en una sola fila (saldo inicial → +entradas −salidas → saldo final); el usuario la sintió menos legible que antes. Se volvió a una tabla real con columnas alineadas, pero agrupada por área de costo (sin repetir esa columna en cada fila, como antes) y ordenada de forma estable por `fuelTypeId`.
- [x] **Layout de la gráfica de Tendencia** (Dashboard) — las dos mini-gráficas ("Consumo mensual" y "Gasto neto mensual") se veían mezcladas sin separación visual clara. Cada una ahora tiene su propia tarjeta con borde/fondo. Además, con más de 6 meses seleccionados (12m/24m/otro) las dos gráficas se apilan verticalmente en vez de ir lado a lado, para que las etiquetas de mes no queden amontonadas.
- [x] **Scroll roto en los 4 paneles de reporte** (Dashboard, Almacén, Rendimiento, Distribución) — `.fuel-dashboard` no tenía `overflow-y: auto` propio y el contenedor padre (`FuelTabbed.svelte`) tiene `overflow: hidden`, así que contenido más alto que la pantalla quedaba cortado sin forma de bajar. Agregado `flex:1; min-height:0; overflow-y:auto` a los 4 archivos.

## Qué queda fuera de este plan (a propósito)

- App móvil (Fase 5) — `CombustibleScreen.kt`/`CombustibleHistorialScreen.kt` ya existen como esqueleto UI sin lógica.
- QA/despliegue/capacitación de campo (Fase 6).
- Librería de gráficos nueva — si Task 20 la necesita y el proyecto no tiene una, se decide en ese momento, no de antemano.
- Selector de tanqueo por búsqueda en el formulario de reintegro (Task 21) — se implementa simple (id numérico) por ahora, se mejora si el usuario lo pide después de probarlo.
