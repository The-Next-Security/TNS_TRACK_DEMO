// src/components/PushNotificationManager.js
// Componente para gestionar suscripciones a Push Notifications

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Smartphone, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Detecta si es iOS (mejorado para evitar falsos positivos de emulación)
 */
const isIOSDevice = () => {
    // Verificar si es realmente iOS o solo emulación
    const hasIOSUserAgent = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const notMSStream = !window.MSStream;

    // Verificación adicional: iOS real tiene ciertas propiedades
    const hasIOSTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Si el userAgent dice iOS pero no hay capacidades táctiles, probablemente es emulación en DevTools
    // En ese caso, tratarlo como Desktop para permitir testing
    if (hasIOSUserAgent && !hasIOSTouch) {
        console.log('[PushManager] ⚠️ UserAgent iOS detectado pero sin capacidades táctiles (posible emulación). Tratando como Desktop.');
        return false;
    }

    return hasIOSUserAgent && notMSStream;
};

/**
 * Detecta si es Safari
 */
const isSafariBrowser = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

/**
 * Detecta si la PWA está instalada (standalone mode)
 * Basado en: pwa-push-notifications-guide.md líneas 132-133
 */
const isPWAInstalled = () => {
    // iOS
    if (window.navigator.standalone === true) {
        return true;
    }

    // Android y otros navegadores - verificar múltiples display modes
    const displayModes = [
        '(display-mode: standalone)',
        '(display-mode: fullscreen)',
        '(display-mode: minimal-ui)'
    ];

    return displayModes.some(mode => window.matchMedia(mode).matches);
};

/**
 * Hook personalizado para gestionar Push Notifications
 */
