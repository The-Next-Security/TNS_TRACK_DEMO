-- ==============================================================================
-- crear_base_datos.sql
-- Crea la base de datos tns_cool_track desde cero.
--
-- IMPORTANTE: Ejecutar desde el directorio SQL_FILES/:
--   mysql -u root -p < crear_base_datos.sql
-- ==============================================================================


-- ==============================================================================
-- PASO 1: Tablas base, índices e inserts iniciales
-- ==============================================================================

SOURCE 01_creacion_desde_cero/01_tablas_base.sql;
SOURCE 01_creacion_desde_cero/02_tablas_log.sql;
SOURCE 01_creacion_desde_cero/03_indices.sql;
SOURCE 01_creacion_desde_cero/04_inserts_base.sql;


-- ==============================================================================
-- PASO 2: Funciones
-- Los bloques BEGIN...END requieren un delimitador alternativo
-- ==============================================================================

DELIMITER //

SOURCE 02_Funciones/02_01_fun_calcular_temp_interpolada.sql
//
SOURCE 02_Funciones/02_02_fun_get_consumption_thresholds.sql
//
SOURCE 02_Funciones/02_03_fun_process_totales_dia.sql
//
SOURCE 02_Funciones/02_04_fun_process_totales_hora.sql
//
SOURCE 02_Funciones/02_05_fun_process_totales_mes.sql
//
SOURCE 02_Funciones/02_06_fun_should_send_notification.sql
//

DELIMITER ;


-- ==============================================================================
-- PASO 3: Triggers
-- ==============================================================================

DELIMITER //

SOURCE 03_Triggers/03_01_trig_update_response_time.sql
DELIMITER //
//
SOURCE 03_Triggers/03_02_trig_gen_usuario.sql
DELIMITER //
//
SOURCE 03_Triggers/03_03_trig_gen_permiso.sql
DELIMITER //
//
SOURCE 03_Triggers/03_04_trig_gen_usuario_permisos.sql
DELIMITER //
//
SOURCE 03_Triggers/03_05_trig_gen_feriados_cl.sql
DELIMITER //
//
SOURCE 03_Triggers/03_06_trig_gen_ubicaciones_reales.sql
DELIMITER //
//
SOURCE 03_Triggers/03_07_trig_gen_tipos_parametros.sql
DELIMITER //
//
SOURCE 03_Triggers/03_08_trig_gen_cofiguracion_grupos.sql
DELIMITER //
//
SOURCE 03_Triggers/03_09_trig_gen_cofiguracion_parametros.sql
DELIMITER //
//
SOURCE 03_Triggers/03_10_trig_gen_cofiguracion_valores.sql
DELIMITER //
//
SOURCE 03_Triggers/03_11_trig_rep_tipo_reporte.sql
DELIMITER //
//
SOURCE 03_Triggers/03_12_trig_rep_plantillas.sql
DELIMITER //
//
SOURCE 03_Triggers/03_13_trig_sem_grupos.sql
DELIMITER //
//
SOURCE 03_Triggers/03_14_trig_sem_tipos_parametros.sql
DELIMITER //
//
SOURCE 03_Triggers/03_15_trig_sem_configuracion.sql
DELIMITER //
//
SOURCE 03_Triggers/03_16_trig_sem_dispositivos.sql
DELIMITER //
//
SOURCE 03_Triggers/03_17_trig_ubi_canal.sql
DELIMITER //
//
SOURCE 03_Triggers/03_18_trig_ubi_grupo.sql
DELIMITER //
//
SOURCE 03_Triggers/03_20_trig_ale_suscripciones_notificacion_after_insert.sql
DELIMITER //
//
SOURCE 03_Triggers/03_21_trig_ale_suscripciones_notificacion_after_update.sql
DELIMITER //
//
SOURCE 03_Triggers/03_22_trig_ale_suscripciones_notificacion_after_delete.sql
DELIMITER //
//

DELIMITER ;


-- ==============================================================================
-- PASO 4: Stored Procedures
-- ==============================================================================

DELIMITER //

SOURCE 04_Stored_Procedures/04_01_stpr_calcular_metricas_temperatura.sql
//
SOURCE 04_Stored_Procedures/04_02_stpr_cleanup_old_alerts.sql
//
SOURCE 04_Stored_Procedures/04_03_stpr_cleanup_old_push_subscriptions.sql
//
SOURCE 04_Stored_Procedures/04_04_stpr_update_category_totals_dia.sql
//
SOURCE 04_Stored_Procedures/04_05_stpr_update_category_totals_hora.sql
//
SOURCE 04_Stored_Procedures/04_06_stpr_update_category_totals_mes.sql
//
SOURCE 04_Stored_Procedures/04_07_stpr_generate_daily_metrics.sql
//
SOURCE 04_Stored_Procedures/04_08_stpr_obtener_valor_string.sql
//
SOURCE 04_Stored_Procedures/04_09_stpr_apply_preset_to_cameras.sql
//
SOURCE 04_Stored_Procedures/04_10_stpr_archive_old_metrics.sql
//
SOURCE 04_Stored_Procedures/04_11_stpr_calcular_ciclos_temperatura.sql
//
SOURCE 04_Stored_Procedures/04_12_stpr_calcular_cuartiles_consumo.sql
//
SOURCE 04_Stored_Procedures/04_13_stpr_calculate_hourly_metrics.sql
//
SOURCE 04_Stored_Procedures/04_14_stpr_disable_dnd.sql
//
SOURCE 04_Stored_Procedures/04_16_stpr_enable_default_dnd.sql
//
SOURCE 04_Stored_Procedures/04_17_stpr_get_daily_summary.sql
//
SOURCE 04_Stored_Procedures/04_18_stpr_get_weekly_trends.sql
//
SOURCE 04_Stored_Procedures/04_19_stpr_procesar_channels_faltantes.sql
//
SOURCE 04_Stored_Procedures/04_20_stpr_process_all_daily_totals.sql
//
SOURCE 04_Stored_Procedures/04_21_stpr_process_recent_metrics.sql
//
SOURCE 04_Stored_Procedures/04_22_stpr_restore_default_presets.sql
//
SOURCE 04_Stored_Procedures/04_23_stpr_sync_alert_temperature_by_id.sql
//
SOURCE 04_Stored_Procedures/04_24_stpr_sync_alert_temperature_historical.sql
//
SOURCE 04_Stored_Procedures/04_25_stpr_test_evento_manual.sql
//
SOURCE 04_Stored_Procedures/04_26_stpr_upsert_notification_preferences.sql
//
SOURCE 04_Stored_Procedures/04_27_stpr_verificar_consistencia_evento.sql
//

DELIMITER ;


-- ==============================================================================
-- PASO 5: Eventos
-- ==============================================================================

DELIMITER //

SOURCE 05_Eventos/05_00_evn_limpeza_tokens_reset_password.sql
//
SOURCE 05_Eventos/05_01_evn_actualizar_totales_dia.sql
//
SOURCE 05_Eventos/05_02_evn_actualizar_totales_hora.sql
//
SOURCE 05_Eventos/05_03_evn_actualizar_totales_mes.sql
//
SOURCE 05_Eventos/05_04_evn_actualizar_totales_metricas.sql
//
SOURCE 05_Eventos/05_05_evn_procesar_totales.sql
//
SOURCE 05_Eventos/05_06_evn_recalculate_daily_metrics.sql
//
SOURCE 05_Eventos/05_07_evn_update_consumption_categories.sql
//

DELIMITER ;
