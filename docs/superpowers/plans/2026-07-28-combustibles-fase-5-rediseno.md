# Combustibles — Fase 5 (Rediseño visual + pulido) — Estado actual

> **For agentic workers:** este documento es el **estado real vigente** del módulo
> `fuel` en frontend+backend, no un plan de tareas a ejecutar en orden. Se actualiza
> a medida que se pulen detalles — leerlo completo antes de tocar cualquier vista de
> Combustibles, en vez de asumir lo que dice la Fase 4 original (desactualizada en
> estructura de pestañas).

**Origen:** implementación del proyecto de Claude Design "Dashboard financiero con
sidebar" (`23f9be61-a37a-43d9-b23e-faee6fd82c04`, archivo `Combustibles (sin
almacén).dc.html`) — decisión del usuario de reducir el módulo a 3 pestañas activas
y modernizar visualmente sidebar + Combustibles, dejando el resto de la app
(Vehículos, Máquinas, etc.) intacto en su estilo retro.

---

## 1. Estructura activa hoy

`FuelTabbed.svelte` tiene **3 pestañas** (antes 6):

| Pestaña | Componente | Estado |
|---|---|---|
| Dashboard Financiero | `FuelFinancialDashboard.svelte` | ✅ Rediseñado + pulido |
| Rendimiento | `FuelPerformance.svelte` + `AssetFuelConfigManagement.svelte` (modal embebido) | ✅ Rediseñado |
| Tanqueo y Distribución | `TanqueoDistribucion.svelte` (nuevo, fusiona Tanqueo + Distribución) | ✅ Rediseñado: resumen por activo (Vehículos / Maquinaria y Motos) con historial y edición por activo, reemplaza el agrupado Bomba/Almacén (31/07/2026) |

**Ocultos, no borrados** (componentes y endpoints de backend siguen intactos, por si
se reactivan): `RefuelingManagement.svelte` (Tanqueo viejo, standalone),
`FuelPurchaseManagement.svelte` (Suministro), `FuelWarehouseControl.svelte` (Control
de Almacén), `FuelDistribution.svelte` (Distribución vieja, standalone).

**Decisión de alcance confirmada (28/07/2026):** de momento no se maneja compras a
proveedor ni control de inventario de almacén — solo se registran tanqueos
directamente ("lo que llenaron y ya"), sin trazar entradas/salidas de un stock. Por
eso las pantallas de Suministro/Almacén no se van a pulir por ahora.

---

## 2. Decisiones de diseño aplicadas

- **Sidebar (`Sidebar.svelte`):** colores/tipografía modernizados (fondo blanco,
  activo azul `#eef2f7`/`#2a78d6`, `system-ui`), pero el **comportamiento** se dejó
  igual que antes (rail colapsado a 60px, expande a 220px al hover) — el usuario
  pidió explícitamente no cambiar el comportamiento, solo la estética.
- **`DataGrid.svelte` (componente global):** se revirtió un primer intento de
  restyle global porque afectaba TODA la app (Vehículos, Máquinas, etc.). Ahora usa
  un prop `variant="modern"` opt-in — por defecto sigue retro, solo `FuelPerformance`
  y `AssetFuelConfigManagement` lo activan.
