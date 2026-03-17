/**
 * @fileoverview Responsive Reports Table Component
 * @description Provides responsive table display with card-based layout for mobile
 * and optimized table layout for desktop with column visibility management
 * @feature 004-reportes-base-core
 */

import React from 'react';
import { cn } from '../../../lib/utils';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  FileText,
  FileCheck,
  Download,
  Mail,
  Calendar,
  HardDrive,
  FileType,
  MoreVertical,
  Clock,
  Thermometer,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

/**
 * Formats file size from bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Formats date to DD/MM/YYYY format
 * @param {string} date - Date string
 * @param {boolean} compact - Use compact format (DD/MM for mobile)
 * @returns {string} Formatted date
 */
const formatDate = (date, compact = false) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (compact) {
    return `${day}/${month}`;
  }
  return `${day}/${month}/${year}`;
};

/**
 * Gets emoji based on report template key
 * @param {string} templateKey - Template key from report
 * @returns {string} Emoji for the report type
 */
const getReportTypeEmoji = (templateKey) => {
  const emojis = {
    executive_temperature: '🌡️',
    executive_alerts: '🔔'
  };
  return emojis[templateKey] || '📄';
};

/**
 * Mobile Card Component for single report
 */
const ReportCard = ({ report, onSendEmail, onDownload }) => {
  const isNew = !report.downloaded_at;
  const typeEmoji = getReportTypeEmoji(report.template_key);

  return (
    <Card className={cn(
      "mb-4 transition-all duration-200",
      isNew && "ring-2 ring-blue-500 ring-opacity-30 bg-blue-50/50 dark:bg-blue-900/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isNew ? (
                <FileText className="h-4 w-4 text-blue-500" />
              ) : (
                <FileCheck className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-base">{typeEmoji}</span>
              <h3 className="font-semibold text-sm line-clamp-1">
                {report.report_name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center justify-center">
                <span className="text-lg" title={report.report_type}>{typeEmoji}</span>
              </div>
              {isNew && (
                <Badge variant="default" className="text-xs bg-blue-500">
                  Nuevo
                </Badge>
              )}
            </div>
          </div>

          {/* Actions Menu for Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSendEmail(report)}>
                <Mail className="h-3 w-3 mr-2" />
                Enviar Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(report)}>
                <Download className="h-3 w-3 mr-2" />
                Descargar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(report.created_at, true)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <HardDrive className="h-3 w-3" />
            <span>{formatFileSize(report.file_size)}</span>
          </div>
        </div>

        {/* Quick Actions for easier access on mobile */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendEmail(report)}
            className="flex-1 h-8 text-xs"
          >
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button
            variant={isNew ? "default" : "outline"}
            size="sm"
            onClick={() => onDownload(report)}
            className="flex-1 h-8 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            {isNew ? 'Descargar' : 'Recargar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Responsive Reports Table Component
 * Switches between card and table views based on screen size
 */
const ResponsiveReportsTable = ({
  reports,
  onSendEmail,
  onDownload,
  className
}) => {

  const handleDownload = (report) => {
    if (onDownload) {
      onDownload(report);
    } else {
      window.open(`/api/reportes/descargar/${report.id}`, '_blank');
    }
  };

  if (!reports || reports.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          No hay reportes recientes disponibles
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile View - Cards (visible on small screens) */}
      <div className="block sm:hidden">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onSendEmail={onSendEmail}
            onDownload={handleDownload}
          />
        ))}
      </div>

      {/* Tablet View - Condensed Table (visible on medium screens) */}
      <div className="hidden sm:block lg:hidden">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Reporte</TableHead>
                <TableHead className="w-[30%]">Fecha</TableHead>
                <TableHead className="w-[30%] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const isNew = !report.downloaded_at;
                const typeEmoji = getReportTypeEmoji(report.template_key);

                return (
                <TableRow
                  key={report.id}
                  className={cn(
                    isNew && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isNew ? (
                          <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                        ) : (
                          <FileCheck className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                        <span className="text-base">{typeEmoji}</span>
                        <span className="font-medium text-sm line-clamp-1">
                          {report.report_name}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-base" title={report.report_type}>{typeEmoji}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(report.file_size)}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(report.created_at, true)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendEmail(report)}
                        className="h-8 w-8 p-0"
                        title="Enviar por email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Desktop View - Full Table (visible on large screens) */}
      <div className="hidden lg:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[30%]">Nombre del Reporte</TableHead>
                <TableHead className="w-[15%]">Tipo</TableHead>
                <TableHead className="w-[20%]">Fecha Creación</TableHead>
                <TableHead className="w-[10%] text-center">Tamaño</TableHead>
                <TableHead className="w-[15%] text-center">Estado</TableHead>
                <TableHead className="w-[10%] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const isNew = !report.downloaded_at;
                const typeEmoji = getReportTypeEmoji(report.template_key);

                return (
                  <TableRow
                    key={report.id}
                    className={cn(
                      "transition-colors",
                      isNew && "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isNew ? (
                          <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                        ) : (
                          <FileCheck className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                        <span className="text-base">{typeEmoji}</span>
                        <span className="font-medium truncate max-w-[300px]" title={report.report_name}>
                          {report.report_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <span className="text-xl" title={report.report_type}>{typeEmoji}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(report.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(report.file_size)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {isNew ? (
                        <Badge variant="default" className="bg-blue-500">
                          Nuevo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Descargado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSendEmail(report)}
                          className="h-8 w-8 p-0"
                          title="Enviar por email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(report)}
                          className="h-8 px-3"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {isNew ? 'Nuevo' : ''}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default ResponsiveReportsTable;