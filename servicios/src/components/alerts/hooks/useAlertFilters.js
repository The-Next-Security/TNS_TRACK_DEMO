/**
 * @fileoverview useAlertFilters Hook
 * @description Custom hook for managing alert filters and pagination
 * @version 1.0.0
 * @module alerts/hooks/useAlertFilters
 */

import { useState, useEffect, useMemo } from "react";
import { DEFAULT_VALUES, PAGINATION_CONFIG } from "../constants/alertConstants";

/**
 * Custom hook for managing alert filtering and pagination
 * @param {Array} alerts - Array of all alerts
 * @returns {Object} Filter state and functions
 */
export const useAlertFilters = (alerts = []) => {
  // Filter states
  const [statusFilter, setStatusFilter] = useState(DEFAULT_VALUES.defaultStatusFilter);
  const [typeFilter, setTypeFilter] = useState(DEFAULT_VALUES.defaultTypeFilter);
  const [sensorFilter, setSensorFilter] = useState(DEFAULT_VALUES.defaultSensorFilter);
  const [dateRangeFilter, setDateRangeFilter] = useState(DEFAULT_VALUES.defaultDateRangeFilter);
  const [alertIdSearch, setAlertIdSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Apply all active filters to alerts
   */
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(alert => alert.alertType === typeFilter);
    }

    // Filter by sensor
    if (sensorFilter !== "all") {
      filtered = filtered.filter(alert => alert.channelName === sensorFilter);
    }

    // Filter by alert ID
    if (alertIdSearch.trim()) {
      const searchValue = alertIdSearch.trim();
      filtered = filtered.filter(alert =>
        alert.alertId.toString().includes(searchValue)
      );
    }

    return filtered;
  }, [alerts, statusFilter, typeFilter, sensorFilter, alertIdSearch]);

  /**
   * Calculate pagination values
   */
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredAlerts.length / PAGINATION_CONFIG.itemsPerPage);
    const startIndex = (currentPage - 1) * PAGINATION_CONFIG.itemsPerPage;
    const endIndex = startIndex + PAGINATION_CONFIG.itemsPerPage;
    const currentAlerts = filteredAlerts.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      currentAlerts
    };
  }, [filteredAlerts, currentPage]);

  /**
   * Get active filters for display
   */
  const activeFilters = useMemo(() => {
    const filters = [];

    if (statusFilter !== "all") {
      filters.push({
        key: "status",
        label: "Estado",
        value: statusFilter,
        onRemove: () => setStatusFilter("all")
      });
    }

    if (typeFilter !== "all") {
      filters.push({
        key: "type",
        label: "Tipo",
        value: typeFilter,
        onRemove: () => setTypeFilter("all")
      });
    }

    if (sensorFilter !== "all") {
      filters.push({
        key: "sensor",
        label: "Sensor",
        value: sensorFilter,
        onRemove: () => setSensorFilter("all")
      });
    }

    if (alertIdSearch.trim()) {
      filters.push({
        key: "alertId",
        label: "Núm. Alerta",
        value: alertIdSearch,
        onRemove: () => setAlertIdSearch("")
      });
    }

    if (dateRangeFilter !== "week") {
      const rangeLabels = {
        today: "Hoy",
        month: "Último mes",
        quarter: "Último trimestre"
      };
      filters.push({
        key: "dateRange",
        label: "Período",
        value: rangeLabels[dateRangeFilter],
        onRemove: () => setDateRangeFilter("week")
      });
    }

    return filters;
  }, [statusFilter, typeFilter, sensorFilter, alertIdSearch, dateRangeFilter]);

  /**
   * Clear all filters
   */
  const clearAllFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSensorFilter("all");
    setDateRangeFilter("week");
    setAlertIdSearch("");
  };

  /**
   * Reset to first page when filters change
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, sensorFilter, alertIdSearch, dateRangeFilter]);

  return {
    // Filter states
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sensorFilter,
    setSensorFilter,
    dateRangeFilter,
    setDateRangeFilter,
    alertIdSearch,
    setAlertIdSearch,

    // Filtered data
    filteredAlerts,

    // Pagination
    currentPage,
    setCurrentPage,
    ...paginationData,

    // Utilities
    activeFilters,
    clearAllFilters
  };
};
