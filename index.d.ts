declare module 'browserrc' {
  /**
   * Returns a greeting message from browserrc
   */
  export function hello(): string;

  /**
   * The current version of browserrc
   */
  export const version: string;

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

    constructor(name: string, description: string);

    register(listener: ((...args: Args) => any) | Action): () => void;
    trigger(...args: Args): any[];
    clear(): void;

    get count(): number;
  }

  /**
   * Options for configuring a TrieNode
   */
  export interface TrieNodeOptions {
    action?: Function;
    forwardOnNonMatch?: boolean;
    metadata?: Record<string, any>;
  }

  /**
   * Options for configuring a Trie
   */
  export interface TrieOptions extends TrieNodeOptions {
    forwardOnNonMatch?: boolean;
  }

  /**
   * Context object passed to hook listeners
   */
  export interface HookContext {
    executeAction: Function;
    keys: string[];
    mode?: string;
    currentNode: TrieNode;
    matchedPath: TrieNode[];
    [key: string]: any;
  }

  /**
   * Hooks available on a TrieNode for lifecycle events
   */
  export interface TrieNodeHooks {
    onMatched: Hook<[HookContext, TrieNode]>;
    onNotMatched: Hook<[]>;
    onChildMatched: Hook<[]>;
    onChildBranchCompleted: Hook<[]>;
    onNoChildMatched: Hook<[]>;
    onNoChildBranchCompleted: Hook<[]>;
  }

  /**
   * A node in a trie data structure for key sequence matching
   */
  export class TrieNode {
    key: string | null;
    children: Map<string, TrieNode>;
    action: Function | null;
    forwardOnNonMatch: boolean;
    metadata: Record<string, any>;
    hooks: TrieNodeHooks;

    constructor(key?: string | null, options?: TrieNodeOptions);

    addChild(key: string, node: TrieNode): void;
    getChild(key: string): TrieNode | undefined;
    hasChildren(): boolean;
    isLeaf(): boolean;
    isAmbiguous(): boolean;
  }

  /**
   * A trie data structure for efficient key sequence lookup and action execution
   */
  export class Trie {
    root: TrieNode;

    constructor(options?: TrieOptions);

    insert(keySequence: string[], action: Function): void;
    find(keySequence: string[]): TrieNode | null;
  }
}
