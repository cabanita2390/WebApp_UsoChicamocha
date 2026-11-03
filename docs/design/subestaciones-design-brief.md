# Subestaciones — Brief para propuesta de diseño visual (módulo nuevo)

**Propósito de este documento:** describir con el mayor detalle posible qué debe existir en cada pantalla del nuevo módulo de Subestaciones (`/subestaciones`) para que una propuesta visual (Claude Design) se pueda generar y aprobar sin necesidad de leer código — y para que, una vez aprobada, se pueda implementar contra el backend real sin sorpresas. Mismo formato que `docs/design/combustibles-design-brief.md`, con una diferencia importante: **esto no es un rediseño**. Hoy no existe absolutamente nada de este módulo en la web (`grep -ril subestacion` en todo `front/` no devuelve un solo archivo) — el backend y el móvil ya están construidos y verificados (ver §1), pero la web es una hoja en blanco.

**Verificado el 2026-09-15** contra el código real, no contra un plan: backend `substation` con 19/19 tests de integración pasando, móvil con 141/141 tests pasando y el módulo de captura Civil ya en producción de campo. Todo lo que se describe abajo (endpoints, campos, valores permitidos) corresponde al código tal como está hoy, no a un diseño de base de datos preliminar.

---

## 1. Contexto: qué existe hoy y qué hay que construir

- **Stack:** igual que el resto de la web — Svelte 4 + Vite, SPA con `svelte-spa-router`, sin librería de componentes (CSS a mano por componente).
- **Alcance de negocio actual: solo disciplina `CIVIL` está activa.** El backend ya tiene `ELECTRICO`/`ELECTROMECANICO` como valores válidos en varios campos (así fue diseñado a propósito, para no tener que migrar esquema el día que se activen — ver `mant_disciplina`), pero **hoy solo Civil tiene actividades con `capturaMovilHabilitada=true` y solo Civil tiene ejecuciones reales**. La propuesta de diseño debe funcionar bien mostrando solo Civil, pero no debe cerrarle la puerta a mostrar otras disciplinas después (ej. un selector de disciplina que hoy solo tiene una opción utilizable, no tres funcionando a medias).
- **Quién ejecuta el trabajo de campo:** la app móvil (Kotlin/Compose, offline-first). La web **no captura visitas nuevas** — es un módulo de consulta/reportería para el ingeniero de mantenimiento y supervisión, exactamente como Combustibles separa "captura en campo" (móvil/Tanqueo) de "reportes" (Dashboard/Rendimiento/Distribución). Ver §9 sobre una función de edición que el backend sí soporta pero que este brief **no** pide construir en la web todavía.
- **Rol que debería ver el módulo:** a definir junto con el resto del sistema (`ADMIN`/`SUPERVISOR_OPERATIVO`, siguiendo el patrón de Combustibles) — el backend hoy no restringe estos endpoints por rol más allá de requerir autenticación, así que la restricción de rol (si se quiere) es una decisión de UI/routing a tomar en la implementación, no algo que ya exista.
- **Dato de volumen real** (para que el diseño no sobre-optimice para "big data" ni sub-optimice asumiendo un puñado de filas): 23 estaciones, ~309 citas de cronograma/año, ~228 registros históricos de referencia (Excel). Es un catálogo pequeño y estable — tablas con 20-25 filas, listados de ejecuciones que crecen con el tiempo pero no explotan.

### 1.1 Tokens de color y tipografía — usar el estilo "moderno" de Combustibles, no el "retro"

Subestaciones es 100% pantallas de consulta/reporte (no formularios de captura, esos viven en el móvil) — por eso debe seguir el mismo lenguaje visual que las 4 pestañas de reporte de Combustibles, **copiando los mismos tokens exactos** para que ambos módulos se sientan parte del mismo sistema:

```css
--surface: #ffffff;
--page: #f7f7f6;
--ink: #0b0b0b;
--ink-secondary: #52514e;
--ink-muted: #898781;
--border: rgba(11, 11, 11, 0.08);
--shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

- Tarjetas: `border-radius: 8-10px`, `padding: 14-20px`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow)`.
- Botón primario (Filtrar): fondo `#2a78d6`, texto blanco, forma de píldora (`border-radius: 999px`), `padding: 9px 20px` — es el mismo botón exacto que usa Combustibles (`.btn-filter`), reutilizar tal cual.
- Botón secundario (Limpiar filtro): fondo blanco, borde `1px solid rgba(11,11,11,0.12)`, mismo radio de píldora.
- La barra de pestañas superior (`TabPanel.svelte`, estilo retro Windows 98/2000) **no cambia** — es compartida con todo el sistema, igual que en Combustibles.

