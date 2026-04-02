// HeaderV2.js - Migrado a Shadcn/UI
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import analyticsService from "../services/analytics_Service";
import { LogoutReason } from "../constants/logoutReason_Constants";
import { setLogoutReason } from "../utils/session_Utils";
import { broadcastLogout } from "../utils/crossTabSync_Utils";

// Assets
import homeIcon from "../assets/images/home_white.png";
import tnsTrackLogo from "../assets/images/TNS Track White.png";

/**
 * Header - Navegación Global
 *
 * Componente de cabecera principal de la aplicación con:
 * - Logo y navegación home
 * - Título dinámico de la página
 * - Botón de logout
 * - Diseño responsive
 *
 * @param {Object} props
 * @param {string} props.title - Título de la página actual
 * @param {string} [props.image] - URL del ícono de la rutina (opcional)
 */
const HeaderV2 = ({ title, image }) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const routineTitle = state?.title || title;
  const routineImage = state?.image || image;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

    // Limpiar tokens de localStorage y revocar refresh en servidor
    const refreshToken = localStorage.getItem('refreshToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");

    try {
      await axios.post('/api/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (error) {
      console.error('[Header] Error calling /logout:', error);
    }

    // Redirect to login
    navigate("/");
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

      {/* Right Section - Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-none justify-end">
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
