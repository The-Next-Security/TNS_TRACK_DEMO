const { DateTime, Duration, Settings } = require('luxon');

// Configurar locale por defecto para toda la aplicación
Settings.defaultLocale = 'es';

class DateUtils {
    constructor() {
        this.defaultTimezone = 'America/Santiago';
    }

    /**
     * Obtiene el rango de inicio y fin de un día específico
     * @param {string|Date} date - Fecha para la cual obtener el rango
     * @returns {[Date, Date]} Array con fecha inicio y fin del día
     */
    getDayRange(date) {
        const parsedDate = date instanceof Date ? date : new Date(date);

        if (isNaN(parsedDate.getTime())) {
            throw new Error('Fecha inválida');
        }

        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Si es el día actual, usar la hora actual como fin
        const now = new Date();
        if (endOfDay > now) {
            endOfDay.setTime(now.getTime());
        }

        return [startOfDay, endOfDay];
    }

    /**
     * Convierte una fecha UTC a la zona horaria local
     * @returns {DateTime} Objeto DateTime de Luxon en la zona local
     */
    utcToLocal(utcDate, timezone = this.defaultTimezone) {
        return DateTime
            .fromJSDate(utcDate)
            .setZone(timezone);
    }

    /**
     * Convierte una fecha UTC a string formateado en zona local
     * Reemplaza el patrón: moment.utc(date).tz(tz).format(fmt)
     * @param {string|Date} utcDate - Fecha en UTC
     * @param {string} format - Formato Luxon (ej: 'yyyy-MM-dd HH:mm:ss')
     * @param {string} timezone - Zona horaria destino
     * @returns {string} Fecha formateada en zona local
     */
    utcToLocalFormatted(utcDate, format = 'yyyy-MM-dd HH:mm:ss', timezone = this.defaultTimezone) {
        const dt = utcDate instanceof Date
            ? DateTime.fromJSDate(utcDate, { zone: 'utc' })
            : DateTime.fromISO(String(utcDate), { zone: 'utc' });
        return dt.setZone(timezone).toFormat(format);
    }

    /**
     * Retorna la hora actual en zona local formateada como string SQL
     * Reemplaza el patrón: moment().tz(tz).format('YYYY-MM-DD HH:mm:ss')
     * @param {string} format - Formato Luxon
     * @param {string} timezone - Zona horaria
     * @returns {string}
     */
    nowInLocalTz(format = 'yyyy-MM-dd HH:mm:ss', timezone = this.defaultTimezone) {
        return DateTime.now().setZone(timezone).toFormat(format);
    }

    /**
     * Convierte cualquier fecha a objeto Date nativo (para Chart.js)
     * Reemplaza el patrón: moment(date).toDate()
     * @param {string|Date} date
     * @returns {Date}
     */
    toJSDate(date) {
        if (date instanceof Date) return date;
        return DateTime.fromISO(String(date)).toJSDate();
    }

    /**
     * Convierte una fecha a tiempo relativo en español ("hace 5 minutos")
     * Reemplaza el patrón: moment(date).fromNow()
     * @param {string|Date} date
     * @returns {string}
     */
    toRelative(date) {
        const dt = date instanceof Date
            ? DateTime.fromJSDate(date)
            : DateTime.fromISO(String(date));
        return dt.toRelative();
    }

    /**
     * Inicio del día en zona local como Date nativo
     * Reemplaza: moment(date).tz(tz).startOf('day').toDate()
     * @param {string|Date} date
     * @param {string} timezone
     * @returns {Date}
     */
    startOfDayLocal(date, timezone = this.defaultTimezone) {
        const dt = date instanceof Date
            ? DateTime.fromJSDate(date)
            : DateTime.fromISO(String(date));
        return dt.setZone(timezone).startOf('day').toJSDate();
    }

