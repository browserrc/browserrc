/**
 * Key Processor - Unified key processing with trie-based sequence matching
 * 
 * Features:
 * - Trie-based key sequence matching
 * - Hooks (pass global hooks for main processor, or use default local hooks)
 * - Multi-mode support
 * - Context management
 * - Force execute keys
 * - Key repeat support
 */

import { Trie } from "./trie.js";
import { eventToKey, parseKeySequence } from "./keyParser.js";
import { Hook } from "./hooks.js";

/**
 * @typedef {Object} KeyProcessorOptions
 * @property {number} [keyTimeout=1000] - Timeout for key sequences in milliseconds
 * @property {number} [ambiguityTimeout=300] - Timeout for ambiguous key resolution
 * @property {string[]} [forceExecuteKeys=["<Enter>"]] - Keys that force execution of ambiguous actions
 * @property {number} [repeatInterval=50] - Interval in milliseconds for key repeat functionality
 * @property {string} [defaultMode="n"] - Default mode to initialize the key processor with
 * @property {Hook} [onKey] - Hook called for every key press
 * @property {Hook} [onNodeMatched] - Hook called when a node is matched
 * @property {Hook} [onSequenceReset] - Hook called when the key sequence is reset
 * @property {Hook} [onActionExecuted] - Hook called when an action is executed
 */

export class KeyProcessor {
  /**
   * @param {KeyProcessorOptions} options
   */
  constructor(options = {}) {
    // Multi-mode support
    this.modes = new Map(); // Map<modeName, Trie>
    this.defaultMode = options.defaultMode ?? "n";
    this.currentMode = this.defaultMode;
    this.currentRoot = null;

    // Initialize default mode
    this.initMode(this.defaultMode);
    this.currentRoot = this.modes.get(this.defaultMode);
    this.currentNode = this.currentRoot.root;
    
    // Timeouts
    this.keyTimeout = options.keyTimeout ?? 1000;
    this.ambiguityTimeout = options.ambiguityTimeout ?? 300;
    this.timeoutId = null;
    this.timeoutType = null;
    
    // State
    this.pendingAmbiguousAction = null;
    this.matchedPath = [];
    this.isActive = true;
    this.context = null;
    
    // Hooks - create new instances by default, or use provided ones
    this.onKey = options.onKey ?? new Hook('onKey', 'Called for every key press');
    this.onNodeMatched = options.onNodeMatched ?? new Hook('onNodeMatched', 'Called when a node is matched');
    this.onSequenceReset = options.onSequenceReset ?? new Hook('onSequenceReset', 'Called when key sequence resets');
    this.onActionExecuted = options.onActionExecuted ?? new Hook('onActionExecuted', 'Called after an action is executed');

    // Force execute keys
    this.forceExecuteKeys = options.forceExecuteKeys ?? ["<Enter>"];

    // Key repeat support
    this.heldKeys = new Map();
    this.repeatInterval = options.repeatInterval ?? 50;
  }

  /**
   * Configure allowed fields.
   * Only allows updating specific safe fields.
   */
  configure({ keyTimeout, ambiguityTimeout, repeatInterval, defaultMode, forceExecuteKeys, ctx }) {
    if (keyTimeout !== undefined) this.keyTimeout = keyTimeout;
    if (ambiguityTimeout !== undefined) this.ambiguityTimeout = ambiguityTimeout;
    if (repeatInterval !== undefined) this.repeatInterval = repeatInterval;
    if (defaultMode !== undefined) this.defaultMode = defaultMode;
    if (forceExecuteKeys !== undefined) this.forceExecuteKeys = forceExecuteKeys;
    if (ctx !== undefined) this.context = ctx;
  }

  /**
   * Initialize a mode with its trie
   */
  initMode(modeName) {
    if (!this.modes.has(modeName)) {
      this.modes.set(modeName, new Trie());
    }
    return this.modes.get(modeName);
  }

  /**
   * Set the current mode
   */
  setMode(modeName) {
    this.stopAllRepeating();
    if (!this.modes.has(modeName)) {
      this.initMode(modeName);
    }
    this.currentMode = modeName;
    this.currentRoot = this.modes.get(modeName);
    this.resetToRoot();
  }

  /**
   * Set a keybinding using Whaleboat key notation
   */
  set(sequence, callback) {
    const keys = parseKeySequence(sequence);
    const keyStrings = keys.map(k => k.string);
    this.currentRoot.insert(keyStrings, callback);
  }

  /**
   * Clear all keybindings in current mode
   */
  clear() {
    this.modes.set(this.currentMode, new Trie());
    this.currentRoot = this.modes.get(this.currentMode);
    this.resetToRoot();
  }

  /**
   * Clear all modes and reset
   */
  clearAll() {
    this.modes.clear();
    this.initMode(this.defaultMode);
    this.setMode(this.defaultMode);
  }

