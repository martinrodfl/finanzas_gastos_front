# Frontend de Finanzas Gastos

Última actualización: 21 de abril de 2026

---

## 1. Visión General

SPA (Single Page Application) en React que permite:

- Ver los movimientos bancarios del mes en tabla.
- Clasificar movimientos por categoría.
- Ver la evolución anual de egresos e ingresos en gráfico de barras.
- Importar movimientos desde Excel.
- Cargar movimientos manualmente.
- Trackear el estado de pago de gastos fijos mensuales.
- Alternar entre tema claro y oscuro.

---

## 2. Stack Tecnológico

| Herramienta | Versión | Rol |
|---|---|---|
| React | 19 | UI |
| React Router DOM | 7 | Ruteo SPA |
| Vite | 8 | Build y dev server |
| pnpm | 10 | Package manager |
| ESLint | 9 | Linter |
| CSS Modules | — | Estilos por componente |

**Sin axios:** el cliente HTTP es nativo (`fetch`) encapsulado en `src/api/client.js`.  
**Sin TypeScript:** JSDoc para documentar tipos.

### Variables de entorno

```
VITE_API_BASE_URL=http://localhost:8000/api
```

Definir en `.env.local`. El cliente la lee como `import.meta.env.VITE_API_BASE_URL`.

### Comandos principales

```bash
pnpm dev       # Dev server (puerto 5173 por defecto)
pnpm build     # Build de producción
pnpm lint      # ESLint
pnpm preview   # Previsualizar build
```

---

## 3. Estructura de Directorios

```
src/
├── api/
│   └── client.js            # Cliente HTTP (fetch wrapper)
├── assets/                  # Imágenes estáticas
├── components/
│   ├── CargaManual.jsx       # Formulario de carga manual de movimientos
│   ├── GastosFijos.jsx       # Acordeón de gastos fijos del mes
│   ├── ImportadorExcel.jsx   # Importación de archivo Excel
│   ├── TablaMovimientos.jsx  # Tabla de movimientos con edición inline
│   ├── ThemeToggle.jsx       # Botón de cambio de tema
│   ├── VistaCategorias.jsx   # Movimientos agrupados por categoría
│   └── VistaMensual.jsx      # Gráfico de evolución anual
├── context/
│   ├── ThemeContext.jsx      # Provider del contexto de tema
│   └── theme-context.js     # Creación del contexto (separado para evitar circular)
├── hooks/
│   ├── useCategorias.js     # Carga y caché de categorías
│   ├── useTheme.js          # Consume ThemeContext
│   └── useViewport.js       # Ancho de ventana para responsive
├── pages/
│   ├── Dashboard.jsx        # Página principal
│   ├── Dashboard.module.css # Estilos del dashboard (compartido con sub-componentes)
│   ├── Login.jsx            # Página de login
│   └── Login.module.css
├── router/
│   └── PrivateRoute.jsx     # Guard de rutas privadas
├── styles/                  # Variables CSS globales / reset
├── utils/
│   ├── categoriaIconos.js   # Lista de emojis para el picker de íconos
│   ├── categorias.js        # Definición de categorías + funciones de clasificación
│   └── gastosFijos.js       # Definición de gastos fijos mensuales
├── App.jsx                  # Árbol de rutas raíz
└── main.jsx                 # Entry point, monta ThemeProvider
```

---

## 4. Ruteo

Definido en `App.jsx` con `BrowserRouter`:

| Ruta | Componente | Guard |
|---|---|---|
| `/login` | `Login` | — |
| `/dashboard` | `Dashboard` | `PrivateRoute` |
| `*` | Redirect a `/dashboard` | — |

`PrivateRoute` revisa `localStorage.getItem('token')`. Si no existe, redirige a `/login` (con `replace`).

El token se guarda en `localStorage` bajo la clave `token` al hacer login exitoso y se elimina al cerrar sesión.

---

## 5. Cliente HTTP (`src/api/client.js`)

Wrapper sobre `fetch` que:

