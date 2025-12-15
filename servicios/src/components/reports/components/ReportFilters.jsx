/**
 * @fileoverview Report Filters Component
 * @description Reusable filter component for report history and other report pages
 * @feature 004-reportes-base-core - Phase 5: T050 - Extracted Filters Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Search,
  Filter,
  X,
  ArrowUpDown,
} from 'lucide-react';
import DateRangePicker from '../../ui/DateRangePicker';

/**
 * ReportFilters Component
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values { search, status, startDate, endDate, sortBy, sortOrder }
 * @param {string} props.searchValue - Separate search input value (for debounced search)
 * @param {Function} props.onFilterChange - Callback for filter changes (key, value)
 * @param {Function} props.onClearFilters - Callback to clear all filters
 * @param {Function} props.onSortChange - Callback for sort changes (sortBy)
 * @param {boolean} props.isLoading - Loading state (optional)
 */
const ReportFilters = ({
  filters = {},
  searchValue,
  onFilterChange,
  onClearFilters,
  onSortChange,
  isLoading = false
}) => {
  /**
   * Check if any filters are active
   */
  const hasActiveFilters = () => {
    return filters.search ||
           filters.status !== 'all' ||
           filters.reportType !== 'all' ||
           filters.startDate ||
           filters.endDate;
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Filtros y Búsqueda</span>
          {hasActiveFilters() && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {[filters.search, filters.status !== 'all', filters.reportType !== 'all', filters.startDate, filters.endDate]
                .filter(Boolean).length} activo(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Search Input */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="search" className="flex items-center gap-1.5 sm:gap-2 text-sm">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Buscar por nombre
          </Label>
          <div className="relative">
            <Input
              id="search"
              type="text"
              placeholder="Buscar reportes..."
              value={searchValue !== undefined ? searchValue : (filters.search || '')}
              onChange={(e) => onFilterChange('search', e.target.value)}
              disabled={isLoading}
              className="pr-10 min-h-[44px] text-base sm:text-sm sm:min-h-[40px]"
            />
            {(searchValue || filters.search) && (
              <button
                onClick={() => onFilterChange('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="status" className="text-sm">Estado</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFilterChange('status', value)}
            disabled={isLoading}
          >
            <SelectTrigger id="status" className="min-h-[44px] sm:min-h-[40px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="new">Nuevos</SelectItem>
              <SelectItem value="downloaded">Descargados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Type Filter */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="reportType" className="text-sm">Tipo de Reporte</Label>
          <Select
            value={filters.reportType || 'all'}
            onValueChange={(value) => onFilterChange('reportType', value)}
            disabled={isLoading}
          >
            <SelectTrigger id="reportType" className="min-h-[44px] sm:min-h-[40px]">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="executive_temperature">🌡️ Temperatura</SelectItem>
              <SelectItem value="executive_alerts">🔔 Alertas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          startDate={filters.startDate || ''}
          endDate={filters.endDate || ''}
          onStartDateChange={(value) => onFilterChange('startDate', value)}
          onEndDateChange={(value) => onFilterChange('endDate', value)}
          disabled={isLoading}
        />

        {/* Sort Options */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-sm">Ordenar por</Label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {[
              { value: 'created_at', label: 'Fecha' },
              { value: 'report_name', label: 'Nombre' },
              { value: 'file_size', label: 'Tamaño' }
            ].map(sort => (
              <Button
                key={sort.value}
                variant={filters.sortBy === sort.value ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange(sort.value)}
                disabled={isLoading}
                className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm min-h-[36px] sm:min-h-[32px]"
              >
                {sort.label}
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            ))}
            <Badge variant="outline" className="ml-auto self-center text-xs">
              {filters.sortOrder === 'desc' ? '↓' : '↑'}
              <span className="hidden sm:inline ml-1">
                {filters.sortOrder === 'desc' ? 'Descendente' : 'Ascendente'}
              </span>
            </Badge>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters() && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={isLoading}
            className="w-full gap-2 min-h-[44px] sm:min-h-[36px]"
          >
            <X className="h-4 w-4" />
            Limpiar Filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportFilters;
