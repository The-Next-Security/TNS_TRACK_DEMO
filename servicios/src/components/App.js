// App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import GlobalStyle from "../GlobalStyle.js"; // Asumiendo que tienes un GlobalStyle
import AppContent from "./AppContent";
import { SessionManager } from "./SessionManager";
import { Toaster } from "./ui/toaster"; // Componente para las notificaciones toast
import "../styles/globals.css"; // Tailwind CSS
import analyticsService from "../services/analytics_Service";
import { LogoutReason } from "../constants/logoutReason_Constants";
import { setLogoutReason } from "../utils/session_Utils";
import { setupAxiosInterceptor } from "../utils/axiosInterceptor_Utils";
import { AuthProvider } from "../context/AuthContext";
import axios from "axios";

function App() {
  useEffect(() => {
    // Inicializar analytics al cargar la aplicación
    analyticsService.init().catch((error) => {
      console.error("[App] Error inicializando analytics:", error);
    });

    // 🔥 Setup global axios interceptor for 401 responses
    // Feature: 003-fix-session-expiry-handling
    setupAxiosInterceptor();

    // Manejar 401 — side effects: revocar refresh token, analytics, redirect
    // El estado de auth lo limpia AuthProvider al escuchar el mismo evento
    const handleUnauthorized = (event) => {
      setLogoutReason(LogoutReason.TOKEN_EXPIRED);

      const refreshToken = localStorage.getItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Notificar al servidor para revocar refresh token (fire and forget)
      axios
        .post('/api/auth/logout', refreshToken ? { refreshToken } : {})
        .catch((error) => {
          console.error('[App] Error calling /logout:', error);
        });

      // Track logout en analytics
      analyticsService.trackEvent('session_expired_401', {
        url: event.detail?.url,
        timestamp: event.detail?.timestamp
      });

      // Redirigir al login
      window.location.href = '/TNSTrack/';
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  return (
    <Router basename="/TNSTrack">
      {" "}
      {/* Asegúrate que el basename sea el correcto para tu despliegue */}
      <GlobalStyle /> {/* Estilos globales o resets aquí */}
      <AuthProvider>
        <SessionManager>
          <AppContent />
        </SessionManager>
      </AuthProvider>
      <Toaster /> {/* Componente para mostrar las notificaciones toast */}
    </Router>
  );
}
export default App;
