# Combustibles — Brief para propuesta de rediseño visual

**Propósito de este documento:** describir con el mayor detalle posible qué existe HOY en cada pantalla del módulo de Combustibles (`/fuel`) — layout, datos, textos exactos, colores, comportamiento — para que una propuesta de diseño nueva se pueda evaluar y aprobar sin necesidad de leer código, y para que lo aprobado se pueda implementar tocando el mínimo de código posible (mismos componentes, mismos datos, solo cambia la presentación).

**No es un pedido de rediseño de datos ni de flujo** — todo lo que se describe abajo (qué campos existen, qué hace cada botón, qué reglas de negocio hay) se da por bueno y **no debe cambiar**. Lo que se busca mejorar es *cómo se ve*.

---

## 1. Contexto: cómo está construido el sistema hoy

- **Stack:** Svelte 4 + Vite, SPA de una sola página con router (`svelte-spa-router`). No hay librería de componentes de diseño (Bootstrap, Tailwind, Material, etc.) — todo el CSS está escrito a mano, por componente.
- **El resto del sistema** (Vehículos, Maquinaria, Motos, Usuarios, Inspecciones, Órdenes de trabajo, etc.) usa un **estilo "retro" tipo Windows 98/2000**: fondos gris claro con gradientes planos, bordes `inset`/`outset` de 1-2px, botones con gradiente gris y borde en relieve, tipografía `'MS Sans Serif', 'Tahoma', sans-serif` en tamaños pequeños (10-11px). Este es el estilo de **toda la barra de pestañas** (el componente compartido `TabPanel.svelte`) y de **todos los formularios de creación/edición** de la aplicación completa, no solo de Combustibles.
- **Combustibles introdujo un segundo estilo, "moderno"**, pero solo para sus 4 pantallas de solo-lectura (reportes). Es una decisión ya tomada y validada con el usuario dueño del producto: tarjetas blancas con sombra suave, esquinas redondeadas, tipografía `system-ui`. Los formularios de registro de Combustibles (Tanqueo, Suministro, Reintegro, Configuración) usan el estilo retro, igual que el resto del sistema.
- **Resultado actual:** dentro de una misma pestaña `/fuel` conviven dos lenguajes visuales — la barra de pestañas de arriba siempre es retro (heredada, no se puede cambiar sin afectar TODAS las demás secciones del sistema que también usan `TabPanel.svelte`), y el contenido de cada pestaña es retro o moderno según si es un formulario o un reporte.

**Implicación para la propuesta de diseño:** cualquier propuesta nueva debe asumir que **la barra de pestañas superior (retro) no cambia** — es un componente compartido con el resto del sistema. Lo que sí se puede rediseñar libremente es el contenido de cada una de las 6 pestañas. Si la propuesta unifica el estilo retro/moderno en uno solo, debe funcionar bien visualmente debajo de esa barra retro fija.

### 1.1 Tokens de color y tipografía — estilo "moderno" (las 4 pestañas de reporte)

Repetidos de forma idéntica (copy-pasteados) en cada uno de los 4 archivos de reporte — un design system real reemplazaría esta duplicación:

```css
--surface: #ffffff;      /* fondo de tarjetas */
--page: #f7f7f6;         /* fondo de la página detrás de las tarjetas */
--ink: #0b0b0b;           /* texto principal */
--ink-secondary: #52514e; /* texto secundario, etiquetas */
--ink-muted: #898781;     /* texto deshabilitado / estados vacíos */
--border: rgba(11, 11, 11, 0.08);
--shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

- Tarjetas (`.fuel-chart`, `.stat-tile`, `.conc-area`): `border-radius: 8-10px`, `padding: 14-20px`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow)`.
- Botones de acción primaria: fondo `#2a78d6` (azul), texto blanco, `border-radius: 6px`, sin borde, `padding: 7px 16px`.
- Botones secundarios (reintegro, config): fondo `#006300` (verde) o `#52514e` (gris oscuro).

### 1.2 Paleta de datos (gráficas y semántica de estado) — validada con herramienta de accesibilidad de color

