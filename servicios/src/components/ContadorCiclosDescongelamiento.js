// src/components/ContadorCiclosDescongelamiento.js
import React, { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import axios from "axios";
import Header from "./Header";
import {
  generarDatasetsGrafico,
  generarOpcionesGrafico,
  validarDatosGrafico,
  formatearFechaTooltip,
} from "../utils/chartConfigCiclos";
import "../assets/css/ContadorCiclosDescongelamiento.css";

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const ContadorCiclosDescongelamiento = () => {
  // Estados principales
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(null);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [datosCiclos, setDatosCiclos] = useState({});
  const [estadisticas, setEstadisticas] = useState(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(true);
  const [error, setError] = useState(null);

  // Referencias
  const abortControllerRef = useRef(null);
  const inicializacionCompleta = useRef(false);

  // Configuración
  const UBICACION_DEFAULT = 92498; // Cámara 1

  /**
   * Efecto de inicialización
   */
  useEffect(() => {
    inicializarComponente();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Efecto para cargar datos cuando cambian ubicación o mes
   */
  useEffect(() => {
    if (
        inicializacionCompleta.current &&
        ubicacionSeleccionada &&
        mesSeleccionado
    ) {
      cargarDatosCiclos();
    }
  }, [ubicacionSeleccionada, mesSeleccionado]);

  /**
   * Inicializa el componente cargando ubicaciones y configuración guardada
   */
  const inicializarComponente = async () => {
    try {
      await cargarUbicaciones();
      cargarConfiguracionGuardada();
      inicializacionCompleta.current = true;
    } catch (err) {
      console.error("Error en inicialización:", err);
      setError("Error al inicializar el componente");
    }
  };

  /**
   * Carga las ubicaciones disponibles desde la API
   */
  const cargarUbicaciones = async () => {
    try {
      setLoadingUbicaciones(true);
      const response = await axios.get("/api/contador-ciclos/ubicaciones");

      if (response.data.success && Array.isArray(response.data.data)) {
        setUbicaciones(response.data.data);
      } else {
        throw new Error("Formato de respuesta inválido");
      }
    } catch (err) {
      console.error("Error cargando ubicaciones:", err);
      setError("Error al cargar ubicaciones disponibles");
    } finally {
      setLoadingUbicaciones(false);
    }
  };

  /**
   * Carga la configuración guardada en localStorage
   */
  const cargarConfiguracionGuardada = () => {
    try {
      // Cargar ubicación guardada o usar default
      const ubicacionGuardada = localStorage.getItem(
          "contadorCiclos.ubicacion"
      );
      const ubicacionId = ubicacionGuardada
          ? parseInt(ubicacionGuardada)
          : UBICACION_DEFAULT;
      setUbicacionSeleccionada(ubicacionId);

      // Cargar mes guardado o usar mes actual
      const mesGuardado = localStorage.getItem("contadorCiclos.mes");
      if (mesGuardado && validarMesNoFuturo(mesGuardado)) {
        setMesSeleccionado(mesGuardado);
      } else {
        // Si no hay mes guardado válido, usar mes actual
        const mesActual = obtenerMesActual();
        setMesSeleccionado(mesActual);
      }
    } catch (err) {
      console.error("Error cargando configuración:", err);
      // Configuración por defecto en caso de error
      setUbicacionSeleccionada(UBICACION_DEFAULT);
      setMesSeleccionado(obtenerMesActual());
    }
  };

  /**
   * Guarda la configuración actual en localStorage
   */
  const guardarConfiguracion = () => {
    try {
      if (ubicacionSeleccionada) {
        localStorage.setItem(
            "contadorCiclos.ubicacion",
            ubicacionSeleccionada.toString()
        );
      }
      if (mesSeleccionado) {
        localStorage.setItem("contadorCiclos.mes", mesSeleccionado);
      }
    } catch (err) {
      console.warn("Error guardando configuración:", err);
    }
  };

  /**
   * Valida que un mes no sea futuro
   */
  const validarMesNoFuturo = (mes) => {
    const fechaActual = new Date();
    const mesActual = `${fechaActual.getFullYear()}-${String(
        fechaActual.getMonth() + 1
    ).padStart(2, "0")}`;
    return mes <= mesActual;
  };

  /**
   * Carga los datos de ciclos desde la API
   */
  const cargarDatosCiclos = async () => {
    if (!ubicacionSeleccionada || !mesSeleccionado) return;

    try {
      // Cancelar solicitud anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      // Construir parámetros de consulta para un solo mes
      const params = new URLSearchParams();
      params.append("meses", mesSeleccionado);
      params.append("ubicacion", ubicacionSeleccionada);

      const response = await axios.get(
          `/api/contador-ciclos/descongelamiento?${params.toString()}`,
          { signal: abortControllerRef.current.signal }
      );

      if (response.data.success) {
        setDatosCiclos(response.data.data.ciclos || {});
        setEstadisticas(response.data.data.estadisticas || null);
        guardarConfiguracion();
      } else {
        throw new Error(
            response.data.message || "Error en la respuesta del servidor"
        );
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error cargando datos:", err);
        const mensajeError =
            err.response?.data?.message ||
            err.message ||
            "Error al cargar datos de ciclos";
        setError(mensajeError);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de ubicación seleccionada
   */
  const manejarCambioUbicacion = (event) => {
    const nuevaUbicacion = parseInt(event.target.value);
    if (nuevaUbicacion !== ubicacionSeleccionada) {
      setUbicacionSeleccionada(nuevaUbicacion);
    }
  };

  /**
   * Maneja el cambio de mes seleccionado
   */
  const manejarCambioMes = (event) => {
    const nuevoMes = event.target.value;
    if (nuevoMes !== mesSeleccionado && validarMesNoFuturo(nuevoMes)) {
      setMesSeleccionado(nuevoMes);
    }
  };

  /**
   * Selecciona el mes actual
   */
  const seleccionarMesActual = () => {
    const mesActual = obtenerMesActual();
    setMesSeleccionado(mesActual);
  };

  /**
   * Limpia la selección actual
   */
  const limpiarSeleccion = () => {
    setMesSeleccionado("");
    setDatosCiclos({});
    setEstadisticas(null);
    setError(null);

    // Limpiar localStorage
    localStorage.removeItem("contadorCiclos.mes");
  };

  /**
   * Obtiene el mes actual en formato YYYY-MM
   */
  const obtenerMesActual = () => {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  /**
   * Genera las opciones de meses disponibles (últimos 12 meses)
   */
  const generarOpcionesMeses = () => {
    const opciones = [];
    const fechaActual = new Date();

    for (let i = 0; i < 12; i++) {
      const fecha = new Date(
          fechaActual.getFullYear(),
          fechaActual.getMonth() - i,
          1
      );
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const mesId = `${year}-${month}`;

      const nombreMes = fecha.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });

      opciones.push({
        id: mesId,
        nombre: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
      });
    }

    return opciones;
  };

  /**
   * Obtiene el nombre de la ubicación seleccionada
   */
  const obtenerNombreUbicacion = () => {
    const ubicacion = ubicaciones.find(
        (u) => u.channel_id === ubicacionSeleccionada
    );
    // CAMBIO: Solo devolver nombre_ubicacion
    return ubicacion ? ubicacion.nombre_ubicacion : "Ubicación no encontrada";
  };

  /**
   * Renderiza los controles principales - Diseño mejorado pero conservador
   */
  const renderizarControles = () => {
    const opcionesMeses = generarOpcionesMeses();

    return (
        <div className="controles-principales">
          <div className="controles-grid">
            {/* Selector de ubicación */}
            <div className="selector-ubicacion">
              <label htmlFor="ubicacion-select">Ubicación:</label>
              <select
                  id="ubicacion-select"
                  value={ubicacionSeleccionada || ""}
                  onChange={manejarCambioUbicacion}
                  disabled={loadingUbicaciones || loading}
              >
                <option value="" disabled>
                  {loadingUbicaciones
                      ? "Cargando ubicaciones..."
                      : "Seleccionar ubicación"}
                </option>
                {ubicaciones.map((ubicacion) => (
                    <option key={ubicacion.channel_id} value={ubicacion.channel_id}>
                      {/* CAMBIO: Solo mostrar nombre de ubicación */}
                      {ubicacion.nombre_ubicacion}
                    </option>
                ))}
              </select>
            </div>

            {/* Selector de mes - MonthPicker simple */}
            <div className="selector-mes">
              <label htmlFor="mes-select">Mes:</label>
              <select
                  id="mes-select"
                  className="month-picker"
                  value={mesSeleccionado}
                  onChange={manejarCambioMes}
                  disabled={loading}
              >
                <option value="" disabled>
                  Seleccionar mes
                </option>
                {opcionesMeses.map((mes) => (
                    <option key={mes.id} value={mes.id}>
                      {mes.nombre}
                    </option>
                ))}
              </select>
            </div>

            {/* Botones de acción */}
            <div className="botones-accion">
              <button
                  className={`btn btn-primary ${loading ? "loading" : ""}`}
                  onClick={seleccionarMesActual}
                  disabled={loading}
              >
                Mes Actual
              </button>
              <button
                  className="btn btn-outline"
                  onClick={limpiarSeleccion}
                  disabled={loading || !mesSeleccionado}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
    );
  };

  /**
   * Renderiza las estadísticas - Simplificado para un mes
   */
  const renderizarEstadisticas = () => {
    if (
        !estadisticas ||
        !estadisticas.meses ||
        estadisticas.meses.length === 0
    ) {
      return null;
    }

    const estadisticaMes = estadisticas.meses[0]; // Solo un mes

    return (
        <div className="estadisticas-seccion">
          <h3 className="estadisticas-titulo">Estadísticas del Mes</h3>
          <div className="estadistica-mes">
            <h4>
              {estadisticaMes.nombreMes} {estadisticaMes.año}
            </h4>
            <div className="estadisticas-grid">
              <div className="estadistica-item">
                <span className="estadistica-label">Promedio de ciclos:</span>
                <span className="estadistica-valor">
                {estadisticaMes.promedioCiclos}
              </span>
              </div>
              <div className="estadistica-item">
              <span className="estadistica-label">
                Promedio de minutos por día:
              </span>
                <span className="estadistica-valor">
                {estadisticaMes.promedioMinutos} min
              </span>
              </div>
              <div className="estadistica-item">
                <span className="estadistica-label">Porcentaje tiempo del mes transcurrido:</span>
                <span className="estadistica-valor">
                {estadisticaMes.porcentajeMes}%
              </span>
              </div>
              <div className="estadistica-item">
                <span className="estadistica-label">Días con datos:</span>
                <span className="estadistica-valor">
                {estadisticaMes.diasConDatos}/{estadisticaMes.diasEnMes}
              </span>
              </div>
            </div>
          </div>
        </div>
    );
  };

  /**
   * Renderiza el gráfico
   */
  const renderizarGrafico = () => {
    // Estado de carga
    if (loading) {
      return (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-texto">Cargando datos de ciclos...</div>
          </div>
      );
    }

    // Estado de error
    if (error) {
      return (
          <div className="error-container">
            <div className="error-texto">Error al cargar datos</div>
            <div className="error-detalle">{error}</div>
          </div>
      );
    }

    // Sin mes seleccionado
    if (!mesSeleccionado) {
      return (
          <div className="sin-datos-container">
            <div className="sin-datos-texto">
              Seleccione un mes para visualizar
            </div>
          </div>
      );
    }

    // Sin datos
    if (!datosCiclos || Object.keys(datosCiclos).length === 0) {
      return (
          <div className="sin-datos-container">
            <div className="sin-datos-texto">Sin datos disponibles</div>
            <div className="error-detalle">
              No hay datos para el mes seleccionado en {obtenerNombreUbicacion()}
            </div>
          </div>
      );
    }

    // Validar datos antes de renderizar
    const validacion = validarDatosGrafico(datosCiclos, mesSeleccionado);
    if (!validacion.esValido) {
      return (
          <div className="error-container">
            <div className="error-texto">Error en los datos</div>
            <div className="error-detalle">{validacion.errores.join(", ")}</div>
          </div>
      );
    }

    // Generar datos y opciones para Chart.js - MANTENER SIMPLE
    const chartData = generarDatasetsGrafico(datosCiclos, mesSeleccionado);
    const chartOptions = generarOpcionesGrafico(600); // Altura fija

    return (
        <div className="grafico-contenedor">
          <Bar data={chartData} options={chartOptions} />
        </div>
    );
  };

  // Renderizado principal
  return (
      <div className="contador-ciclos-container">
        <div className="contador-ciclos-header">
          <Header title="Contador de Ciclos de Descongelamiento" />
        </div>

        {renderizarControles()}

        {renderizarEstadisticas()}

        <div className="grafico-seccion">{renderizarGrafico()}</div>
      </div>
  );
};

export default ContadorCiclosDescongelamiento;