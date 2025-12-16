#!/bin/bash

################################################################################
# Script: generate_door_status_data.sh
# Descripción: Genera datos dummy para la tabla door_status con temperatura
#              y estado de puertas realistas desde 2025-12-01 hasta 2026-12-31
# Autor: Auto-generado
# Fecha: 2025-12-15
################################################################################

set -e  # Salir si hay algún error

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

DB_HOST="192.168.1.150"
DB_PORT="3306"
DB_NAME="teltonika"
DB_USER="root"
DB_PASS="Clev2.Thenext"

# Sectores a generar
declare -a SECTORS=("E/S Bodega" "Zona L3")

# Rango de fechas
START_DATE="2025-12-01"
END_DATE="2026-12-31"

# Intervalo entre registros (minutos)
INTERVAL_MINUTES=2

# Configuración de temperatura
TEMP_MIN=17
TEMP_MAX=32
TEMP_CLOSED_TARGET_MIN=18
TEMP_CLOSED_TARGET_MAX=21
TEMP_OPEN_TARGET_MIN=25
TEMP_OPEN_TARGET_MAX=32

# Configuración de eventos de apertura
MIN_DOOR_EVENTS_PER_DAY=10
MAX_DOOR_EVENTS_PER_DAY=15
MIN_DOOR_OPEN_MINUTES=10
MAX_DOOR_OPEN_MINUTES=30

# Tamaño de lote para inserciones
BATCH_SIZE=1000

# ============================================================================
# COLORES PARA OUTPUT
# ============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar conexión a la base de datos
check_database_connection() {
    log_info "Verificando conexión a MySQL en ${DB_HOST}:${DB_PORT}..."
    
    if mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" -e "USE ${DB_NAME};" 2>/dev/null; then
        log_success "Conexión a base de datos exitosa"
        return 0
    else
        log_error "No se pudo conectar a la base de datos"
        log_error "Host: ${DB_HOST}:${DB_PORT}, Database: ${DB_NAME}, User: ${DB_USER}"
        return 1
    fi
}

# Generar temperatura basada en estado de puerta y temperatura anterior
calculate_temperature() {
    local current_temp=$1
    local magnet_status=$2  # 0=abierta, 1=cerrada
    local target_min=$3
    local target_max=$4
    
    # Convertir a entero para comparación (usando awk para evitar problemas de locale)
    local temp_int=$(echo "$current_temp" | awk '{print int($1 + 0.5)}')
    local target_mid=$(( (target_min + target_max) / 2 ))
    
    local new_temp=$current_temp
    
    if [ "$magnet_status" -eq 1 ]; then
        # Puerta cerrada: temperatura disminuye
        if [ "$temp_int" -gt "$target_max" ]; then
            # Muy caliente, enfriar más rápido
            new_temp=$(echo "$current_temp - $(echo "scale=2; $RANDOM / 32767 * 0.3 + 0.2" | bc)" | bc)
        elif [ "$temp_int" -gt "$target_mid" ]; then
            # Ligeramente caliente, enfriar lentamente
            new_temp=$(echo "$current_temp - $(echo "scale=2; $RANDOM / 32767 * 0.2 + 0.1" | bc)" | bc)
        else
            # Cerca del objetivo, mantener o pequeña variación
            new_temp=$(echo "$current_temp + $(echo "scale=2; ($RANDOM / 32767 - 0.5) * 0.1" | bc)" | bc)
        fi
    else
        # Puerta abierta: temperatura aumenta
        if [ "$temp_int" -lt "$target_min" ]; then
            # Muy frío, calentar más rápido
            new_temp=$(echo "$current_temp + $(echo "scale=2; $RANDOM / 32767 * 0.4 + 0.3" | bc)" | bc)
        elif [ "$temp_int" -lt "$target_mid" ]; then
            # Ligeramente frío, calentar lentamente
            new_temp=$(echo "$current_temp + $(echo "scale=2; $RANDOM / 32767 * 0.3 + 0.2" | bc)" | bc)
        else
            # Cerca del objetivo, mantener o pequeña variación
            new_temp=$(echo "$current_temp + $(echo "scale=2; ($RANDOM / 32767 - 0.3) * 0.2" | bc)" | bc)
        fi
    fi
    
    # Asegurar que está dentro del rango permitido
    new_temp=$(echo "if ($new_temp < $TEMP_MIN) $TEMP_MIN else if ($new_temp > $TEMP_MAX) $TEMP_MAX else $new_temp" | bc)
    
    echo "$new_temp"
}

# Generar eventos de apertura/cierre para un día
generate_door_events() {
    local day_start_ts=$1
    local events_count=$((RANDOM % (MAX_DOOR_EVENTS_PER_DAY - MIN_DOOR_EVENTS_PER_DAY + 1) + MIN_DOOR_EVENTS_PER_DAY))
    
    # Generar eventos durante horario laboral (7:00 - 20:00 = 780 minutos)
    local work_hours_start=420  # 7:00 AM en minutos
    local work_hours_end=1200   # 8:00 PM en minutos
    local work_hours_range=$((work_hours_end - work_hours_start))
    
    declare -A door_events
    
    for ((i=0; i<events_count; i++)); do
        # Momento de apertura (en minutos desde medianoche)
        local open_minute=$((work_hours_start + RANDOM % work_hours_range))
        
        # Duración de apertura
        local duration=$((RANDOM % (MAX_DOOR_OPEN_MINUTES - MIN_DOOR_OPEN_MINUTES + 1) + MIN_DOOR_OPEN_MINUTES))
        
        # Marcar todos los minutos como abiertos
        for ((m=open_minute; m<open_minute+duration && m<=1439; m++)); do
            door_events[$m]=0  # 0 = abierta
        done
    done
    
    # Convertir a string para retornar (formato: "minuto1:estado1,minuto2:estado2,...")
    local result=""
    for minute in "${!door_events[@]}"; do
        result="${result}${minute}:${door_events[$minute]},"
    done
    echo "${result%,}"  # Remover última coma
}

