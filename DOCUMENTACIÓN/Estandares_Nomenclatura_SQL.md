# Estándares de Nomenclatura — SQL

> Referencia oficial de convenciones de nomenclatura para archivos SQL y base de datos.

---

## Archivos SQL

### Carpetas
`NN_NombreCategoria/` — número de dos dígitos + guión bajo + PascalCase.

```
01_creacion_desde_cero/
02_Funciones/
03_Triggers/
04_Stored_Procedures/
05_Eventos/
```

### Archivos
`NN_NN_prefijo_nombre.sql` — número de categoría + número de archivo + prefijo de tipo + nombre en snake_case.

| Prefijo | Tipo de objeto SQL |
|---------|--------------------|
| `fun_` | Función |
| `trig_` | Trigger |
| `stpr_` | Stored Procedure |
| `evt_` | Evento |

```
02_01_fun_calcular_temp_interpolada.sql
03_01_trig_update_response_time.sql
04_01_stpr_calcular_metricas_temperatura.sql
```

---

## Base de Datos (`tns_cool_track`)

### Tablas
`prefijo_nombre_en_snake_case` — prefijo de módulo obligatorio.

| Prefijo | Módulo |
|---------|--------|
| `gen_` | General — usuarios, permisos, feriados, ubicaciones |
| `sem_` | Semáforos — configuración de dispositivos y parámetros |
| `ubi_` | Ubicaciones — canales, presets de temperatura |
| `rep_` | Reportes — tipos, plantillas, historial |
| `tel_` | Teltonika — datos GPS y dispositivos |

### Columnas
`snake_case` — siempre en minúsculas con guiones bajos.

### Primary Keys
`id_{nombre_tabla}` — sin prefijo de módulo.

Ejemplos: `id_usuario`, `id_totales_mes`, `id_canal`.
