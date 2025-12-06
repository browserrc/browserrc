import { Hook } from './hooks.js';

/**
 * Options for configuring a TrieNode
 * @typedef {Object} TrieNodeOptions
 * @property {boolean} [isCompletable=false] - Whether this sequence can be completed at this node
 * @property {boolean} [forwardOnNonMatch=false] - Whether to forward key if no match
 * @property {Object} [metadata={}] - Additional metadata for this node
 */

/**
 * Hooks available on a TrieNode for lifecycle events
 * @typedef {Object} TrieNodeHooks
 * @property {Hook} onMatched - Called when this node is matched in a sequence
 * @property {Hook} onNotMatched - Called when this node fails to match
 * @property {Hook} onChildMatched - Called when a child of this node matches
 * @property {Hook} onSequenceComplete - Called when sequence completes at this node
 * @property {Hook} onNoChildMatched - Called when no child matches
 * @property {Hook} onBranchFailed - Called when child branch fails
 */

export class TrieNode {
  /** @type {string|null} */
  key;
  /** @type {Map<string, TrieNode>} */
  children;
  /** @type {boolean} */
  isCompletable;
  /** @type {boolean} */
  forwardOnNonMatch;
  /** @type {Object} */
  metadata;
  /** @type {TrieNodeHooks} */
  hooks;

  /**
   * @param {string|null} [key=null] - The key this node represents
   * @param {TrieNodeOptions} [options={}] - Optional extra settings
   */
  constructor(key = null, options = {}) {
    this.key = key;
    this.children = new Map();
    this.isCompletable = options.isCompletable ?? false;
    this.forwardOnNonMatch = options.forwardOnNonMatch ?? false;
    this.metadata = options.metadata ?? {};

    this.hooks = {
      onMatched: new Hook(`onMatched[${key}]`, 'Called when this node is matched'),
      onNotMatched: new Hook(`onNotMatched[${key}]`, 'Called when this node fails to match'),
      onChildMatched: new Hook(`onChildMatched[${key}]`, 'Called when a child of this node matches'),
      onSequenceComplete: new Hook(`onSequenceComplete[${key}]`, 'Called when sequence completes at this node'),
      onNoChildMatched: new Hook(`onNoChildMatched[${key}]`, 'Called when no child matches'),
      onBranchFailed: new Hook(`onBranchFailed[${key}]`, 'Called when child branch fails'),
    };
  }

  /**
   * Add a child node for a given key
   * @param {string} key - The key for the child node
   * @param {TrieNode} node - The child node to add
   * @returns {void}
   */
  addChild(key, node) {
    this.children.set(key, node);
  }

  /**
   * Get child node for a given key
   * @param {string} key - The key to search for
   * @returns {TrieNode|undefined} The child node or undefined if not found
   */
  getChild(key) {
    return this.children.get(key);
  }

  /**
   * Check if this node has children
   * @returns {boolean} True if the node has children
   */
  hasChildren() {
    return this.children.size > 0;
  }

  /**
   * Check if this sequence can be completed at this node
   * @returns {boolean} True if the sequence can be completed here
   */
  canComplete() {
    return this.isCompletable;
  }

  /**
   * Check if this node is ambiguous (can be completed here but also has children)
   * @returns {boolean} True if the node is completable and has children
   */
  isAmbiguous() {
    return this.isCompletable && this.children.size > 0;
  }
}

/**
 * Options for configuring a Trie
 * @typedef {TrieNodeOptions} TrieOptions
 * @property {boolean} [forwardOnNonMatch=true] - Whether to forward key if no match at root
 */

export class Trie {
  /** @type {TrieNode} */
  root;

  /**
   * @param {TrieOptions} [options={}] - Options to pass to the root TrieNode
   */
  constructor(options = {}) {
    this.root = new TrieNode(null, options);
    this.root.forwardOnNonMatch = options.forwardOnNonMatch ?? true;
  }

  /**
   * Insert a key sequence into the trie
   * @param {string[]} keySequence - Array of key strings
   * @param {Object} options - Additional options like repeat
   * @returns {void}
   */
  insert(keySequence, options = {}) {
    let currentNode = this.root;

    for (const key of keySequence) {
      let child = currentNode.getChild(key);
      if (!child) {
        child = new TrieNode(key);
        currentNode.addChild(key, child);
      }
      currentNode = child;
    }

    currentNode.isCompletable = true;

    // Store metadata from options
    if (options.repeat !== undefined) {
      currentNode.metadata.repeat = options.repeat;
    }
  }

  /**
   * Find a node matching a key sequence (without removing it)
   * @param {string[]} keySequence - Array of key strings to search for
   * @returns {TrieNode|null} The node that matches the key sequence, or null if no match
   */
  find(keySequence) {
    let currentNode = this.root;

    for (const key of keySequence) {
      const child = currentNode.getChild(key);
      if (!child) {
        return null;
      }
      currentNode = child;
    }

    return currentNode;
  }
}

