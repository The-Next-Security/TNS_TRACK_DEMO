/**
 * @fileoverview Dashboard General TNS Track - Módulo Futuro
 * Panel de control centralizado para integración IoT/Teltonika.
 * Versión stub siguiendo estándares Shadcn/UI v2.1 con efectos premium.
 *
 * @component
 * @requires framer-motion
 * @requires Shadcn/UI components
 * @version 1.0.0 - Stub Módulo Futuro
 */
/* MÓDULO FUTURO - Teltonika IoT: pendiente de desarrollo */

import React from 'react';
import { motion } from 'framer-motion';

// Componentes Shadcn/UI
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

// Componentes custom
import HeaderV2 from './Header_View';

/**
 * Dashboard general centralizado - Módulo futuro Teltonika.
 * Muestra un aviso de módulo en desarrollo hasta que se integre el hardware IoT.
 *
 * @returns {JSX.Element} Componente renderizado
 */
const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <HeaderV2 title="Dashboard" />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
        >
          {/* Ícono representativo */}
          <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center border border-slate-600/50">
            <svg
              className="w-12 h-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>

          <Card className="w-full max-w-md bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CardTitle className="text-2xl font-bold text-white">
                  Dashboard
                </CardTitle>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Próximamente
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-center text-slate-400 text-sm leading-relaxed">
              Panel de control centralizado para monitoreo IoT en tiempo real.
              Este módulo estará disponible una vez completada la integración con
              el hardware Teltonika.
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