const usePushNotifications = () => {
    const { isAuthenticated } = useAuth();
    const [permission, setPermission] = useState('default'); // 'default', 'granted', 'denied'
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [subscriptionId, setSubscriptionId] = useState(null); // ✅ NUEVO: ID del backend
    const [isSupported, setIsSupported] = useState(false); // Estado de soporte dinámico
    const [platformInfo, setPlatformInfo] = useState({
        isIOS: false,
        isSafari: false,
        isPWA: false,
        isAndroid: false
    });

    /**
     * Verifica si el navegador soporta notificaciones push
     * NOTA: Verificación SÍNCRONA - 'PushManager' in window SÍ existe en iOS Safari PWA instalada
     * Basado en: pwa-push-notifications-guide.md líneas 135-140
     */
    const checkNotificationSupport = () => {
        if (!('serviceWorker' in navigator)) {
            console.log('[PushManager] Service Worker no disponible');
            return false;
        }

        if (!('PushManager' in window)) {
            console.log('[PushManager] PushManager API no disponible');
            return false;
        }

        if (!('Notification' in window)) {
            console.log('[PushManager] Notification API no disponible');
            return false;
        }

        console.log('[PushManager] ✅ Soporte completo detectado (verificación síncrona)');
        return true;
    };

    // Verificar soporte y estado inicial
    useEffect(() => {
        const init = async () => {
            // Detectar plataforma
            const platform = {
                isIOS: isIOSDevice(),
                isSafari: isSafariBrowser(),
                isPWA: isPWAInstalled(),
                isAndroid: /Android/i.test(navigator.userAgent)
            };
            setPlatformInfo(platform);

            console.log('[PushManager] Plataforma detectada:', platform);

            // Verificar soporte básico (síncrono) + condición iOS
            // Basado en: pwa-push-notifications-guide.md línea 140
            const basicSupport = checkNotificationSupport();
            const supported = basicSupport && (!platform.isIOS || platform.isPWA);

            setIsSupported(supported);

            if (!supported) {
                // iOS Safari sin instalar → Instrucciones de instalación
                if (platform.isIOS && platform.isSafari && !platform.isPWA) {
                    setError('iOS_NEEDS_PWA');
                }
                // No soporte real (falta alguna API) → Mensaje genérico
                else if (!basicSupport) {
                    setError('Tu navegador no soporta Push Notifications');
                }
                // iOS en Chrome/Firefox → No soportado por restricciones de Apple
                else if (platform.isIOS && !platform.isSafari) {
                    setError('En iOS, solo Safari soporta notificaciones. Usa Safari y agrega la app a tu pantalla de inicio.');
                }
                return;
            }

            // Actualizar permiso actual
            if ('Notification' in window) {
                setPermission(Notification.permission);
            }

            // ✅ NUEVO: Cargar subscriptionId desde localStorage
            const storedId = localStorage.getItem('pushSubscriptionId');
            if (storedId) {
                setSubscriptionId(storedId);
                console.log('[PushManager] ID de suscripción cargado desde localStorage:', storedId);
            }

            // Verificar suscripción existente
            try {
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();

                if (existingSubscription) {
                    setSubscription(existingSubscription);
                    setIsSubscribed(true);
                    console.log('[PushManager] Suscripción existente detectada');
                } else {
                    setIsSubscribed(false);
                    console.log('[PushManager] No hay suscripción activa');
                }
            } catch (err) {
                console.error('[PushManager] Error verificando suscripción:', err);
            }
        };

        init();
    }, []);

    /**
     * Registra el Service Worker si no está registrado
     * Basado en: pwa-push-notifications-guide.md líneas 166-175
     */
    const registerServiceWorker = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('/TNSTrack/service-worker.js', {
                    scope: '/TNSTrack/'
                });
                console.log('[PushManager] Service Worker registrado:', registration.scope);
                return registration;
            }
        } catch (error) {
            console.error('[PushManager] Error registrando Service Worker:', error);
            throw error;
        }
    };

    /**
     * Convierte clave pública VAPID de base64 a Uint8Array
     */
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    };

    /**
     * Suscribe al usuario a Push Notifications
     * Basado en: pwa-push-notifications-guide.md líneas 178-229
     */
    const subscribe = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 0. Asegurar que el Service Worker esté registrado PRIMERO
            // CRÍTICO para iOS - debe registrarse antes de pedir permiso
            await registerServiceWorker();

            // 1. Verificar soporte básico
            const basicSupport = checkNotificationSupport();
            if (!basicSupport) {
                throw new Error('Push Notifications no disponibles en este navegador');
            }

            // 2. Solicitar permiso (debe ser resultado de acción del usuario)
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                throw new Error('Permiso de notificaciones denegado');
            }

            // 3. Obtener clave pública VAPID del servidor
            const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:1337' : '';
            const response = await fetch(`${apiBaseUrl}/api/push/vapid-public-key`);
            const data = await response.json();

            if (!data.success || !data.publicKey) {
                throw new Error('No se pudo obtener la clave pública VAPID');
            }

            const publicKey = data.publicKey;
            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            // 4. Esperar a que el Service Worker esté listo
            const registration = await navigator.serviceWorker.ready;

            // 5. Suscribirse a Push Manager
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('[PushManager] Suscripción creada:', pushSubscription);

            // 6. Verificar sesión activa antes de llamar al servidor
            const token = localStorage.getItem('accessToken');
            if (!token || !isAuthenticated) {
                throw new Error('Debes iniciar sesión para activar las notificaciones');
            }

            // 7. Enviar suscripción al servidor con token de autenticación
            const subscribeResponse = await fetch(`${apiBaseUrl}/api/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subscription: pushSubscription.toJSON(),
                    // ✅ Enviar subscriptionId existente si hay
                    existingSubscriptionId: localStorage.getItem('pushSubscriptionId') || null
                    // userId NO se envía en el body — el backend lo extrae del JWT
                })
            });

            // Manejar token expirado
            if (subscribeResponse.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                throw new Error('Tu sesión expiró. Vuelve a iniciar sesión para activar las notificaciones');
            }

            const subscribeData = await subscribeResponse.json();

            if (!subscribeData.success) {
                throw new Error('Error guardando suscripción en el servidor');
            }

            // ✅ iOS: Guardar subscriptionId en localStorage y estado
            const backendSubscriptionId = subscribeData.subscriptionId;
            localStorage.setItem('pushSubscriptionId', backendSubscriptionId);
            setSubscriptionId(backendSubscriptionId);

            // ✅ iOS: Verificar que se guardó correctamente
            const savedId = localStorage.getItem('pushSubscriptionId');
            if (savedId === backendSubscriptionId) {
                console.log('[PushManager] ✅ subscriptionId guardado correctamente en localStorage:', backendSubscriptionId);
            } else {
                console.error('[PushManager] ⚠️ Error: subscriptionId no se guardó correctamente en localStorage');
                console.error('[PushManager] Esperado:', backendSubscriptionId, 'Guardado:', savedId);
            }

            setSubscription(pushSubscription);
            setIsSubscribed(true);

            console.log('[PushManager] Suscripción guardada en servidor:', subscribeData);

            // Opcional: Mostrar notificación de bienvenida
            if ('showNotification' in registration) {
                registration.showNotification('¡Notificaciones Activadas!', {
                    body: 'Recibirás alertas en tiempo real del sistema',
                    icon: '/TNSTrack/icons/icon-192x192.png',
                    badge: '/TNSTrack/icons/icon-72x72.png',
                    tag: 'welcome-notification'
                });
            }

        } catch (err) {
            console.error('[PushManager] Error en suscripción:', err);
            setError(err.message);
            setIsSubscribed(false);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Cancela la suscripción a Push Notifications
     */
    const unsubscribe = async () => {
        if (!subscription) {
            console.warn('[PushManager] No hay suscripción para cancelar');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Cancelar suscripción en el navegador
            await subscription.unsubscribe();

            // 2. Notificar al servidor
            const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:1337' : '';
            const token = localStorage.getItem('accessToken');
            await fetch(`${apiBaseUrl}/api/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            // ✅ NUEVO: Limpiar subscriptionId de localStorage y estado
            localStorage.removeItem('pushSubscriptionId');
            setSubscriptionId(null);
            console.log('[PushManager] subscriptionId eliminado de localStorage');

            setSubscription(null);
            setIsSubscribed(false);

            console.log('[PushManager] Suscripción cancelada exitosamente');

        } catch (err) {
            console.error('[PushManager] Error cancelando suscripción:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Envía una notificación de prueba
     */
    const sendTestNotification = async () => {
        try {
            const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:1337' : '';
            const response = await fetch(`${apiBaseUrl}/api/push/test-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    title: '🔔 Notificación de Prueba',
                    body: 'Si ves esto, las notificaciones funcionan correctamente'
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('[PushManager] Notificación de prueba enviada:', data);
            } else {
                console.error('[PushManager] Error enviando prueba:', data);
            }
        } catch (err) {
            console.error('[PushManager] Error en notificación de prueba:', err);
        }
    };

    return {
        permission,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        sendTestNotification,
        isSupported, // Ahora es estado, no función
        platformInfo,
        subscriptionId // ✅ NUEVO: Exponer subscriptionId
    };
};

/**
 * Componente de instrucciones para instalar PWA en iOS
 */
const IOSInstallInstructions = () => {
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <Smartphone className="text-blue-600 mt-1 flex-shrink-0" size={24} />
                <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                        📱 Para recibir notificaciones en iOS
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>Toca el botón <strong>Compartir</strong> en Safari</li>
                        <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                        <li>Toca <strong>"Agregar"</strong></li>
                        <li>Abre la app desde tu pantalla de inicio</li>
                        <li>Regresa a esta sección y activa las notificaciones</li>
                    </ol>
                    <p className="mt-3 text-xs text-blue-600">
                        💡 Las notificaciones solo funcionan cuando la app está instalada en tu pantalla de inicio
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Componente UI para gestionar Push Notifications
 */
const PushNotificationManager = () => {
    const {
        permission,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        sendTestNotification,
        isSupported,
        platformInfo
    } = usePushNotifications();

    // Si es iOS Safari sin PWA, mostrar instrucciones de instalación
    if (error === 'iOS_NEEDS_PWA') {
        return <IOSInstallInstructions />;
    }

    // Si no hay soporte genérico, mostrar mensaje
    if (!isSupported) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <BellOff className="text-yellow-600" size={20} />
                    <p className="text-sm text-yellow-800">
                        Tu navegador no soporta notificaciones push
                    </p>
                </div>
            </div>
        );
    }

    // Botón principal
    const renderButton = () => {
        if (isLoading) {
            return (
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                >
                    <BellRing className="animate-pulse" size={20} />
                    <span>Procesando...</span>
                </button>
            );
        }

        if (permission === 'denied') {
            return (
                <div className="text-sm text-red-600">
                    <BellOff className="inline mr-2" size={16} />
                    Notificaciones bloqueadas. Habilítalas en la configuración de tu navegador.
                </div>
            );
        }

        if (isSubscribed) {
            return (
                <div className="flex gap-2">
                    <button
                        onClick={unsubscribe}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                    >
                        <BellOff size={20} />
                        <span>Desactivar Notificaciones</span>
                    </button>
                    <button
                        onClick={sendTestNotification}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                    >
                        <BellRing size={20} />
                        <span>Enviar Prueba</span>
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={subscribe}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
            >
                <Bell size={20} />
                <span>Activar Notificaciones</span>
            </button>
        );
    };

    // Mensaje informativo según plataforma
    const getPlatformMessage = () => {
        if (isSubscribed) {
            return '✅ Recibirás alertas de temperatura y conexión en tiempo real';
        }

        if (platformInfo.isIOS && platformInfo.isPWA) {
            return '📱 App instalada correctamente. Activa las notificaciones para recibir alertas';
        }

        if (platformInfo.isAndroid) {
            return '📱 Recibe alertas instantáneas en tu dispositivo Android';
        }

        return 'Recibe alertas instantáneas incluso cuando la app esté cerrada';
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Badge de plataforma (solo visible en desarrollo) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mb-2 text-xs text-gray-500">
                    🔍 Plataforma: {platformInfo.isIOS ? 'iOS' : platformInfo.isAndroid ? 'Android' : 'Desktop'}
                    {platformInfo.isPWA && ' | PWA Instalada'}
                    {platformInfo.isSafari && ' | Safari'}
                </div>
            )}

            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        Notificaciones Push
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {getPlatformMessage()}
                    </p>

                    {renderButton()}

                    {error && error !== 'iOS_NEEDS_PWA' && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Mensaje adicional para iOS PWA */}
                    {platformInfo.isIOS && platformInfo.isPWA && !isSubscribed && permission === 'default' && (
                        <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            💡 Tip: Asegúrate de haber abierto la app desde el ícono de tu pantalla de inicio
                        </div>
                    )}
                </div>

                {isSubscribed && (
                    <div className="ml-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Bell className="text-green-600" size={24} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PushNotificationManager;
export { usePushNotifications };
