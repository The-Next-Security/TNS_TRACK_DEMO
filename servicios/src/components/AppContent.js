import React, { useState, useEffect } from "react";
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import DashboardElectrico from "./DashboardElectrico_View";
import ConsumoElectrico from "./ConsumoElectrico_View";
import ConsumoTotalDiario from "./ConsumoTotalDiario_View";
import ConsumoTotalMensual from "./ConsumoTotalMensual_View";
import ConsumoTotalAnual from "./ConsumoTotalAnual_View";
import DashboardTemperatura from "./DashboardTemperatura_View";
import LastKnownPosition from "./LastKnownPosition_View";
import PersonSearch from "./PersonSearch_View";
import LandingPage from "./LandingPage_View";
import SelectRoutine from "./SelectRoutine_View";
import HistoricalMovementsSearch from "./HistoricalMovementsSearch_View";
import Configuration from "./Configuration_View";
import UserRegistration from "./UserRegistration_View";
import ForgotPassword from "./ForgotPassword_View";
import ResetPassword from "./ResetPassword_View";
import TemperaturaCamaras from "./TemperaturaCamaras_View";
import DefrostAnalysis from "./DefrostAnalysis_View";
import IntelligenciaDatosTemperatura from "./IntelligenciaDatosTemperatura_View";
import ParametroTempCamaras from "./ParametroTempCamaras_View";
import TemperaturePowerAnalysis from "./TemperaturePowerAnalysis_View";
import AlertManagementView from "./AlertManagement_View";
import AlertNotificationConfigView from "./AlertNotificationConfig_View";
import NotificationHorariosEnvioView from "./NotificationHorariosEnvio_View";
import AlertMetricsDashboardView from "./AlertMetricsDashboard_View";
import ReportDashboardView from "./reports/ReportDashboard_View";
import AIAnalysisView from "./AIAnalysis_View";
import ReportGeneratorView from "./reports/ReportGenerator_View";
import ReportSchedulerView from "./reports/ReportScheduler_View";
import ReportHistoryPageView from "./reports/ReportHistoryPage_View";
import "core-js/stable";
import "regenerator-runtime/runtime";

// ✅ PrivateRoute basado en validación con Authorization header
const PrivateRoute = ({ children, userPermissions }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);
  const location = useLocation();

  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    // Validar autenticación con el backend (token en Authorization header via interceptor axios)
    fetch('/api/auth/validate', {
      headers: { Authorization: `Bearer ${token}` }
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
    // ✅ Obtener permisos desde el endpoint de validación
    const token = localStorage.getItem('accessToken');
    fetch('/api/auth/validate', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
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
              <AlertManagementView />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion-notificaciones"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AlertNotificationConfigView />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion-horarios-envio"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <NotificationHorariosEnvioView />
            </PrivateRoute>
          }
        />
        <Route
          path="/metricas-alertas"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AlertMetricsDashboardView />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportDashboardView />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/generate"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportGeneratorView />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/scheduled"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportSchedulerView />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/history"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <ReportHistoryPageView userPermissions={userPermissions} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-analysis"
          element={
            <PrivateRoute userPermissions={userPermissions}>
              <AIAnalysisView userPermissions={userPermissions} />
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
