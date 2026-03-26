/**
 * Compressed DB schema for AI agent context.
 * Injected into system prompt to give Gemini awareness of available data.
 * Optimized for minimal token usage (~200-300 tokens).
 */

const SCHEMA_CONTEXT = `
AVAILABLE DATA (read-only):
- Temperature chambers: daily readings (avg/min/max temp, breach_count, std_dev) per chamber. Thresholds per chamber (min/max °C). ~3 active chambers.
- Energy (Shelly devices): daily kWh consumption and cost per device. Located at specific sites. Historical data available.
- Weather: historical and forecast via Open-Meteo API for any location (temp, humidity, wind, precipitation). Default: Santiago, Chile (Quinta Normal).
- Company context: TNS Track operates in Santiago, Chile, comuna Quinta Normal. Monitors cold storage chambers and energy consumption for food safety compliance.

CONTEXTO FÍSICO DE INSTALACIONES:
- Ubicación: Santiago, Chile, comuna Quinta Normal (zona urbana industrial).
- Tipos de cámaras:
  * Cámaras de frío en hormigón (Cámaras 1, 2, 3, 4 y 5): Instalaciones fijas de construcción sólida, mayor inercia térmica.
  * Cámaras en contenedores Carrier Transicold ThinLINE de 40 pies (Reefers): Contenedores reefer con controlador Micro-Link 2, rango operativo amplio (congelados o refrigerados). Sistema con refrigerante gestionado por controlador con teclado de 11 teclas y display para alarmas y setpoints. Menor inercia térmica que hormigón, más sensibles a temperatura ambiente. Capacidad de refrigeración, calefacción y descongelamiento automático o manual. Tablero de potencia con seccionador magnético de 32A.
- Consumo eléctrico: De momento SOLO el Reefer B (Carrier) tiene sensor de consumo eléctrico Shelly instalado.
- Operación: Varias cámaras y reefers están en arriendo. Los arrendatarios las usan para gestionar mercadería en frío, con aperturas y cierres frecuentes de puertas durante horarios laborales, lo que causa fluctuaciones de temperatura esperadas.
- Clima Santiago: Mediterráneo, veranos calurosos (30-35°C), inviernos fríos (2-8°C). Las variaciones estacionales afectan significativamente el consumo energético y las brechas de temperatura.
- Los ciclos de descongelamiento son programados y las brechas durante estos son normales.

TOOLS YOU CAN USE:
1. get_temperature_chamber_data(chamber_ids, days): Chamber temp history, aggregated by day. chamber_ids son los canal_id de Ubibot (proporcionados en el contexto del usuario).
2. get_energy_history(days, shelly_ids): Daily energy consumption per Shelly device
3. get_energy_stats_summary(weeks): Weekly energy stats with trends
4. get_active_devices(): List all active Shelly energy monitors
5. get_weather_forecast(location, days): Future weather (1-14 days)
6. get_historical_weather(location, days): Past weather (1-60 days)

IMPORTANT RULES:
- You can ONLY read data, never write/modify
- Always use tools to get real data before answering
- Default location for weather: "Santiago, Quinta Normal, Chile"
- Dates are in Chile timezone (America/Santiago)
- Usa los canal_id proporcionados en el contexto del usuario como chamber_ids para get_temperature_chamber_data
`;

module.exports = { SCHEMA_CONTEXT };