- Construye la URL base desde `VITE_API_BASE_URL`.
- Filtra query params `null`/`undefined`/`''` en `buildUrl()`.
- Adjunta el header `Authorization: Bearer <token>` en cada petición.
- Si el body es `FormData`, no toca `Content-Type` (el browser lo pone con boundary).
- Si el body es objeto JS, lo serializa a JSON y pone `Content-Type: application/json`.
- En respuesta 401: elimina el token de localStorage y hace `window.location = '/login'`.
- En respuesta 204: devuelve `{ data: null }`.
- En respuestas de error: devuelve un `Error` con `.response.status` y `.response.data`.

**Uso:**

```js
import api from '../api/client';

const { data } = await api.get('/movimientos', { params: { mes: '2026-04' } });
await api.post('/movimientos', bodyObjeto);
await api.post('/movimientos/import', formData);   // FormData para archivo
await api.patch(`/movimientos/${id}/categoria`, { categoria_manual: 'Salud' });
await api.delete(`/movimientos/${id}`);
```

---

## 6. Páginas

### 6.1 `Login.jsx`

- Formulario simple: email + password.
- Llama `POST /login`. Guarda `data.token` en localStorage.
- Redirige a `/dashboard` tras login exitoso.

### 6.2 `Dashboard.jsx`

Página principal. Orquesta todo. Aproximadamente 280 líneas (reducido desde ~760 tras refactorización de abril 2026).

**Estado interno:**

| Variable | Tipo | Descripción |
|---|---|---|
| `movimientos` | `Array` | Movimientos del mes seleccionado |
| `meses` | `string[]` | Meses disponibles (formato `YYYY-MM`) |
| `mesSeleccionado` | `string` | Mes activo en el selector |
| `loading` | `boolean` | Carga inicial |
| `loadingMes` | `boolean` | Carga al cambiar de mes |
| `vista` | `'tabla'\|'categorias'\|'mensual'` | Vista activa |
| `abiertaCargas` | `boolean` | Estado del acordeón de importación/carga |

**Hooks usados:**
- `useCategorias()` → `{ categorias, guardar: guardarCategoria }`
- `useNavigate()` para el logout

**Funciones clave:**

| Función | Descripción |
|---|---|
| `normalizeMeses(payload)` | Normaliza respuesta del endpoint de meses (puede venir como array, `{ meses }` o `{ data }`) |
| `cargarMeses({ mesPreferido? })` | Carga lista de meses y movimientos del mes. Usado en montaje, post-import y post-carga manual |
| `salir()` | Elimina token y redirige a `/login` |
| `handleCategoriaChange(id, payload)` | Llama `PATCH /movimientos/{id}/categoria`, actualiza el movimiento en state |
| `handleGastoFijoChange(id, gastoFijo)` | Llama `PATCH /movimientos/{id}/gasto-fijo`, actualiza en state |
| `formatMes(mesStr)` | Convierte `YYYY-MM` a nombre legible (ej: `Abril 2026`) |

**Sub-componentes renderizados:**

```jsx
<ImportadorExcel onImportado={({ mesPreferido }) => cargarMeses({ mesPreferido })} />
<CargaManual categorias={categorias} onGuardado={(mes) => cargarMeses({ mesPreferido: mes })} />
<GastosFijos movimientos={movimientos} mesSeleccionado={mesSeleccionado} />

{vista === 'tabla'      && <TablaMovimientos ... />}
{vista === 'categorias' && <VistaCategorias ... />}
{vista === 'mensual'    && <VistaMensual />}
```

---

## 7. Componentes

### 7.1 `ImportadorExcel.jsx`

Maneja la subida de un archivo `.xlsx`/`.xls` al backend.

- Estado: `archivoExcel`, `importando`, `mensaje`, `error`, `resumen`.
- `handleImportarExcel()` → `POST /movimientos/import` con `FormData`.
- `resumen` muestra la cantidad de filas importadas.
- Tras importar exitoso, llama `onImportado({ mesPreferido })` para que Dashboard recargue meses.

**Props:**
```
onImportado: ({ mesPreferido: string }) => void
```

---

### 7.2 `CargaManual.jsx`

Formulario para ingresar un movimiento manualmente.

- Estado: `form` (fecha, tipo, descripcion, dependencia, documento, categoria, monto), `guardando`, `mensaje`, `error`.
- `handleSubmit()` → `POST /movimientos`.
- Tras guardar exitoso, llama `onGuardado(mesNuevo)` con el mes del movimiento creado.

**Props:**
```
categorias: Array<{ nombre, icono, color }>
onGuardado: (mes: string) => void
```

