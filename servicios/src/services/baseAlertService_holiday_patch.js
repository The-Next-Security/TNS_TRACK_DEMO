/**
 * PATCH: Holiday logic for baseAlertService.js
 * Feature: 002-configurable-alert-schedules (User Story 2 - T051-T054)
 *
 * Add this code to baseAlertService.js:
 * 1. isHoliday() method - after _timeToDecimal() method
 * 2. Modified isWithinWorkingHours() - make it async and add holiday check
 */

// ============================================================================
// METHOD 1: isHoliday() - Add after _timeToDecimal() method (around line 162)
// ============================================================================

    /**
     * Verifica si una fecha específica es un feriado en Chile
     *
     * Consulta la tabla feriados_cl para determinar si la fecha dada es un feriado.
     * En caso de error, retorna false (graceful degradation).
     *
     * Feature: 002-configurable-alert-schedules (T051 - User Story 2)
     *
     * @param {Date|string|moment.Moment|null} [checkTime=null] - Fecha a verificar (null = hoy)
     * @returns {Promise<boolean>} true si la fecha es un feriado
     */
    async isHoliday(checkTime = null) {
        try {
            // Verificar si tenemos acceso a la base de datos
            if (!this.pool && !alertScheduleConfigService.databaseService) {
                console.warn('[BaseAlertService] isHoliday: No database connection available');
                return false; // Graceful degradation
            }

            // Normalizar fecha a objeto moment en zona horaria correcta
            const dateToCheck = checkTime
                ? (moment.isMoment(checkTime) ? checkTime.clone() : moment(checkTime))
                : moment();

            const localDate = dateToCheck.tz(this.timeZone);
            const formattedDate = localDate.format('YYYY-MM-DD');

            // Consultar tabla de feriados usando el databaseService
            const connection = await alertScheduleConfigService.databaseService.getConnection();
            const [rows] = await connection.query(
                "SELECT 1 FROM feriados_cl WHERE fecha = ?",
                [formattedDate]
            );

            const isHolidayResult = rows.length > 0;

            if (isHolidayResult) {
                console.log(`[BaseAlertService] isHoliday: Date ${formattedDate} IS a Chilean holiday`);
            } else {
                console.log(`[BaseAlertService] isHoliday: Date ${formattedDate} is NOT a holiday`);
            }

            return isHolidayResult;

        } catch (error) {
            console.error(`[BaseAlertService] ❌ Error checking holiday status:`, error.message);
            // Graceful degradation: assume not a holiday on error
            return false;
        }
    }

// ============================================================================
// METHOD 2: Modified isWithinWorkingHours()
// Replace the existing isWithinWorkingHours() method (starts around line 174)
// ============================================================================

    /**
     * Verifica si estamos dentro del horario laboral
     *
     * MODIFICADO: Feature 002-configurable-alert-schedules
     * Ahora usa configuración dinámica desde base de datos (configCache)
     * en lugar de valores hardcodeados.
     *
     * User Story 2 (T052-T054): Añadida lógica de feriados
     * Si respect_holidays='true' y es feriado, se trata como domingo (enviar todo el día).
     *
     * @param {Date|string|null} [checkTime=null] - Tiempo específico a verificar
     * @returns {Promise<boolean>} true si estamos en horario laboral
     */
    async isWithinWorkingHours(checkTime = null) {
        let timeToCheck;
        if (checkTime) {
            timeToCheck = moment.isMoment(checkTime)
                ? checkTime.clone()
                : moment(checkTime);
        } else {
            timeToCheck = moment();
        }

        const localTime = timeToCheck.tz(this.timeZone);
        const dayOfWeek = localTime.day();
        const hourDecimal = localTime.hour() + localTime.minute() / 60;

        // T052-T053: Check if today is a holiday and respect_holidays is enabled
        // If true, treat as Sunday (send all day = outside working hours)
        if (this.configCache.respect_holidays === 'true') {
            const isHolidayToday = await this.isHoliday(timeToCheck);
            if (isHolidayToday) {
                console.log(`[BaseAlertService] isWithinWorkingHours: Holiday detected (respect_holidays=true) - treating as Sunday (send all day) - OUTSIDE working hours`);
                return false;  // false = fuera de horario laboral = sí enviar alertas
            }
        }

        // Use dynamic configuration from database
        let isWithinHours;

        // Domingo tiene horario especial
        // Por defecto sunday_start=23:59:59, sunday_end=00:00:00 significa: enviar todo el día
        // (start >= end = nunca dentro de horario laboral = siempre enviar)
        if (dayOfWeek === 0) {
            const sundayStart = this._timeToDecimal(this.configCache.sunday_start);
            const sundayEnd = this._timeToDecimal(this.configCache.sunday_end);

            // Si start >= end, significa que NO HAY horario laboral el domingo (enviar todo el día)
            if (sundayStart >= sundayEnd) {
                console.log(`[BaseAlertService] isWithinWorkingHours: Sunday (always send) - OUTSIDE working hours`);
                return false;  // false = fuera de horario laboral = sí enviar alertas
            }

            isWithinHours = (hourDecimal >= sundayStart && hourDecimal <= sundayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Sunday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.sunday_start} to ${this.configCache.sunday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
            return isWithinHours;
        }

        // Sábado tiene horario especial
        if (dayOfWeek === 6) {
            const saturdayStart = this._timeToDecimal(this.configCache.saturday_start);
            const saturdayEnd = this._timeToDecimal(this.configCache.saturday_end);

            isWithinHours = (hourDecimal >= saturdayStart && hourDecimal <= saturdayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Saturday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.saturday_start} to ${this.configCache.saturday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
        } else {
            // Lunes a viernes (días 1-5)
            const weekdayStart = this._timeToDecimal(this.configCache.weekday_start);
            const weekdayEnd = this._timeToDecimal(this.configCache.weekday_end);

            isWithinHours = (hourDecimal >= weekdayStart && hourDecimal <= weekdayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Weekday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.weekday_start} to ${this.configCache.weekday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
        }

        return isWithinHours;
    }

// ============================================================================
// IMPORTANT NOTES:
// ============================================================================
// 1. The is WithinWorkingHours() method signature changed from sync to async
// 2. All callers of isWithinWorkingHours() must now use await:
//    - OLD: if (this.isWithinWorkingHours()) { ... }
//    - NEW: if (await this.isWithinWorkingHours()) { ... }
//
// 3. This implements tasks T051-T054:
//    ✅ T051: isHoliday() method added
//    ✅ T052: isWithinWorkingHours() checks holiday status and respect_holidays
//    ✅ T053: Two-step evaluation: check feriados_cl → evaluate respect_holidays → decide
//    ✅ T054: Logging added for holiday evaluation
// ============================================================================
