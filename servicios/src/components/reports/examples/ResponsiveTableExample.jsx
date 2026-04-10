/**
 * @fileoverview Example usage of ResponsiveReportsTable
 * @description Demonstrates how to integrate the responsive table with filters and search
 */

import React, { useState, useMemo } from 'react';
import ResponsiveReportsTable from '../components/ResponsiveReportsTable';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Search, Filter, X } from 'lucide-react';
import { useToast } from '../../ui/use-toast';

/**
 * Example implementation with search and filters
 */
const ResponsiveTableExample = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sample data - replace with your actual data
  const [reports] = useState([
    {
      id: 1,
      report_name: 'Reporte Ejecutivo Temperatura - Enero 2025',
      report_type: 'executive_temperature',
      created_at: '2025-01-15T10:30:00',
      file_size: 245760,
      downloaded_at: null,
      status: 'ready',
    },
    {
      id: 2,
      report_name: 'Análisis Consumo Eléctrico - Q4 2024',
      report_type: 'power_consumption',
      created_at: '2025-01-14T15:45:00',
      file_size: 189440,
      downloaded_at: '2025-01-14T16:00:00',
      status: 'ready',
    },
    {
      id: 3,
      report_name: 'Reporte Alertas Críticas - Enero 2025',
      report_type: 'critical_alerts',
      created_at: '2025-01-13T08:20:00',
      file_size: 567890,
      downloaded_at: null,
      status: 'ready',
    },
  ]);

  // Filter and search logic
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Search filter
      if (searchTerm && !report.report_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && report.report_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'new' && report.downloaded_at) {
        return false;
      }
      if (statusFilter === 'downloaded' && !report.downloaded_at) {
        return false;
      }

      return true;
    });
  }, [reports, searchTerm, typeFilter, statusFilter]);

  // Handlers
  const handleSendEmail = (report) => {
    toast({
      title: 'Enviando reporte por email',
      description: `Preparando "${report.report_name}" para envío...`,
    });
    // Open email modal or handle email sending
  };

  const handleDownload = (report) => {
    toast({
      title: 'Descargando reporte',
      description: `Iniciando descarga de "${report.report_name}"...`,
    });
    window.open(`/api/reportes/descargar/${report.id}`, '_blank');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const activeFiltersCount = [
    searchTerm !== '',
    typeFilter !== 'all',
    statusFilter !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre de reporte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="executive_temperature">Temperatura Ejecutivo</SelectItem>
                <SelectItem value="power_consumption">Consumo Eléctrico</SelectItem>
                <SelectItem value="critical_alerts">Alertas Críticas</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new">Nuevos</SelectItem>
                <SelectItem value="downloaded">Descargados</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Búsqueda: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Tipo: {typeFilter}
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Estado: {statusFilter === 'new' ? 'Nuevos' : 'Descargados'}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Reportes Encontrados
        </h2>
        <Badge variant="outline">
          {filteredReports.length} de {reports.length} reportes
        </Badge>
      </div>

      {/* Responsive Table */}
      <ResponsiveReportsTable
        reports={filteredReports}
        onSendEmail={handleSendEmail}
        onDownload={handleDownload}
      />

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <Card className="p-8 text-center">
          <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No se encontraron reportes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No hay reportes que coincidan con los filtros seleccionados.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar Filtros
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ResponsiveTableExample;