// src/components/DiagnosticoPushIOS.js
// Componente temporal para diagnosticar problemas con Push Notifications en iOS

import React, { useState, useEffect } from 'react';

const DiagnosticoPushIOS = () => {
    const [diagnostico, setDiagnostico] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ejecutarDiagnostico = async () => {
            const resultado = {};

            // 1. Detección de Plataforma
            resultado.userAgent = navigator.userAgent;
            resultado.esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            resultado.standalone = window.navigator.standalone === true;
            resultado.displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
            resultado.displayModeFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
            resultado.displayModeMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

            // 2. APIs Disponibles
            resultado.serviceWorkerDisponible = 'serviceWorker' in navigator;
            resultado.pushManagerEnWindow = 'PushManager' in window;
            resultado.notificationDisponible = 'Notification' in window;

            // 3. Service Worker
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    resultado.swRegistrados = registrations.length;
                    resultado.swDetalles = registrations.map(reg => ({
                        scope: reg.scope,
                        activo: !!reg.active,
                        installing: !!reg.installing,
                        waiting: !!reg.waiting
                    }));
                    resultado.swControlador = navigator.serviceWorker.controller
                        ? navigator.serviceWorker.controller.scriptURL
                        : null;

                    // Esperar a que esté ready
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        resultado.swReady = true;
                        resultado.pushManagerEnRegistration = !!registration.pushManager;

                        if (registration.pushManager) {
                            const subscription = await registration.pushManager.getSubscription();
                            resultado.suscripcionActiva = !!subscription;
                            if (subscription) {
                                resultado.endpoint = subscription.endpoint;
                            }
                        }
                    } catch (err) {
                        resultado.swReady = false;
                        resultado.swReadyError = err.message;
                    }
                } catch (err) {
                    resultado.errorSW = err.message;
                }
            }

            // 4. Notification Permission
            if ('Notification' in window) {
                resultado.notificationPermission = Notification.permission;
            }

            // 5. Constructor PushManager
            resultado.pushManagerType = typeof PushManager;

            setDiagnostico(resultado);
            setLoading(false);
        };

        ejecutarDiagnostico();
    }, []);

    if (loading) {
        return (
            <div style={styles.container}>
                <h3>🔍 Ejecutando diagnóstico...</h3>
            </div>
        );
    }

    const esPWAInstalada = diagnostico.standalone || diagnostico.displayModeStandalone;
    const tieneSoporteCompleto =
        diagnostico.serviceWorkerDisponible &&
        diagnostico.pushManagerEnWindow &&
        diagnostico.notificationDisponible;
    const deberiaFuncionar = diagnostico.esIOS && esPWAInstalada && tieneSoporteCompleto;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>🔍 Diagnóstico Push Notifications (iOS)</h2>

            {/* Resumen */}
            <div style={{
                ...styles.card,
                backgroundColor: deberiaFuncionar ? '#e8f5e9' : '#ffebee'
            }}>
                <h3 style={{ margin: 0 }}>
                    {deberiaFuncionar ? '✅ DEBERÍA FUNCIONAR' : '❌ HAY UN PROBLEMA'}
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                    {deberiaFuncionar
                        ? 'Todas las condiciones se cumplen para push notifications'
                        : 'Revisa los detalles abajo para identificar el problema'}
                </p>
            </div>

            {/* 1. Plataforma */}
            <div style={styles.card}>
                <h4 style={styles.cardTitle}>1️⃣ Plataforma</h4>
                <div style={styles.item}>
                    <span style={styles.label}>Es iOS:</span>
                    <span style={diagnostico.esIOS ? styles.success : styles.error}>
                        {diagnostico.esIOS ? '✅ SÍ' : '❌ NO'}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>PWA Instalada (standalone):</span>
                    <span style={diagnostico.standalone ? styles.success : styles.error}>
                        {diagnostico.standalone ? '✅ SÍ' : '❌ NO'}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>Display mode standalone:</span>
                    <span style={diagnostico.displayModeStandalone ? styles.success : styles.error}>
                        {diagnostico.displayModeStandalone ? '✅ SÍ' : '❌ NO'}
                    </span>
                </div>
                {!esPWAInstalada && (
                    <div style={styles.warning}>
                        ⚠️ La app NO está instalada. Ábrela desde el ícono de la pantalla de inicio.
                    </div>
                )}
            </div>

            {/* 2. APIs */}
            <div style={styles.card}>
                <h4 style={styles.cardTitle}>2️⃣ APIs Disponibles</h4>
                <div style={styles.item}>
                    <span style={styles.label}>Service Worker:</span>
                    <span style={diagnostico.serviceWorkerDisponible ? styles.success : styles.error}>
                        {diagnostico.serviceWorkerDisponible ? '✅ Disponible' : '❌ No disponible'}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>PushManager in window:</span>
                    <span style={diagnostico.pushManagerEnWindow ? styles.success : styles.error}>
                        {diagnostico.pushManagerEnWindow ? '✅ Disponible' : '❌ No disponible'}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>Notification API:</span>
                    <span style={diagnostico.notificationDisponible ? styles.success : styles.error}>
                        {diagnostico.notificationDisponible ? '✅ Disponible' : '❌ No disponible'}
                    </span>
                </div>
            </div>

            {/* 3. Service Worker */}
            <div style={styles.card}>
                <h4 style={styles.cardTitle}>3️⃣ Service Worker</h4>
                <div style={styles.item}>
                    <span style={styles.label}>SW Registrados:</span>
                    <span style={diagnostico.swRegistrados > 0 ? styles.success : styles.error}>
                        {diagnostico.swRegistrados}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>SW Controlador:</span>
                    <span style={diagnostico.swControlador ? styles.success : styles.error}>
                        {diagnostico.swControlador || '❌ Sin controlador'}
                    </span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>SW Ready:</span>
                    <span style={diagnostico.swReady ? styles.success : styles.error}>
                        {diagnostico.swReady ? '✅ SÍ' : '❌ NO'}
                    </span>
                </div>
                {diagnostico.swReadyError && (
                    <div style={styles.error}>
                        Error: {diagnostico.swReadyError}
                    </div>
                )}
                <div style={styles.item}>
                    <span style={styles.label}>pushManager en registration:</span>
                    <span style={diagnostico.pushManagerEnRegistration ? styles.success : styles.error}>
                        {diagnostico.pushManagerEnRegistration ? '✅ EXISTE' : '❌ NO EXISTE'}
                    </span>
                </div>
            </div>

            {/* 4. Suscripción */}
            <div style={styles.card}>
                <h4 style={styles.cardTitle}>4️⃣ Suscripción</h4>
                <div style={styles.item}>
                    <span style={styles.label}>Permiso:</span>
                    <span>{diagnostico.notificationPermission || 'N/A'}</span>
                </div>
                <div style={styles.item}>
                    <span style={styles.label}>Suscripción activa:</span>
                    <span style={diagnostico.suscripcionActiva ? styles.success : styles.warning}>
                        {diagnostico.suscripcionActiva ? '✅ SÍ' : '⚠️ NO'}
                    </span>
                </div>
            </div>

            {/* Detalles técnicos */}
            <details style={styles.details}>
                <summary style={styles.summary}>Ver detalles técnicos completos</summary>
                <pre style={styles.pre}>
                    {JSON.stringify(diagnostico, null, 2)}
                </pre>
            </details>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '600px',
        margin: '20px auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    title: {
        fontSize: '20px',
        marginBottom: '20px',
        color: '#333'
    },
    card: {
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
    },
    cardTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        color: '#333'
    },
    item: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0'
    },
    label: {
        fontWeight: '500',
        color: '#666'
    },
    success: {
        color: '#4caf50',
        fontWeight: '600'
    },
    error: {
        color: '#f44336',
        fontWeight: '600'
    },
    warning: {
        color: '#ff9800',
        fontWeight: '600',
        backgroundColor: '#fff3e0',
        padding: '8px',
        borderRadius: '4px',
        marginTop: '8px',
        fontSize: '14px'
    },
    details: {
        marginTop: '20px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '12px'
    },
    summary: {
        cursor: 'pointer',
        fontWeight: '500',
        color: '#1976d2'
    },
    pre: {
        backgroundColor: '#f5f5f5',
        padding: '12px',
        borderRadius: '4px',
        overflow: 'auto',
        fontSize: '12px',
        marginTop: '12px'
    }
};

export default DiagnosticoPushIOS;
