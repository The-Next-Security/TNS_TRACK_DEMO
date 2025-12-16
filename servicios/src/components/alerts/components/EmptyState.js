/**
 * @fileoverview EmptyState Component
 * @description Display empty state with icon and message
 * @version 1.0.0
 * @module alerts/components/EmptyState
 */

import React from "react";
import { motion } from "framer-motion";
import { Database } from "lucide-react";

/**
 * EmptyState - Shows when no data is available
 * @param {Object} props - Component props
 * @param {string} props.message - Message to display
 * @param {React.Component} [props.icon=Database] - Icon component to display
 * @returns {JSX.Element} EmptyState component
 */
export const EmptyState = ({ message, icon: Icon = Database }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-12 px-4"
  >
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
      <Icon className="h-12 w-12 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sin resultados</h3>
    <p className="text-sm text-muted-foreground text-center max-w-sm">{message}</p>
  </motion.div>
);
