import React, { useState, useEffect } from "react";
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import DashboardElectrico from "./DashboardElectricoV2"; // Migrado a V2
import ConsumoElectrico from "./ConsumoElectricoV2"; // Migrado a V2
import ConsumoTotalDiario from "./ConsumoTotalDiarioV2" // Usa V2 components internamente
import ConsumoTotalMensual from "./ConsumoTotalMensualV2"; // Usa V2 components internamente
import ConsumoTotalAnual from "./ConsumoTotalAnualV2"; // Usa V2 components internamente
import DashboardTemperatura from "./DashboardTemperaturaV2"; // Migrado a V2
import LastKnownPosition from "./LastKnownPositionV2"; // Migrado a V2
import UbicacionTiempoRealInteriores from "./UbicacionTiempoRealInteriorV2"; // Migrado a V2
import PersonSearch from "./PersonSearchV2"; // Migrado a V2
import LandingPage from "./LandingPageV2"; // Migrado a V2
import SelectRoutine from "./SelectRoutineV2"; // Migrado a V2
import HistoricalMovementsSearch from "./HistoricalMovementsSearchV2"; // Migrado a V2
import Configuration from "./ConfigurationV2"; // Migrado a V2
import DoorStatusMatrix from "./DoorStatusMatrixV2"; // Migrado a V2
import UserRegistration from "./UserRegistrationV2"; // Migrado a V2
import ForgotPassword from "./ForgotPasswordV2"; // Migrado a V2
import ResetPassword from "./ResetPasswordV2"; // Migrado a V2
import TemperaturaCamaras from "./TemperaturaCamarasV2"; // Migrado a V2
import DefrostAnalysis from "./DefrostAnalysisV2"; // Migrado a V2
import IntelligenciaDatosTemperatura from "./IntelligenciaDatosTemperaturaV2"; // Migrado a V2
import ParametroTempCamaras from "./ParametroTempCamarasV2"; // Migrado a V2
import TemperaturePowerAnalysis from "./TemperaturePowerAnalysisV2"; // Migrado a V2
import AlertManagementV2 from "./AlertManagementV2"; // Sistema de gestión de alertas
import AlertNotificationConfigV2 from "./AlertNotificationConfigV2"; // Configuración de notificaciones
import AlertMetricsDashboardV2 from "./AlertMetricsDashboardV2"; // Dashboard de métricas de alertas
import ReportDashboardV2 from "./reports/ReportDashboardV2"; // Dashboard de reportes (Feature 004)
import AIAnalysisV2 from "./AIAnalysisV2"; // AI Cold Chamber Analysis (Feature 005)
import ReportGeneratorV2 from "./reports/ReportGeneratorV2"; // Generador de reportes (Feature 004)
import ReportSchedulerV2 from "./reports/ReportSchedulerV2"; // Scheduler de reportes (Feature 004 - Phase 4)
import ReportHistoryPage from "./reports/ReportHistoryPage"; // Historial completo de reportes (Feature 004 - Phase 5)
import "core-js/stable";
import "regenerator-runtime/runtime";

// ✅ Nuevo PrivateRoute basado en validación de cookies httpOnly
const PrivateRoute = ({ children, userPermissions }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);
  const location = useLocation();

  React.useEffect(() => {
    // Validar autenticación con el backend (las cookies se envían automáticamente)
    fetch('/api/auth/validate', {
      credentials: 'include' // ✅ Importante para enviar cookies
    })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // Mostrar loading mientras verifica
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, guardar URL y redirigir al login
  if (!isAuthenticated) {
    // ✅ NUEVO: Guardar URL completa (pathname + search params) para redirigir después del login
    // Solo guardar si tiene parámetros de alerta para evitar loops innecesarios
    const fullPath = location.pathname + location.search;
    if (location.search.includes('alertId') || location.search.includes('channelId')) {
      sessionStorage.setItem('redirectAfterLogin', fullPath);
      console.log('[PrivateRoute] URL guardada para redirect después del login:', fullPath);
    }

    return <Navigate to="/" replace />;
  }

  return React.cloneElement(children, { userPermissions });
};

function AppContent() {
  const [userPermissions, setUserPermissions] = useState([]);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#E1E9F2");
  const location = useLocation();

  useEffect(() => {
    // ✅ Obtener permisos desde el endpoint de validación en vez de localStorage
    fetch('/api/auth/validate', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user && data.user.permissions) {
          const perms = typeof data.user.permissions === 'string'
            ? data.user.permissions.split(",")
            : data.user.permissions;
          setUserPermissions(perms);
        }
      })
      .catch(error => {
        console.error("Error fetching user permissions:", error);
      });

    const savedColor = localStorage.getItem("appBackgroundColor");
    if (savedColor) {
      setBackgroundColor(savedColor);
    }
  }, []);

  const routesWithoutSideNav = ["/"];
  const shouldShowSideNav =
    !routesWithoutSideNav.includes(location.pathname) &&
    userPermissions.length > 0;

  const handleNavExpand = (expanded) => {
    setIsNavExpanded(expanded);
  };

  const changeBackgroundColor = (color) => {
    setBackgroundColor(color);
    localStorage.setItem("appBackgroundColor", color);
  };

  return (
    <div className="app-container" style={{ backgroundColor: backgroundColor }}>
      {" "}
      {/* Aplicar backgroundColor */}
      <div className="w-full flex-1">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/dashboard-electrico" element={<DashboardElectrico />} />
        <Route path="/consumo-electrico" element={<ConsumoElectrico />} />
        <Route path="/consumo-total-diario" element={<ConsumoTotalDiario />} />
        <Route path="/consumo-total-mensual" element={<ConsumoTotalMensual />} />
        <Route path="/consumo-total-anual" element={<ConsumoTotalAnual />} />
        <Route
          path="/select-routine"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <SelectRoutine />
            </PrivateRoute>
          }
        />
        <Route
          path="/register-user"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <UserRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/temperatura-camaras"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <TemperaturaCamaras />
            </PrivateRoute>
          }
        />
        <Route
          path="/parametro-temp-camaras"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ParametroTempCamaras />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard-temperatura"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <DashboardTemperatura />
            </PrivateRoute>
          }
        />
        <Route
          path="/analisis-deshielo"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <DefrostAnalysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/inteligencia-datos-temperatura"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <IntelligenciaDatosTemperatura />
            </PrivateRoute>
          }
        />

        <Route
          path="/busqueda-entradas-persona"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <PersonSearch />
            </PrivateRoute>
          }
        />
        <Route
          path="/consulta-historica-movimientos"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <HistoricalMovementsSearch />
            </PrivateRoute>
          }
        />
        <Route
          path="/last-known-position"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <LastKnownPosition />
            </PrivateRoute>
          }
        />
        

        <Route
          path="/door-status-matrix"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <DoorStatusMatrix />
            </PrivateRoute>
          }
        />
        <Route
          path="/analisis-temperatura-potencia"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <TemperaturePowerAnalysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/gestion-alertas"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AlertManagementV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion-notificaciones"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AlertNotificationConfigV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/metricas-alertas"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AlertMetricsDashboardV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportDashboardV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/generate"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportGeneratorV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/scheduled"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportSchedulerV2 />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/history"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportHistoryPage userPermissions={userPermissions} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-analysis"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AIAnalysisV2 userPermissions={userPermissions} />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
    </div>
  );
}

export default AppContent;
