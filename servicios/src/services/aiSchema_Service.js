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

TOOLS YOU CAN USE:
1. get_temperature_chamber_data(days): Chamber temp history, aggregated by day
2. get_energy_history(days): Daily energy consumption per Shelly device
3. get_energy_stats_summary(weeks): Weekly energy stats with trends
4. get_active_devices(): List all active Shelly energy monitors
5. get_weather_forecast(location, days): Future weather (1-14 days)
6. get_historical_weather(location, days): Past weather (1-60 days)

IMPORTANT RULES:
- You can ONLY read data, never write/modify
- Always use tools to get real data before answering
- Default location for weather: "Santiago, Quinta Normal, Chile"
- Dates are in Chile timezone (America/Santiago)
`;

module.exports = { SCHEMA_CONTEXT };