- **Categórica** (identidad de tipo de combustible, orden fijo, nunca se recicla el color): `#2a78d6` (azul) → `#008300` (verde) → `#e87ba4` (rosa) → `#eda100` (ámbar).
- **Estado "bueno" / positivo:** `#006300` (verde oscuro).
- **Estado "crítico" / malo:** `#d03b3b` (rojo).
- **Estado "advertencia":** `#c98500` (ámbar).
- Regla aplicada en todo el módulo: el color **nunca** es la única señal — siempre va acompañado de una leyenda, una etiqueta de texto o un ícono (flecha ↑/↓/→, palabra "SÍ"/"NO", etc.), pensando en accesibilidad.

### 1.3 Tokens — estilo "retro" (formularios de registro, y la barra de pestañas)

```css
/* Modal / contenedor de formulario */
background: #e0e0e0;
border: 2px outset #ffffff;
box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);

/* Inputs */
border: 1px inset #c0c0c0;
font-size: 11px;

/* Botones */
background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
border: 1px outset #c0c0c0;

/* Barra de pestañas (TabPanel.svelte, compartida con TODO el sistema) */
background: linear-gradient(to bottom, #d0d0d0 0%, #c0c0c0 100%);
font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
font-size: 11px;
```

---

## 2. Estructura general del módulo

- **Ruta:** `/fuel`, un único componente `FuelTabbed.svelte` con 6 pestañas.
- **Roles del sistema que existen:** `OPERARIO`, `ALMACEN`, `SUPERVISOR_OPERATIVO`, `ADMIN`. Cualquier usuario autenticado con acceso a `/fuel` ve las 6 pestañas (la barra de pestañas hoy **no oculta pestañas por rol**) — lo que cambia por rol es qué *botones de acción* aparecen dentro de cada pestaña, y el backend rechaza (403) las peticiones de datos que ese rol no debería poder ver. **Esto es una inconsistencia conocida** (un `OPERARIO` vería una pestaña de Dashboard que después le falla al cargar) — vale la pena que la propuesta de diseño contemple qué pasa visualmente en ese caso (hoy no hay una pantalla de "no tienes acceso" diseñada).
- **Pendiente conocido, fuera de este ejercicio de diseño:** el rol `ALMACEN` hoy ve todo el menú lateral del sistema (Vehículos, Maquinaria, etc.), no solo Combustibles. Se va a resolver aparte, no es parte de este rediseño.
- **Las 6 pestañas, en el orden en que aparecen hoy:** Dashboard Financiero, Control de Almacén, Rendimiento, Distribución, Tanqueo, Suministro de Almacén *(el orden es configurable, no es una decisión de negocio — se puede reordenar en la propuesta si tiene más sentido)*.
- **Patrón compartido de filtros:** en las 4 pestañas de reporte, el filtro de fecha (cuando existe) es igual: dos campos `<input type="date">` (Fecha inicio / Fecha fin) + un botón "Filtrar". Si se dejan vacíos, el backend asume el mes actual hasta hoy. No hay validación visual de que "fecha fin" sea posterior a "fecha inicio".
- **Patrón compartido de estados vacíos:** un párrafo gris `Sin <cosa> en el rango seleccionado.` cuando no hay datos — no hay una ilustración ni un estado vacío diseñado, es texto plano.
- **Patrón compartido de carga:** un componente `<Loader />` genérico (spinner, sin skeleton) mientras se espera la respuesta del backend.

---

## 3. Pestaña 1 — Dashboard Financiero

**Rol que puede verla (según backend):** `SUPERVISOR_OPERATIVO`, `ADMIN`.
**Estilo actual:** moderno.
**Propósito:** vista de aterrizaje del módulo — resumen financiero del gasto en combustible en un rango de fechas.

### 3.1 Filtro
- Fecha inicio, Fecha fin, botón "Filtrar" (azul).

### 3.2 Fila de 3 tarjetas KPI principales
Cada tarjeta: punto de color a la izquierda de la etiqueta (`--tile-accent`), etiqueta pequeña gris, valor grande en negrita, y debajo un texto pequeño de "delta" con flecha y color.

