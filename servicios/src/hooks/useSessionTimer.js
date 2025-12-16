// useSessionTimer.js
// Custom hook for session timer with drift compensation
// Feature: 003-fix-session-expiry-handling

import { useState, useEffect, useRef } from 'react';

/**
 * Session timer hook with drift compensation
 * Uses setTimeout recursive pattern instead of setInterval
 * to prevent drift over long periods
 *
 * @param {number} initialSeconds - Initial time remaining in seconds
 * @returns {number} timeRemaining - Current time remaining in seconds
 *
 * @example
 * const timeRemaining = useSessionTimer(900); // 15 minutes
 * console.log(`Session expires in ${timeRemaining} seconds`);
 */
export function useSessionTimer(initialSeconds) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const startTimeRef = useRef(Date.now());
  const initialSecondsRef = useRef(initialSeconds);

  useEffect(() => {
    // Reset start time and initial seconds when initialSeconds changes
    startTimeRef.current = Date.now();
    initialSecondsRef.current = initialSeconds;
    setTimeRemaining(initialSeconds);

    let timeoutId;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, initialSecondsRef.current - elapsed);

      setTimeRemaining(remaining);

      if (remaining > 0) {
        // Drift compensation: adjust next tick to stay aligned
        const drift = (Date.now() - startTimeRef.current) % 1000;
        timeoutId = setTimeout(tick, 1000 - drift);
      }
    };

    // Start first tick
    timeoutId = setTimeout(tick, 1000);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialSeconds]);

  return timeRemaining;
}
