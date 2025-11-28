/**
 * Hook class that manages listeners and triggering
 * @template {any[]} Args
 */
export class Hook {
  /** @type {((...args: Args) => any)[]} */
  #listeners = [];
  /** @type {string} */
  name;
  /** @type {string} */
  description;

  /**
   * @param {string} name
   * @param {string} description
   */
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Register a listener for this hook. Can be a function or an Action.
   * @param {((...args: Args) => any) | import('../rpc.js').Action} listener
   * @returns {() => void} Unregister function
   */
  register(listener) {
    this.#listeners.push(listener);
    return () => {
      const index = this.#listeners.indexOf(listener);
      if (index > -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }

  /**
   * Trigger all registered listeners and return their results
   * @param {...Args} args
   * @returns {any[]}
   */
  trigger(...args) {
    const results = [];
    for (const listener of this.#listeners) {
      try {
        results.push(listener(...args));
      } catch (error) {
        console.error(`[Hook:${this.name}] Error in listener:`, error);
        results.push(undefined);
      }
    }
    return results;
  }

  clear() {
    this.#listeners = [];
  }

  /** @returns {number} */
  get count() {
    return this.#listeners.length;
  }
}