1. **Gasto bruto** — valor en pesos colombianos formato compacto (ej. `$1,2 M`). Acento azul.
2. **Gasto neto** — igual formato. Acento azul.
3. **Ahorro por descuentos** — mismo formato, texto en verde (`stat-value--good`). Acento verde.

**Delta bajo cada una de las 3:** compara contra el periodo inmediatamente anterior **de la misma duración** que el filtro aplicado (no "mes anterior" fijo — si filtras 10 días, compara contra los 10 días previos). Formato: `↑ +20% vs. periodo anterior` / `↓ -5% vs. periodo anterior` / `→ 0% vs. periodo anterior`. Color: verde si la dirección es "buena" (para gasto, que baje es bueno; para ahorro, que suba es bueno), rojo si es "mala", gris si es 0%. Si el periodo anterior no tiene datos (división por cero), no se muestra el delta.

### 3.3 Fila de 2 tarjetas KPI secundarias
1. **Discrepancias detectadas** — número entero. Acento ámbar si es mayor a 0, verde si es 0. Debajo, en texto pequeño gris: *"Compras y tanqueos donde lo ingresado no coincide con lo calculado"*.
2. **Precio promedio por galón comprado** — en pesos, o `—` si no hay compras en el rango.

### 3.4 Bloque "Tendencia"
- Encabezado: `Tendencia — últimos {N} meses` donde N es el número de meses seleccionado.
- Selector de periodo, alineado a la derecha del encabezado: 5 botones fijos `2m` `3m` `6m` `12m` `24m` (el activo se resalta en azul) + un campo numérico libre + botón "Aplicar" para cualquier otro número de meses.
- **Dos mini-gráficas de línea**, cada una en su propia tarjeta con borde:
  1. **"Consumo mensual (galones)"** — línea azul, relleno de área al 10% de opacidad, un punto marcador en el último mes, eje X con las etiquetas de mes abreviadas (`ene feb mar...`), debajo un texto `Último mes: <valor> gal` (o `m³` si aplica). Sin eje Y numérico visible — es una gráfica de tendencia, no de lectura exacta por punto.
  2. **"Gasto neto mensual"** — mismo formato, línea verde, valores en pesos.
  - **Comportamiento responsivo ya implementado:** con 6 meses o menos, las dos mini-gráficas van lado a lado; con más de 6 meses seleccionados, se apilan una debajo de la otra (para que las etiquetas de mes no se amontonen).
  - **Limitación conocida, no resuelta:** si en un mismo mes hay tanqueos de más de un tipo de combustible con distinta unidad física (ej. diésel en galones y gas en m³), el total mensual de "Consumo" los suma como si fueran la misma unidad. Vale la pena que la propuesta de diseño contemple cómo mostrar esto si se vuelve un caso real (hoy la organización solo usa combustibles en galones).

### 3.5 Bloque "Origen del gasto: almacén vs. bomba"
- Gráfica de barras horizontales, 2 barras: "Compras almacén" (azul `#2a78d6`) y "Tanqueos bomba" (naranja `#eb6834`, es el único color que no sigue la paleta categórica de 4 — es un color aparte para no confundir con la identidad de tipo de combustible).
- Leyenda arriba de las barras (swatch de color + etiqueta).
- Cada barra tiene el valor en pesos escrito al final de la barra (nunca el valor solo-color).

### 3.6 Bloque "Gasto por tipo de combustible"
- Gráfica de barras horizontales, una barra por cada tipo de combustible que tuvo movimiento en el rango (los tipos sin compras/tanqueos en el periodo no aparecen). Colores de la paleta categórica en orden fijo.
- Si no hay datos: `Sin gasto en el rango seleccionado.`

### 3.7 Bloque "Cantidad por tipo de combustible"
- Igual estructura que 3.6, pero mostrando galones o m³ (según el tipo) en vez de pesos.
- Si no hay datos: `Sin tanqueos en el rango seleccionado.`

---

## 4. Pestaña 2 — Control de Almacén

