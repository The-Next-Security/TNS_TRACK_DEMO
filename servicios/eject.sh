#!/bin/bash
cd /home/servicios/servicios
LOG_FILE="/home/servicios/eject.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')


if pgrep -f  "npm run start-all" > /dev/null
then
        echo "$DATE: El servicio de Storage esta corriendo." >>$LOG_FILE
	echo "El servicio de Storage esta corriendo."


else
        echo "$DATE: El servicio de Storage no esta corriendo, iniciando ....." >>$LOG_FILE
	echo "El servicio de Storage no esta corriendo, iniciando ....." 
	
        npm run start-all
fi


