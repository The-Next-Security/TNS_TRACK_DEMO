# Estándares de Nomenclatura — TNS Track

> Referencia oficial de convenciones de nomenclatura para todo el proyecto.

---

## Regla general

```
dominioEnCamelCase_Sufijo.ext
```

- **Dominio**: en español, describe QUÉ maneja el archivo
- **Sufijo**: en inglés, describe el ROL técnico del archivo
- Separados por guión bajo `_`

Ejemplos:
```
usuarios_Controller.js
temperaturaDashboard_Service.js
consumoCategoria_Routes.js
auth_Middleware.js
```

---

## Catálogo de sufijos — Backend (Node.js)

| Sufijo | Rol | Carpeta |
|--------|-----|---------|
| `_Controller` | Recibe la request HTTP y devuelve la response | `controllers/` |
| `_Service` | Lógica de negocio, acceso a base de datos | `services/` |
| `_Routes` | Define los endpoints Express | `routes/` |
| `_Middleware` | Intercepta requests antes del controller | `middlewares/` |
| `_Handler` | Gestión y procesamiento de errores | `errorHandling/` |
| `_Adapter` | Conecta con una API o servicio externo | `services/api/`, `services/<proveedor>/` |
| `_Job` | Tarea programada (cron) | `jobs/` |
| `_Utils` | Funciones utilitarias reutilizables | `utils/` |
| `_Config` | Configuración de la aplicación | `config/` |
| `_Constants` | Constantes globales | `constants/` |
| `_Hook` | Hook personalizado de React | `hooks/` |

---

## Componentes React (Frontend)

### Componentes de negocio
`PascalCase_View.jsx` — PascalCase para el dominio, sufijo `_View`.

```
TemperaturaDashboard_View.jsx
AlertManagement_View.jsx
ReportGenerator_View.jsx
```

### Hooks personalizados
`use` + camelCase + sufijo `_Hook`.

```
useSessionTimer_Hook.js
useAlertFilters_Hook.js
useCrossTabLogout_Hook.js
```

### Componentes UI primitivos (`components/ui/`)
`kebab-case.jsx` — convención shadcn/ui. Son componentes de librería externa, no se modifican.

```
button.jsx
alert-dialog.jsx
dropdown-menu.jsx
```

Los componentes UI **propios** dentro de esta carpeta siguen `PascalCase_View.jsx`.

---

## SQL y Base de Datos

Ver [Estandares_Nomenclatura_SQL.md](./Estandares_Nomenclatura_SQL.md)