**Rol que puede verla:** `ALMACEN`, `SUPERVISOR_OPERATIVO`, `ADMIN` (saldos/movimientos); el botón de reintegro solo aparece para `SUPERVISOR_OPERATIVO`/`ADMIN`.
**Estilo actual:** moderno (contenido) + modal retro (formulario de reintegro).
**Propósito:** saldo disponible del almacén propio, conciliación de entradas/salidas, e historial de compras del periodo.

### 4.1 Filtro y acciones
- Fecha inicio, Fecha fin, botón "Filtrar".
- Botón "Registrar reintegro" (verde, alineado a la derecha, solo visible para roles autorizados).

### 4.2 Bloque "Saldos"
- Dos tarjetas lado a lado, una por área de costo: **DISTRITO** y **ASOCIACION** (son inventarios independientes, nunca se suman entre sí — es una regla de negocio explícita).
- Dentro de cada tarjeta, una tarjeta pequeña ("stat-tile") por cada tipo de combustible que la organización realmente maneja (los tipos del catálogo sin ninguna compra/tanqueo histórico no aparecen — filtro ya implementado para no mostrar "basura" del catálogo).
- Cada stat-tile: nombre del combustible + cantidad disponible con su unidad correcta (`gal` o `m³` según el tipo).
- Si un área no tiene saldo: `Sin saldo registrado.`

### 4.3 Bloque "Conciliación del periodo"
- Misma agrupación por área que Saldos (dos tarjetas, DISTRITO / ASOCIACION).
- Dentro de cada una, una **tabla real** (no texto en línea — se probó un formato de "línea de flujo" en una sola fila por combustible y el usuario lo encontró menos legible que una tabla con columnas alineadas):

  | Combustible | Saldo inicial | Entradas | Salidas | Saldo final |
  |---|---|---|---|---|
  | ACPM / Diésel | 120 gal | +50 gal | −30 gal | **140 gal** |

  - Entradas en verde, Salidas en rojo, Saldo final en negrita.
  - Filas ordenadas de forma estable por tipo de combustible (mismo orden en cada carga).
  - Si no hay movimientos: `Sin movimientos en el rango seleccionado.`

### 4.4 Bloque "Historial de compras del periodo"
- Tabla simple: Fecha, Área, Combustible, Cantidad (con unidad), Total (pesos).
- Si no hay compras: `Sin compras en el rango seleccionado.`

### 4.5 Modal "Registrar reintegro" (retro)
- Campo "Id del tanqueo" (numérico) con texto de ayuda: *"Busca el id en el historial de Tanqueo"* — hoy no hay un buscador, el usuario debe ir a la pestaña de Tanqueo, ver el id en la tabla, y volver a escribirlo a mano. **Es una oportunidad de mejora real** si el diseño quiere proponer un selector/buscador en vez de un campo numérico ciego.
- Campo "Cantidad reintegrada" (numérico).
- Botón "Registrar reintegro".

---

## 5. Pestaña 3 — Rendimiento

**Rol que puede verla:** `SUPERVISOR_OPERATIVO`, `ADMIN` (el botón de Configuración, solo `ADMIN`).
**Estilo actual:** moderno (contenido) + modal retro (formulario de configuración).
**Propósito:** comparar el consumo real de combustible de cada vehículo/máquina contra su consumo estándar esperado, y alertar cuando la diferencia es grande.

### 5.1 Filtro y acciones
- Selector "Tipo": Maquinaria / Vehículo / Motocicleta.
- Fecha inicio, Fecha fin, botón "Filtrar".
- Botón "Configurar consumo estándar" (gris oscuro, solo `ADMIN`) — es un **toggle**: al hacer click, aparece/desaparece un panel completo de configuración *arriba* de la tabla de rendimiento, dentro de la misma pestaña (no es una pestaña aparte — ver nota en §5.2 sobre por qué).

