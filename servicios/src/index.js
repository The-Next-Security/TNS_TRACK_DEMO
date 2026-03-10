import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { registerServiceWorker } from './utils/registerServiceWorker_Utils';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

// Registrar Service Worker en producción Y en desarrollo (necesario para Push Notifications)
// NOTA: En desarrollo, el SW se registra para permitir testing de Push Notifications
registerServiceWorker();
if (process.env.NODE_ENV === 'production') {
  console.log('✅ [PWA] Service Worker habilitado en producción');
} else {
  console.log('⚠️  [PWA] Service Worker habilitado en desarrollo para testing de Push Notifications');
}

// Detectar si la app está instalada como PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ [PWA] Aplicación ejecutándose como PWA instalada');
}

// Detectar cambios en el estado de conexión
window.addEventListener('online', () => {
  console.log('🌐 [PWA] Conexión restablecida');
});

window.addEventListener('offline', () => {
  console.log('📡 [PWA] Sin conexión - Modo offline activado');
});
