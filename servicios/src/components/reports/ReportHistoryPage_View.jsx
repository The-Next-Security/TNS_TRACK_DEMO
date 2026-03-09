/**
 * @fileoverview Report History Page Component
 * @description Full-featured history page with filtering, search, sorting, and pagination
 * @feature 004-reportes-base-core - Phase 5: History View
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeaderV2 from '../Header_View';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  History,
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '../ui/use-toast';
import ResponsiveReportsTable from './components/ResponsiveReportsTable';
import EmailModal from './components/EmailModal';
import ReportFilters from './components/ReportFilters';
import Pagination from '../ui/Pagination';
import reportsApiService from '../../services/reportsApiService';

/**
 * Report History Page - Complete history view with advanced filtering
 */
const ReportHistoryPage = ({ userPermissions = [] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State Management
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(25);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    reportType: 'all',
    startDate: '',
    endDate: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Separate state for search input (debounced)
  const [searchInputValue, setSearchInputValue] = useState('');

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Debounce timer ref for search input
  const searchDebounceTimer = useRef(null);

  /**
   * Fetch report history from API
   */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filter params
      const params = {
        page: currentPage,
        limit: pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      // Add optional filters
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.reportType !== 'all') params.type = filters.reportType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await reportsApiService.getHistory(params);

      if (response.success) {
        // Map API response to table format
        const mappedReports = (response.reports || []).map(report => ({
          id: report.id,
          report_name: report.name,
          report_type: report.type,
          template_key: report.template_key || report.templateKey,
          created_at: report.createdAt,
          downloaded_at: report.downloadedAt,
          file_size: report.fileSize,
          period_start_date: report.periodStartDate,
          period_end_date: report.periodEndDate,
          generation_status: report.status,
          source: report.source
        }));

        setReports(mappedReports);
        setTotalCount(response.totalCount || 0);
        setTotalPages(response.totalPages || 1);
      } else {
        throw new Error(response.message || 'Error al cargar historial');
      }
    } catch (err) {
      console.error('[ReportHistoryPage] Error fetching reports:', err);
      setError(err.message || 'Error al cargar el historial de reportes');
      toast({
        title: "Error al cargar reportes",
        description: err.message || 'No se pudo cargar el historial',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, toast]);

  // Fetch reports on mount and when dependencies change
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  /**
   * Handle filter changes with debounce for search input
   */
  const handleFilterChange = (key, value) => {
    // Apply debounce only to search input for better mobile UX
    if (key === 'search') {
      // Clear existing timer
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }

      // Update local input value immediately (for controlled input - keeps keyboard open)
      setSearchInputValue(value);

      // Debounce the actual filter update (which triggers fetchReports)
      searchDebounceTimer.current = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: value }));
        setCurrentPage(1);
      }, 500);
    } else {
      // All other filters apply immediately
      setFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    }
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    // Clear debounce timer if active
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // Reset both search input value and filters
    setSearchInputValue('');
    setFilters({
      search: '',
      status: 'all',
      startDate: '',
      endDate: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  /**
   * Handle email modal
   */
  const handleSendEmail = (report) => {
    setSelectedReport({
      id: report.id,
      name: report.report_name
    });
    setEmailModalOpen(true);
  };

  const handleEmailSuccess = (result) => {
    toast({
      title: "✅ Email enviado exitosamente",
      description: `El reporte fue enviado a ${result.sentCount} destinatario(s)`,
      variant: "default"
    });
    setEmailModalOpen(false);
  };

  const handleCloseEmailModal = () => {
    setEmailModalOpen(false);
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HeaderV2 userPermissions={userPermissions} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
              className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Volver al Dashboard</span>
              <span className="sm:hidden">Volver</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg shrink-0">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                Historial de Reportes
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                {totalCount > 0 ? `${totalCount} reporte${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}` : 'Sin reportes'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <ReportFilters
            filters={filters}
            searchValue={searchInputValue}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onSortChange={handleSortChange}
            isLoading={loading}
          />
        </motion.div>

        {/* Reports Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-purple-600 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Cargando historial...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                  <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mb-3 sm:mb-4" />
                  <p className="text-gray-900 dark:text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base text-center">
                    Error al cargar reportes
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 text-center">{error}</p>
                  <Button onClick={fetchReports} variant="outline" size="sm" className="min-h-[36px]">
                    Reintentar
                  </Button>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-gray-900 dark:text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base text-center">
                    {(filters.search || filters.status !== 'all' || filters.startDate || filters.endDate) ? 'No se encontraron reportes' : 'No hay reportes generados'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm text-center">
                    {(filters.search || filters.status !== 'all' || filters.startDate || filters.endDate) ? 'Intenta ajustar los filtros' : 'Genera tu primer reporte para verlo aquí'}
                  </p>
                </div>
              ) : (
                <>
                  <ResponsiveReportsTable
                    reports={reports}
                    onSendEmail={handleSendEmail}
                    onDownload={null} // Use default download behavior
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                        Página {currentPage} de {totalPages} • {totalCount} total
                      </p>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        className="touch-manipulation"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Email Modal */}
      {selectedReport && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={handleCloseEmailModal}
          report={selectedReport}
          onSuccess={handleEmailSuccess}
        />
      )}
    </div>
  );
};

export default ReportHistoryPage;
