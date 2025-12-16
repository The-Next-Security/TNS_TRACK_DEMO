/**
 * @fileoverview TableSkeleton Component
 * @description Loading skeleton for alert history table
 * @version 1.0.0
 * @module alerts/components/TableSkeleton
 */

import React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "../../ui/skeleton";
import { ANIMATION_VARIANTS } from "../constants/alertConstants";

/**
 * TableSkeleton - Loading skeleton for alert table
 * @param {Object} props - Component props
 * @param {number} [props.rows=5] - Number of skeleton rows to display
 * @returns {JSX.Element} Skeleton loader component
 */
export const TableSkeleton = ({ rows = 5 }) => (
  <motion.div
    initial="initial"
    animate="animate"
    variants={ANIMATION_VARIANTS.staggerChildren}
    className="space-y-3"
  >
    {Array.from({ length: rows }).map((_, i) => (
      <motion.div key={i} variants={ANIMATION_VARIANTS.slideInUp}>
        <Skeleton className="h-20 w-full rounded-lg" />
      </motion.div>
    ))}
  </motion.div>
);
