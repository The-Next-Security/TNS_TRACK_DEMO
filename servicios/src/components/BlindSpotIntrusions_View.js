/**
 * @fileoverview Intrusiones Blind Spot TNS Track - Módulo Futuro
 * Detección y visualización de intrusiones en zonas ciegas mediante sensores Teltonika.
 * Versión stub siguiendo estándares Shadcn/UI v2.1 con efectos premium.
 *
 * @component
 * @requires framer-motion
 * @requires Shadcn/UI components
 * @version 1.0.0 - Stub Módulo Futuro
 */
/* MÓDULO FUTURO - Teltonika/BlindSpot: pendiente de desarrollo */

import React from 'react';
import { motion } from 'framer-motion';

// Componentes Shadcn/UI
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

// Componentes custom
import HeaderV2 from './Header_View';

/**
 * Módulo de intrusiones Blind Spot - pendiente de integración Teltonika.
 * Muestra un aviso de módulo en desarrollo hasta que se integre el hardware.
 *
 * @returns {JSX.Element} Componente renderizado
 */
const BlindSpotIntrusions = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <HeaderV2 title="Intrusiones Blind Spot" />

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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
              <line x1="2" y1="2" x2="22" y2="22" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </div>

          <Card className="w-full max-w-md bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CardTitle className="text-2xl font-bold text-white">
                  Intrusiones Blind Spot
                </CardTitle>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Próximamente
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-center text-slate-400 text-sm leading-relaxed">
              Detección y registro de intrusiones en zonas ciegas mediante sensores
              Teltonika. Este módulo estará disponible una vez completada la
              integración con el hardware BlindSpot.
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default BlindSpotIntrusions;
