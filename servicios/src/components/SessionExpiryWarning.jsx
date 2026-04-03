// SessionExpiryWarning.jsx
// Toast notification warning user about impending session expiry
// Feature: 003-fix-session-expiry-handling

import React, { useEffect } from 'react';
import { toast } from '../hooks/useToast_Hook';
import { useSessionExtension } from '../hooks/useSessionExtension_Hook';
import analyticsService from '../services/analytics_Service';

/**
 * Session Expiry Warning Component
 * Displays a persistent toast warning when session is about to expire
 *
 * @param {Object} props
 * @param {number} props.timeRemaining - Time remaining in seconds
 * @param {function} props.onLogoutClick - Callback when "Logout Now" is clicked
 * @param {function} props.onExtended - Callback when session is successfully extended
 */
export function SessionExpiryWarning({ timeRemaining, onLogoutClick, onExtended }) {
  const { extendSession, isExtending } = useSessionExtension();

  useEffect(() => {
    // Track warning shown in analytics
    analyticsService.trackEvent('session_expiry_warning_shown', {
      timeRemaining,
      timestamp: Date.now()
    });

    // Show persistent toast with actions
    const toastInstance = toast({
      title: "⏰ Sesión por expirar",
      description: "Tu sesión expirará en menos de 2 minutos. Extiende tu sesión o guarda tu trabajo.",
      duration: Infinity, // Persist indefinitely
      variant: "destructive",
      action: (
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const result = await extendSession();

              if (result.success) {
                toastInstance.dismiss();

                // Show success toast
                toast({
                  title: "✅ Sesión extendida",
                  description: "Tu sesión ha sido extendida correctamente",
                  duration: 3000,
                  variant: "default"
                });

                // Notify parent component
                if (onExtended) {
                  onExtended(result);
                }
              } else {
                // Show error toast
                toast({
                  title: "❌ Error al extender sesión",
                  description: result.error || "No se pudo extender la sesión",
                  duration: 5000,
                  variant: "destructive"
                });
              }
            }}
            disabled={isExtending}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isExtending ? 'Extendiendo...' : 'Extender sesión'}
          </button>

          <button
            onClick={() => {
              toastInstance.dismiss();

              // Track logout from warning
              analyticsService.trackEvent('logout_from_session_warning', {
                timeRemaining: timeRemaining,
                timestamp: Date.now()
              });

              if (onLogoutClick) {
                onLogoutClick();
              }
            }}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
          >
            Cerrar sesión
          </button>
        </div>
      )
    });

    return () => {
      toastInstance.dismiss();
    };
  }, []); // Empty deps - only run once on mount

  return null; // This component doesn't render anything itself
}