- **Modales de registro:** a diferencia de la regla original ("formularios se quedan
  retro"), el mockup mostraba modales modernos — se aplicó esa excepción a
  "Configurar consumo estándar" y "Registrar tanqueo" (dentro de
  `TanqueoDistribucion.svelte`). Suministro/Almacén (ocultos) siguen retro, no se
  tocaron.
- **Tabla "Combustible — precio, cantidad y gasto"** (Dashboard Financiero) reemplaza
  las viejas tarjetas separadas de "Gasto por tipo"/"Cantidad por tipo". Se eliminó
  la tarjeta "Origen del gasto: almacén vs. bomba" (no estaba en el mockup).
- **Rendimiento:** el `<select>` de Tipo se volvió 3 píldoras (Maquinaria/Vehículos/
  Motocicletas) en la misma fila que los filtros de fecha (no en fila aparte, para no
  ocupar espacio vertical). El conteo `(N)` solo se muestra en la pestaña activa (no
  se piden los otros 2 tipos por adelantado solo para el badge).
- **Tanqueo y Distribución:** tabla agrupada por `lugar` ("En bomba"/"En almacén"),
  con selector de Área que ahora acepta "Todas" (antes obligaba Distrito o
  Asociación).

---

## 3. Campos de backend agregados en este pulido

| DTO | Campo nuevo | Para qué |
|---|---|---|
| `FuelPerformanceResponse` | `tipoActivo` | Vehículos: nombre del tipo real. Máquinas: nombre de la máquina (no tienen subtipo formal) |
| `FuelPerformanceResponse` | `esFull` | Columna "Full" en Rendimiento |
| `FuelDistributionResponse.Fila` | `lugar`, `areaCosto`, `esFull`, `precioUnitario`, `discrepanciaValor` | Necesarios para la tabla agrupada de Tanqueo y Distribución |
| `FuelDashboardResponse` | `galonesBombaPorTipo` | Precio/unidad real (gasto bomba ÷ **cantidad bomba**, no bomba+almacén) |

`FuelDistributionService`/`FuelDistributionController`: `area` ahora es opcional
(`null` o `"TODAS"` = combina Distrito+Asociación), reutilizando
`findByFechaRegistroBetween` que ya existía.

---

## 4. Bugs reales encontrados y corregidos en la auditoría funcional (28-29/07/2026)

1. **Tanqueo BOMBA siempre fallaba contra Postgres real** — el CHECK constraint de
   la migración V20 exige `url_factura IS NOT NULL` desde el INSERT mismo cuando
   `lugar='BOMBA'`, pero `RefuelingRecordService` insertaba primero con `null`. Se
   corrigió con el mismo patrón que ya usaba `FuelPurchaseService` (placeholder
   `"pendiente"`). Los tests con H2 no lo detectaban porque H2 no aplica ese CHECK
   (Flyway deshabilitado en tests).
2. **Historial de aceite de motos llamaba a un endpoint inexistente**
   (`moto/{placa}/oil-change-history`) — bug fuera del módulo fuel, encontrado en la
   auditoría general. Las motos viven en `vehiculos`, se corrigió para reutilizar
   `vehicle/oil-change/history/{placa}`.
3. **Precio/unidad de la tabla combinada se diluía con galones de almacén sin
   costo** — corregido con `galonesBombaPorTipo` (ver sección 3).

---

## 5. Verificación realizada

- Backend: **278/278** tests. Frontend: **261/261** tests (32 archivos).
- Restaurado un dump real (`dbPruebasReal/`) en una BD de prueba separada
  (`usochicamocha_test_real`, sin tocar `usochicamocha_local`) con 24 vehículos, 15
  máquinas, 55 usuarios reales — migrado a V22, usado para probar cada endpoint de
  fuel con curl contra datos reales (no solo mocks de test).
- Flujo end-to-end confirmado: tanqueo BOMBA → aparece en Rendimiento con alerta →
  aparece en Distribución agrupado → suma en Dashboard → reintegro se refleja en la
  misma fila.
- Pendiente sin resolver: prueba **visual** en navegador (Playwright) — el
  navegador headless se cuelga justo después de descargar al 100%, limitación del
  sandbox, no del código.

---

## 6. Endpoints de fuel — mapa rápido (qué pantalla usa cuál)

Ver detalle completo de qué devuelve cada uno y sus roles en la conversación del
28-29/07 — resumen:

- **Dashboard Financiero** → `GET /fuel/dashboard/financiero` + `GET
  /fuel/dashboard/tendencia`
- **Rendimiento** → `GET /fuel/rendimiento` (incluye `fuelTypeId` desde 31/07/2026,
  columna "Producto") + `GET/PUT /fuel/config/**` (modal)
- **Tanqueo y Distribución** → `POST /fuel/refueling` (registrar) + `GET
  /fuel/refueling/reporte` (reporte plano por tipo de activo + rango + área,
  reemplaza `/fuel/distribucion` en esta pantalla desde 31/07/2026 — ver sección 7)
  + `PUT/DELETE /fuel/refueling/{id}` (editar/eliminar, solo ADMIN, 31/07/2026)
- **Sin UI activa que los use** (solo componentes ocultos o sin botón que los
  dispare): `GET /fuel/distribucion` (reemplazado en esta pantalla, endpoint y
  service intactos por si se reactiva), `GET /fuel/refueling` (listado plano
  paginado, reemplazado por `/fuel/refueling/reporte`), `POST/GET
  /fuel/purchases`, `GET /fuel/almacen/**`, `POST /fuel/reintegros` (el dato se
  muestra, pero no hay formulario activo para crearlos).

---

## 7. Candidatos a pulir (pendientes, sin decidir orden)

- [x] **Tarjetas KPI del Dashboard Financiero revisadas de fondo (29/07/2026)** —
  se agregó y luego se quitó otra vez la tarjeta "Gasto bomba": dado el alcance sin
  compras/inventario, `totalComprasAlmacen` y sus descuentos son siempre $0, así que
  Gasto bruto, Gasto neto y Gasto bomba coinciden matemáticamente siempre. Se dejó
  solo **Gasto bruto, Gasto neto, Ahorro por descuentos, Discrepancias** (sin Gasto
  bomba, redundante). El texto de la actividad 5 del cronograma debe decir "Gasto
  total real, Descuentos aplicados, Valor neto" — sin "Gasto bomba" como tarjeta aparte.
  Formato de moneda cambiado de notación compacta (`1,2 M`) a valor completo
  (`$ 1.200.000`) en todo el dashboard (KPIs y tendencia mensual), para que montos
  distintos no luzcan iguales.
- [x] **Bug corregido: descuentos de tanqueos en BOMBA no se contaban en "Ahorro"**
  (29/07/2026) — `RefuelingRecordService` sí guarda el campo `descuento` del
  formulario de Tanqueo en Bomba, pero lo restaba en silencio dentro de
  `totalCalculado` sin sumarlo nunca a la tarjeta "Ahorro por descuentos" (que solo
  miraba `fuel_purchases`, siempre $0 dado el alcance actual). Se agregó
  `RefuelingRecordsRepository.sumDescuentoBombaBetween` y se corrigió la fórmula en
  `FuelDashboardService` (bruto = neto + descuento, no neto − descuento otra vez) en
  `obtenerDashboard`, `calcularComparacionAnterior` y `obtenerTendencia`.
- [x] **Tabla de "Consumo estándar" quitada de `AssetFuelConfigManagement`
  (29/07/2026)** — el usuario la consideró innecesaria. Ahora el botón "Configurar
  consumo estándar" en `FuelPerformance` abre el modal directo (sin tabla ni botón
  "+ Configurar" intermedio); al cerrar/cancelar/guardar, el componente dispara un
  evento `close` que `FuelPerformance` escucha para volver a ocultarlo.
- [x] **Buscador de activo en el modal de Configurar rendimiento (29/07/2026)** —
  "Id del activo" (número a mano) reemplazado por un buscador: al elegir el tipo
  (Vehículo/Motocicleta/Máquina, se agregó Motocicleta como tercera opción) se
  despliega la lista completa de ese tipo y filtra al escribir; la selección queda
  dentro del mismo modal (sin abrir uno nuevo). Motos comparten el mismo endpoint
  que vehículos (`updateAssetFuelConfigVehicle`) porque viven en la tabla
  `vehiculos` del backend — mismo `arco exclusivo vehicle_id/machine_id` de
  `asset_fuel_config`.