# Insertar registros en la base de datos
insert_batch() {
    local batch_data=$1
    
    if [ -z "$batch_data" ]; then
        return 0
    fi
    
    local sql="INSERT INTO door_status (sector, magnet_status, temperature, timestamp) VALUES ${batch_data};"
    
    if mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" -e "${sql}" 2>/dev/null; then
        return 0
    else
        log_error "Error insertando lote de datos"
        return 1
    fi
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    log_info "======================================================================"
    log_info "  GENERADOR DE DATOS DUMMY - door_status"
    log_info "======================================================================"
    log_info ""
    log_info "Configuración:"
    log_info "  - Período: ${START_DATE} hasta ${END_DATE}"
    log_info "  - Sectores: ${SECTORS[*]}"
    log_info "  - Intervalo: cada ${INTERVAL_MINUTES} minutos"
    log_info "  - Temperatura: ${TEMP_MIN}°C - ${TEMP_MAX}°C"
    log_info "  - Eventos de apertura por día: ${MIN_DOOR_EVENTS_PER_DAY}-${MAX_DOOR_EVENTS_PER_DAY}"
    log_info ""
    
    # Verificar conexión
    if ! check_database_connection; then
        exit 1
    fi
    
    log_info ""
    log_info "Iniciando generación de datos..."
    log_info ""
    
    local total_records=0
    local batch_data=""
    local batch_count=0
    
    # Convertir fechas a timestamp
    local current_date=$(date -d "$START_DATE" +%s)
    local end_date=$(date -d "$END_DATE" +%s)
    
    # Iterar por cada día
    while [ "$current_date" -le "$end_date" ]; do
        local current_date_str=$(date -d "@$current_date" +"%Y-%m-%d")
        
        log_info "Procesando fecha: ${current_date_str}"
        
        # Procesar cada sector
        for sector in "${SECTORS[@]}"; do
            # Generar eventos de apertura para este día
            local door_events=$(generate_door_events "$current_date")
            declare -A events_map
            
            # Parsear eventos en un array asociativo
            IFS=',' read -ra EVENTS <<< "$door_events"
            for event in "${EVENTS[@]}"; do
                IFS=':' read -r minute status <<< "$event"
                events_map[$minute]=$status
            done
            
            # Temperatura inicial para este sector/día
            local current_temp=$(echo "scale=2; $TEMP_CLOSED_TARGET_MIN + $RANDOM / 32767 * ($TEMP_CLOSED_TARGET_MAX - $TEMP_CLOSED_TARGET_MIN)" | bc)
            
            # Generar registros cada INTERVAL_MINUTES minutos
            for ((minute=0; minute<1440; minute+=INTERVAL_MINUTES)); do
                # Determinar estado de la puerta
                local magnet_status=1  # Por defecto cerrada
                if [ -n "${events_map[$minute]}" ]; then
                    magnet_status=0  # Abierta
                fi
                
                # Calcular temperatura
                if [ "$magnet_status" -eq 1 ]; then
                    current_temp=$(calculate_temperature "$current_temp" 1 "$TEMP_CLOSED_TARGET_MIN" "$TEMP_CLOSED_TARGET_MAX")
                else
                    current_temp=$(calculate_temperature "$current_temp" 0 "$TEMP_OPEN_TARGET_MIN" "$TEMP_OPEN_TARGET_MAX")
                fi
                
                # Calcular timestamp
                local hour=$((minute / 60))
                local min=$((minute % 60))
                local timestamp="${current_date_str} $(printf "%02d:%02d:00" $hour $min)"
                
                # Agregar a batch
                if [ -n "$batch_data" ]; then
                    batch_data="${batch_data},"
                fi
                batch_data="${batch_data}('${sector}', ${magnet_status}, ${current_temp}, '${timestamp}')"
                batch_count=$((batch_count + 1))
                total_records=$((total_records + 1))
                
                # Insertar cuando el batch está lleno
                if [ "$batch_count" -ge "$BATCH_SIZE" ]; then
                    if ! insert_batch "$batch_data"; then
                        log_error "Falló la inserción, abortando..."
                        exit 1
                    fi
                    batch_data=""
                    batch_count=0
                    
                    # Log cada 10,000 registros
                    if [ $((total_records % 10000)) -eq 0 ]; then
                        log_success "  → ${total_records} registros insertados..."
                    fi
                fi
            done
            
            # Limpiar array asociativo
            unset events_map
        done
        
        # Siguiente día
        current_date=$((current_date + 86400))
    done
    
    # Insertar registros restantes
    if [ -n "$batch_data" ]; then
        if ! insert_batch "$batch_data"; then
            log_error "Falló la inserción del último lote"
            exit 1
        fi
    fi
    
    log_info ""
    log_success "======================================================================"
    log_success "  GENERACIÓN COMPLETADA"
    log_success "======================================================================"
    log_success "Total de registros generados: ${total_records}"
    log_success ""
    log_info "Verificar datos con:"
    log_info "  mysql -h${DB_HOST} -u${DB_USER} -p${DB_PASS} ${DB_NAME} -e \\"
    log_info "    \"SELECT sector, COUNT(*) as total, MIN(timestamp), MAX(timestamp) \\"
    log_info "     FROM door_status WHERE timestamp >= '${START_DATE}' GROUP BY sector;\""
    log_info ""
}

# ============================================================================
# EJECUCIÓN
# ============================================================================

main

exit 0