---

### 7.3 `GastosFijos.jsx`

Acordeón que muestra el estado de cada gasto fijo del mes.

- Usa `GASTOS_FIJOS` de `utils/gastosFijos.js`.
- Detecta pagos con dos prioridades:
  1. Campo `gasto_fijo` en el movimiento (asignado explícitamente por el usuario).
  2. Búsqueda de keywords en `descripcion` + `dependencia` del movimiento.
- "No aplica este mes": botón `×` por gasto. Estado persiste en `localStorage` con clave `gastos_fijos_disabled_{YYYY-MM}`.

**Props:**
```
movimientos: Array
mesSeleccionado: string   // formato YYYY-MM
```

---

### 7.4 `TablaMovimientos.jsx`

Tabla mensual de movimientos con edición inline.

- Cada fila: fecha, descripción, dependencia, documento, débito, crédito, selector de categoría, selector de gasto fijo.
- Edición inline de categoría: abre un select; si elige "Nueva…", abre un mini-formulario (nombre + emoji picker).
- `cambiarCategoria(id, nombre)` → `PATCH /movimientos/{id}/categoria`.
- `cambiarGastoFijo(id, valor)` → `PATCH /movimientos/{id}/gasto-fijo` (null para limpiar).
- `guardarNuevaCategoria(id)` → llama `guardarPersonalizada()` del hook, luego asigna al movimiento.

**Props:**
```
movimientos: Array
onCategoriaChange: (id, payload) => void
categorias: Array<{ nombre, icono, color }>
guardarCategoria: (nombre, icono) => Promise<void>
onGastoFijoChange: (id, gastoFijo: string | null) => void
```

---

### 7.5 `VistaCategorias.jsx`

Movimientos agrupados por categoría, vista tipo acordeón.

- Cada categoría muestra: ícono, nombre, total debitado, barra proporcional al gasto total global, lista de movimientos expandible.
- Resolución de categoría por prioridad: `categoria_manual` > `categoria_regla` > keyword match > "Otros".
- Misma lógica de edición inline que `TablaMovimientos` (editor de nueva categoría incluido).
- Usa `useViewport()` para ajustar columnas en mobile.

**Props:**
```
movimientos: Array
onCategoriaChange: (id, payload) => void
categorias: Array<{ nombre, icono, color }>
guardarCategoria: (nombre, icono) => Promise<void>
```

---

### 7.6 `VistaMensual.jsx`

Gráfico de barras de evolución anual.

- Llama `GET /movimientos/resumen` al montar.
- `normalizeResumen(payload)`: soporta respuesta directa como array, `{ resumen }` o `{ data }`.
- `construirEscala(maxValor, segmentos)`: calcula el paso del eje Y redondeando al "número bonito" más cercano (1, 2, 5, 10, 20, 50, 100…) para que las marcas queden legibles.
- Muestra 3 tarjetas de totales (egresos, ingresos, balance) + gráfico + tabla con proporciones %.

---

### 7.7 `ThemeToggle.jsx`

Botón que alterna entre tema claro y oscuro llamando `toggleTheme()` del contexto.

---

## 8. Hooks

### 8.1 `useCategorias.js`

```js
const { categorias, cargando, guardar, recargar } = useCategorias();
```

- Al montar, llama `GET /categorias-personalizadas`.
- Enriquece las categorías del backend con datos locales (color, palabras) usando `LOCAL_MAP`.
- **Caché a nivel de módulo** (`_cache` / `_inflight`): evita múltiples fetches simultáneos en React StrictMode (doble montaje en desarrollo).
- `guardar(nombre, icono)` → `POST /categorias-personalizadas`. Invalida `_cache = null` para forzar re-fetch.
- Fallback inmediato: el estado se inicializa con `CATEGORIAS + CATEGORIA_OTROS` locales para evitar flash vacío.

---

### 8.2 `useTheme.js`

```js
const { theme, toggleTheme } = useTheme();
```

Consume `ThemeContext`. Lanza error si se usa fuera de `ThemeProvider`.

---

### 8.3 `useViewport.js`

```js
const { width } = useViewport();
```

Retorna el ancho actual de `window.innerWidth` y se actualiza en cada `resize`. Usado en `VistaCategorias` para ocultar columnas en pantallas chicas.

