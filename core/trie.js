import { Hook } from './hooks.js';

/**
 * Options for configuring a TrieNode
 * @typedef {Object} TrieNodeOptions
 * @property {Function} [action] - The action function for this node
 * @property {boolean} [forwardOnNonMatch=false] - Whether to forward key if no match
 * @property {Object} [metadata={}] - Additional metadata for this node
 */

/**
 * Hooks available on a TrieNode for lifecycle events
 * @typedef {Object} TrieNodeHooks
 * @property {Hook} onMatched - Called when this node is matched
 * @property {Hook} onNotMatched - Called when this node fails to match
 * @property {Hook} onChildMatched - Called when a child of this node matches
 * @property {Hook} onChildBranchCompleted - Called when child branch completes
 * @property {Hook} onNoChildMatched - Called when no child matches
 * @property {Hook} onNoChildBranchCompleted - Called when child branch fails
 */

export class TrieNode {
  /** @type {string|null} */
  key;
  /** @type {Map<string, TrieNode>} */
  children;
  /** @type {Function|null} */
  action;
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
    this.action = options.action ?? null;
    this.forwardOnNonMatch = options.forwardOnNonMatch ?? false;
    this.metadata = options.metadata ?? {};

    this.hooks = {
      onMatched: new Hook(`onMatched[${key}]`, 'Called when this node is matched'),
      onNotMatched: new Hook(`onNotMatched[${key}]`, 'Called when this node fails to match'),
      onChildMatched: new Hook(`onChildMatched[${key}]`, 'Called when a child of this node matches'),
      onChildBranchCompleted: new Hook(`onChildBranchCompleted[${key}]`, 'Called when child branch completes'),
      onNoChildMatched: new Hook(`onNoChildMatched[${key}]`, 'Called when no child matches'),
      onNoChildBranchCompleted: new Hook(`onNoChildBranchCompleted[${key}]`, 'Called when child branch fails'),
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
   * Check if this is a leaf node (has an action)
   * @returns {boolean} True if the node has an action
   */
  isLeaf() {
    return this.action !== null;
  }

  /**
   * Check if this node is ambiguous (has both an action and children)
   * @returns {boolean} True if the node has both an action and children
   */
  isAmbiguous() {
    return this.action !== null && this.children.size > 0;
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
   * Insert a key sequence and action into the trie
   * @param {string[]} keySequence - Array of key strings
   * @param {Function} action - Action function to execute when sequence is matched
   * @param {Object} options - Additional options like repeat
   * @returns {void}
   */
  insert(keySequence, action, options = {}) {
    let currentNode = this.root;

    for (const key of keySequence) {
      let child = currentNode.getChild(key);
      if (!child) {
        child = new TrieNode(key);
        currentNode.addChild(key, child);
      }
      currentNode = child;
    }

    currentNode.action = action;

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

