// SessionExpiryWarning.jsx
// Toast notification warning user about impending session expiry
// Feature: 003-fix-session-expiry-handling

import React, { useEffect } from 'react';
import { toast } from '../hooks/use-toast';
import { useSessionExtension } from '../hooks/useSessionExtension';
import analyticsService from '../services/analyticsService';

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
      title: "⏰ Session Expiring Soon",
      description: "Your session will expire in less than 2 minutes. Please extend your session or save your work.",
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
                  title: "✅ Session Extended",
                  description: "Your session has been extended",
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
                  title: "❌ Extension Failed",
                  description: result.error || "Could not extend session",
                  duration: 5000,
                  variant: "destructive"
                });
              }
            }}
            disabled={isExtending}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isExtending ? 'Extending...' : 'Extend Session'}
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
            Logout Now
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