### 1.2 Semántica de color (ya validada, reutilizar sin inventar una paleta nueva)

- **Estado "bueno":** `#006300` (verde oscuro) — `CONFORME`, % de cumplimiento alto.
- **Estado "advertencia":** `#c98500` (ámbar) — `CON_HALLAZGOS`, % de cumplimiento medio.
- **Estado "crítico":** `#d03b3b` (rojo) — `REQUIERE_INTERVENCION`, % de cumplimiento bajo.
- **Umbrales de % de cumplimiento** (ya usados por el Excel real de la empresa, hoja `DASH_ESTACIONES` — reutilizar los mismos números, no inventar unos nuevos): **> 55% verde, 36-55% ámbar, < 35% rojo.**
- Regla de accesibilidad ya vigente en todo el sistema: **el color nunca es la única señal** — siempre acompañado de texto/ícono (la palabra "CONFORME", una flecha, un badge con label).

---

## 2. Estructura general del módulo

- **Ruta propuesta:** `/subestaciones`, un componente `SubestacionesTabbed.svelte` con 3 pestañas, siguiendo exactamente el patrón de `FuelTabbed.svelte` (`TabPanel` + `{#if activeTab === ...}`).
- **Las 3 pestañas:**
  1. **Dashboard de Estaciones** (aterrizaje del módulo)
  2. **Resumen por Actividad**
  3. **Ejecuciones y Hallazgos** (el listado con filtros completos — es el corazón de este pedido)
- **Entrada en el menú lateral** (`components/shared/Sidebar.svelte`): un ítem nuevo, mismo patrón visual que los existentes (`use:link use:active`), en algún punto entre "Inventario" y "Combustible" — a decidir junto con el usuario, no hay convención de orden documentada más allá de "lo que tiene más uso arriba".
- **Patrón de carga:** `<Loader />` genérico, igual que el resto del sistema.
- **Patrón de estado vacío:** párrafo gris `Sin <cosa> en el rango/filtro seleccionado.` — igual que Combustibles, no requiere ilustración.

---

## 3. Pestaña 1 — Dashboard de Estaciones

**Propósito:** vista de aterrizaje — cómo va el cumplimiento del cronograma anual, estación por estación. Espejo de la hoja `DASH_ESTACIONES` que el ingeniero ya usa en Excel.

**Fuente de datos:** `GET /api/v1/substation/indicadores/por-estacion` (sin parámetros — trae las 23 estaciones activas en una sola llamada). Backend: `IndicadorEstacionResponse[]`.

**Gap de backend conocido, no bloqueante:** esta vista SQL (`v_mant_indicadores_estacion`) no filtra por disciplina — hoy da igual porque solo Civil ejecuta, pero el día que otra disciplina se active, esta pantalla mezclará sus números sin avisar. No es un problema de diseño visual, es una nota para cuando se retome otra disciplina.

### 3.1 Filtro
- Esta pantalla **no tiene filtro de fecha** — el endpoint que la alimenta es un snapshot acumulado, no un rango. Si se quiere filtrar por año/mes, es un cambio de backend a futuro, no algo que la propuesta de diseño deba resolver ahora. Puede llevar únicamente un buscador de texto libre sobre la tabla (nombre de estación).

### 3.2 Fila de tarjetas KPI (agregando las 23 filas del endpoint en el cliente)
1. **Estaciones activas** — conteo simple (23 hoy).
2. **% cumplimiento global** — promedio ponderado de `porcentajeCumplimiento` sobre todas las estaciones. Semáforo según §1.2.
3. **Citas programadas vs. cumplidas** — suma de `programado` y `cumple` de todas las filas, mostrado como `X / Y`.
4. **Ejecuciones no programadas** — suma de `ejecutadoNoProgramado` — visitas que no correspondían a una cita del cronograma (trabajo real pero fuera de plan).

### 3.3 Gráfica de barras — % de cumplimiento por estación
- Una barra horizontal o vertical por cada una de las 23 estaciones, coloreada según el semáforo de §1.2 (no un solo color fijo — el color de cada barra depende de su propio valor).
- Mismo patrón técnico que `FuelTrendChart.svelte` (SVG hecho a mano, sin librería).
- Ordenar de peor a mejor cumplimiento por defecto (para que lo crítico salte a la vista primero) — coincide con cómo el ingeniero ya lee el Excel hoy.

