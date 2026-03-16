// App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import GlobalStyle from "../GlobalStyle.js"; // Asumiendo que tienes un GlobalStyle
import AppContent from "./AppContent";
import { SessionManager } from "./SessionManager";
import { Toaster } from "./ui/toaster"; // Componente para las notificaciones toast
import "../styles/globals.css"; // Tailwind CSS
import analyticsService from "../services/analytics_Service";
import { LogoutReason } from "../constants/logoutReason_Constants";
import { setLogoutReason } from "../utils/session_Utils";
import { setupAxiosInterceptor } from "../utils/axiosInterceptor_Utils";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Inicializar analytics al cargar la aplicación
    analyticsService.init().catch((error) => {
      console.error("[App] Error inicializando analytics:", error);
    });

    // 🔥 Setup global axios interceptor for 401 responses
    // Feature: 003-fix-session-expiry-handling
    setupAxiosInterceptor();

    // Check authentication status on mount usando token de localStorage
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        const response = await fetch('/api/auth/validate', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.error('[App] Auth check error:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for auth:unauthorized events (401 responses)
    const handleUnauthorized = (event) => {
      // Update auth state
      setIsAuthenticated(false);

      // Store logout reason
      setLogoutReason(LogoutReason.TOKEN_EXPIRED);

      // Limpiar tokens de localStorage
      const refreshToken = localStorage.getItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Notificar al servidor para revocar refresh token (fire and forget)
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {})
      }).catch((error) => {
        console.error('[App] Error calling /logout:', error);
      });

      // Track logout in analytics
      analyticsService.trackEvent('session_expired_401', {
        url: event.detail.url,
        timestamp: event.detail.timestamp
      });

      // Redirect to login (home page)
      window.location.href = '/TNSTrack/';
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Listen for successful logins to update auth state
  useEffect(() => {
    const handleLoginSuccess = (event) => {
      setIsAuthenticated(true);
    };

    window.addEventListener('auth:login_success', handleLoginSuccess);

    return () => {
      window.removeEventListener('auth:login_success', handleLoginSuccess);
    };
  }, []);

  return (
    <Router basename="/TNSTrack">
      {" "}
      {/* Asegúrate que el basename sea el correcto para tu despliegue */}
      <GlobalStyle /> {/* Estilos globales o resets aquí */}
      <SessionManager isAuthenticated={isAuthenticated}>
        <AppContent />
      </SessionManager>
      <Toaster /> {/* Componente para mostrar las notificaciones toast */}
    </Router>
  );
}
export default App;
