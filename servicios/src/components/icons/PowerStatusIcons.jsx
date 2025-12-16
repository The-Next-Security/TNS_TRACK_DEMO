// src/components/icons/PowerStatusIcons.jsx
import React from 'react';

/**
 * Iconos SVG animados modernos para estados de consumo eléctrico
 * Reemplazan los GIFs por SVG + CSS animations para mejor performance
 */

// Icono de dispositivo apagado/sin conexión
export const PowerOffIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <style>
        {`
          @keyframes pulse-off {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
          .pulse-off-circle {
            animation: pulse-off 2s ease-in-out infinite;
          }
        `}
      </style>
    </defs>

    {/* Círculo exterior con pulse */}
    <circle
      cx="32"
      cy="32"
      r="28"
      stroke="#9ca3af"
      strokeWidth="2"
      fill="none"
      className="pulse-off-circle"
    />

    {/* Círculo interior */}
    <circle
      cx="32"
      cy="32"
      r="20"
      fill="#6b7280"
      opacity="0.3"
    />

    {/* Línea diagonal (símbolo de apagado) */}
    <line
      x1="18"
      y1="18"
      x2="46"
      y2="46"
      stroke="#ef4444"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Símbolo de power */}
    <path
      d="M32 22 V32"
      stroke="#9ca3af"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M24 26 A10 10 0 0 0 32 42 A10 10 0 0 0 40 26"
      stroke="#9ca3af"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// Icono de consumo bajo (verde)
export const LowPowerIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <style>
        {`
          @keyframes glow-green {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.5)); }
            50% { filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.9)); }
          }
          .glow-green-bolt {
            animation: glow-green 1.5s ease-in-out infinite;
          }
        `}
      </style>
      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>

    {/* Rayo con glow effect */}
    <path
      d="M35 10 L20 35 L28 35 L25 54 L45 28 L36 28 Z"
      fill="url(#greenGradient)"
      className="glow-green-bolt"
    />

    {/* Detalles internos del rayo */}
    <path
      d="M32 15 L24 32 L29 32 L27 46 L38 30 L34 30 Z"
      fill="#86efac"
      opacity="0.6"
    />
  </svg>
);

// Icono de consumo medio (amarillo/naranja)
export const MediumPowerIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <style>
        {`
          @keyframes pulse-warning {
            0%, 100% {
              filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.6));
              transform: scale(1);
            }
            50% {
              filter: drop-shadow(0 0 10px rgba(251, 191, 36, 1));
              transform: scale(1.05);
            }
          }
          .pulse-warning-bolt {
            animation: pulse-warning 1s ease-in-out infinite;
            transform-origin: center;
          }
        `}
      </style>
      <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>

    {/* Rayo con pulse warning */}
    <path
      d="M35 10 L20 35 L28 35 L25 54 L45 28 L36 28 Z"
      fill="url(#yellowGradient)"
      className="pulse-warning-bolt"
    />

    {/* Detalles internos */}
    <path
      d="M32 15 L24 32 L29 32 L27 46 L38 30 L34 30 Z"
      fill="#fcd34d"
      opacity="0.7"
    />

    {/* Símbolo de advertencia (triángulo pequeño) */}
    <path
      d="M32 50 L28 56 L36 56 Z"
      fill="#f59e0b"
    />
    <circle
      cx="32"
      cy="54"
      r="1"
      fill="#ffffff"
    />
  </svg>
);

// Icono de consumo alto (rojo) con alerta
export const HighPowerIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <style>
        {`
          @keyframes alert-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));
              transform: scale(1);
            }
            50% {
              filter: drop-shadow(0 0 12px rgba(239, 68, 68, 1));
              transform: scale(1.08);
            }
          }
          @keyframes alert-ring {
            0% {
              stroke-width: 2;
              opacity: 0.8;
            }
            50% {
              stroke-width: 4;
              opacity: 1;
            }
            100% {
              stroke-width: 2;
              opacity: 0.8;
            }
          }
          .alert-bolt {
            animation: alert-pulse 0.8s ease-in-out infinite;
            transform-origin: center;
          }
          .alert-ring {
            animation: alert-ring 0.8s ease-in-out infinite;
          }
        `}
      </style>
      <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
    </defs>

    {/* Círculo de alerta animado */}
    <circle
      cx="32"
      cy="32"
      r="30"
      stroke="#dc2626"
      fill="none"
      className="alert-ring"
    />

    {/* Rayo con alert pulse */}
    <path
      d="M35 10 L20 35 L28 35 L25 54 L45 28 L36 28 Z"
      fill="url(#redGradient)"
      className="alert-bolt"
    />

    {/* Detalles internos */}
    <path
      d="M32 15 L24 32 L29 32 L27 46 L38 30 L34 30 Z"
      fill="#fca5a5"
      opacity="0.7"
    />

    {/* Símbolo de alerta (exclamación) */}
    <g transform="translate(48, 8)">
      <circle cx="0" cy="0" r="6" fill="#dc2626" />
      <line x1="0" y1="-3" x2="0" y2="1" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="0" cy="3" r="0.8" fill="#ffffff" />
    </g>
  </svg>
);

// Componente principal que exporta el icono según la categoría
export const PowerStatusIcon = ({ category, className = "w-8 h-8" }) => {
  switch (category) {
    case 0:
      return <PowerOffIcon className={className} />;
    case 1:
      return <LowPowerIcon className={className} />;
    case 2:
      return <MediumPowerIcon className={className} />;
    case 3:
      return <HighPowerIcon className={className} />;
    default:
      return <PowerOffIcon className={className} />;
  }
};

export default PowerStatusIcon;