### 5.2 Panel de Configuración (embebido, solo visible tras el toggle, solo `ADMIN`)
> Nota de contexto: originalmente eran 2 tareas separadas del roadmap, pero el sistema está limitado a 6 pestañas totales, así que Configuración quedó "escondida" dentro de Rendimiento en vez de ser su propia pestaña. Si la propuesta de diseño encuentra una mejor forma de exponer esto (una pestaña 7ª, un ícono de engranaje, un acceso separado para ADMIN), es bienvenida.

- Tabla (misma tabla de datos que el resto del sistema, `DataGrid`) con las configuraciones existentes: Activo (`Vehículo #5` / `Máquina #8`), Combustible, Consumo estándar (número), Unidad (texto: `KM_POR_GALON`, `GAL_POR_HORA`, `KM_POR_M3`, `M3_POR_HORA` — texto técnico/crudo, no traducido a lenguaje natural, oportunidad de mejora), Capacidad tanque (gal).
- Botón "+ Configurar" abre un modal retro con: Tipo de activo (Vehículo/Máquina), Id del activo, Combustible, Consumo estándar, Capacidad del tanque (gal, opcional). **La unidad de consumo NO se pide al usuario** — se calcula automáticamente según el tipo de activo y el combustible elegido, y se muestra de solo lectura debajo del formulario (`Unidad de consumo: KM_POR_GALON`) para que el usuario entienda qué está registrando, sin tener que saber el nombre técnico del enum de antemano.

### 5.3 Tabla de Rendimiento
Columnas: Elemento (`Vehículo #5` / `Máquina #8`), Fecha, Horómetro/Km ejecutado, Consumo estándar (con unidad), Proyectado (con unidad — lo que se esperaba consumir), Real (con unidad — lo que realmente se tanqueó), Diferencia (con unidad), Alerta (`SÍ`/`NO`).

- **Las filas con Alerta = SÍ se resaltan visualmente** (hoy: fondo ámbar claro `#fff0d0` + borde izquierdo ámbar `#e8a000` de 3px — es un estilo genérico de "anomalía" reutilizado de la tabla compartida de todo el sistema, no diseñado específicamente para Combustibles).
- Una alerta se dispara cuando la diferencia entre lo proyectado y lo real supera un 15% (configurable en backend, no visible en la UI).
- **Activos sin configuración de consumo estándar, o sin un tanqueo anterior de referencia, simplemente no aparecen en la tabla** — es intencional (no se puede proyectar sin línea base), pero visualmente no hay ninguna indicación de "estos activos existen pero no tienen datos suficientes todavía". Si no hay ninguna fila: `Sin activos con línea base y consumo configurado en el rango seleccionado.`

---

## 6. Pestaña 4 — Distribución

**Rol que puede verla:** `SUPERVISOR_OPERATIVO`, `ADMIN`.
**Estilo actual:** moderno.
**Propósito:** ver qué se despachó (entregó) a cada área de costo (Distrito o Asociación) y su valorización.

### 6.1 Filtro
- Selector "Área": Distrito / Asociación (un solo valor a la vez, no ambos simultáneamente).
- Fecha inicio, Fecha fin, botón "Filtrar".

### 6.2 Dos tarjetas KPI
1. **Total despachado** — cantidad con unidad (gal o m³ — toma la unidad del primer tipo de combustible que aparezca en los datos, **limitación conocida**: si el área despachó más de un tipo de combustible con distinta unidad en el mismo periodo, esta tarjeta no lo refleja bien).
2. **Costo total despachado** — en pesos, formato compacto.

### 6.3 Tabla "Detalle de despachos"
Columnas: Fecha, Elemento (`Vehículo #5` / `Máquina #8`), Combustible, Origen (texto libre, ej. "Estación Norte", o `—` si no se registró), Cantidad (con unidad), Valor, Reintegrado (cantidad con unidad, o `—`).

- **Regla de negocio importante para el diseño:** cuando `Valor` es `null` (pasa cuando el tanqueo fue registrado como "ALMACEN" en vez de "BOMBA", porque no tiene precio de compra asociado directamente), la celda debe mostrar `—`, **nunca `$0`** — son conceptos distintos ("no se valorizó" vs. "costó cero") y mostrarlo mal generaría desconfianza en los números.
- Si no hay despachos: `Sin despachos en el rango seleccionado.`

