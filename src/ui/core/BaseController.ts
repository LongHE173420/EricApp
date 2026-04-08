/**
 * Base Controller class for MVVM architecture in React Native.
 * Handles state management and listener subscriptions.
 */
export abstract class BaseController<S> {
  protected state: S;
  private listeners: Array<(state: S) => void> = [];

  constructor(initialState: S) {
    this.state = initialState;
  }

  /**
   * Partially update the state and notify all listeners.
   */
  protected setState(newState: Partial<S>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  /**
   * Retrieve the current state.
   */
  public getState(): S {
    return this.state;
  }

  /**
   * Subscribe to state changes. Used internally by useController hook.
   * @returns Cleanup function to unsubscribe.
   */
  public subscribe(listener: (state: S) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Lifecycle method called when the controller is unmounted/destroyed.
   * Override this to cleanup any intervals or side effects.
   */
  public destroy() {
    this.listeners = [];
  }
}
