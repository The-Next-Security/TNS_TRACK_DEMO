// HeaderV2.js - Migrado a Shadcn/UI
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import analyticsService from "../services/analyticsService";
import { LogoutReason } from "../constants/LogoutReason";
import { setLogoutReason } from "../utils/sessionUtils";
import { broadcastLogout } from "../utils/crossTabSync";

// Assets
import homeIcon from "../assets/images/home_white.png";
import tnsTrackLogo from "../assets/images/TNS Track White.png";
import alertGif from "../assets/images/alert.gif";
import sirenaGif from "../assets/images/Sirena.gif";

/**
 * Header - Navegación Global
 *
 * Componente de cabecera principal de la aplicación con:
 * - Logo y navegación home
 * - Título dinámico de la página
 * - Notificaciones en tiempo real (SMS, Incidencias)
 * - Botón de logout
 * - Diseño responsive
 *
 * @param {Object} props
 * @param {string} props.title - Título de la página actual
 * @param {string} [props.image] - URL del ícono de la rutina (opcional)
 */
const HeaderV2 = ({ title, image }) => {
  const [newSms, setNewSms] = useState(false);
  const [newIncidencia, setNewIncidencia] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const routineTitle = state?.title || title;
  const routineImage = state?.image || image;

  useEffect(() => {
    // Socket.IO para notificaciones en tiempo real
    // Solo conectar en producción, deshabilitado en desarrollo local
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    if (!isProduction) {
      console.log('[Dev] Socket.IO deshabilitado en desarrollo local');
      return; // No conectar en desarrollo
    }

    const socket = io('https://tns.thenextsecurity.cl:1337');

    socket.on("new_sms", (data) => {
      setNewSms(true);
    });

    socket.on("nueva_incidencia", (data) => {
      setNewIncidencia(true);
    });

    // Detección responsive
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      if (isProduction) {
        socket.disconnect();
      }
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleHomeClick = () => {
    navigate("/select-routine");
  };

  const handleLogoutClick = async () => {
    // ✅ FEATURE: 003-fix-session-expiry-handling
    // Store logout reason
    setLogoutReason(LogoutReason.MANUAL);

    // Broadcast to other tabs
    broadcastLogout(LogoutReason.MANUAL);

    // 🆕 ANALYTICS: Trackear logout ANTES de limpiar
    try {
      analyticsService.trackLogout();
    } catch (error) {
      console.error('[Analytics] Error tracking logout:', error);
    }

    // Clear auth cookies via /logout endpoint
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[Header] Error calling /logout:', error);
    }

    // Clean up localStorage (legacy)
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");

    // Redirect to login
    navigate("/");
  };

  const handleSmsClick = () => {
    setNewSms(false);
    navigate("/sms-data");
  };

  const handleIncidenciaClick = () => {
    setNewIncidencia(false);
    navigate("/blind-spot-intrusions");
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between",
        "bg-[#6b9fd4] text-white",
        "px-3 sm:px-5 py-2.5",
        "h-[70px]",
        "transition-all duration-300"
      )}
    >
      {/* Left Section - Home Icon & Logo */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-none">
        <img
          src={homeIcon}
          alt="Home"
          className={cn(
            "cursor-pointer transition-opacity hover:opacity-80",
            "h-8 sm:h-9",
            "w-auto object-contain"
          )}
          onClick={handleHomeClick}
        />
        <img
          src={tnsTrackLogo}
          alt="TNS Track"
          className={cn(
            "h-8 sm:h-9",
            "w-auto object-contain max-w-[120px] sm:max-w-[150px]"
          )}
        />
      </div>

      {/* Center Section - Routine Title & Icon */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 sm:gap-3",
          "flex-1 mx-2 sm:mx-4",
          "min-w-0"
        )}
      >
        {routineImage && (
          <img
            src={routineImage}
            alt="Routine"
            className="h-6 sm:h-7 w-auto object-contain flex-shrink-0"
          />
        )}
        <h1
          className={cn(
            "font-semibold text-center",
            "whitespace-nowrap overflow-hidden text-ellipsis",
            "text-base sm:text-lg md:text-xl",
            "m-0 leading-tight"
          )}
        >
          {routineTitle}
        </h1>
      </div>

      {/* Right Section - Notifications & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-none justify-end">
        {/* SMS Notification */}
        {newSms && (
          <img
            src={alertGif}
            alt="New SMS"
            className={cn(
              "cursor-pointer transition-opacity hover:opacity-80",
              "h-7 sm:h-8",
              "w-auto object-contain"
            )}
            onClick={handleSmsClick}
          />
        )}

        {/* Incidencia Notification */}
        {newIncidencia && (
          <img
            src={sirenaGif}
            alt="Nueva Incidencia"
            className={cn(
              "cursor-pointer transition-opacity hover:opacity-80",
              "h-7 sm:h-8",
              "w-auto object-contain"
            )}
            onClick={handleIncidenciaClick}
          />
        )}

        {/* Logout Button - Using Shadcn Button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogoutClick}
          className={cn(
            "bg-[#ff4d4d] hover:bg-[#ff3333]",
            "transition-colors duration-200",
            "text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2",
            "h-8 sm:h-9"
          )}
        >
          Logout
        </Button>
      </div>
    </header>
  );
};

export default HeaderV2;