---

## 7. Pestaña 5 — Tanqueo

**Rol que puede verla:** todos los roles autenticados (ver historial); todos pueden registrar según backend (`OPERARIO`, `ALMACEN`, `SUPERVISOR_OPERATIVO`, `ADMIN`).
**Estilo actual:** 100% retro (es un formulario de registro).
**Propósito:** historial de tanqueos + registro manual de respaldo — **el flujo principal de registro de tanqueos ocurre desde la app móvil en campo**, este formulario web es secundario.

### 7.1 Encabezado
- Texto de contexto (gris, pequeño): *"El tanqueo se registra principalmente desde la app móvil en campo — este formulario queda disponible por si acaso."* — esto es importante para el diseño: esta pantalla no necesita ser el foco visual del módulo, es una red de respaldo.
- Botón "+ Registrar tanqueo" (abre modal).

### 7.2 Tabla de historial
Columnas: Fecha, Elemento (`Máquina #10` / `Vehículo #7`), Lugar (`BOMBA`/`ALMACEN`), Área de costo, Combustible, Cantidad (con unidad), Horómetro/Km, Full (`SÍ`/`NO`), Precio unit. (o `—`), Total (o `—`), Discrepancia (`SÍ`/`NO`), Origen.

### 7.3 Modal "Registrar tanqueo" (retro)
Campos, en este orden:
1. Tipo de elemento — select: Maquinaria / Vehículo / Motocicleta.
2. Etiqueta dinámica según el tipo elegido — Id numérico ("Máquina (ID)" o "Vehículo (ID)").
3. Lugar — select: Bomba / Almacén. **Este campo cambia qué otros campos son obligatorios** (ver punto 7 y 8 abajo).
4. Área de costo — select: Distrito / Asociación.
5. Combustible — select (catálogo completo, no filtrado — a diferencia de los reportes, aquí siempre deben aparecer los 4 tipos, para poder registrar un combustible nuevo la primera vez que se compre).
6. Cantidad — con etiqueta dinámica de unidad: `Cantidad (galones)` o `Cantidad (m³)` según el combustible elegido en el punto 5.
7. Horómetro/Km — numérico.
8. ¿Tanque lleno? — checkbox.
9. **Solo si Lugar = Bomba:**
   - Precio unitario.
   - Descuento (opcional).
   - "Total pagado (valor real)" con texto de ayuda pequeño: *"Lo que realmente pagaste, no un estimado"*.
   - Factura — input de archivo (imagen o PDF).
10. Origen — texto libre (ej. "Estación Norte").
- Botón "Registrar tanqueo".

---

## 8. Pestaña 6 — Suministro de Almacén

**Rol que puede verla:** todos ven el historial; solo `SUPERVISOR_OPERATIVO`/`ADMIN` pueden registrar.
**Estilo actual:** 100% retro.
**Propósito:** registrar las compras de combustible a proveedor que abastecen el almacén propio (a diferencia de Tanqueo, que es consumo).

### 8.1 Encabezado
- Texto de contexto: *"Registro de compras de combustible que abastecen el almacén."*
- Botón "+ Registrar compra" (solo visible para roles autorizados).

### 8.2 Tabla de historial
Columnas: Fecha, Área de costo, Combustible, Cantidad (con unidad), Precio unit., Descuento (o `—`), Total ingresado, Total calculado, Discrepancia (`SÍ`/`NO`).

### 8.3 Modal "Registrar compra" (retro)
Campos, en este orden:
1. Área de costo — select: Distrito / Asociación.
2. Combustible — select (catálogo completo, igual razón que en Tanqueo).
3. Cantidad — con etiqueta dinámica de unidad (galones / m³).
4. Precio unitario.
5. Descuento (opcional).
6. "Total pagado (valor real)" con texto de ayuda: *"Lo que realmente pagaste, no el calculado abajo"*.
7. Factura — input de archivo, **obligatorio** (a diferencia de Tanqueo, donde es opcional).
- **Debajo del formulario, antes del botón de enviar:** una línea de cálculo automático en vivo, que se recalcula mientras el usuario escribe: `Cálculo automático (cantidad × precio − descuento): $X — compáralo con el total pagado`. Es una ayuda visual para que el usuario detecte errores de digitación antes de enviar, no bloquea el envío.
- Botón "Registrar compra".