---

## 9. Contexto de Tema (`context/ThemeContext.jsx`)

- Lee preferencia guardada en `localStorage` bajo la clave `finanzas-theme`.
- Si no hay preferencia guardada, usa `prefers-color-scheme` del sistema.
- Al cambiar tema, aplica `document.documentElement.dataset.theme = theme` y `colorScheme`.
- Las variables CSS del tema se definen en los archivos de estilos usando `[data-theme="dark"]`.

---

## 10. Utilidades

### `utils/categorias.js`

| Exportación | Descripción |
|---|---|
| `CATEGORIAS` | Array de categorías predefinidas: nombre, color (CSS var), icono emoji, palabras clave (mayúsculas) |
| `CATEGORIA_OTROS` | Categoría fallback "Otros" |
| `categorizar(descripcion, dependencia, cats)` | Devuelve el nombre de la primera categoría cuyas keywords coinciden |
| `crearCategoriaPersonalizada(nombre, icono)` | Crea objeto de categoría con color default |
| `combinarCategoriasConPersonalizadas(base, nombres)` | Merge de categorías base con las que aparecen en movimientos (incluye personalizadas del usuario) |

---

### `utils/gastosFijos.js`

`GASTOS_FIJOS`: array de gastos fijos a trackear. Cada entrada:
```js
{ nombre: string, keywords: string[] }
```
`nombre` es el identificador único guardado en el campo `gasto_fijo` de la BD.  
`keywords` son términos en minúsculas para detección automática (fallback).

---

### `utils/categoriaIconos.js`

`ICONOS_CATEGORIA`: array de emojis disponibles para el picker de íconos al crear una categoría.  
`ICONO_CATEGORIA_DEFAULT`: emoji por defecto (`📁`).

---

## 11. Estilos

- **CSS Modules** para cada componente (`.module.css` junto al `.jsx`).
- `Dashboard.module.css` es **compartido** por `GastosFijos.jsx`, `ImportadorExcel.jsx` y `CargaManual.jsx` (sub-componentes extraídos del Dashboard original).
- Variables de color del tema en `styles/` globales: `--color-category-*`, `--color-bg`, etc.
- El tema se activa con `[data-theme="dark"]` en el `<html>`.

---

## 12. Endpoints del Backend Consumidos

| Método | Ruta | Usado en |
|---|---|---|
| `POST` | `/login` | `Login.jsx` |
| `GET` | `/movimientos/meses` | `Dashboard.jsx` |
| `GET` | `/movimientos?mes=YYYY-MM` | `Dashboard.jsx` |
| `GET` | `/movimientos/resumen` | `VistaMensual.jsx` |
| `POST` | `/movimientos/import` | `ImportadorExcel.jsx` |
| `POST` | `/movimientos` | `CargaManual.jsx` |
| `PATCH` | `/movimientos/{id}/categoria` | `TablaMovimientos`, `VistaCategorias` |
| `PATCH` | `/movimientos/{id}/gasto-fijo` | `TablaMovimientos`, `GastosFijos` |
| `GET` | `/categorias-personalizadas` | `useCategorias.js` |
| `POST` | `/categorias-personalizadas` | `useCategorias.js` |

---

## 13. Decisiones de Diseño Relevantes

- **Sin axios**: se optó por `fetch` nativo para no agregar dependencia. El wrapper `api/client.js` cubre todos los casos necesarios.
- **Caché de módulo en useCategorias**: los módulos ES son singletons. `_cache` y `_inflight` son variables de módulo que sobreviven re-renders y el doble montaje de StrictMode en desarrollo.
- **Dashboard.module.css compartido**: los sub-componentes `ImportadorExcel`, `CargaManual` y `GastosFijos` fueron extraídos del Dashboard y mantienen referencia a sus estilos originales para evitar duplicar CSS.
- **Prioridad de categoría (3 niveles)**: `categoria_manual` (usuario) > `categoria_regla` (regla automática del backend) > keyword match local > "Otros". Esta lógica está replicada tanto en `TablaMovimientos` como en `VistaCategorias`.
- **Detección de gastos fijos (2 niveles)**: campo `gasto_fijo` en BD (explícito) > keywords en texto (automático). El campo explícito permite corregir falsos positivos de la detección automática.