### 3.4 Tabla — Estaciones
Columnas: `Estación | Tipo (BOMBEO/COMPLEMENTARIA) | Programado | Cumple | No cumple | % Cumplimiento | No programadas`.
- `% Cumplimiento`: badge con semáforo de §1.2, nunca solo texto plano.
- `Tipo`: texto simple, sin badge (es catalogación, no un estado).
- Buscador de texto libre (patrón `DataGrid`) sobre nombre de estación.
- Si no hay datos: `Sin estaciones registradas.` (en la práctica no debería pasar nunca, las 23 son fijas).

**Gap conocido, descartado por ahora (no incluir en la propuesta salvo que el usuario lo pida de nuevo):** un desglose "programado vs. no programado" en gráfica de torta — no tiene endpoint agregado hoy y no es prioridad.

---

## 4. Pestaña 2 — Resumen por Actividad

**Propósito:** ver, por cada actividad del catálogo (las 9 de Civil), cuánto se ha ejecutado contra lo programado, todas las estaciones juntas. Espejo de la hoja `RESUMEN_ANUAL`.

**Fuente de datos:** `GET /api/v1/substation/indicadores/por-actividad?disciplina=CIVIL`. Backend: `ResumenActividadResponse[]`.

### 4.1 Filtro
- Selector de disciplina — **mostrar pero dejar fijo en "Civil"** (única opción funcional hoy; ver §1). No agregar Eléctrico/Electromecánico como opciones seleccionables todavía, aunque el backend acepte el parámetro — mostrarían tablas vacías sin explicación.
- Buscador de texto libre sobre nombre de actividad.

### 4.2 Tabla — Actividades
Columnas: `Actividad | Programado anual | Ejecutado anual | No programado | Mantenimiento | Inspección | Total`.
- Sin semáforo aquí — son conteos, no porcentajes (a diferencia de la Pestaña 1). Si se quiere una señal visual, una barra de progreso simple `ejecutadoAnual / programadoAnual` es razonable, pero no es obligatorio.
- "Inspección maquinaria amarilla" e "Inspección vehículos y motocicletas" pueden aparecer con `programadoAnual = 0` (son actividades ad-hoc, sin cronograma fijo) — no tratar esto como un error de datos, es esperado.
- Si no hay datos: `Sin actividades registradas para esta disciplina.`

---

## 5. Pestaña 3 — Ejecuciones y Hallazgos (la pantalla con filtros completos)

**Propósito:** el registro de auditoría/consulta real — cada visita de campo capturada desde el móvil, buscable por cualquier combinación de criterios. No existe un espejo directo en el Excel (es la brecha más obvia que el Excel manual no cubría bien) — esta es la pantalla donde el ingeniero encuentra "¿qué pasó en tal estación en tal mes?" o "muéstrame todo lo que tuvo hallazgos este trimestre".

**Fuente de datos:** `GET /api/v1/substation/ejecuciones` — paginado (`Page<EjecucionResponse>`), acepta hoy `estacionId` (opcional), `fechaInicio`/`fechaFin` (opcional), `esProgramada` (opcional), más los parámetros estándar de paginación (`page`, `size`, `sort`).

### 5.1 Filtros — estado real vs. lo que pide este pedido

El usuario pidió "filtros para buscar por cualquier parámetro". Estos son los campos disponibles en `EjecucionResponse` y su estado real de soporte en el backend hoy:

| Filtro | Campo en `EjecucionResponse` | ¿Soportado hoy por `GET /ejecuciones`? |
|---|---|---|
| Estación | `estacionId`/`estacionNombre` | ✅ Sí (`estacionId`) |
| Rango de fechas | `fecha` | ✅ Sí (`fechaInicio`/`fechaFin`) |
| Programada / No programada | `esProgramada` | ✅ Sí (`esProgramada`) |
| **Resultado** (Conforme / Con hallazgos / Requiere intervención) | `resultado` | ❌ **No** — falta agregar `?resultado=` al controller+service (mismo patrón que `esProgramada`, cambio chico) |
| Actividad | `actividadId`/`actividadNombre` | ❌ No expuesto como filtro (sí existe el dato) |
| Tipo de mantenimiento | `tipoMantenimiento` | ❌ No expuesto como filtro |
| Tipo de actividad | `tipoActividad` | ❌ No expuesto como filtro |
| Responsable | `responsable` | ❌ No expuesto como filtro |
| Texto libre (observaciones, descripción libre) | `observaciones`/`descripcionLibre` | Parcial — el buscador de `DataGrid` solo filtra la página cargada en el cliente, no busca en todo el histórico |

