/**
 * Key Processor - Unified key processing with trie-based sequence matching
 * 
 * Features:
 * - Trie-based key sequence matching
 * - Hooks (pass global hooks for main processor, or use default local hooks)
 * - Multi-mode support
 * - Context management
 * - Force execute keys
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
 * @property {Hook} [onSequenceComplete] - Hook called when a sequence completes
 * @property {Hook} [onAmbiguousTimeout] - Hook called when ambiguous sequence times out
 * @property {Hook} [onRepeat] - Hook called for each repeat
 * @property {Hook} [onRepeatStart] - Hook called when repeat starts
 * @property {Hook} [onRepeatEnd] - Hook called when repeat ends
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
    this.pendingAmbiguousSequence = null;
    this.matchedPath = [];
    this.isActive = true;
    this.context = null;

    // Hooks - create new instances by default, or use provided ones
    this.onKey = options.onKey ?? new Hook('onKey', 'Called for every key press');
    this.onNodeMatched = options.onNodeMatched ?? new Hook('onNodeMatched', 'Called when a node is matched');
    this.onSequenceReset = options.onSequenceReset ?? new Hook('onSequenceReset', 'Called when key sequence resets');
    this.onSequenceComplete = options.onSequenceComplete ?? new Hook('onSequenceComplete', 'Called when a sequence completes');
    this.onAmbiguousTimeout = options.onAmbiguousTimeout ?? new Hook('onAmbiguousTimeout', 'Called when ambiguous sequence times out');
    this.onRepeat = options.onRepeat ?? new Hook('onRepeat', 'Called for each repeat');
    this.onRepeatStart = options.onRepeatStart ?? new Hook('onRepeatStart', 'Called when repeat starts');
    this.onRepeatEnd = options.onRepeatEnd ?? new Hook('onRepeatEnd', 'Called when repeat ends');
    this.onActionExecuted = options.onActionExecuted ?? new Hook('onActionExecuted', 'Called after an action is executed');

    // Force execute keys
    this.forceExecuteKeys = options.forceExecuteKeys ?? ["<Enter>"];
    this.repeatInterval = options.repeatInterval ?? 50;
    this.heldKeys = new Map();
  }

  /**
   * Configure allowed fields.
   * Only allows updating specific safe fields.
   */
  configure({ keyTimeout, ambiguityTimeout, defaultMode, forceExecuteKeys, ctx }) {
    if (keyTimeout !== undefined) this.keyTimeout = keyTimeout;
    if (ambiguityTimeout !== undefined) this.ambiguityTimeout = ambiguityTimeout;
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
  set(sequence) {
    const keys = parseKeySequence(sequence);
    const keyStrings = keys.map(k => k.string);
    this.currentRoot.insert(keyStrings);
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
  setTimer(type) {
    this.clearTimeout();
    this.timeoutType = type;
    const duration = type === "AMBIGUOUS" ? this.ambiguityTimeout : this.keyTimeout;

    this.timeoutId = setTimeout(() => {
      if (type === "AMBIGUOUS" && this.pendingAmbiguousSequence) {
        const sequenceInfo = {
          keySequence: this.pendingAmbiguousSequence,
          mode: this.currentMode
        };
        this.onAmbiguousTimeout.trigger(sequenceInfo);
        this.callCompletionHooks();
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
  buildContextWithState() {
    return {
      ...(this.context || {}),
      keys: [...this.matchedPath.map((n) => n.key).filter(Boolean), this.currentNode?.key].filter(Boolean),
      mode: this.currentMode,
      currentNode: this.currentNode,
      matchedPath: this.matchedPath,
      forceExecuteKeys: this.forceExecuteKeys,
      timeoutType: this.timeoutType,
      resetTimeout: (type = "SEQUENCE") => this.setTimer(type),
      executeTrieAction: (callback) => {
        const metadata = { actionName: "extension", keySequence: [] };
        callback(metadata);
      },
    };
  }

  /**
   * Process a key - handles both KeyboardEvent and parsed key objects
   */
  processKey(eventOrKey) {
    if (typeof eventOrKey.preventDefault === 'function') {
      return this.processKeyEvent(eventOrKey);
    }
    return this.processKeyParsed(eventOrKey);
  }

  /**
   * Process a KeyboardEvent
   */
  processKeyEvent(event) {
    if (!this.isActive) return false;

    const modifierKeys = ["Shift", "Control", "Alt", "Meta"];
    if (modifierKeys.includes(event.key)) return false;

    const key = eventToKey(event);
    const shouldForward = this.processKeyInternal(key, event);

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
  processKeyParsed(key) {
    const root = this.currentRoot;
    if (!root || !this.currentNode) return false;

    // Call onKey hooks
    if (this.onKey.count > 0) {
      // If any of the hook results are true, return true, otherwise return false
      return this.onKey
        .trigger(this.buildContextWithState(), key)
        .some(result => result === true);
    }

    return !this.processKeyCore(key, null);
  }

  /**
   * Internal processing with full hook support
   */
  processKeyInternal(key, event) {
    const ctx = this.buildContextWithState();
    const results = this.onKey.trigger(ctx, key, event);
    for (const result of results) {
      if (result === true) return false; // Consume
      if (result === false) return true; // Forward
    }

    // Force execute on ambiguous node
    if (this.currentNode?.isAmbiguous() && this.pendingAmbiguousSequence && this.isForceExecuteKey(key)) {
      const sequenceInfo = {
        keySequence: this.pendingAmbiguousSequence,
        mode: this.currentMode
      };
      this.onSequenceComplete.trigger(sequenceInfo);
      this.callCompletionHooks();
      this.onActionExecuted.trigger(this.buildContextWithState());
      this.resetToRoot();
      return false;
    }

    return this.processKeyCore(key, event);
  }

  /**
   * Core key processing logic
   */
  processKeyCore(key, event) {
    const child = this.currentNode.getChild(key.string);

    if (child) {
      const previousNode = this.currentNode;
      this.currentNode = child;
      this.matchedPath.push(previousNode);

      // Trie node hooks
      previousNode.hooks?.onChildMatched?.trigger();

      // Global node matched hook
      const ctx = this.buildContextWithState();
      this.onNodeMatched.trigger(ctx, this.currentNode);
      this.currentNode.hooks?.onMatched?.trigger(ctx, this.currentNode);

      if (this.currentNode.isAmbiguous()) {
        this.pendingAmbiguousSequence = [...this.matchedPath.map((n) => n.key).filter(Boolean), this.currentNode?.key].filter(Boolean);
        this.setTimer("AMBIGUOUS");
        return false;
      } else if (this.currentNode.canComplete()) {
        const keySequence = [...this.matchedPath.map((n) => n.key).filter(Boolean), this.currentNode?.key].filter(Boolean);
        const sequenceInfo = { keySequence, mode: this.currentMode };

        // Key repeat support
        const repeatOption = this.currentNode.metadata?.repeat;
        const shouldRepeat = repeatOption === true || (typeof repeatOption === 'object' && repeatOption !== null);

        if (shouldRepeat) {
          const interval = typeof repeatOption === 'object' ? repeatOption.interval : null;
          this.startRepeating(key.string, sequenceInfo, interval);
        } else {
          this.onSequenceComplete.trigger(sequenceInfo);
        }

        this.callCompletionHooks();
        this.onActionExecuted.trigger(ctx);
        this.resetToRoot();
        return false;
      } else {
        this.setTimer("SEQUENCE");
        return false;
      }
    } else {
      // No child matched
      const hadChildren = this.currentNode.hasChildren();

      if (this.currentNode?.isAmbiguous() && this.pendingAmbiguousSequence) {
        const sequenceInfo = {
          keySequence: this.pendingAmbiguousSequence,
          mode: this.currentMode
        };
        this.onSequenceComplete.trigger(sequenceInfo);
        this.callCompletionHooks();
        this.onActionExecuted.trigger(this.buildContextWithState());
        this.resetToRoot();
        return true;
      }

      // Failure hooks
      this.currentNode.hooks?.onNotMatched?.trigger();
      if (hadChildren) {
        this.currentNode.hooks?.onNoChildMatched?.trigger();
      }
      this.matchedPath.forEach((node) => {
        node.hooks?.onBranchFailed?.trigger();
      });

      const shouldForward = this.currentNode.forwardOnNonMatch ?? true;
      this.resetToRoot();
      return shouldForward;
    }
  }

  /**
   * Call completion hooks on matched path
   */
  callCompletionHooks() {
    this.matchedPath.forEach((node) => {
      node.hooks?.onSequenceComplete?.trigger();
    });
    const root = this.currentRoot.root;
    root?.hooks?.onSequenceComplete?.trigger();
  }




  /**
   * Start repeating a sequence
   */
  startRepeating(keyString, sequenceInfo, customInterval = null) {
    this.stopRepeating(keyString);
    this.onRepeatStart.trigger(sequenceInfo);
    const interval = customInterval ?? this.repeatInterval;
    const intervalId = setInterval(() => {
      this.onRepeat.trigger(sequenceInfo);
    }, interval);
    this.heldKeys.set(keyString, { intervalId, sequenceInfo });
  }

  /**
   * Stop repeating for a key
   */
  stopRepeating(keyString) {
    const heldKey = this.heldKeys.get(keyString);
    if (heldKey) {
      clearInterval(heldKey.intervalId);
      this.onRepeatEnd.trigger(heldKey.sequenceInfo);
      this.heldKeys.delete(keyString);
    }
  }

  /**
   * Stop all repeating
   */
  stopAllRepeating() {
    for (const [, heldKey] of this.heldKeys.entries()) {
      clearInterval(heldKey.intervalId);
      this.onRepeatEnd.trigger(heldKey.sequenceInfo);
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
