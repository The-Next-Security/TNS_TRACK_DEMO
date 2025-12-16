/**
 * @fileoverview ActiveFilters Component
 * @description Display active filters with ability to remove individual filters
 * @version 1.0.0
 * @module alerts/components/ActiveFilters
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

/**
 * ActiveFilters - Shows active filters with remove functionality
 * @param {Object} props - Component props
 * @param {Array<Object>} props.filters - Array of filter objects
 * @param {Function} props.onClear - Callback to clear all filters
 * @returns {JSX.Element|null} ActiveFilters component or null if no filters
 */
export const ActiveFilters = ({ filters, onClear }) => {
  if (!filters || filters.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <Filter className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Filtros activos:</span>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <Badge key={filter.key || index} variant="secondary" className="gap-1">
              {filter.label}: {filter.value}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-600"
                onClick={() => filter.onRemove()}
              />
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="ml-auto text-blue-600 hover:text-blue-700"
        >
          Limpiar todos
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};