---

## 9. Componente compartido: tabla de datos (`DataGrid`)

Usado en Tanqueo, Suministro, Configuración (dentro de Rendimiento), y Rendimiento. Comportamiento actual (no exclusivo de Combustibles, es el mismo en todo el sistema):
- Buscador de texto libre arriba de la tabla ("Filtrar: Buscar en toda la tabla...").
- Encabezados de columna clicables para ordenar (indicador de orden).
- Paginación abajo: selector de tamaño de página (10/20/30/50/100/250), controles Primero/Anterior/Página X de Y/Siguiente/Último.
- Estilo visual: tabla con bordes finos, encabezado gris, hover en filas — estilo neutro, ni retro puro ni moderno puro (comparte los dos mundos).
- Soporta resaltar filas completas con una clase de "anomalía" (fondo ámbar + borde izquierdo) — es lo que usa Rendimiento para las alertas.

---

## 10. Resumen de oportunidades de mejora ya identificadas (no obligatorio, pero útil para la propuesta)

Estas son cosas que el equipo ya notó como mejorables, sin resolver todavía — si la propuesta de diseño las cubre, mejor, pero no es requisito:

1. Unidad de texto técnico crudo (`KM_POR_GALON`, `GAL_POR_HORA`, etc.) visible en la tabla de Configuración de Rendimiento — podría traducirse a lenguaje natural ("km por galón").
2. El campo "Id del tanqueo" en el formulario de Reintegro es un número ciego — no hay forma de buscar/seleccionar el tanqueo desde la UI, hay que ir a otra pestaña a copiar el id.
3. No hay una pantalla diseñada para "no tienes permiso para ver esto" cuando un rol sin acceso entra a una pestaña que el backend le va a rechazar.
4. Los estados vacíos son solo texto plano gris, sin ilustración ni llamada a la acción.
5. El resaltado de filas con alerta en Rendimiento es un estilo genérico heredado de otra parte del sistema, no pensado específicamente para este caso de uso.
6. La tendencia mensual (Dashboard) y el total despachado (Distribución) no distinguen bien cuando hay más de un tipo de unidad física mezclado en el mismo total — hoy no es un problema real porque solo manejan combustibles en galones, pero si empiezan a usar gas natural vehicular (m³) con frecuencia, esos totales combinados dejarían de tener sentido.

---

## 11. Qué se espera de la propuesta

- Puede unificar el estilo retro/moderno en uno solo, o mantener la separación formularios/reportes — cualquiera de las dos es válida, siempre que la barra de pestañas superior (retro, compartida con todo el sistema) siga funcionando visualmente debajo.
- No debe agregar, quitar ni renombrar ningún campo, columna, filtro o botón de los descritos arriba — todos los datos y acciones listados deben seguir existiendo, con los mismos nombres de negocio (los textos exactos entre comillas en este documento son los que existen hoy y pueden usarse tal cual o mejorarse en redacción, pero el *significado* no cambia).
- Debe respetar la regla de "el color nunca es la única señal" (§1.2) por accesibilidad.
- Puede proponer una librería de gráficos si lo considera necesario — hoy no se usa ninguna (las gráficas de barras y de línea están hechas a mano con `<svg>`/`<div>`), así que si el diseño la requiere, hay que evaluarlo aparte antes de implementar.
- Idealmente, la propuesta debería entregarse como mockups por pantalla (una imagen o Figma-like view por cada una de las 6 pestañas descritas), para poder mapear 1:1 cada pieza visual a su componente real (`FuelFinancialDashboard.svelte`, `FuelWarehouseControl.svelte`, `FuelPerformance.svelte`, `FuelDistribution.svelte`, `RefuelingManagement.svelte`, `FuelPurchaseManagement.svelte`) al momento de implementar.
