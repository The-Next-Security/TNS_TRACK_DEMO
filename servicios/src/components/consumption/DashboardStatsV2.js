// src/components/consumption/DashboardStatsV2.js - Migrated to Tailwind CSS + Shadcn Card
import React from "react";
import { DateTime } from "luxon";
import {
  formatCurrency,
  formatEnergy,
  formatNumber,
} from "../../utils/consumption/chart_Utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

const TZ = "America/Santiago";

const DashboardStatsV2 = ({
  data,
  period,
  deviceInfo = null,
  showDeviceInfo = true,
  showCategoryBreakdown = true,
  className = "",
}) => {
  /**
   * ✅ CORRECCIÓN CRÍTICA: Calcula los totales correctamente según el período
   */
  const calculateTotals = () => {
    if (!data || data.length === 0) {
      return {
        moneyTotal: 0,
        energyTotal: 0,
        categoryTotals: {
          apagado: 0,
          bajo: 0,
          medio: 0,
          alto: 0,
          total: 0,
        },
        recordCount: 0,
      };
    }

    let moneyTotal;
    let energyTotal;

    if (period === "daily") {
      // ✅ PARA VISTA DIARIA:
      // - costo_total de cada hora representa el costo DE ESA HORA
      // - Para obtener el total del día, SUMAMOS todos los costos horarios
      // - costo_acumulado (si existe) debería ser la suma progresiva

      moneyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.costo_total || 0),
        0
      );

      // Verificar si tenemos costo_acumulado y usar el máximo como verificación
      const maxCostoAcumulado = Math.max(
        ...data.map((item) => parseFloat(item.costo_acumulado || 0))
      );

      // Si el costo acumulado es significativamente mayor, usar ese
      if (maxCostoAcumulado > moneyTotal && maxCostoAcumulado > 0) {
        moneyTotal = maxCostoAcumulado;
      }

      // Para energía diaria: sumar todas las energías horarias
      energyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.energia_activa_total || 0),
        0
      );
    } else if (period === "monthly") {
      // ✅ PARA VISTA MENSUAL:
      // - Cada registro representa UN DÍA completo
      // - Sumamos todos los días del mes
      moneyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.costo_total || 0),
        0
      );

      energyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.energia_activa_total || 0),
        0
      );
    } else if (period === "yearly") {
      // ✅ PARA VISTA ANUAL:
      // - Cada registro representa UN MES completo
      // - Sumamos todos los meses del año
      moneyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.costo_total || 0),
        0
      );

      energyTotal = data.reduce(
        (sum, item) => sum + parseFloat(item.energia_activa_total || 0),
        0
      );
    }


    // Calcular totales de categorización
    const categoryTotals = data.reduce(
      (totals, item) => {
        if (item.categorias) {
          totals.apagado += item.categorias.apagado?.cantidad || 0;
          totals.bajo += item.categorias.bajo?.cantidad || 0;
          totals.medio += item.categorias.medio?.cantidad || 0;
          totals.alto += item.categorias.alto?.cantidad || 0;
        }

        // Sumar también desde metadata si está disponible
        if (item.metadata) {
          totals.total += item.metadata.cantidad_datos || 0;
        }

        return totals;
      },
      { apagado: 0, bajo: 0, medio: 0, alto: 0, total: 0 }
    );

    // Si no tenemos total desde metadata, calcularlo
    if (categoryTotals.total === 0) {
      categoryTotals.total =
        categoryTotals.apagado +
        categoryTotals.bajo +
        categoryTotals.medio +
        categoryTotals.alto;
    }

    return {
      moneyTotal,
      energyTotal,
      categoryTotals,
      recordCount: data.length,
    };
  };

  const { moneyTotal, energyTotal, categoryTotals, recordCount } =
    calculateTotals();

  /**
   * Calcula porcentajes de distribución por categorías
   */
  const calculateCategoryPercentages = () => {
    if (categoryTotals.total === 0) {
      return {
        apagado: 0,
        bajo: 0,
        medio: 0,
        alto: 0,
      };
    }

    return {
      apagado:
        Math.round((categoryTotals.apagado / categoryTotals.total) * 100 * 10) /
        10,
      bajo:
        Math.round((categoryTotals.bajo / categoryTotals.total) * 100 * 10) /
        10,
      medio:
        Math.round((categoryTotals.medio / categoryTotals.total) * 100 * 10) /
        10,
      alto:
        Math.round((categoryTotals.alto / categoryTotals.total) * 100 * 10) /
        10,
    };
  };

  const categoryPercentages = calculateCategoryPercentages();

  /**
   * Determina si los datos son históricos o del período actual
   */
  const isHistoricalData = () => {
    if (!data || data.length === 0) return false;

    const today = DateTime.now().setZone(TZ);
    const firstRecord = data[0];

    let dataDate;
    if (period === "daily") {
      dataDate = DateTime.fromISO(firstRecord.periodo).setZone(TZ).startOf("day");
      return dataDate < today.startOf("day");
    } else if (period === "monthly") {
      dataDate = DateTime.fromISO(firstRecord.periodo).setZone(TZ).startOf("month");
      return dataDate.month !== today.month || dataDate.year !== today.year;
    } else if (period === "yearly") {
      if (firstRecord.anio || firstRecord.año) {
        const dataYear = firstRecord.anio || firstRecord.año;
        return dataYear !== today.year;
      }
      dataDate = DateTime.fromISO(firstRecord.periodo).setZone(TZ).startOf("year");
      return dataDate.year !== today.year;
    }

    return false;
  };

  /**
   * ✅ Obtiene información de fechas mejorada
   */
  const getDateInfo = () => {
    const isHistorical = isHistoricalData();
    const dateTitle = isHistorical ? "Período Cerrado" : "Última Actualización";

    let displayDate;
    if (data && data.length > 0) {
      // Obtener el registro más reciente por fecha de actualización
      const latestRecord = [...data].sort((a, b) => {
        const dateA = a.metadata?.fecha_actualizacion || a.fecha_actualizacion;
        const dateB = b.metadata?.fecha_actualizacion || b.fecha_actualizacion;
        return DateTime.fromISO(dateB).toMillis() - DateTime.fromISO(dateA).toMillis();
      })[0];

      if (isHistorical) {
        const dt0 = DateTime.fromISO(data[0].periodo).setZone(TZ).setLocale("es");
        switch (period) {
          case "daily":
            displayDate = dt0.toFormat("dd 'de' MMMM 'de' yyyy");
            break;
          case "monthly":
            displayDate = dt0.toFormat("MMMM 'de' yyyy");
            break;
          case "yearly":
            if (data[0].anio || data[0].año) {
              displayDate = `Año ${data[0].anio || data[0].año}`;
            } else {
              displayDate = dt0.toFormat("yyyy");
            }
            break;
          default:
            displayDate = "Período cerrado";
        }
      } else {
        const updateDate =
          latestRecord?.metadata?.fecha_actualizacion ||
          latestRecord?.fecha_actualizacion;
        displayDate = updateDate
          ? DateTime.fromISO(updateDate).setZone(TZ).toFormat("dd/MM/yyyy HH:mm")
          : DateTime.now().setZone(TZ).toFormat("dd/MM/yyyy HH:mm");
      }
    } else {
      displayDate = DateTime.now().setZone(TZ).toFormat("dd/MM/yyyy HH:mm");
    }

    return { dateTitle, displayDate };
  };

  const { dateTitle, displayDate } = getDateInfo();

  const getDeviceDisplayInfo = () => {
    if (deviceInfo) {
      const deviceType =
        deviceInfo.display_subtitle || deviceInfo.dispositivo_nombre || "";
      const locationName =
        deviceInfo.display_name || deviceInfo.ubicacion_nombre || "Dispositivo";

      return {
        name: locationName,
        type: deviceType,
        group: deviceInfo.grupo_nombre || "Sin Grupo",
        status: deviceInfo.estado_conexion || "Conectado",
      };
    }

    // Extraer de los datos si está disponible
    if (data && data.length > 0) {
      const firstRecord = data[0];
      return {
        name: firstRecord.ubicacion_nombre || "Dispositivo",
        type: firstRecord.dispositivo_nombre || "",
        group: firstRecord.grupo_nombre || "Sin Grupo",
        status: "Conectado",
      };
    }

    return {
      name: "Dispositivo",
      type: "",
      group: "Sin Grupo",
      status: "Desconocido",
    };
  };

  const deviceDisplayInfo = getDeviceDisplayInfo();

  /**
   * ✅ Obtiene el título correcto según el período
   */
  const getPeriodTitle = () => {
    switch (period) {
      case "daily":
        return "Total del Día";
      case "monthly":
        return "Total del Mes";
      case "yearly":
        return "Total del Año";
      default:
        return "Total Acumulado";
    }
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* ✅ CAMBIO: Información del dispositivo con intercambio de posiciones */}
      {showDeviceInfo && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {/* ✅ CAMBIO: Contenedor para el nombre del dispositivo (ahora será el tipo) */}
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-800">{deviceDisplayInfo.name}</h2>
              </div>
            </div>

            {/* ✅ Metadata a la derecha (grupo y estado) */}
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center">📍 {deviceDisplayInfo.group}</span>
              <span className="flex items-center">🟢 {deviceDisplayInfo.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CARDS CON ESTILO TEMPERATURA CAMARAS - OPTIMIZADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Money Card */}
        <Card className={cn(
          "bg-white/70 backdrop-blur-sm",
          "border-2 border-gray-300/60",
          "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
          "transition-all duration-300",
          "rounded-xl"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600 leading-tight">{getPeriodTitle()}</CardTitle>
            <span className="text-xl leading-none">💰</span>
          </CardHeader>
          <CardContent className="pb-2 pt-1 px-4">
            <div className="text-xl font-bold text-gray-700 leading-tight">
              {formatCurrency(moneyTotal)}
            </div>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Costo energético total</p>
          </CardContent>
        </Card>

        {/* Energy Card */}
        <Card className={cn(
          "bg-white/70 backdrop-blur-sm",
          "border-2 border-gray-300/60",
          "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
          "transition-all duration-300",
          "rounded-xl"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600 leading-tight">Electricidad</CardTitle>
            <span className="text-xl leading-none">⚡</span>
          </CardHeader>
          <CardContent className="pb-2 pt-1 px-4">
            <div className="text-xl font-bold text-gray-700 leading-tight">
              {formatEnergy(energyTotal).replace('.', ',')}
            </div>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Energía consumida</p>
          </CardContent>
        </Card>

        {/* Date Card */}
        <Card className={cn(
          "bg-white/70 backdrop-blur-sm",
          "border-2 border-gray-300/60",
          "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
          "transition-all duration-300",
          "rounded-xl"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600 leading-tight">{dateTitle}</CardTitle>
            <span className="text-xl leading-none">📅</span>
          </CardHeader>
          <CardContent className="pb-2 pt-1 px-4">
            <div className="text-xl font-bold text-gray-700 leading-tight">{displayDate}</div>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {!isHistoricalData() ? "Tiempo real" : "Período cerrado"}
            </p>
          </CardContent>
        </Card>

        {/* Readings Card */}
        <Card className={cn(
          "bg-white/70 backdrop-blur-sm",
          "border-2 border-gray-300/60",
          "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
          "transition-all duration-300",
          "rounded-xl"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-gray-600 leading-tight">Lecturas</CardTitle>
            <span className="text-xl leading-none">📊</span>
          </CardHeader>
          <CardContent className="pb-2 pt-1 px-4">
            <div className="text-xl font-bold text-gray-700 leading-tight">
              {formatNumber(categoryTotals.total)}
            </div>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {recordCount} período{recordCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Sección de categorización ultra compacta */}
      {showCategoryBreakdown && categoryTotals.total > 0 && (
        <div className="space-y-3 mt-3">
          <h4 className="text-base font-semibold text-gray-800">
            Distribución por Categorías de Consumo
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stand-by Card */}
            <Card className={cn(
              "bg-white/70 backdrop-blur-sm",
              "border-2 border-gray-300/60",
              "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
              "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
              "transition-all duration-300",
              "rounded-xl"
            )}>
              <CardContent className="pt-3 pb-2 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full bg-black flex-shrink-0"></div>
                  <h5 className="text-xs font-semibold text-gray-600 leading-tight">Stand-by</h5>
                </div>
                <div className="text-2xl font-bold text-gray-700 leading-tight">
                  {categoryPercentages.apagado}%
                </div>
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  {formatNumber(categoryTotals.apagado)} lecturas
                </div>
              </CardContent>
            </Card>

            {/* Low Consumption Card */}
            <Card className={cn(
              "bg-white/70 backdrop-blur-sm",
              "border-2 border-gray-300/60",
              "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
              "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
              "transition-all duration-300",
              "rounded-xl"
            )}>
              <CardContent className="pt-3 pb-2 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                  <h5 className="text-xs font-semibold text-gray-600 leading-tight">Bajo Consumo</h5>
                </div>
                <div className="text-2xl font-bold text-gray-700 leading-tight">
                  {categoryPercentages.bajo}%
                </div>
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  {formatNumber(categoryTotals.bajo)} lecturas
                </div>
              </CardContent>
            </Card>

            {/* Medium Consumption Card */}
            <Card className={cn(
              "bg-white/70 backdrop-blur-sm",
              "border-2 border-gray-300/60",
              "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
              "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
              "transition-all duration-300",
              "rounded-xl"
            )}>
              <CardContent className="pt-3 pb-2 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                  <h5 className="text-xs font-semibold text-gray-600 leading-tight">Medio Consumo</h5>
                </div>
                <div className="text-2xl font-bold text-gray-700 leading-tight">
                  {categoryPercentages.medio}%
                </div>
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  {formatNumber(categoryTotals.medio)} lecturas
                </div>
              </CardContent>
            </Card>

            {/* High Consumption Card */}
            <Card className={cn(
              "bg-white/70 backdrop-blur-sm",
              "border-2 border-gray-300/60",
              "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
              "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
              "transition-all duration-300",
              "rounded-xl"
            )}>
              <CardContent className="pt-3 pb-2 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                  <h5 className="text-xs font-semibold text-gray-600 leading-tight">Alto Consumo</h5>
                </div>
                <div className="text-2xl font-bold text-gray-700 leading-tight">
                  {categoryPercentages.alto}%
                </div>
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  {formatNumber(categoryTotals.alto)} lecturas
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStatsV2;