declare module 'browserrc' {
  /**
   * The current version of browserrc
   */
  export const version: string;


  /**
   * Hook class that manages listeners and triggering
   */
  export class Hook<Args extends any[] = []> {
    /** @readonly */
    name?: string;
    /** @readonly */
    description: string;

    constructor(name?: string, description?: string);

    register(listener: (...args: Args) => any, options?: { onError?: (error: unknown) => void }): () => void;
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

  // ============================================================================
  // Action System Types
  // ============================================================================

  /**
   * Extract the first parameter type from a function
   */
  export type ExtractParams<F> = F extends (params: infer P) => any ? P : never;

  /**
   * Remove all keys from ActionParams type from parameter type
   */
  export type OmitActionParams<P, AP> = Omit<P, keyof AP>;

  /**
   * Check if a type has no properties
   */
  export type IsEmpty<T> = keyof T extends never ? true : false;

  /**
   * Base parameter type for action handlers (extensible)
   * Currently contains ctx, but can be extended in the future
   */
  export type ActionParams<Ctx> = {
    ctx: Ctx;
  };

  /**
   * Parameter type for page action handlers
   */
  export type PageActionParams = ActionParams<PageContext>;

  /**
   * Parameter type for background action handlers
   */
  export type BackgroundActionParams = ActionParams<BackgroundContext>;
  
  export type Environment = 'page' | 'background' | 'unknown';

  /**
   * Base context interface available in all environments
   */
  export interface Context {
    environment: 'page' | 'background' | 'unknown';
  }

  /**
   * Context available in page (content script) environment
   */
  export interface PageContext extends Context {
    environment: 'page';
  }

  /**
   * Context available in background script environment
   */
  export interface BackgroundContext extends Context {
    environment: 'background';
  }

  /**
   * Action handler function signature
   */
  export type ActionHandler<Ctx = Context, I = {}, R = void> =
    (params: ActionParams<Ctx> & I) => Promise<R>;

  /**
   * An action that can be executed
   */
  export interface Action<Ctx = Context, I = {}, R = void> {
    id: string;
    handler: ActionHandler<Ctx, I, R>;
  }

  /**
   * Type alias for actions in page context
   */
  export type PageAction<I = {}, R = void> = Action<PageContext, I, R>;

  /**
   * Type alias for actions in background context
   */
  export type BackgroundAction<I = {}, R = void> = Action<BackgroundContext, I, R>;


  /**
   * Create an action from a handler function
   */
  export function createAction<Ctx = Context, I = {}, R = void>(
    fn: ActionHandler<Ctx, I, R>
  ): Action<Ctx, I, R>;

  /**
   * Create a page action from a handler function
   */
  export function createPageAction<I = {}, R = void>(
    fn: ActionHandler<PageContext, I, R>
  ): PageAction<I, R>;

  /**
   * Create a background action from a handler function
   */
  export function createBackgroundAction<I = {}, R = void>(
    fn: ActionHandler<BackgroundContext, I, R>
  ): BackgroundAction<I, R>;
  

  /**
   * Base properties for the extension manifest
   * These properties are common to all platforms and general to all extensions
   */
  export type ManifestProperties = {
    name?: string;
    version?: string;
    description?: string;
  };

  /**
   * The extension manifest object that users can configure
   */
  export const manifest: ManifestProperties;

  /**
   * Build options for the build function
   */
  export interface BuildOptions {
    platforms: string[];
    rcpath: string;
    outputDir: string;
  }

  /**
   * Build the extension for one or more platforms
   */
  export function build(options: BuildOptions): Promise<void>;

}
