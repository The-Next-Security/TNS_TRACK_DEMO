// SideNavV2.js
import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

// Importa las imágenes y datos de las rutinas
import dashboardImage from "../assets/images/dashboard.png";
import ubicaciontiemporealinteriorImage from "../assets/images/ubicaciontiemporealinterior.png";
import personSearchImage from "../assets/images/person_search.png";
import interiorLocationsImage from "../assets/images/plano_super.png";
import historicalMovementsImage from "../assets/images/historical_movements1.png";
import dataIntelligenceImage from "../assets/images/data_intelligence.png";
import configurationImage from "../assets/images/configuration.png";
import presenciaImage from "../assets/images/presencia.png";
import smsDataImage from "../assets/images/sms_data.png";
import doorStatusImage from "../assets/images/door_status.png";
import userRegistrationImage from "../assets/images/user_registration.png";
import temperaturaImage from "../assets/images/temperatura.png";
import selectRoutineImage from "../assets/images/selectroutine.png";
import temperaturaCamarasImage from "../assets/images/thermometer.png";
import detectionImage from "../assets/images/detection.png";
import dashboardTemperaturaImage from "../assets/images/dashboard_temperatura.png";
import descargadatostempImage from "../assets/images/descargadatostemp.png";

const routines = [
  {
    title: "Seleccionar Rutina",
    image: selectRoutineImage,
    route: "/select-routine",
    permission: "view_dashboard",
  },
  {
    title: "Dashboard",
    image: dashboardImage,
    route: "/dashboard",
    permission: "view_dashboard",
  },
  {
    title: "Intrusiones Blind Spot",
    image: detectionImage,
    route: "/blind-spot-intrusions",
    permission: "view_blind_spot_intrusions",
  },
  {
    title: "Interior : Ubicación en Tiempo Real",
    image: ubicaciontiemporealinteriorImage,
    route: "/ubicaciones-interior",
    permission: "view_interior",
  },
  {
    title: "Interior : Búsqueda Histórica Ubicación",
    image: personSearchImage,
    route: "/busqueda-entradas-persona",
    permission: "search_interior",
  },
  {
    title: "Exterior : Ubicación Tiempo Real",
    image: interiorLocationsImage,
    route: "/last-known-position",
    permission: "view_exterior",
  },
  {
    title: "Exterior : Búsqueda Histórica Ubicación",
    image: historicalMovementsImage,
    route: "/consulta-historica-movimientos",
    permission: "search_exterior",
  },
  {
    title: "Sectores : Presencia Personal",
    image: presenciaImage,
    route: "/presencia",
    permission: "view_presence",
  },
  {
    title: "Mensajes SOS : Visualización por Ubicación",
    image: smsDataImage,
    route: "/sms-data",
    permission: "view_sms",
  },
  {
    title: "Temperatura",
    image: temperaturaImage,
    route: "/temperatura",
    permission: "view_temperature",
  },
  {
    title: "Dashboard Temperatura",
    image: dashboardTemperaturaImage,
    route: "/dashboard-temperatura",
    permission: "view_temperature_dashboard",
  },
  {
    title: "Temperaturas Cámaras de Frío",
    image: temperaturaCamarasImage,
    route: "/temperatura-camaras",
    permission: "view_temperature_camaras",
  },
  {
    title: "Inteligencia de Datos Temperatura",
    image: descargadatostempImage,
    route: "/inteligencia-datos-temperatura",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "Puertas : Status Cierre / Apertura",
    image: doorStatusImage,
    route: "/door-status-matrix",
    permission: "view_door_status",
  },
  {
    title: "Datos : Análisis Forense",
    image: dataIntelligenceImage,
    route: "/inteligencia-de-datos",
    permission: "view_data_intelligence",
  },
  {
    title: "Parametrización",
    image: configurationImage,
    route: "/configuracion",
    permission: "view_configuration",
  },
  {
    title: "Registrar Usuario",
    image: userRegistrationImage,
    route: "/register-user",
    permission: "create_users",
  },
];

const SideNavV2 = ({ userPermissions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const location = useLocation();

  const loadSideNav = useCallback(() => {
    setIsLoading(true);
    // Simula una carga asíncrona
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    loadSideNav();

    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loadSideNav]);

  const filteredRoutines = userPermissions
    ? routines.filter((routine) => userPermissions.includes(routine.permission))
    : [];

  useEffect(() => {
    if (!isLoading && filteredRoutines.length === 0 && retryCount < 3) {
      // Si no hay rutinas filtradas, intenta cargar de nuevo
      setRetryCount((prev) => prev + 1);
      loadSideNav();
    }
  }, [isLoading, filteredRoutines.length, retryCount, loadSideNav]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isDesktop) {
    return null; // No renderiza nada en dispositivos móviles
  }

  if (isLoading) {
    return (
      <div className="p-5 text-center bg-gray-100 border border-gray-300 rounded m-2.5">
        Cargando...
      </div>
    );
  }

  if (filteredRoutines.length === 0) {
    return (
      <div className="p-5 text-center text-red-800 bg-red-100 border border-red-300 rounded m-2.5">
        No se pudo cargar el menú
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 h-screen bg-gray-100 overflow-y-auto transition-all duration-300 ease-in-out z-[1000]",
        isExpanded ? "w-[250px]" : "w-[60px]"
      )}
    >
      {/* Expand/collapse button */}
      <button
        onClick={toggleExpand}
        className="w-full p-2.5 bg-gray-300 border-0 cursor-pointer hover:bg-gray-400 transition-colors"
      >
        {isExpanded ? "<<" : ">>"}
      </button>

      {/* Menu items with permission filtering */}
      {filteredRoutines.map((routine, index) => (
        <Link
          key={index}
          to={routine.route}
          className={cn(
            "flex items-center p-2.5 no-underline text-gray-800 transition-colors duration-300",
            "hover:bg-gray-300",
            location.pathname === routine.route && "bg-gray-300",
            !isExpanded && "justify-center"
          )}
          title={routine.title}
        >
          <img
            src={routine.image}
            alt={routine.title}
            className={cn(
              "w-[30px] h-[30px] object-contain flex-shrink-0",
              isExpanded && "mr-2.5"
            )}
            loading="lazy"
          />
          {isExpanded && (
            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {routine.title}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
};

export default SideNavV2;