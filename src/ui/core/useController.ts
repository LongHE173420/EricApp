import { useEffect, useRef, useState } from 'react';
import { BaseController } from './BaseController';

/**
 * Hook to instantiate a controller and subscribe to its state changes.
 * 
 * @param ControllerClass The class of the controller to instantiate.
 * @param args Arguments to pass to the controller's constructor.
 * @returns A tuple of the current state and the controller instance.
 */
export function useController<T extends BaseController<any>>(
  ControllerClass: new (...args: any[]) => T,
  ...args: any[]
): [ReturnType<T['getState']>, T] {
  // Instantiate the controller once
  const controllerRef = useRef<T | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = new ControllerClass(...args);
  }

  const controller = controllerRef.current as T;

  // React state matches controller state
  const [state, setState] = useState<ReturnType<T['getState']>>(controller.getState());

  useEffect(() => {
    // Whenever controller updates its state, React will re-render
    const unsubscribe = controller.subscribe((newState: ReturnType<T['getState']>) => {
      setState(newState);
    });

    // Sync immediately in case the controller changed state
    // before React attached this subscription.
    setState(controller.getState());

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      if (typeof controller.destroy === 'function') {
        controller.destroy();
      }
    };
  }, [controller]);

  return [state, controller];
}
