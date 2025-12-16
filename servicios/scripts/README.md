# Script Generador de Datos Dummy - door_status

## Descripción

Script Bash que genera datos simulados realistas de temperatura y estado de puertas para la tabla `door_status` en MySQL.

## Características

- **Período**: Genera datos desde 2025-12-01 hasta 2026-12-31
- **Sectores**: 'E/S Bodega' y 'Zona L3'
- **Frecuencia**: Un registro cada 2 minutos (720 registros/día por sector)
- **Total de registros**: ~526,320 registros (730 días × 720 registros × 2 sectores)

### Simulación Realista

#### Temperatura
- Rango: 17-32°C
- Puerta cerrada: temperatura disminuye gradualmente hacia 18-21°C
- Puerta abierta: temperatura aumenta gradualmente hacia 25-32°C
- Cambios graduales y realistas (sin saltos bruscos)

#### Estado de Puerta
- `magnet_status = 0`: Puerta abierta
- `magnet_status = 1`: Puerta cerrada
- Mínimo 10-15 eventos de apertura/cierre por día
- Aperturas durante horario laboral (7:00 AM - 8:00 PM)
- Duración de apertura: 10-30 minutos

## Requisitos

- Servidor Linux con Bash
- Cliente MySQL instalado (`mysql-client`)
- Acceso a la base de datos MySQL en `192.168.1.150:3306`
- Credenciales configuradas en el script

## Instalación y Uso

### 1. Copiar el script al servidor

```bash
scp generate_door_status_data.sh user@linux-server:/tmp/
```

### 2. Conectarse al servidor

```bash
ssh user@linux-server
```

### 3. Dar permisos de ejecución

```bash
chmod +x /tmp/generate_door_status_data.sh
```

### 4. Ejecutar el script

```bash
/tmp/generate_door_status_data.sh
```

**Nota**: El script tardará aproximadamente 5-10 minutos en completarse.

### 5. Verificar los datos generados

```bash
mysql -h192.168.1.150 -uroot -pClev2.Thenext teltonika -e "
  SELECT 
    sector, 
    COUNT(*) as total_registros,
    MIN(timestamp) as fecha_inicio,
    MAX(timestamp) as fecha_fin,
    AVG(temperature) as temp_promedio,
    MIN(temperature) as temp_min,
    MAX(temperature) as temp_max
  FROM door_status 
  WHERE timestamp >= '2025-12-01'
  GROUP BY sector;
"
```

### Resultado esperado

```
+-------------+-----------------+---------------------+---------------------+---------------+----------+----------+
| sector      | total_registros | fecha_inicio        | fecha_fin           | temp_promedio | temp_min | temp_max |
+-------------+-----------------+---------------------+---------------------+---------------+----------+----------+
| E/S Bodega  | 263160          | 2025-12-01 00:00:00 | 2026-12-31 23:58:00 | 22.45         | 17.00    | 32.00    |
| Zona L3     | 263160          | 2025-12-01 00:00:00 | 2026-12-31 23:58:00 | 22.51         | 17.00    | 32.00    |
+-------------+-----------------+---------------------+---------------------+---------------+----------+----------+
```

## Configuración

Las siguientes variables pueden modificarse en el script según necesidades:

```bash
# Base de datos
DB_HOST="192.168.1.150"
DB_PORT="3306"
DB_NAME="teltonika"
DB_USER="root"
DB_PASS="Clev2.Thenext"

# Sectores
SECTORS=("E/S Bodega" "Zona L3")

# Fechas
START_DATE="2025-12-01"
END_DATE="2026-12-31"

# Intervalo entre registros (minutos)
INTERVAL_MINUTES=2

# Temperatura
TEMP_MIN=17
TEMP_MAX=32
TEMP_CLOSED_TARGET_MIN=18
TEMP_CLOSED_TARGET_MAX=21
TEMP_OPEN_TARGET_MIN=25
TEMP_OPEN_TARGET_MAX=32

# Eventos de apertura
MIN_DOOR_EVENTS_PER_DAY=10
MAX_DOOR_EVENTS_PER_DAY=15
MIN_DOOR_OPEN_MINUTES=10
MAX_DOOR_OPEN_MINUTES=30
```

## Optimización

- **Inserciones por lotes**: El script inserta registros en lotes de 1000 para mejor rendimiento
- **Logging de progreso**: Muestra progreso cada 10,000 registros insertados
- **Manejo de errores**: Se detiene automáticamente si hay algún error de conexión o inserción

## Troubleshooting

### Error de conexión a MySQL

```
[ERROR] No se pudo conectar a la base de datos
```

**Solución**: Verificar:
- Que el servidor MySQL esté accesible en `192.168.1.150:3306`
- Las credenciales sean correctas
- El firewall permita conexiones desde el servidor Linux

### Script muy lento

**Solución**: 
- Aumentar `BATCH_SIZE` (por ejemplo, a 5000)
- Verificar velocidad de red entre servidor Linux y MySQL
- Considerar ejecutar el script directamente en el servidor de base de datos

### Datos ya existen

Si los datos ya fueron generados y se quiere regenerar:

```bash
# Eliminar datos existentes
mysql -h192.168.1.150 -uroot -pClev2.Thenext teltonika -e "
  DELETE FROM door_status 
  WHERE timestamp >= '2025-12-01' 
  AND sector IN ('E/S Bodega', 'Zona L3');
"

# Ejecutar nuevamente el script
/tmp/generate_door_status_data.sh
```

## Frontend - Limitación de Fechas

El componente `DoorStatusMatrixV2` ha sido modificado para prevenir la selección de fechas futuras:

```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  dateFormat="yyyy-MM-dd"
  maxDate={new Date()}  // ← No permite fechas posteriores a hoy
  // ...
/>
```

Esto asegura que los usuarios solo puedan seleccionar fechas donde hay datos disponibles.

## Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.

