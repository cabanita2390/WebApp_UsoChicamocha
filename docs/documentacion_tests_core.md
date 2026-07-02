# Documentación de Tests Core

Este documento describe qué se prueba en los archivos de tests unitarios para los módulos core del sistema.

## __tests__/auth.test.js

**Alcance**: Pruebas completas del sistema de autenticación JWT.

**Funciones probadas**:

### login()
- **Login exitoso**: Credenciales válidas, rol permitido (ADMIN/MECANIC), persistencia en localStorage
- **Login fallido**: Credenciales incorrectas, manejo de errores 401
- **Rol no permitido**: Usuario con rol USER rechazado
- **Error de red**: Manejo de excepciones de conexión

### logout()
- **Limpieza de sesión**: Eliminación de tokens y datos de usuario de localStorage
- **Reset del store**: Estado de autenticación establecido en false

### checkAuth()
- **Token válido**: Decodificación exitosa, actualización del store
- **Token expirado**: Renovación automática usando refresh token
- **Sin token**: Retorno false, sin cambios en store
- **Token inválido**: Manejo de errores de decodificación, limpieza de sesión

### refreshToken()
- **Renovación exitosa**: Llamada a API, actualización de tokens
- **Sin refresh token**: Retorno false
- **Error del servidor**: Manejo de respuestas 4xx/5xx, limpieza de sesión

**Métricas de cobertura**:
- Estados de autenticación
- Persistencia localStorage
- Validación de roles
- Manejo de errores de red
- Renovación automática de tokens

## __tests__/data.test.js

**Alcance**: Pruebas de gestión de datos y comunicación con API.

**Funciones probadas**:

### fetchDashboardData()
- **Obtención exitosa**: Paginación, transformación de respuesta
- **Manejo de errores**: Propagación de excepciones de red

### fetchUsers()
- **Carga de usuarios**: Llamada correcta a endpoint, retorno de datos

### createUser()
- **Creación exitosa**: POST con datos, actualización del store

### fetchInspectionImages()
- **Transformación de URLs**: Conversión de rutas relativas a absolutas
- **Sin imágenes**: Retorno de arreglo vacío para respuestas null

**Métricas de cobertura**:
- Comunicación HTTP
- Transformación de datos
- Estados de error
- Paginación y filtros

## __tests__/ui.test.js

**Alcance**: Pruebas del estado de interfaz de usuario y sistema de notificaciones.

**Funciones probadas**:

### Store UI Básico
- **Inicialización**: Valores por defecto (vista dashboard, modal cerrado)
- **Cambio de vista**: Actualización de estado y persistencia en localStorage
- **Modal de órdenes**: Apertura y cierre con datos de fila/columna
- **Estado de guardado**: Control de indicadores de carga

### Sistema de Notificaciones
- **Agregar notificación**: Incremento de contador, almacenamiento en lista
- **Duplicados**: Prevención de notificaciones repetidas
- **Remover notificación**: Decremento de contador, eliminación de lista
- **Limpiar todas**: Reset completo del sistema

**Métricas de cobertura**:
- Estados de navegación
- Control de modales
- Persistencia de preferencias
- Gestión de notificaciones

## __tests__/api.test.js

**Alcance**: Pruebas del cliente HTTP con autenticación.

**Funciones probadas**:

### fetchWithAuth()
- **Petición autenticada**: Headers correctos (Authorization, Content-Type)
- **Construcción de URL**: Base URL + versión API + endpoint
- **Manejo de respuestas**: JSON válido, 204 No Content, errores
- **Errores específicos**: 403 Forbidden, JSON inválido, sin token
- **Versiones de API**: v1 por defecto, versiones personalizadas
- **Headers personalizados**: Fusión con headers por defecto

**Escenarios de error**:
- **403 Forbidden**: Mensaje específico "No tiene permisos..."
- **JSON inválido**: Mensaje claro sobre respuesta no parseable
- **Sin token**: Error de sesión inválida
- **Errores genéricos**: Propagación de mensajes del servidor

**Métricas de cobertura**:
- Autenticación automática
- Manejo de versiones API
- Headers y configuración HTTP
- Todos los códigos de estado HTTP comunes
- Parsing de respuestas JSON

## Cobertura General

### Estados y Escenarios
- **Camino feliz**: Funcionamiento normal con datos válidos
- **Casos límite**: Datos vacíos, null, undefined
- **Errores**: Red, servidor, autenticación, validación
- **Persistencia**: localStorage, sessionStorage

### Mocks Utilizados
- **fetch**: Simulación de respuestas HTTP
- **localStorage/sessionStorage**: Control de persistencia
- **jwt-decode**: Simulación de tokens JWT
- **import.meta.env**: Variables de entorno

### Patrones de Testing
- **Arrange-Act-Assert**: Estructura clara en cada test
- **Mocks independientes**: Reset entre tests
- **Aserciones específicas**: Verificación de llamadas y estados
- **Casos edge**: Manejo de datos inesperados