**Recomendación para la propuesta de diseño:** diseñar la barra de filtros completa (los 8 campos de la tabla), asumiendo que todos van a funcionar server-side — es el diseño correcto a largo plazo y evita rediseñar la pantalla cuando se cierre el gap de backend. La implementación puede salir en dos pasos (primero con los 3 filtros que ya funcionan, agregando los otros 5 al controller en un segundo commit), pero el diseño visual no necesita reflejar esa secuencia.

**Barra de filtros propuesta** (mismo patrón visual que Combustibles: fila de campos + botón "Filtrar" azul + "Limpiar filtro"):
1. Estación — select (23 opciones, desde `GET /estaciones`).
2. Actividad — select (9 opciones para Civil, desde `GET /actividades?disciplina=CIVIL`).
3. Tipo de mantenimiento — select: `Preventivo / Correctivo / Predictivo / No programado`.
4. Tipo de actividad — select: `Inspección / Mantenimiento / No programado` (Civil no usa "Otros" en este campo — ver nota abajo).
5. Resultado — select: `Conforme / Con hallazgos / Requiere intervención`.
6. Programada — select de 3 estados: `Todas / Sí / No`.
7. Fecha inicio / Fecha fin — igual que Combustibles.
8. Buscador de texto libre — encabezado de tabla, patrón `DataGrid` estándar.

**Nota de negocio para no confundir al diseñador:** aunque la base de datos permite un 4° valor `"Otros"` en tipo de actividad (para cuando se active Electromecánico), **Civil nunca lo usa** — el backend lo valida y lo rechaza para esta disciplina. El selector de "Tipo de actividad" en esta pantalla debe mostrar solo 3 opciones mientras solo Civil esté activo, no 4.

### 5.2 Atajo útil: preset "Solo hallazgos"
- Dado que el caso de uso más importante de esta pantalla es "encontrar visitas con problemas", un botón/toggle rápido tipo chip — `Solo hallazgos` — que aplica de una vez `resultado IN (CON_HALLAZGOS, REQUIERE_INTERVENCION)` sin tener que abrir el select de Resultado y elegir dos veces. Esto es lo que la Vista 3 aprobada originalmente pedía como su versión más simple ("Hallazgos"); con los filtros completos de arriba, ese caso queda cubierto como un preset, no como una pantalla aparte.

### 5.3 Tabla — Ejecuciones
Columnas: `Fecha | Estación | Actividad | Tipo mant. | Tipo act. | Programada (Sí/No) | Resultado | Responsable | Evidencia`.

- **`Resultado`**: badge con semáforo de §1.2 — verde `CONFORME`, ámbar `CON_HALLAZGOS`, rojo `REQUIERE_INTERVENCION`.
- **`Actividad`**: si `actividadId` es `null` (visita no prevista o "otros"), mostrar `descripcionLibre` en su lugar, con una etiqueta pequeña `(no catalogada)` — nunca dejar la celda vacía.
- **`Evidencia`**: contador de fotos (`evidencias.length`). Si `evidenciaPendiente = true` (el backend ya calcula esto: resultado ≠ Conforme y sin ninguna foto todavía), mostrar un badge de alerta — `Sin evidencia` en ámbar — es una señal operativa real (algo salió mal y no quedó registro fotográfico), no solo informativa.
- Fila clicable → abre el modal de detalle (§5.4).
- Paginación server-side estándar de `DataGrid` (10/20/30/50/100/250, controles Primero/Anterior/Página X de Y/Siguiente/Último) — coincide 1:1 con el `Page<EjecucionResponse>` que ya devuelve el backend.
- Si no hay resultados: `Sin ejecuciones para los filtros seleccionados.`

### 5.4 Modal / panel de detalle de una ejecución
Al hacer click en una fila, abrir el detalle completo (`GET /ejecuciones/{id}`, ya trae evidencias e historial de ediciones en una sola llamada):

