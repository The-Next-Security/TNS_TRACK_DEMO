// src/components/consumption/ConsumptionChartV2.js - Migrated to Tailwind CSS (styles only)
import React, { useRef, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  generateMixedChartDatasets,
  generateChartOptions,
  validateChartData,
} from "../../utils/consumption/chart_Utils";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { cn } from "../../lib/utils";

// Registrar componentes de Chart.js
ChartJS.register(
  TimeScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

const ConsumptionChartV2 = ({
  data = [],
  period = "daily",
  height = 700, // ✅ Altura por defecto grande
  loading = false,
  error = null,
  onBarClick = null,
  onDataPointHover = null,
  className = "",
}) => {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Procesar datos cuando cambian las props
  useEffect(() => {
    processChartData();
  }, [data, period, height]);

  /**
   * Procesa los datos para el gráfico
   */
  const processChartData = () => {
    try {
      const validation = validateChartData(data, period);

      if (!validation.isValid) {
        setValidationError(validation.errors.join(", "));
        setChartData(null);
        setChartOptions(null);
        return;
      }

      if (validation.warnings.length > 0) {
        // No mostrar warnings como errores, solo loguear
        console.warn(
          "Advertencias en datos del gráfico:",
          validation.warnings.join(", ")
        );
      }

      // Si no hay datos pero la validación pasó (ej. array vacío), no es un error de validación.
      if (data.length === 0 && validation.isValid) {
        setChartData({ labels: [], datasets: [] }); // Configuración para gráfico vacío
        setChartOptions(
          generateChartOptions(period, {
            height,
            maintainAspectRatio: false,
            responsive: true,
            onClick: handleChartClick,
            onHover: handleChartHover,
          })
        );
        setValidationError(null);
        return;
      }

      const datasets = generateMixedChartDatasets(data, period);
      const options = generateChartOptions(period, {
        height,
        onClick: handleChartClick,
        onHover: handleChartHover,
        maintainAspectRatio: false, // ✅ Permitir que el gráfico llene el contenedor
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "center",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: "rect",
              font: {
                size: 14,
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: {
                size: 12,
              },
            },
            title: {
              font: {
                size: 14,
              },
            },
          },
          "y-left": {
            ticks: {
              font: {
                size: 12,
              },
            },
            title: {
              font: {
                size: 14,
              },
            },
          },
          "y-right": {
            ticks: {
              font: {
                size: 12,
              },
            },
            title: {
              font: {
                size: 14,
              },
            },
          },
        },
      });

      setChartData(datasets);
      setChartOptions(options);
      setValidationError(null);
    } catch (err) {
      console.error("Error procesando datos del gráfico:", err);
      setValidationError(`Error procesando datos: ${err.message}`);
      setChartData(null);
      setChartOptions(null);
    }
  };

  /**
   * Maneja clics en el gráfico
   */
  const handleChartClick = (event, elements) => {
    if (!onBarClick || !elements.length) return;

    try {
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;

      if (
        chartData &&
        chartData.originalData &&
        chartData.originalData[dataIndex]
      ) {
        const clickedData = {
          dataPoint: chartData.originalData[dataIndex],
          dataset: chartData.datasets[datasetIndex],
          dataIndex,
          datasetIndex,
          period,
        };
        onBarClick(clickedData);
      }
    } catch (err) {
      console.error("Error en handleChartClick:", err);
    }
  };

  /**
   * Maneja hover sobre el gráfico
   */
  const handleChartHover = (event, elements) => {
    if (!onDataPointHover) return;

    try {
      if (elements.length > 0) {
        const element = elements[0];
        const dataIndex = element.index;

        if (
          chartData &&
          chartData.originalData &&
          chartData.originalData[dataIndex]
        ) {
          onDataPointHover(chartData.originalData[dataIndex]);
        }
      } else {
        onDataPointHover(null);
      }
    } catch (err) {
      console.error("Error en handleChartHover:", err);
    }
  };

  // Renderizado condicional por estados
  const displayError = error || validationError;

  if (loading) {
    return (
      <div className={cn("w-full p-4", className)} style={{ height: `${height}px` }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (displayError) {
    return (
      <div className={cn("w-full p-4", className)} style={{ height: `${height}px` }}>
        <Alert variant="destructive">
          <AlertDescription>
            <h3 className="font-bold mb-2">Error en el Gráfico</h3>
            <p>{displayError}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Manejar el caso de datos vacíos después de la carga y sin errores
  if (
    !chartData ||
    !chartData.datasets ||
    chartData.datasets.length === 0 ||
    (chartData.labels && chartData.labels.length === 0)
  ) {
    return (
      <div className={cn("w-full p-4", className)} style={{ height: `${height}px` }}>
        <Alert>
          <AlertDescription>
            <h3 className="font-bold mb-2">Sin Datos</h3>
            <p>No hay datos disponibles para mostrar el gráfico.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* ✅ Este div es crucial para el tamaño del canvas - ancho completo */}
      <div
        className="w-full box-border"
        style={{
          height: `${height}px`,
          padding: "1rem 0.25rem", // ✅ Padding mínimo en los lados
        }}
      >
        <Bar
          ref={chartRef}
          data={chartData}
          options={chartOptions}
          style={{
            width: "100% !important", // ✅ Forzar ancho completo
            height: "100% !important",
          }}
        />
      </div>
    </div>
  );
};

export default ConsumptionChartV2;