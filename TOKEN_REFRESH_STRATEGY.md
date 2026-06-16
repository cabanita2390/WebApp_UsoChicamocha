# Estrategia de Refresh Automático de Tokens

## 🎯 Objetivo
Refrescar el `accessToken` **proactivamente** antes de que expire, sin interrupciones para el usuario.

---

## 📊 Flujo de Funcionamiento

```
┌──────────────────────────────────────────────────────────────────────┐
│ USUARIO INICIA SESIÓN                                                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Login exitoso          │
                    │ accessToken: JWT       │
                    │ refreshToken: JWT      │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────────────────┐
                    │ 🔄 INICIA MONITOR                  │
                    │ - Chequea cada 60 segundos         │
                    │ - Si faltan 5min para expirar:     │
                    │   → Refrescar automáticamente      │
                    └───────────┬────────────────────────┘
                                │
                    ┌───────────▼────────────────────────┐
                    │ USUARIO TRABAJA SIN INTERRUPCIONES │
                    │ - El token se refrescha en bg      │
                    │ - Nunca ve errores de 401          │
                    │ - Las peticiones siempre funcionan │
                    └────────────────────────────────────┘
```

---

## ⏱️ Línea de Tiempo

Asumiendo:
- `accessToken` expira en: **15 minutos**
- Monitor chequea cada: **1 minuto**
- Umbral de refresh: **5 minutos antes de expirar**

```
Tiempo     │ Evento
═══════════╪════════════════════════════════════════════════════════
00:00      │ ✅ Usuario inicia sesión
00:00      │ 🔄 Monitor de refresh inicia
00:01      │ ⏰ Monitor: Token vence en 14:00min → no refrescar
00:02      │ ⏰ Monitor: Token vence en 13:00min → no refrescar
...        │
10:00      │ ⏰ Monitor: Token vence en 5:00min → no refrescar (=5 es threshold)
10:01      │ ⏰ Monitor: Token vence en 3:59min → ¡REFRESCAR AHORA!
10:01      │ 🔄 Solicita nuevo token al servidor
10:01      │ ✅ Nuevo accessToken recibido (15min adicionales)
10:01      │ 💾 Actualizado en localStorage
10:02      │ ⏰ Monitor: Token vence en 14:59min → no refrescar
...        │
20:01      │ 🔄 Vuelve a refrescar automáticamente
```

---

## 🔧 Configuración

En `auth.js`:

```javascript
const TOKEN_REFRESH_CHECK_INTERVAL = 60000;     // Chequear cada 1 minuto
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;  // Refrescar con 5min de anticipación
```

**Personalización:**
- ❌ NO cambiar a intervalos muy cortos (<30s) → Desperdicia recursos
- ❌ NO cambiar el umbral muy bajo (<2 min) → Riesgo de que expire en tránsito
- ✅ 1 minuto de intervalo + 5 minutos de umbral es óptimo

---

## 🛡️ Capas de Protección

### Capa 1: Monitor Proactivo (PRINCIPAL)
```javascript
// auth.js - startTokenRefreshMonitor()
Cada 60s: Si token vence en < 5min → refreshToken()
```
✅ **Ventaja:** Nunca hay 401, nunca hay interrupciones
✅ **Invisible:** Usuario no se entera

### Capa 2: Fallback en API (RESPALDO)
```javascript
// api.js - Si llega un 401 (edge case)
Intenta refrescar + reintentar request
```
✅ **Ventaja:** Failsafe por si el monitor falló
✅ **Raro:** Solo se ejecuta en edge cases

### Capa 3: Logout Automático (ÚLTIMO RECURSO)
```javascript
// Si refresh falla → Limpia sesión
// Usuario debe hacer login de nuevo
```
✅ **Seguridad:** No deja al usuario en estado inválido

---

## 📋 Ciclo de Vida

```
┌─────────────────────────────────────────┐
│ 1. LOGIN                                 │
│    auth.login(user, pass)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 2. INICIO DE MONITOR                    │
│    startTokenRefreshMonitor()            │
│    (en background)                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 3. USUARIO INTERACTÚA                   │
│    API calls, cambios de ruta, etc      │
│    El monitor refrescha silenciosamente │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 4. LOGOUT                               │
│    auth.logout()                        │
│    stopTokenRefreshMonitor()            │
└─────────────────────────────────────────┘
```

---

## 🔍 Debugging

### Ver en Console:
```javascript
// Monitor activo:
⏰ Token vence en 3:45s, refrescando proactivamente...
✅ Token refrescado proactivamente. Próxima renovación en ~5min

// Si falla (raro):
⚠️ Token expirado (401) - El monitor no refrescó a tiempo, intentando refrescar ahora...
✅ Token refrescado en fallback, reintentando request...
```

### Ver en Network Tab (DevTools):
1. Espera ~10 minutos tras login
2. Abre DevTools → Network
3. Verás un `POST /api/v1/auth/token/refresh` cada 5 minutos aproximadamente
4. Status: `200 OK` (nunca debería ver 401)

---

## ✅ Checklist de Verificación

- [ ] Usuario puede trabajar 30+ minutos sin logout forzado
- [ ] No hay errores de 401 en la consola
- [ ] Console muestra "Token refrescado proactivamente"
- [ ] No hay interrupciones visuales
- [ ] Cambios de ruta/datos fluyen sin problemas
- [ ] El logout detiene el monitor correctamente

---

## 🎓 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Cuándo se refrescar** | Cuando una petición falla (401) | Cada 60s, si faltan 5min |
| **Interrupciones** | SÍ (error, reintento) | NO (silencioso) |
| **Experiencia del usuario** | "Invalid or expired token" | Transparente |
| **Confiabilidad** | Media (puede haber 401) | Alta (casi nunca 401) |
| **Overhead** | Alto por reintentos | Bajo (simple chequeo) |

---

## 📌 Notas Importantes

1. **El refresh es silencioso** → No hay toasts ni notificaciones innecesarias
2. **El monitor se inicia automáticamente** → No requiere inicialización manual
3. **Se detiene en logout** → Evita memory leaks
4. **Compatible con múltiples pestañas** → Cada pestaña tiene su monitor (OK, no crea conflictos)
5. **Si el servidor rechaza el refresh** → Se limpia la sesión y se redirige a login

---

## 🚀 Próximas Mejoras

- [ ] Sincronización entre pestañas (evitar múltiples refreshes simultáneos)
- [ ] Persistencia del monitor en localStorage (en caso de refresh de página)
- [ ] Notificación silenciosa al usuario si session expira en 1 minuto
- [ ] Estadísticas: Cuántas veces se refrescó por sesión
