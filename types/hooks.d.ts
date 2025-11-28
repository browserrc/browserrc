/**
 * Action type for RPC calls (placeholder - actual type defined in rpc.js)
 */
export interface Action {
  (...args: any[]): any;
}

/**
 * Hook class that manages listeners and triggering
 */
export class Hook<Args extends any[] = []> {
  /** @readonly */
  name: string;
  /** @readonly */
  description: string;

  /**
   * @param name - The name of the hook
   * @param description - Description of what this hook does
   */
  constructor(name: string, description: string);

  /**
   * Register a listener for this hook. Can be a function or an Action.
   * @param listener - The listener function to register
   * @returns Unregister function to remove the listener
   */
  register(listener: ((...args: Args) => any) | Action): () => void;

  /**
   * Trigger all registered listeners and return their results
   * @param args - Arguments to pass to the listeners
   * @returns Array of results from all listeners
   */
  trigger(...args: Args): any[];

  /**
   * Clear all registered listeners
   */
  clear(): void;

  /**
   * Get the number of registered listeners
   */
  get count(): number;
}
