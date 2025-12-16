/**
 * @fileoverview Date Range Picker Component
 * @description Simple date range picker using HTML5 date inputs
 * @feature 004-reportes-base-core - Phase 5: History View
 */

import React from 'react';
import { Label } from './label';
import { Input } from './input';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Date Range Picker Component
 * @param {Object} props
 * @param {string} props.startDate - Start date in YYYY-MM-DD format
 * @param {string} props.endDate - End date in YYYY-MM-DD format
 * @param {Function} props.onStartDateChange - Callback for start date change
 * @param {Function} props.onEndDateChange - Callback for end date change
 * @param {string} [props.className] - Additional CSS classes
 */
const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className
}) => {
  // Get today's date in YYYY-MM-DD format (prevent future dates)
  const today = new Date().toISOString().split('T')[0];

  /**
   * Handle start date change with validation for iOS
   * iOS Safari doesn't fully respect min/max attributes
   */
  const handleStartDateChange = (value) => {
    // Prevent future dates
    if (value > today) {
      onStartDateChange(today);
      return;
    }
    // Prevent start date > end date
    if (endDate && value > endDate) {
      onStartDateChange(endDate);
      return;
    }
    onStartDateChange(value);
  };

  /**
   * Handle end date change with validation for iOS
   * iOS Safari doesn't fully respect min/max attributes
   */
  const handleEndDateChange = (value) => {
    // Prevent future dates
    if (value > today) {
      onEndDateChange(today);
      return;
    }
    // Prevent end date < start date
    if (startDate && value < startDate) {
      onEndDateChange(startDate);
      return;
    }
    onEndDateChange(value);
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4", className)}>
      {/* Start Date */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="start-date" className="flex items-center gap-1.5 sm:gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Fecha Desde
        </Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          max={endDate ? (endDate < today ? endDate : today) : today}
          className="w-full min-h-[44px] sm:min-h-[40px] text-base sm:text-sm"
        />
      </div>

      {/* End Date */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="end-date" className="flex items-center gap-1.5 sm:gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Fecha Hasta
        </Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          min={startDate || undefined}
          max={today}
          className="w-full min-h-[44px] sm:min-h-[40px] text-base sm:text-sm"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
