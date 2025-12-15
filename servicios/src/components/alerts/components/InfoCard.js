/**
 * @fileoverview InfoCard Component
 * @description Reusable info card for displaying label-value pairs with icons
 * @version 1.0.0
 * @module alerts/components/InfoCard
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { ANIMATION_VARIANTS } from "../constants/alertConstants";

/**
 * InfoCard - Displays information with icon, label, and value
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.label - Label text
 * @param {string|number} props.value - Value to display
 * @param {string} [props.color="text-gray-600"] - Tailwind color class
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} InfoCard component
 */
export const InfoCard = ({ icon: Icon, label, value, color = "text-gray-600", className }) => (
  <motion.div
    variants={ANIMATION_VARIANTS.fadeInUp}
    className={cn(
      "flex items-center gap-3 p-4 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200",
      className
    )}
  >
    <div className={cn("p-2 rounded-lg bg-gray-50 dark:bg-gray-800", color)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-semibold mt-0.5", color)}>{value}</p>
    </div>
  </motion.div>
);
