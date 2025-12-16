/**
 * @fileoverview StatCard Component
 * @description Statistics card with icon, value, and optional trend indicator
 * @version 1.0.0
 * @module alerts/components/StatCard
 */

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../../lib/utils";

/**
 * StatCard - Displays a statistic with icon and optional trend
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.label - Label text
 * @param {string|number} props.value - Value to display
 * @param {number} [props.trend] - Trend percentage (positive or negative)
 * @param {string} [props.color="text-gray-600"] - Tailwind color class
 * @returns {JSX.Element} StatCard component
 */
export const StatCard = ({ icon: Icon, label, value, trend, color = "text-gray-600" }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
        {trend !== undefined && trend !== null && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className={cn("text-xs font-medium", trend > 0 ? "text-red-500" : "text-green-500")}>
              {Math.abs(trend)}% vs ayer
            </span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-full", color === "text-red-600" ? "bg-red-100 dark:bg-red-950/30" : "bg-gray-100 dark:bg-gray-800")}>
        <Icon className={cn("h-6 w-6", color)} />
      </div>
    </div>
  </motion.div>
);