  /**
   * Reset to root node
   */
  resetToRoot() {
    this.currentNode = this.currentRoot.root;
    this.matchedPath = [];
    this.pendingAmbiguousAction = null;
    this.clearTimeout();
    this.onSequenceReset.trigger(this.context);
  }

  /**
   * Clear any pending timeout
   */
  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.timeoutType = null;
  }

  /**
   * Set a timeout
   */
  setTimer(type, executeAction) {
    this.clearTimeout();
    this.timeoutType = type;
    const duration = type === "AMBIGUOUS" ? this.ambiguityTimeout : this.keyTimeout;

    this.timeoutId = setTimeout(() => {
      if (type === "AMBIGUOUS" && this.pendingAmbiguousAction) {
        this.executeActionInternal(this.pendingAmbiguousAction, executeAction);
        this.callCompletionHooks(executeAction);
      }
      this.resetToRoot();
    }, duration);
  }

  /**
   * Check if a key is a force execute key
   */
  isForceExecuteKey(key) {
    return this.forceExecuteKeys.includes(key.string);
  }

  /**
   * Build context with current state
   */
  buildContextWithState(executeActionCallback) {
    return {
      ...(this.context || {}),
      keys: [...this.matchedPath.map((n) => n.key).filter(Boolean), this.currentNode?.key].filter(Boolean),
      mode: this.currentMode,
      currentNode: this.currentNode,
      matchedPath: this.matchedPath,
      forceExecuteKeys: this.forceExecuteKeys,
      pendingAmbiguousAction: this.pendingAmbiguousAction,
      timeoutType: this.timeoutType,
      resetTimeout: (type = "SEQUENCE") => this.setTimer(type, executeActionCallback),
      executeTrieAction: (callback) => {
        const metadata = { actionName: "extension", keySequence: [] };
        callback(metadata);
      },
    };
  }

  /**
   * Process a key - handles both KeyboardEvent and parsed key objects
   */
  processKey(eventOrKey, executeAction) {
    if (typeof eventOrKey.preventDefault === 'function') {
      return this.processKeyEvent(eventOrKey, executeAction);
    }
    return this.processKeyParsed(eventOrKey, executeAction);
  }

  /**
   * Process a KeyboardEvent
   */
  processKeyEvent(event, executeAction) {
    if (!this.isActive) return false;

    const modifierKeys = ["Shift", "Control", "Alt", "Meta"];
    if (modifierKeys.includes(event.key)) return false;

    const key = eventToKey(event);
    const shouldForward = this.processKeyInternal(key, event, executeAction);

    if (shouldForward) {
      this.clearTimeout();
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  /**
   * Process a parsed key object
   */
  processKeyParsed(key, executeAction) {
    const root = this.currentRoot;
    if (!root || !this.currentNode) return false;

    // Call onKey hooks
    if (this.onKey.count > 0) {
      // If any of the hook results are true, return true, otherwise return false
      return this.onKey
        .trigger(this.buildContextWithState(executeAction), key)
        .some(result => result === true);
    }

    return !this.processKeyCore(key, null, executeAction);
  }

  /**
   * Internal processing with full hook support
   */
  processKeyInternal(key, event, executeAction) {
    const ctx = this.buildContextWithState(executeAction);
    const results = this.onKey.trigger(ctx, key, event);
    for (const result of results) {
      if (result === true) return false; // Consume
      if (result === false) return true; // Forward
    }

    // Force execute on ambiguous node
    if (this.currentNode?.isAmbiguous() && this.pendingAmbiguousAction && this.isForceExecuteKey(key)) {
      this.executeActionInternal(this.pendingAmbiguousAction, executeAction);
      this.callCompletionHooks(executeAction);
      this.onActionExecuted.trigger(this.buildContextWithState(executeAction));
      this.resetToRoot();
      return false;
    }

    return this.processKeyCore(key, event, executeAction);
  }

  /**
   * Core key processing logic
   */
  processKeyCore(key, event, executeAction) {
    const child = this.currentNode.getChild(key.string);

    if (child) {
      this.pendingAmbiguousAction = null;
      const previousNode = this.currentNode;
      this.currentNode = child;
      this.matchedPath.push(previousNode);

      // Trie node hooks
      if (previousNode.hooks?.onChildMatched?.count > 0) {
        this.executeHook(previousNode.hooks.onChildMatched, executeAction);
      }

      // Global node matched hook
      const ctx = this.buildContextWithState(executeAction);
      this.onNodeMatched.trigger(ctx, this.currentNode);
      this.currentNode.hooks?.onMatched?.trigger(ctx, this.currentNode);

      if (this.currentNode.isAmbiguous()) {
        this.pendingAmbiguousAction = this.currentNode.action;
        this.setTimer("AMBIGUOUS", executeAction);
        if (this.currentNode.hooks?.onMatched?.count > 0) {
          this.executeHook(this.currentNode.hooks.onMatched, executeAction);
        }
        return false;
      } else if (this.currentNode.isLeaf() && this.currentNode.action) {
        
        // Key repeat support
        const repeatOption = this.currentNode.metadata?.repeat;
        const shouldRepeat = repeatOption === true || (typeof repeatOption === 'object' && repeatOption !== null);
        
        if (shouldRepeat) {
          const interval = typeof repeatOption === 'object' ? repeatOption.interval : null;
          this.startRepeating(key.string, this.currentNode.action, executeAction, interval);
        } else {
          this.executeActionInternal(this.currentNode.action, executeAction);
        }

        this.callCompletionHooks(executeAction);
        this.onActionExecuted.trigger(ctx);
        this.resetToRoot();
        return false;
      } else {
        this.setTimer("SEQUENCE", executeAction);
        return false;
      }
    } else {
      // No child matched
      const hadChildren = this.currentNode.hasChildren();

      if (this.currentNode?.isAmbiguous() && this.pendingAmbiguousAction) {
        this.executeActionInternal(this.pendingAmbiguousAction, executeAction);
        this.callCompletionHooks(executeAction);
        this.onActionExecuted.trigger(this.buildContextWithState(executeAction));
        this.resetToRoot();
        return true;
      }

      // Failure hooks
      if (this.currentNode.hooks?.onNotMatched?.count > 0) {
        this.executeHook(this.currentNode.hooks.onNotMatched, executeAction);
      }
      if (hadChildren && this.currentNode.hooks?.onNoChildMatched?.count > 0) {
        this.executeHook(this.currentNode.hooks.onNoChildMatched, executeAction);
      }
      this.matchedPath.forEach((node) => {
        if (node.hooks?.onNoChildBranchCompleted?.count > 0) {
          this.executeHook(node.hooks.onNoChildBranchCompleted, executeAction);
        }
      });

      const shouldForward = this.currentNode.forwardOnNonMatch ?? true;
      this.resetToRoot();
      return shouldForward;
    }
  }

  /**
   * Call completion hooks on matched path
   */
  callCompletionHooks(executeAction) {
    this.matchedPath.forEach((node) => {
      if (node.hooks?.onChildBranchCompleted?.count > 0) {
        this.executeHook(node.hooks.onChildBranchCompleted, executeAction);
      }
    });
    const root = this.currentRoot.root;
    if (root?.hooks?.onChildBranchCompleted?.count > 0) {
      this.executeHook(root.hooks.onChildBranchCompleted, executeAction);
    }
  }

  /**
   * Execute callback
   */
  executeActionInternal(callback, executeActionCallback) {
    const keySequence = [];
    for (let i = 1; i < this.matchedPath.length; i++) {
      if (this.matchedPath[i].key) keySequence.push(this.matchedPath[i].key);
    }
    if (this.currentNode?.key) keySequence.push(this.currentNode.key);

    const metadata = { keySequence, actionName: callback.name || "unknown" };

    // Call the callback directly with metadata
    callback(metadata);
  }

  /**
   * Execute a trie node hook
   */
  executeHook(hook, executeActionCallback) {
    if (!hook) return;
    const results = hook.trigger();
    for (const action of results) {
      if (action) this.executeActionInternal(action, executeActionCallback);
    }
  }

  /**
   * Start repeating an action
   */
  startRepeating(keyString, action, executeActionCallback, customInterval = null) {
    this.stopRepeating(keyString);
    const interval = customInterval ?? this.repeatInterval;
    this.executeActionInternal(action, executeActionCallback);
    const intervalId = setInterval(() => {
      this.executeActionInternal(action, executeActionCallback);
    }, interval);
    this.heldKeys.set(keyString, { intervalId, action, executeAction: executeActionCallback });
  }

  /**
   * Stop repeating for a key
   */
  stopRepeating(keyString) {
    const heldKey = this.heldKeys.get(keyString);
    if (heldKey) {
      clearInterval(heldKey.intervalId);
      this.heldKeys.delete(keyString);
    }
  }

  /**
   * Stop all repeating
   */
  stopAllRepeating() {
    for (const [, heldKey] of this.heldKeys.entries()) {
      clearInterval(heldKey.intervalId);
    }
    this.heldKeys.clear();
  }

  /**
   * Handle keyup event
   */
  handleKeyUp(event) {
    if (!this.isActive) return;
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta'];
    if (modifierKeys.includes(event.key)) return;
    const key = eventToKey(event);
    this.stopRepeating(key.string);
  }

  reset() {
    this.stopAllRepeating();
    this.resetToRoot();
    this.setMode(this.defaultMode);
  }

  /**
   * Get matched sequence
   */
  getMatchedSequence() {
    return [...this.matchedPath.map(n => n.key).filter(Boolean), this.currentNode?.key].filter(Boolean);
  }

}
