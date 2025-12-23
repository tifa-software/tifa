"use client";

import { useEffect } from "react";
import { SessionProvider, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MINUTES = 15; // Adjust this value as needed
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

const SessionWatcher = ({ children }) => {
  useEffect(() => {
    let timerId;

    const resetTimer = () => {
      if (timerId) {
        clearTimeout(timerId);
      }

      timerId = setTimeout(() => {
        // Auto sign out the user after inactivity
        signOut({ callbackUrl: "/signin" });
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer on mount
    resetTimer();

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return <>{children}</>;
};

export const AuthProvider = ({ children }) => {
  return (
    <SessionProvider>
      <SessionWatcher>{children}</SessionWatcher>
    </SessionProvider>
  );
};
