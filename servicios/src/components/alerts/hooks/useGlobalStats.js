/**
 * @fileoverview useGlobalStats Hook
 * @description Custom hook for fetching global/historical statistics (all-time averages)
 * @version 1.0.0
 * @module alerts/hooks/useGlobalStats
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../constants/alertConstants";
import { calculateAlertStats } from "../utils/alertUtils";

/**
 * Custom hook for fetching global statistics (all-time, not filtered by date)
 * @returns {Object} Global statistics data
 */
export const useGlobalStats = () => {
  const [globalStats, setGlobalStats] = useState({
    avgAcknowledgeTime: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);

  /**
   * Fetches all-time alerts to calculate global averages
   */
  const fetchGlobalStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all alerts with a very wide date range to get all historical data
      // Using 5 years back to cover all possible alerts
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5); // 5 years back

      const params = {
        startDate: startDate.toISOString().slice(0, 19).replace('T', ' '),
        endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),
        limit: 5000,
        offset: 0
      };

      console.log('[useGlobalStats] Fetching global statistics with params:', params);

      const response = await axios.get(API_ENDPOINTS.listAlerts, { params });

      if (response.data && response.data.success) {
        const alertsData = response.data.data || [];
        console.log(`[useGlobalStats] Loaded ${alertsData.length} alerts for global stats calculation`);

        // Calculate only the time-based statistics
        const stats = calculateAlertStats(alertsData);

        console.log('[useGlobalStats] Calculated stats:', {
          avgAcknowledgeTime: stats.avgAcknowledgeTime,
          avgResolutionTime: stats.avgResolutionTime
        });

        setGlobalStats({
          avgAcknowledgeTime: stats.avgAcknowledgeTime,
          avgResolutionTime: stats.avgResolutionTime
        });
      } else {
        console.error('[useGlobalStats] Invalid response:', response.data);
      }
    } catch (err) {
      console.error('[useGlobalStats] Error fetching global stats:', err);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch global stats on mount
   */
  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  return {
    globalStats,
    loading
  };
};
