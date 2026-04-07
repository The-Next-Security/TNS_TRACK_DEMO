import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

/**
 * Normaliza el campo permissions (string CSV o array) y agrega ai_analysis
 * al array si corresponde.
 */
function normalizarPermisos(permissions, aiAnalysis) {
  let perms = [];
  if (!permissions) {
    perms = [];
  } else if (typeof permissions === 'string') {
    perms = permissions.split(',').map(p => p.trim()).filter(Boolean);
  } else if (Array.isArray(permissions)) {
    perms = [...permissions];
  }

  const tieneAI = aiAnalysis === true || aiAnalysis === 1 || aiAnalysis === '1';
  if (tieneAI && !perms.includes('ai_analysis')) {
    perms.push('ai_analysis');
  }
  return perms;
}

/**
 * AuthProvider — fuente única de verdad para el estado de autenticación.
 *
 * Responsabilidades:
 * - Verificar sesión al recargar página (page refresh)
 * - Escuchar evento auth:login_success para cargar datos sin llamada extra
 * - Escuchar evento auth:unauthorized para limpiar estado local
 * - Exponer isAuthenticated, userPermissions, user, isLoading y helpers
 */
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthData = useCallback((userData) => {
    const perms = normalizarPermisos(userData.permissions, userData.ai_analysis);
    setIsAuthenticated(true);
    setUserPermissions(perms);
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    setUserPermissions([]);
    setUser(null);
  }, []);

  /**
   * Verifica sesión llamando a /api/auth/validate.
   * Solo se ejecuta si existe token en localStorage — evita 401 innecesarios.
   */
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      clearAuth();
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await axios.get('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.valid && data.user) {
        setAuthData(data.user);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [setAuthData, clearAuth]);

  // Carga inicial (page refresh)
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login exitoso: usar datos del response directamente, sin llamada extra
  useEffect(() => {
    const handleLoginSuccess = (event) => {
      if (event.detail?.user) {
        setAuthData(event.detail.user);
      } else {
        checkAuth();
      }
    };
    window.addEventListener('auth:login_success', handleLoginSuccess);
    return () => window.removeEventListener('auth:login_success', handleLoginSuccess);
  }, [setAuthData, checkAuth]);

  // 401 → limpiar estado de autenticación local
  useEffect(() => {
    const handleUnauthorized = () => clearAuth();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearAuth]);

  const hasPermission = useCallback(
    (permName) => userPermissions.includes(permName),
    [userPermissions]
  );

  const value = {
    isAuthenticated,
    userPermissions,
    user,
    isLoading,
    hasPermission,
    setAuthData,
    clearAuth,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para consumir el contexto de autenticación.
 * Lanza error si se usa fuera de <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('[useAuth] Debe usarse dentro de <AuthProvider>');
  }
  return context;
}