- [x] **Buscador convertido en select "acordeón" (29/07/2026)** — "Tipo de
  activo" ya no preselecciona Vehículo (empieza en "Seleccione..."), y el
  buscador de abajo no aparece hasta elegir un tipo. Dentro de cada tipo, el
  buscador queda cerrado (solo un botón "Seleccionar vehículo/motocicleta/
  máquina...") hasta que se le da click — ahí despliega la lista completa con
  scroll y filtra al escribir. El filtro busca en campos que no se muestran en
  la etiqueta (modelo, tipo de vehículo, número de identificación de máquina),
  para no ensuciar el texto visible pero sí poder buscar "por cualquier
  contenido". Un click dentro del modal pero fuera del buscador lo cierra sin
  seleccionar nada.
- [x] **Reutilizar listas ya cargadas + unidad de consumo editable (29/07/2026)**
  — `onMount` ahora solo pide vehículos/motos/máquinas si el store todavía no
  los tiene (`if (!vehicles.length) data.fetchVehicles()`, etc.), reutilizando
  lo que ya haya cargado otra vista (ej. Inventario). Mientras una lista está en
  vuelo se muestra "Cargando..." en el buscador en vez de "Sin resultados". La
  unidad de consumo (antes texto fijo `<strong>`) ahora es un `<select>`
  editable: se auto-sugiere al elegir tipo+combustible, pero el usuario puede
  cambiarla a cualquiera de las 4 (KM_POR_GALON, KM_POR_M3, GAL_POR_HORA,
  M3_POR_HORA) sin que sea obligatorio quedarse con la sugerida. El override
  manual sobrevive a interactuar con otros campos (seleccionar activo, escribir
  consumo estándar) y solo se re-sugiere cuando tipo o combustible cambian de
  verdad. **Nota de testing:** no se pudo cubrir con test automatizado el
  "no reutiliza si ya está cargado" ni el estado "Cargando..." porque ambos
  dependen del efecto de `onMount`, que no es observable de forma confiable en
  este proyecto con Vitest + @testing-library/svelte (ni sync, ni tick(), ni
  waitFor) — verificado manualmente en el código.
- [x] **Bug real: el buscador no abría al hacer click (29/07/2026)** — el
  botón "Seleccionar..." dependía por completo de mi propio manejo de clicks
  (`activoDropdownOpen` + bubbling). Se reemplazó por `<details>/<summary>`
  nativo del navegador: abrir/cerrar ya no depende de ninguna lógica propia,
  es comportamiento nativo del HTML. Además se encontró que el evento `toggle`
  (usado para sincronizar el estado nativo hacia la variable Svelte) no se
  dispara a tiempo de forma confiable — el cierre por "click fuera" ahora lee
  el estado real del DOM (`activoDetailsEl.open`) en vez de depender de esa
  sincronización.
- [x] **Rediseño final del buscador: un solo input, como el mockup de Tanqueo
  (29/07/2026)** — se reemplazó el `<details>/<summary>` por el patrón que ya
  usa el mockup de diseño de Combustibles y el picker de la app móvil (aunque
  la app móvil lo hace con un diálogo aparte; aquí se mantiene inline, sin
  modal extra, por pedido explícito del usuario). Un solo `<input>` siempre
  visible: placeholder "Escribe o haz clic para ver opciones..." cuando no hay
  selección, o el activo elegido cuando sí la hay. Al enfocarlo (click) se
  despliega la lista completa como overlay (`position: absolute`, no empuja
  los demás campos); escribir filtra en vivo; click en un resultado lo
  selecciona y cierra la lista; click fuera la cierra sin perder la selección
  ya hecha. Ya no hay botón "Seleccionar..." ni "Cambiar" separados.
- [x] **Bug: el buscador de "Vehículo" mostraba motos (29/07/2026)** —
  `GET /vehicle` no filtra por tipo (documentado así explícitamente en el
  propio `VehicleController`: "puede incluir motocicletas si están en la misma
  tabla"), a diferencia de `GET /moto`, que sí filtra solo motos. Se agregó un
  filtro en el frontend (`tipoVehiculo !== 'MOTOCICLETA'`) al construir la
  lista de "Vehículo" en el buscador.
- [x] **"Registrar tanqueo" adopta el mismo buscador (29/07/2026)** —
  `TanqueoDistribucion.svelte`: el campo "Máquina/Vehículo/Motocicleta (ID)"
  (número a mano) se reemplazó por el mismo buscador de un solo input que
  Configurar rendimiento, incluyendo la exclusión de motos en `/vehicle` y la
  reutilización de listas ya cargadas. La selección final se muestra como
  "Vehículo #12"/"Máquina #8" (misma convención que la tabla de distribución de
  abajo, función `elemento()`), aunque la lista de búsqueda sí muestra
  placa/marca para poder encontrarlo. También se agregó un `<datalist>` al
  campo Origen (sugiere orígenes ya usados en el rango filtrado, pero permite
  escribir uno nuevo libremente) — el layout de 2 columnas del formulario ya
  existía (`.form-row`), no hizo falta tocarlo.
- [x] **Bug crítico: "Unidad de consumo" no coincidía con lo que el backend
  espera (30/07/2026)** — al ponerle texto bonito a las opciones ("Km/Gl",
  "Gl/Hr"...) se perdió el valor real que exige el backend (`KM_POR_GALON`,
  `GAL_POR_HORA`...), así que **todo guardado estaba fallando con 400**. Se
  separó valor (el que espera el backend) de la etiqueta (el texto bonito).
  De paso se encontró que `AssetFuelConfigService` restringía la unidad por
  **tipo de activo** (vehículo=solo km, máquina=solo horas) — una regla que
  `FuelPerformanceService` no necesita (decide la fórmula solo por el sufijo
  `_POR_HORA` del valor guardado, sin mirar si es vehículo o máquina). Se
  relajó esa validación en el backend para que solo dependa de la **familia
  física del combustible** (galón vs. m³), permitiendo casos reales como un
  vehículo diésel trackeado por horómetro en vez de kilometraje. El selector
  del frontend ahora muestra las 2 unidades válidas para el combustible
  elegido (no las 4, no una sola fija).
- [x] **Inventario (Vehículos/Motos/Maquinaria) conectado a asset_fuel_config
  (30/07/2026)** — los campos "Capacidad del tanque"/"Eficiencia de fábrica" que
  ya existían en los formularios de crear/editar de los 3 inventarios eran
  **restos muertos de un módulo de combustibles anterior**, borrado por completo
  en la migración `V19__eliminar_modulo_combustibles.sql` (el backend ya no
  tiene esas columnas; se guardaban en la UI pero el servidor las ignoraba en
  silencio). Se creó un componente compartido nuevo,
  `components/shared/FuelConfigFields.svelte` (Combustible + Consumo estándar +
  Unidad + Capacidad del tanque, opcional, con las 2 unidades válidas por
  combustible), y se conectó de verdad a `asset_fuel_config` vía
  `updateAssetFuelConfigVehicle`/`updateAssetFuelConfigMachine` — mismo backend
  que "Configurar rendimiento del activo" — en:
  - `VehicleManagement.svelte` (crear inline + editar vía `EditAssetModal.svelte`,
    compartido)
  - `MotoManagement.svelte` (mismo `EditAssetModal.svelte`; motos usan el
    endpoint de vehículo porque viven en la tabla `vehiculos`)
  - `MachineManagement.svelte` (modal propio, no comparte `EditAssetModal`;
    usa `preferPorHora={true}` para que la unidad sugerida por defecto sea
    horómetro en vez de km, ya que ahí sí tiene sentido como default aunque
    ambas queden elegibles)

  Al editar, se precarga el consumo/capacidad ya guardado (buscando en
  `$data.fuelAssetConfig` por `vehicleId`/`machineId`), igual que el resto de la
  información del activo. Es opcional: si no se elige combustible, no se llama
  al endpoint y no bloquea el alta/edición del activo en sí.
- [x] **Auditoría de precisión de Rendimiento + sincronización de km/horómetro
  (30/07/2026)** — 3 correcciones reales tras revisar el código de
  `FuelPerformanceService`/`RefuelingRecordService` (no solo la lógica de
  disparo, el cálculo en sí):
  1. **División por cero podía tumbar todo el reporte**: `AssetFuelConfigRequest`
     no validaba `consumoEstandar > 0` (ni backend ni frontend). Un activo mal
     configurado en 0 rompía TODO el reporte de Rendimiento de ese tipo, no solo
     su fila. Se agregó la validación en `AssetFuelConfigService` (400) +
     defensa en `FuelPerformanceService` (excluye la fila en vez de lanzar
     `ArithmeticException`) + `min="0.0001"` y guard en los formularios.
  2. **Horómetro/km que retrocede**: ya quedaba marcado como alerta por
     coincidencia matemática (el "proyectado" negativo siempre generaba una
     diferencia grande), pero ahora es explícito
     (`horometroRetrocedio = ejecutado.signum() < 0`), sin depender de esa
     coincidencia.
  3. **Kilometraje/horómetro no se sincronizaba**: registrar un tanqueo nunca
     actualizaba `vehiculos.kilometraje_actual` / `machines.horometro_actual`
     (usados en Inventario, alertas, etc.) — quedaba aislado en el tanqueo. Se
     replicó el mismo patrón que ya usa `VehicleOilChangeService` (actualiza
     solo si el valor nuevo es mayor al actual) en `RefuelingRecordService`.

  Se confirmó (con test ya existente + nuevo) que el cálculo para combustible
  GAS (m³) ya era correcto: la fórmula decide por el sufijo de la unidad
  (`_POR_HORA` o no), no por el tipo de combustible, y la validación de
  `AssetFuelConfigService` ya obliga a que la unidad coincida con la familia
  física (galón vs. m³) — no hubo que tocar nada ahí.
- [x] **Columna "Producto" en Rendimiento + historial de tanqueos editable
  (31/07/2026)** — **NOTA: la sección "Historial de tanqueos" descrita aquí
  (debajo de los grupos Bomba/Almacén, sobre `GET /fuel/refueling` paginado) fue
  reemplazada el mismo día por el rediseño de la entrada siguiente — se deja este
  párrafo intacto como bitácora de cómo se llegó ahí, pero la UI actual ya no es
  esta.** `FuelPerformanceResponse` ahora trae `fuelTypeId` (sale del
  propio tanqueo vía `tanqueo.getFuelTypeId()`, no de `AssetFuelConfigEntity`, que
  es solo el default del activo); `FuelPerformance.svelte` cruza con
  `fuelTypesById` para la columna "Producto". Se agregó `PUT`/`DELETE
  /api/v1/fuel/refueling/{id}` (antes no existían — el controller solo tenía
  `POST`/`GET`), restringidos a `hasRole('ADMIN')`. Edición completa: permite
  cambiar hasta el activo y el `lugar` (BOMBA/ALMACEN); si pasa a BOMBA sin
  factura real todavía, la factura se vuelve obligatoria en ese momento (mismo
  input que "Registrar tanqueo"). El `PUT` revierte el efecto de inventario viejo
  (`increment`) y aplica el nuevo (`decrement`) sin calcular deltas — simple y
  correcto ante cualquier combinación de cambios. Eliminar es soft-delete
  (`status=false`) + reversión de inventario si era ALMACEN; usa
  `findByIdAndStatus(id, true)` para que un segundo DELETE sobre el mismo id dé
  404 en vez de revertir el inventario dos veces. En `TanqueoDistribucion.svelte`
  se agregó una sección "Historial de tanqueos" (debajo de los grupos
  Bomba/Almacén existentes, que no se tocaron) sobre `GET /fuel/refueling`
  (listado plano — antes sin UI, ahora la fuente correcta para editar porque trae
  todos los campos crudos, a diferencia de `/fuel/distribucion` que es un reporte
  agregado sin `descuento`/`totalIngresado`/`urlFactura`), con `DataGrid` mostrando
  info real del activo (placa+marca / nombre+marca, no "Vehículo #12") y columna de
  acciones que solo se agrega al array de columnas si `isAdmin` (no alcanza con
  `showDeleteButton`, que solo esconde Eliminar y deja Editar visible a cualquiera
  — aquí ambas son ADMIN-only). Se generalizaron `labelElementoLista`/
  `textoBusquedaElemento` (antes leían `form.tipoElemento` por clausura) para
  aceptar el tipo como parámetro y poder reutilizarlas también en el modal de
  edición. Tests: 22 nuevos en `RefuelingRecordServiceTest`, 2 en
  `RefuelingRecordControllerTest`, 6 en `TanqueoDistribucion.test.js` (más 4 tests
  viejos ajustados para escopar sus queries al diálogo del modal de creación, ya
  que el historial ahora muestra la misma etiqueta "Excavadora — CAT" que la lista
  del buscador). Backend 294/294, frontend 316/316.
- [x] **Rediseño de "Tanqueo y Distribución": resumen por activo en vez de
  Bomba/Almacén (31/07/2026)** — el usuario sintió que agrupar por `lugar`
  (Bomba/Almacén) Y tener una sección "Historial de tanqueos" aparte era
  redundante: en la operación real **Bomba siempre son vehículos, Almacén siempre
  son maquinaria y motocicletas**, así que ambos ejes son la misma partición.
  Cambios:
  - Se quitaron los 2 KPIs financieros (Despachado en bomba / Valor gastado en
    bomba) y las 2 tablas agrupadas Bomba/Almacén — ya hay KPIs equivalentes en
    el Dashboard Financiero. `GET /fuel/distribucion` y su service/controller
    quedan intactos, sin UI que los use (mismo criterio "oculto no borrado" del
    resto del módulo).
  - Se reemplaza por 2 píldoras de tipo ("Vehículos" / "Maquinaria y Motos"),
    mismo patrón visual que `FuelPerformance.svelte`.
  - Nuevo endpoint `GET /api/v1/fuel/refueling/reporte?tipo=VEHICULO|
    MAQUINARIA_MOTO&area=&fechaInicio=&fechaFin=` (`RefuelingReportController`/
    `RefuelingReportService`/`GetRefuelingReportUseCase`, roles
    `SUPERVISOR_OPERATIVO`/`ADMIN` — mismo criterio que `/fuel/rendimiento` y
    `/fuel/distribucion`, que reemplaza en esta pantalla). Devuelve una lista
    plana sin agrupar (reutiliza `RefuelingRecordResponse`, con un nuevo factory
    estático `RefuelingRecordResponse.from(entity)` extraído para no duplicar el
    mapeo con `RefuelingRecordService`). "MAQUINARIA_MOTO" es una categoría nueva
    que no existía en ningún otro reporte (Rendimiento sigue usando 3 tipos
    separados) — se arma uniendo máquinas + motos (filtradas con la misma lógica
    de `filtrarPorTipoVehiculo` que ya usaba `FuelPerformanceService`).
    `GET /fuel/refueling` (listado plano paginado, construido esa misma mañana)
    queda sin uso en el frontend — endpoint intacto, no borrado.
  - El frontend colapsa esa lista a **una fila por activo = su tanqueo más
    reciente dentro del rango filtrado** (si un activo no tanqueó en el rango, no
    aparece) — el colapso es 100% client-side (`reduce` agrupando por
    `machineId`/`vehicleId` con prefijo `M-`/`V-` para no confundir ids
    numéricamente iguales de distinto tipo), igual que ya hacía `/fuel/distribucion`
    con el agrupado por lugar (el backend nunca agregó, solo filtró).
  - Nueva acción "Ver historial" por fila (columna de solo lectura, visible para
    cualquier rol que vea la página — a diferencia de Editar/Eliminar que siguen
    ADMIN-only) abre un modal con **todos** los tanqueos de ese activo en el mismo
    rango (filtrado en memoria sobre la misma lista ya cargada, sin fetch nuevo),
    cada fila con sus propias acciones Editar/Eliminar. Requirió un flag nuevo
    `meta.isViewHistoryAction` en `DataGrid.svelte` (componente compartido — cambio
    puramente aditivo, mismo patrón que los ~8 flags de acción que ya existían ahí,
    ej. `isDocHistoryAction`).
  - `Lugar` en los formularios de Registrar/Editar **sigue siendo manual**, por
    decisión explícita del usuario (no derivarlo del tipo de elemento) — el
    rediseño es solo del reporte, no de los formularios.
  - Tests: 5 nuevos en `RefuelingReportServiceTest`, 1 en
    `RefuelingReportControllerTest`, 1 en `DataGrid.test.js`
    (`isViewHistoryAction`); `TanqueoDistribucion.test.js` reescrito (se quitaron
    los tests de KPIs/grupos Bomba-Almacén, se adaptaron los de historial/editar/
    eliminar a la nueva fuente de datos). Backend 300/300, frontend 317/317.
- [x] **Pulido de la tabla resumen + discrepancia por capacidad de tanque
  (01/08/2026)** — 3 correcciones tras probar con datos reales:
  1. **`totalElements` sin pasar al `DataGrid`** (tabla resumen y modal de
     historial) hacía que el pie mostrara "Mostrando N de 0 registros" — corregido
     pasando `totalElements` en ambos.
  2. **Sin paginación en la tabla resumen** (`showPagination={false}`) — se agregó
     paginación 100% client-side (`resumenPage`/`resumenPageSize`, slice local de
     `resumenPorActivo`), sin refetch al backend porque el reporte ya trae todo el
     rango de una vez. Se resetea a la página 1 al cambiar de píldora o filtrar.
  3. **Discrepancia por capacidad de tanque excedida, no detectada** — el usuario
     pidió explícitamente que esto se calculara en el **backend** (no en el
     frontend, como se había hecho al inicio) para que sea reutilizable por
     cualquier consumidor y cualquier tipo de activo. Nuevo
     `AssetFuelCapacityService.excedeCapacidad(vehicleId, machineId, cantidadGalones)`
     (cruza con `asset_fuel_config.tanqueCapacidadGal`, opcional), inyectado en
     `RefuelingRecordService` (registrar/actualizar/listar) y
     `RefuelingReportService`. `RefuelingRecordResponse` gana el campo
     `capacidadExcedida` — `from(entity)` pasó a `from(entity, capacidadExcedida)`
     (único caller antes era `RefuelingRecordService`, ahora ambos servicios lo
     calculan antes de mapear). El frontend ya no cruza con `$data.fuelAssetConfig`
     (se quitó esa lógica de `TanqueoDistribucion.svelte`) — solo lee
     `row.capacidadExcedida` del backend. La columna "Discrepancia" ahora combina
     `discrepanciaValor` (financiera) OR `capacidadExcedida`, y ambas activan el
     resaltado `isAnomaly` de fila que `DataGrid` ya soportaba (mismo patrón que
     Rendimiento). Tests: nuevo `AssetFuelCapacityServiceTest` (6 casos), casos
     agregados en `RefuelingRecordServiceTest`/`RefuelingReportServiceTest`, 4
     nuevos en `TanqueoDistribucion.test.js`. Backend 308/308, frontend 321/321.
- [x] **Rango de fechas compartido entre las 3 pestañas (01/08/2026)** — cada
  pestaña (Dashboard Financiero, Rendimiento, Tanqueo y Distribución) tenía su
  propio `fechaInicio`/`fechaFin` local, así que cambiar de pestaña perdía el
  filtro. Nuevo store `stores/fuelFilters.js` (`fuelDateRange`, un
  `writable({fechaInicio, fechaFin})`) importado por las 3 vistas — los `<input
  type="date">` se enlazan directo a `$fuelDateRange.fechaInicio`/`.fechaFin`
  (Svelte soporta `bind:value={$store.prop}` sin necesidad de props/eventos entre
  `FuelTabbed.svelte` y sus hijos, que solo se montan de a uno por vez con
  `{#if}/{:else if}`). Área (Tanqueo y Distribución) y tipo/píldoras (Rendimiento,
  Tanqueo y Distribución) siguen siendo locales a cada pestaña — no son
  comparables entre vistas con categorías distintas, y el pedido era solo sobre el
  rango de fechas. Test nuevo en `FuelTabbed.test.js` que filtra en una pestaña y
  verifica que las otras dos ya traen el mismo rango al cambiar de pestaña.
  Frontend 322/322 (cambio 100% frontend, sin tocar backend).
- [x] **Bug de diseño: el campo del buscador mostraba "Tipo #id" en vez de
  placa/marca tras seleccionar (03/08/2026)** — al elegir un elemento en
  "Registrar tanqueo"/"Editar tanqueo" (`TanqueoDistribucion.svelte`), el
  input colapsaba a texto genérico ("Vehículo #10", "Motocicleta #18"),
  decisión documentada explícitamente el 29/07 ("no como placa/marca, eso
  solo ayuda a buscar") pero inconsistente con el modal "Configurar
  rendimiento" (`AssetFuelConfigManagement.svelte`), que ya usaba
  `labelActivo()` con formato "placa — marca" / "nombre — marca" tanto para
  buscar como para mostrar la selección. El usuario lo señaló como un
  problema de diseño a corregir; se unificó `seleccionarElemento`/
  `cerrarBuscadorElemento`/`openEditModal` (y sus equivalentes `*Edit`) para
  reutilizar `labelElementoLista()` en vez del texto genérico. Test
  `TanqueoDistribucion.test.js` actualizado (25/25 pasan, frontend 322/322).
- [x] **Bug: cambiar de tipo rápido a veces "no cargaba" (03/08/2026)** —
  `fetchFuelPerformance` (Rendimiento) y `fetchRefuelingReport` (Tanqueo y
  Distribución) en `stores/data/fuel.js` no protegían contra respuestas fuera
  de orden: al cambiar de pill de tipo, dos peticiones quedaban en vuelo a la
  vez, y si la más vieja resolvía después de la más nueva (jitter de red), la
  pisaba en el store — la pantalla parecía "no cargar" hasta volver a cambiar
  de tipo (la última petición ganaba la carrera esa vez). Se agregó un
  contador de petición por función (`fuelPerformanceRequestId`/
  `refuelingReportRequestId`) que descarta cualquier respuesta que ya no sea
  la más reciente. 2 tests nuevos en `data.test.js` (con promesas controladas
  para forzar el orden de resolución, verificados con y sin el fix). Frontend
  324/324.
- [x] **Rendimiento: los 3 tipos se precargan juntos, cambiar de pill ya no
  dispara fetch (03/08/2026)** — a pedido explícito del usuario, para eliminar
  de raíz (no solo mitigar con guarda) el problema de "a veces no carga" al
  cambiar de tipo rápido. `fetchFuelPerformance(tipo, ...)` en
  `stores/data/fuel.js` se reemplazó por `fetchFuelPerformanceAllTipos(fechaInicio,
  fechaFin)`, que pide los 3 (`Promise.all`) y guarda el resultado en
  `fuelPerformance` como objeto `{ MAQUINARIA, VEHICULO, MOTOCICLETA }` (antes
  array plano de un solo tipo). `FuelPerformance.svelte`: `onMount`/`handleFiltrar`
  llaman a la nueva acción una sola vez; `seleccionarTipo` ya no hace fetch, solo
  cambia la variable local `tipo` (lectura instantánea de `rowsPorTipo[tipo]`).
  Como efecto secundario natural (los 3 tipos ya están cargados sin costo extra),
  las 3 píldoras muestran su conteo `(N)` siempre, no solo la activa — cierra el
  TODO de la sección 2 sobre "el conteo solo se muestra en la pestaña activa".
  Conserva su propio contador de petición (mismo patrón que
  `fetchRefuelingReport`) por si `fetchFuelPerformanceAllTipos` se dispara dos
  veces seguidas (ej. doble click en "Filtrar"). Tests: reescritos en
  `FuelPerformance.test.js`/`FuelTabbed.test.js`/`data.test.js` (con
  resolvers controlados para forzar el orden de las 6 peticiones en vuelo —
  3 de cada llamada). **Alcance:** solo Rendimiento (3 tipos); Tanqueo y
  Distribución (2 tipos, ya cubierta por la guarda de orden del ítem anterior)
  se dejó fuera a pedido explícito. Frontend 325/325.
- [x] **Factura opcional en tanqueos BOMBA + mensaje de error corregido
  (03/08/2026)** — a pedido explícito del usuario. Antes, un tanqueo en BOMBA
  exigía precio unitario Y factura (CHECK de la V20), y el mensaje de error
  ("Un tanqueo en BOMBA requiere precioUnitario y factura.") mencionaba ambos
  campos aunque solo faltara la factura, lo que confundía cuando el usuario ya
  había llenado el precio. Ahora solo el precio unitario es obligatorio:
  - **Migración `V23__factura_opcional_en_bomba.sql`**: recrea el CHECK
    `refueling_records_check1` sin exigir `url_factura IS NOT NULL`. Verificada
    a mano contra Postgres real (`usochicamocha_test_real`) — H2 no valida
    CHECK constraints, por eso Flyway no la hubiera detectado en los tests.
  - **`RefuelingRecordService`**: `registrar()` y `actualizar()` ya no lanzan
    400 por falta de factura, en ningún caso (incluido pasar de ALMACEN a
    BOMBA). El placeholder `"pendiente"` (workaround del CHECK viejo) se quitó
    — el primer `save()` ahora guarda `urlFactura=null` directamente si no se
    adjunta factura; el segundo `save()` solo ocurre si sí se sube una.
    Mensajes reescritos para nombrar un solo campo a la vez en vez del genérico
    de dos campos.
  - **`TanqueoDistribucion.svelte`**: se quitó el bloqueo cliente-side
    `editNecesitaFacturaNueva` en "Editar tanqueo"; el label de Factura ahora
    dice siempre "(opcional)" en ambos modales (antes decía "requerida al
    pasar a Bomba" condicionalmente).
  - Tests: backend — 2 reescritos + 1 nuevo en `RefuelingRecordServiceTest`
    (318/318 total). Frontend — 3 nuevos en `TanqueoDistribucion.test.js`,
    verificados con y sin el fix (328/328 total).
- [x] **"Estación"/"Almacén" ahora agrupan por el `lugar` real, no por tipo de
  activo fijo (03/08/2026)** — a pedido explícito del usuario. Antes,
  `RefuelingReportService` agrupaba **siempre** Vehículos→Estación y
  Maquinaria+Motos→Almacén, sin mirar el campo `lugar` real del tanqueo — una
  moto tanqueada de verdad en una bomba/estación quedaba forzada a "Almacén" de
  todos modos, lo que el usuario reportó como "no se actualiza automáticamente"
  (en realidad sí se actualizaba, solo que en la pestaña que no esperaba).
  Cambios:
  - **Backend**: `RefuelingReportService.obtenerReporte` ahora traduce
    `tipo=VEHICULO→lugar=BOMBA` / `tipo=MAQUINARIA_MOTO→lugar=ALMACEN` y filtra
    con el nuevo `RefuelingRecordsRepository.findByLugarAndFechaRegistroBetween`
    — se eliminó por completo `filtrarPorTipoVehiculo` (ya no hace falta cruzar
    con `VehicleRepository` por cada fila para saber si es moto). El contrato
    del endpoint (`GET /fuel/refueling/reporte?tipo=...`) no cambió, solo la
    semántica interna de qué significa "tipo".
  - **Frontend**: para que el caso común (moto/máquina en almacén, vehículo en
    bomba) siga siendo el default sin que el usuario tenga que pensarlo, el
    campo "Lugar" de "Registrar tanqueo"/"Editar tanqueo" ahora se
    **auto-sugiere** según "Tipo de elemento" (Vehículo→BOMBA,
    Motocicleta/Máquina→ALMACEN) cada vez que ese selector cambia — sigue
    siendo editable, así que la excepción real (moto tanqueada en bomba) se
    puede corregir a mano y el reporte la refleja correctamente. Al abrir
    "Editar tanqueo" sobre un registro existente, el lugar real precargado no
    se pisa (el auto-default solo se dispara si el usuario cambia el tipo de
    elemento a mano, no al abrir el modal).
  - Tests: backend — `RefuelingReportServiceTest` reescrito (2 tests viejos que
    verificaban el filtro por tipo de vehículo, ahora 3 nuevos sobre `lugar`,
    incluida la excepción de la moto en bomba). Frontend — 2 nuevos en
    `TanqueoDistribucion.test.js`, verificados con y sin el fix. Backend
    319/319, frontend 330/330.
- [x] **2 validaciones nuevas de anomalías: precio unitario y cantidad fuera de
  rango (03/08/2026)** — a pedido explícito del usuario, tras una sesión de
  preguntas sobre por qué disparaba una alerta en Rendimiento (esa alerta
  resultó correcta: proyectado=0 con tolerancia relativa también da 0, así que
  cualquier `Real`>0 la dispara — se dejó así, sin tocar código). El usuario
  pidió agregar 2 validaciones nuevas del listado de ideas propuesto:
  1. **Precio unitario fuera de rango** — nuevo `FuelPriceAnomalyService`
     compara el precio de un tanqueo BOMBA contra el promedio reciente (30
     días, configurable) del mismo combustible; ±30% (configurable) de desvío
     se marca. Nueva query `RefuelingRecordsRepository.avgPrecioUnitarioBombaRecienteByFuelType`
     (excluye el propio id al editar). Sin historial reciente → no marca
     (no hay línea base).
  2. **Cantidad fuera de rango típico por tipo de activo** — nuevo método
     `AssetFuelCapacityService.cantidadFueraDeRangoTipico` (complementa, no
     reemplaza, `excedeCapacidad`): topes configurables por tipo — moto 15 gal,
     vehículo 60 gal, maquinaria 500 gal — aplican siempre, incluso sin
     `tanqueCapacidadGal` configurado en `asset_fuel_config` (a diferencia de
     `excedeCapacidad`, que sin esa config no puede detectar nada).
  - `RefuelingRecordResponse` ganó 2 campos (`cantidadFueraDeRango`,
    `precioFueraDeRango`), calculados en `RefuelingRecordService.mapToResponse`
    y `RefuelingReportService.obtenerReporte` (mismos 2 puntos donde ya se
    calculaba `capacidadExcedida`).
  - Frontend: la columna "Discrepancia" de Tanqueo y Distribución
    (`config/table-definitions/fuel.js`) y el resaltado `isAnomaly` de fila
    (`TanqueoDistribucion.svelte`) ahora combinan las 4 discrepancias con OR
    (financiera, capacidad excedida, cantidad fuera de rango, precio fuera de
    rango) — sin diferenciar cuál disparó, mismo patrón ya usado antes.
  - Tests: backend — `FuelPriceAnomalyServiceTest` nuevo (6 casos),
    `AssetFuelCapacityServiceTest` +5 casos, `RefuelingRecordServiceTest`/
    `RefuelingReportServiceTest`/`RefuelingRecordControllerTest` actualizados
    por el cambio de firma de `RefuelingRecordResponse.from(...)`. Frontend —
    2 nuevos en `TanqueoDistribucion.test.js`, verificados con y sin el fix.
    Backend 330/330, frontend 332/332.
- [x] **Bug: gráfica de Tendencia (Dashboard Financiero) no se estiraba al ancho
  del contenedor (03/08/2026)** — `FuelTrendChart.svelte` usa `<svg viewBox="0 0
  320 110">` con `width:100%` pero sin `preserveAspectRatio`, así que el
  navegador aplicaba el default (`xMidYMid meet`): escala manteniendo la
  proporción 320:110 y **centra** el contenido en vez de estirarlo, dejando
  espacio vacío a los lados. Los meses de abajo (`.trend-months`, flex
  `space-between`) sí ocupan el 100% real del contenedor — por eso la línea
  quedaba "pegada al centro" sin alinearse con los meses correspondientes. Fix:
  se agregó `preserveAspectRatio="none"` al `<svg>`. Efecto secundario
  encontrado justo después: ese estirado no uniforme (contenedor mucho más
  ancho que alto) hacía que el `stroke-width` de la línea se viera **más
  grueso en los tramos casi verticales** (subidas/bajadas pronunciadas) que en
  los planos — el grosor del trazo se escala junto con la geometría a menos
  que se marque `vector-effect="non-scaling-stroke"` (agregado a la `polyline`
  y al `circle` del marcador). El usuario confirmó que el punto marcador del
  último mes también se veía raro (ovalado) — mismo origen: `vector-effect`
  corrige el trazo pero no la geometría de relleno de un `<circle>`. Se
  reemplazó el `<circle>` de SVG por un `<div class="trend-marker">`
  posicionado en % (`left`/`top` calculados igual que `xs`/`ys` pero como
  porcentaje de `WIDTH`/`HEIGHT`) con `border-radius: 50%` — un `<div>` con
  CSS siempre es un círculo real, sin importar cómo se estire el SVG que
  tiene al lado. Tests nuevos en `FuelTrendChart.test.js` (4, verificados con
  y sin cada fix, incluida la posición exacta del marcador). Frontend
  336/336.
- [ ] Definir si "Reintegros" necesita un botón/formulario en `TanqueoDistribucion`
  (hoy solo se puede crear vía API directa, no hay UI).
- [ ] Revisar si `precioPromedioGalonComprado` (backend) debería quitarse del todo
  o dejarse calculando en silencio por si se reactiva Suministro.
- [ ] Pulir estilo de las píldoras/filtros restantes en Tanqueo y Distribución
  (comparar contra el mockup con más detalle visual).
- [ ] Revisar accesibilidad (warnings de a11y en modales — `on:click` en `div`s sin
  handler de teclado, ya presente antes de este rediseño, no introducido ahora).
- [ ] Retomar la prueba visual en navegador cuando el sandbox lo permita.

---

## 8. Cómo retomar este documento

Actualizar la sección 7 (marcar lo resuelto, agregar lo nuevo) y la sección 4 (bugs)
cada vez que se pula o corrija algo — este archivo reemplaza la necesidad de releer
toda la conversación para saber "qué hay hoy" en Combustibles.
