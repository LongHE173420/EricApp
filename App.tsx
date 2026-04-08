import React, { useEffect } from 'react';
import { RootScreen } from './src/ui/screens/RootScreen';

export default function App() {
  useEffect(() => {
    if (!__DEV__) return;

    const globalAny = globalThis as any;
    const ErrorUtilsRef = globalAny?.ErrorUtils;
    const previousHandler =
      ErrorUtilsRef && typeof ErrorUtilsRef.getGlobalHandler === 'function'
        ? ErrorUtilsRef.getGlobalHandler()
        : null;

    if (!ErrorUtilsRef || typeof ErrorUtilsRef.setGlobalHandler !== 'function') {
      return;
    }

    ErrorUtilsRef.setGlobalHandler((error: any, isFatal?: boolean) => {
      console.log('[GlobalError]', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        isFatal,
      });

      if (typeof previousHandler === 'function') {
        previousHandler(error, isFatal);
      }
    });

    console.log('[AppRoot] mounted');

    return () => {
      console.log('[AppRoot] unmounted');
      if (typeof previousHandler === 'function') {
        ErrorUtilsRef.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  return <RootScreen />;
}