- **Datos generales:** fecha, mes/semana de ejecución, estación, tipo de mantenimiento, tipo de actividad, actividad (o descripción libre + motivo si no catalogada), programada (Sí/No), resultado (badge), responsable, observaciones.
- **Galería de evidencia:** reusar `ImageCarouselModal.svelte` tal cual (mismo componente que usa Vehículos/Inspecciones) — recibe un arreglo de URLs. Cada `EvidenciaResponse.rutaArchivo` se resuelve con el helper ya existente `getFileUrl()` de `stores/api.js` (mismo patrón que SOAT/tecnomecánica/facturas de Combustible) — no hay que inventar una resolución de URL nueva.
- **Historial de ediciones** (si `ediciones` no está vacío): lista cronológica simple `Usuario — Motivo — Fecha/hora`. Esto existe porque el móvil ya permite corregir una ejecución después de registrada (con motivo obligatorio ≥15 caracteres) — la web debe poder **ver** ese historial aunque no lo edite (ver §9).
- Si `evidenciaPendiente = true`, un aviso visible dentro del modal, no solo en la tabla (ej. una franja ámbar arriba del detalle: *"Este resultado no es Conforme y todavía no tiene fotos de evidencia."*).

---

## 6. Componentes compartidos a reutilizar (no crear nuevos si no hace falta)

- **`DataGrid.svelte`** — tabla + paginación + buscador, ya soporta server-side pageable, usarlo tal cual en Pestañas 1 y 3 (Pestaña 2 puede ser una tabla simple sin paginación, son solo 9 filas).
- **`TabPanel.svelte`** — las 3 pestañas.
- **`ImageCarouselModal.svelte`** — galería de evidencia en el detalle de ejecución.
- **`Loader.svelte`** — estados de carga.
- **`FuelTrendChart.svelte`** — patrón de referencia para la gráfica de barras de cumplimiento por estación (adaptar de línea a barras, mismo enfoque técnico de SVG a mano).
- **`getFileUrl()`** (`stores/api.js`) — resolución de rutas de archivo servidas por `/uploads/**`.

No se necesita ninguna librería nueva ni ningún componente que no exista ya en el sistema.

---

## 7. Resumen de gaps de backend a resolver antes/durante la implementación

Estos no son parte de la propuesta visual, pero condicionan qué tan "completos" quedan los filtros el día 1:

1. **Falta `?resultado=` en `GET /ejecuciones`** — bloquea el preset "Solo hallazgos" (§5.2) y el filtro de Resultado (§5.1) funcionando server-side. Cambio pequeño, mismo patrón que el `esProgramada` ya existente.
2. **Faltan `actividadId`, `tipoMantenimiento`, `tipoActividad` como filtros** en el mismo endpoint — necesarios para que la barra de filtros completa de §5.1 funcione de verdad contra el backend y no solo contra la página cargada en pantalla.
3. **`v_mant_indicadores_estacion` (Pestaña 1) no filtra por disciplina** — no bloquea nada hoy, pero hay que recordarlo si se activa otra disciplina.

Ninguno de estos bloquea empezar: Pestañas 1 y 2 son 100% build-directo hoy; Pestaña 3 puede construirse ya con los 3 filtros que sí funcionan (Estación, Fechas, Programada) y sumar los otros cuando el backend los exponga, sin tener que rediseñar la pantalla.

---

## 8. Qué se espera de la propuesta (para Claude Design)

- Generar mockups de las 3 pestañas descritas arriba (Dashboard de Estaciones, Resumen por Actividad, Ejecuciones y Hallazgos), más el modal de detalle de ejecución (§5.4).
- Usar los tokens de color/tipografía de §1.1-1.2 tal cual — **no proponer una paleta nueva**, el objetivo es que se vea parte de la misma familia visual que Combustibles.
- Respetar la regla "el color nunca es la única señal" (badges con texto, no solo fondo de color).
- La pestaña con más superficie de diseño es la 3 (§5) — es la que tiene la barra de filtros completa y el modal de detalle; vale la pena que reciba la mayor atención.
- No hace falta diseñar un flujo de captura/edición — eso ya existe en el móvil y esta web es de solo consulta (ver §9 para la única excepción a considerar).
- Entregar como mockups por pantalla (una vista por pestaña + una del modal de detalle), para poder mapear cada pieza a su componente real al implementar (`SubestacionesTabbed.svelte` + 3 componentes hijos, siguiendo el nombre de patrón de Combustibles).

---

## 9. Nota abierta, no parte del pedido actual: ¿editar desde la web?

El backend ya soporta `PUT /ejecuciones/{id}` (corrección con historial auditado, motivo obligatorio) — hoy solo el móvil lo usa. Este brief **no** pide construir edición desde la web (el pedido actual es "presentar información y filtrar"), pero como el detalle de ejecución (§5.4) ya va a mostrar el historial de ediciones, es una extensión natural y barata de agregar después si el ingeniero de mantenimiento pide poder corregir un registro desde el escritorio en vez de tener que hacerlo desde el celular. Dejarlo anotado para no tener que rediseñar el modal de detalle si se pide más adelante.
