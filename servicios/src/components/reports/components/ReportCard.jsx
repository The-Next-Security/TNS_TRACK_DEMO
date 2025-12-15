/**
 * @fileoverview Report Card Component - Tarjeta de Tipo de Reporte
 * @description Componente reutilizable que muestra información de un tipo de reporte disponible
 * con opción de generación. Usa Shadcn/UI components y Tailwind CSS.
 * @feature 004-reportes-base-core (T020)
 * @version 1.0.0
 */

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";
import { Clock, FileText } from "lucide-react";

/**
 * ReportCard Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.icon - Ícono del tipo de reporte
 * @param {string} props.title - Título del reporte
 * @param {string} props.description - Descripción del reporte
 * @param {string} props.estimatedTime - Tiempo estimado de generación (ej: "30s")
 * @param {Function} props.onGenerate - Callback al hacer click en generar
 * @param {boolean} props.disabled - Si el botón debe estar deshabilitado
 * @param {string} props.className - Clases CSS adicionales
 */
const ReportCard = ({
  icon,
  title,
  description,
  estimatedTime = "30s",
  onGenerate,
  disabled = false,
  className
}) => {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "h-full flex flex-col",
          "bg-white dark:bg-gray-800",
          "border-2",
          "hover:shadow-lg transition-all duration-300",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-blue-500",
          className
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                "p-3 rounded-lg",
                "bg-gradient-to-br from-blue-500 to-blue-600",
                "text-white",
                "shadow-md"
              )}
            >
              {icon || <FileText className="h-8 w-8" />}
            </div>
            {estimatedTime && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {estimatedTime}
              </Badge>
            )}
          </div>

          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 line-clamp-3">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-grow">
          {/* Características o metadata adicional pueden ir aquí en el futuro */}
        </CardContent>

        <CardFooter className="mt-auto">
          <Button
            onClick={onGenerate}
            disabled={disabled}
            className="w-full"
            size="lg"
          >
            Generar Reporte
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ReportCard;
