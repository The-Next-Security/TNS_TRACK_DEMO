#!/bin/bash

CMD="npm run start-all"

verificar_servicio() {
    pgrep -f "$CMD" > /dev/null 2>&1
    return $?
}

detener_servicio() {
    echo "Deteniendo servicio..."
    pkill -f "$CMD"
    echo "Servicio detenido."
}

if verificar_servicio; then
    detener_servicio
else
    echo "El servicio no está corriendo."
fi
