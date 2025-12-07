export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

declare module 'browserrc' {
  /**
   * The current version of browserrc
   */
  export const version: string;


  /**
   * Hook class that manages listeners and triggering
   */
  export class Hook<Args extends readonly unknown[] = []> {
    /** @readonly */
    name?: string;
    /** @readonly */
    description: string;

    constructor(name?: string, description?: string);

    register(listener: (...args: Args) => void, options?: { onError?: (error: unknown) => void }): () => void;
    trigger(...args: Args): void[];
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
    [key: string]: unknown;
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
   * Standard browser extension permissions
   *
   * This type includes common permissions supported by both Chrome and Firefox,
   * but allows for additional string values to accommodate future permissions
   * that browsers may add.
   *
   * Note: Some permissions are browser-specific:
   * - Chrome-only: enterprise.*, system.*, sidePanel, offscreen (partially)
   * - Firefox-only: find, search
   * - Cross-browser: Most other permissions work similarly but may have slight behavioral differences
   */
  export type Permission =
    | "activeTab"
    | "alarms"
    | "bookmarks"
    | "browsingData"
    | "clipboardRead"
    | "clipboardWrite"
    | "contentSettings"
    | "contextMenus"
    | "cookies"
    | "debugger"
    | "declarativeContent"
    | "declarativeNetRequest"
    | "declarativeNetRequestFeedback"
    | "downloads"
    | "enterprise.deviceAttributes"
    | "enterprise.hardwarePlatform"
    | "enterprise.networkingAttributes"
    | "enterprise.platformKeys"
    | "favicon"
    | "fileBrowserHandler"
    | "fileSystemProvider"
    | "find"
    | "fontSettings"
    | "gcm"
    | "geolocation"
    | "history"
    | "identity"
    | "idle"
    | "loginState"
    | "management"
    | "nativeMessaging"
    | "notifications"
    | "offscreen"
    | "pageCapture"
    | "platformKeys"
    | "power"
    | "printerProvider"
    | "privacy"
    | "proxy"
    | "scripting"
    | "search"
    | "sessions"
    | "sidePanel"
    | "storage"
    | "system.cpu"
    | "system.display"
    | "system.memory"
    | "system.storage"
    | "tabCapture"
    | "tabGroups"
    | "tabs"
    | "topSites"
    | "tts"
    | "ttsEngine"
    | "unlimitedStorage"
    | "vpnProvider"
    | "wallpaper"
    | "webNavigation"
    | "webRequest"
    | (string & {});

  /**
   * Host permission patterns (URL patterns)
   */
  export type HostPermission = string;

  /**
   * Combined permission type that includes both standard permissions and host permissions
   */
  export type ManifestPermission = Permission | HostPermission;

  /**
   * Manifest action configuration (Web Extension Manifest V3)
   */
  export interface ManifestAction {
    default_popup?: string;
    default_title?: string;
    default_icon?: string | { [size: number]: string };
    default_state?: 'enabled' | 'disabled';
    browser_style?: boolean;
    default_area?: 'navbar' | 'menupanel' | 'tabstrip' | 'personaltoolbar';
    theme_icons?: Array<{
      light: string;
      dark: string;
      size: number;
    }>;
  }

  /**
   * Background service worker configuration (Web Extension Manifest V3)
   */
  export interface ManifestBackground {
    service_worker: string;
    type?: 'module';
  }

  export interface ActionConfig extends Partial<ManifestAction> {
    popup?: Bun.HTMLBundle; // Bun.HTMLBundle from HTML import
    onClick?: (tab: chrome.tabs.Tab) => void | Promise<void>;
  }

  /**
   * Base properties for the extension manifest
   * These properties are common to all platforms and general to all extensions
   */
  export type ManifestProperties = {
    name?: string;
    version?: string;
    description?: string;
    permissions: Permission[];
    action?: ActionConfig;
    background?: ManifestBackground;
  };

  /**
   * The extension manifest object that users can configure
   */
  export const manifest: ManifestProperties;

  
  export type BuildPlatform = 'chrome' | 'firefox';
  export type BuildPlatforms = { chrome: true } | { firefox: true } | { chrome: true, firefox: true };

