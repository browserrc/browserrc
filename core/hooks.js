/**
 * Hook class that manages listeners and triggering
 * @template {any[]} Args
 */
export class Hook {
  /** @type {Array<{listener: (...args: Args) => any, onError?: (error: unknown) => void}>} */
  #listeners = [];
  /** @type {string | undefined} */
  name;
  /** @type {string} */
  description;

  /**
   * @param {string} [name]
   * @param {string} description
   */
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Register a listener for this hook.
   * @param {(...args: Args) => any} listener
   * @param {{onError?: (error: unknown) => void}} [options]
   * @returns {() => void} Unregister function
   */
  register(listener, options) {
    const listenerEntry = { listener, onError: options?.onError || (() => {}) };
    this.#listeners.push(listenerEntry);

    return () => {
      const index = this.#listeners.indexOf(listenerEntry);
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
    for (const entry of this.#listeners) {
      try {
        results.push(entry.listener(...args));
      } catch (error) {
        try {
          entry.onError(error);
        } catch (onErrorError) {
            // ignore
        }
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