    /**
     * Fin del día en zona local como Date nativo
     * Reemplaza: moment(date).tz(tz).endOf('day').toDate()
     * @param {string|Date} date
     * @param {string} timezone
     * @returns {Date}
     */
    endOfDayLocal(date, timezone = this.defaultTimezone) {
        const dt = date instanceof Date
            ? DateTime.fromJSDate(date)
            : DateTime.fromISO(String(date));
        return dt.setZone(timezone).endOf('day').toJSDate();
    }

    /**
     * Verifica si una fecha es igual o anterior al día de hoy
     * Reemplaza: moment(date).isSameOrBefore(moment(), 'day')
     * @param {Date} date
     * @returns {boolean}
     */
    isBeforeOrSameDay(date) {
        const dt = date instanceof Date
            ? DateTime.fromJSDate(date)
            : DateTime.fromISO(String(date));
        return dt.startOf('day') <= DateTime.now().startOf('day');
    }

    /**
     * Calcula la duración entre dos fechas y retorna componentes
     * Reemplaza: moment.duration(now.diff(created))
     * @param {string|Date} from
     * @param {string|Date} to - Si no se provee, usa ahora
     * @returns {Duration} Objeto Duration de Luxon
     */
    getDuration(from, to = null) {
        const start = from instanceof Date
            ? DateTime.fromJSDate(from)
            : DateTime.fromISO(String(from));
        const end = to
            ? (to instanceof Date ? DateTime.fromJSDate(to) : DateTime.fromISO(String(to)))
            : DateTime.now();
        return end.diff(start, ['days', 'hours', 'minutes', 'seconds']);
    }

    /**
     * Convierte una fecha local a UTC
     */
    localToUtc(localDate, timezone = this.defaultTimezone) {
        return DateTime
            .fromJSDate(localDate)
            .setZone(timezone)
            .toUTC();
    }

    /**
     * Obtiene el inicio del período actual
     */
    getPeriodStart(date, period = 'hour') {
        const dt = DateTime.fromJSDate(date);
        switch (period.toLowerCase()) {
            case 'hour':
                return dt.startOf('hour');
            case 'day':
                return dt.startOf('day');
            case 'month':
                return dt.startOf('month');
            default:
                throw new Error('Período no válido');
        }
    }

    /**
     * Obtiene el fin del período actual
     */
    getPeriodEnd(date, period = 'hour') {
        const dt = DateTime.fromJSDate(date);
        switch (period.toLowerCase()) {
            case 'hour':
                return dt.endOf('hour');
            case 'day':
                return dt.endOf('day');
            case 'month':
                return dt.endOf('month');
            default:
                throw new Error('Período no válido');
        }
    }

    /**
     * Valida el rango de fechas para un período dado
     */
    validateDateRange(startDate, endDate, period = 'hour') {
        if (!startDate || !endDate) {
            throw new Error('Las fechas de inicio y fin son requeridas');
        }

        const start = DateTime.fromJSDate(startDate);
        const end = DateTime.fromJSDate(endDate);

        if (!start.isValid || !end.isValid) {
            throw new Error('Fechas inválidas');
        }

        if (end < start) {
            throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }

        const diff = end.diff(start);
        switch (period.toLowerCase()) {
            case 'hour':
                if (diff.as('hours') > 24) {
                    throw new Error('El rango para consultas horarias no puede exceder 24 horas');
                }
                break;
            case 'day':
                if (diff.as('days') > 31) {
                    throw new Error('El rango para consultas diarias no puede exceder 31 días');
                }
                break;
            case 'month':
                if (diff.as('months') > 12) {
                    throw new Error('El rango para consultas mensuales no puede exceder 12 meses');
                }
                break;
        }

        return true;
    }

    /**
     * Formatea una fecha según el formato especificado
     */
    formatDate(date, format = 'yyyy-MM-dd HH:mm:ss', timezone = this.defaultTimezone) {
        return DateTime
            .fromJSDate(date)
            .setZone(timezone)
            .toFormat(format);
    }
}

module.exports = new DateUtils();

// Exportar también DateTime y Duration para uso directo en otros módulos
module.exports.DateTime = DateTime;
module.exports.Duration = Duration;