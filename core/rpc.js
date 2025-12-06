import { Hook } from "./hooks.js"

/**
 * Error thrown when an internal library function that requires a specific environment
 * is called while running in a different environment.
 * 
 * This error is thrown by functions like initPageContext() when called outside a content
 * script context, or initBackgroundContext() when called outside a background script context.
 * 
 * It exists to prevent runtime errors and confusion that would occur from executing
 * environment-specific code in the wrong context, which could lead to incorrect behavior
 * or API misuse.
 */
export class WrongEnvironmentError extends Error {
    constructor(expected, actual) {
        super(`Environment mismatch: expected "${expected}", but detected "${actual}"`);
        this.name = 'WrongEnvironmentError';
        this.expected = expected;
        this.actual = actual;
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WrongEnvironmentError);
        }
        
        // Ensure instanceof works correctly after transpilation
        Object.setPrototypeOf(this, WrongEnvironmentError.prototype);
    }
}

export const onContextInit = new Hook('onContextInit', 'Called when context is initialized in any environment');

/**
 * Factory for shared context
 * 
 * This provides the context object which will be passed to all hook and action handlers that 
 * run in any environment (ie. within a content script or background script).
 * 
 * This object will be extended further down the chain, this function should only be used to 
 * add fields which must ALWAYS be present, not for optional plugins.
 *
 * @returns {BaseContext}
 */
function initSharedContext() {
    const context =  {}
    try {
        onContextInit.trigger(context);
    } catch (error) {
        console.error('Error triggering onContextInit', error);
    }
    return context;
}

export const onPageContextInit = new Hook('onPageContextInit', 'Called when page context is initialized');

/**
 * Factory for page context
 * 
 * This provides the context object which will be passed to all hook and action handlers that 
 * run in the "page" environment (ie. within a content script).
 * 
 * This object will be extended further down the chain, this function should only be used to 
 * add fields which must ALWAYS be present, not for optional plugins.
 *
 * @returns {PageContext}
 * @internal This function is for internal library use only and is not part of the public API
 */
export function initPageContext() {
    assertEnvironment("page");
    
    const context = initSharedContext();
    context.environment = "page";
    try {
        onPageContextInit.trigger(context);
    } catch (error) {
        console.error('Error triggering onPageContextInit', error);
    }
    return context;
}

export const onBackgroundContextInit = new Hook('onBackgroundContextInit', 'Called when the background context is initialized');

/**
 * Factory for background context
 * 
 * This provides the context object which will be passed to all hook and action handlers that 
 * run in the "background" environment (ie. within a background script).
 * 
 * This object will be extended further down the chain, this function should only be used to 
 * add fields which must ALWAYS be present, not for optional plugins.
 *
 * @returns {BackgroundContext}
 * @internal This function is for internal library use only and is not part of the public API
 */
export function initBackgroundContext() {
    assertEnvironment("background");
    
    const context = initSharedContext();
    context.environment = "background";
    try {
        onBackgroundContextInit.trigger(context);
    } catch (error) {
        console.error('Error triggering onBackgroundContextInit', error);
    }
    return context;
}

// Cache for inferCurrentEnvironment memoization
let _cachedEnvironment = null;

/**
 * Infer the current runtime environment based on available APIs.
 * 
 * Returns:
 * - "bun" if running in Bun runtime
 * - "node" if running in Node.js runtime
 * - "background" if running in a browser extension background script
 * - "page" if running in a browser extension content script
 * - "unknown" if the environment cannot be determined
 * 
 * This function executes safely in any JavaScript environment including Node.js and Bun.
 * The result is memoized after the first call for performance.
 */
export function inferCurrentEnvironment() {
    if (_cachedEnvironment === null) {
        try {
            if (typeof Bun !== 'undefined') {
                _cachedEnvironment = "bun";
            } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                _cachedEnvironment = "node";
            } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                    _cachedEnvironment = "page";
                } else {
                    _cachedEnvironment = "background";
                }
            } else {
                _cachedEnvironment = "unknown";
            }
        } catch (e) {
            console.warn('Failed to infer current environment:', e);
            _cachedEnvironment = "unknown";
        }
    }
    
    return _cachedEnvironment;
}

/**
 * Assert that the current environment matches the expected environment.
 * 
 * @param {string} expected - The expected environment ("page", "background", or "unknown")
 * @throws {WrongEnvironmentError} If the current environment doesn't match the expected environment
 */
export function assertEnvironment(expected) {
    const current = inferCurrentEnvironment();
    if (current !== expected) {
        throw new WrongEnvironmentError(expected, current);
    }
}

/**
 * Check if the current environment matches the expected environment.
 * 
 * @param {string} expected - The expected environment ("page", "background", or "unknown")
 * @returns {boolean} True if the current environment matches, false otherwise
 */
export function checkEnvironment(expected) {
    return inferCurrentEnvironment() === expected;
}

/**
 * Check if the current environment is a page (content script) environment.
 * 
 * @returns {boolean} True if running in a content script, false otherwise
 */
export function isPage() {
    return inferCurrentEnvironment() === "page";
}

/**
 * Check if the current environment is a background script environment.
 * 
 * @returns {boolean} True if running in a background script, false otherwise
 */
export function isBackground() {
    return inferCurrentEnvironment() === "background";
}

/**
 * Check if the current environment is Node.js runtime.
 * 
 * @returns {boolean} True if running in Node.js, false otherwise
 */
export function isNode() {
    return inferCurrentEnvironment() === "node";
}

/**
 * Check if the current environment is Bun runtime.
 * 
 * @returns {boolean} True if running in Bun, false otherwise
 */
export function isBun() {
    return inferCurrentEnvironment() === "bun";
}


/**
 * Calculate a deterministic action ID based on the function code
 * This ensures that actions can be registered and executed by ID via a handler
 * 
 * Requirement 1: The generated ID must be serializable and able to be passed as an attribute
 *  in the browser messaging APIs, as well as over HTTP or websocket.
 *  
 * Requirement 2: The generated ID must be unique per-context. If a function has identical code, it
 *  will still generate unique IDs between the page and background contexts.
 */
function calculateActionId(fn) {
    // for requirement 2, you'll need to use inferCurrentEnvironment() and include the environment name in the hash
    // to ensure uniqueness accross environments for the same function.
    const environment = inferCurrentEnvironment();
    const str = JSON.stringify({ fn: fn.toString(), env: environment });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & 0xffffffff; // Convert to 32-bit integer
    }
    return `action_${Math.abs(hash)}`;
}

/**
 * Create an action from a handler function
 *
 * The handler function should accept a single object parameter containing
 * the context and any additional input parameters.
 *
 * @example
 * // Action with no additional input
 * const action1 = createAction(async ({ ctx }) => {
 *   console.log('Environment:', ctx.environment);
 * });
 *
 * @example
 * // Action with input parameters
 * const action2 = createAction(async ({ ctx, message, count }) => {
 *   console.log(`${message} (count: ${count})`);
 * });
 *
 * @param {function} fn - Handler function that takes a single object parameter
 * @returns {object} Action object with id and handler
 */
export function createAction(fn) {
    // calculate action id
    const actionId = calculateActionId(fn);

    return {
        id: actionId,
        handler: fn,
    }

}