  /**
   * Build options for the build function
   */
  export interface BuildOptions {
    platforms: BuildPlatforms;
    rcpath?: string;
    outputDir: string;
  }

  /**
   * Build the extension for one or more platforms
   */
  export function build(options: BuildOptions): Promise<void>;

  /**
   * Simple JSON file container for manifest files
   */
  export class JSONFile {
    relPath: string | null;

    constructor(relPath: string, properties?: object);
    write(outputDir?: string): void;
  }

  /**
   * Unified code file container that can be used as a segment or standalone file
   */
  export class CodeFile {
    relPath: string | null;
    constants: Map<string, string>;
    code: string;
    context: object;

    constructor(props?: {
        relPath?: string | null;
        code?: string;
        constants?: Map<string, any> | Array<[string, any]>;
        context?: object;
    });

    addLine(line: string): CodeFile;
    addLines(...lines: string[]): CodeFile;
    addBlock(codeBlock: string): CodeFile;
    includeFileContent(filePath: string): CodeFile;
    includeConstant(name: string, value: JSONValue): CodeFile;
    includeSegment(segment: CodeFile): CodeFile;
    includeIIFE(fn: Function): CodeFile;
    includeFunction(fn: Function, name?: string): CodeFile;

    setContext(keyOrObj: string | Record<string, unknown>, value?: unknown): CodeFile;
    getContext(): object;
    apply(fn: (codeFile: CodeFile) => void): CodeFile;
    clearContext(): CodeFile;
    renderTemplate(additionalContext?: object): CodeFile;
    bundle(options?: object): Promise<CodeFile>;

    getFinalCode(): string;
    write(outputPath?: string | null, outputDir?: string): CodeFile;
  }

  /**
   * Options for configuring content scripts
   */
  export interface ContentScriptOptions {
    matches?: string[];
    run_at?: 'document_start' | 'document_end' | 'document_idle';
    all_frames?: boolean;
    platforms?: BuildPlatforms;
  }

  /**
   * Content script utilities for creating dynamic and static content scripts
   */
  export const contentScripts: {
    /**
     * Create a dynamic content script that gets built and registered in the manifest
     * @param relPath - The relative path to the content script file
     * @param options - Options for the content script
     */
    dynamic(relPath: string, options?: ContentScriptOptions): CodeFile;

    /**
     * Register a static content script in the manifest
     * @param relPath - The relative path to the content script file
     * @param options - Options for the content script
     */
    static(relPath: string, options?: ContentScriptOptions): void;

    /**
     * Create a key handling content script
     */
    keyHandling(): CodeFile;
  };

  /**
   * Background script utilities for managing the global background service worker
   */
  export const background: {
    /**
     * Get the global background service worker CodeFile to add custom functionality
     */
    readonly code: CodeFile;
  };

  /**
   * Hooks namespace containing build-time hooks
   */
  export const hooks: {
    /**
     * Hook called when the browserrc plugin is built
     */
    onBuild: Hook<[BuildOptions]>;
  };
  
  export function onAllPages(fn: () => void): void;
  export function code(relPath: string): CodeFile;
  export function code(relPath: string, content: string): CodeFile;
  export function code(relPath: string, content: () => void): CodeFile;

  // ============================================================================
  // HTML Code Generation Types
  // ============================================================================

  /**
   * A container for HTML code files that will be written to the output directory on build
   */
  export class HTMLCodeFile {
    /**
     * The HTML content of the file
     */
    html: string;

    /**
     * The relative path to the HTML file
     */
    relPath: string;

    constructor(options: { relPath: string; htmlContent: string });

    /**
     * Write the HTML file to the specified output directory
     * @param outputDir - The output directory (defaults to '.')
     */
    write(outputDir?: string): void;
  }

  /**
   * Create a new HTML code file
   *
   * This file will be written to the output directory on build.
   *
   * @param relPath - The relative path to the html file
   * @param content - String html content, or a function that returns a string of html content.
   * @returns The html code file
   */
  export function html(relPath: string, content: string | (() => string)): HTMLCodeFile;

}
