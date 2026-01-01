// browserrc - A framework for making browser extensions using a single javascript file

// Re-export core classes and functions
export { TrieNode, Trie } from './core/trie.js';
export { Hook } from './core/hooks.js';
export { createAction } from './core/rpc.js';
export { manifest } from './core/buildtime/manifest.ts';
export { build } from './core/buildtime/index.js';
export { default as contentScripts } from './core/buildtime/contentScripts.js';
export { background, isBackground } from './core/buildtime/background.js';
export { content, isContentScript } from './core/buildtime/contentScripts.js';
export { CodeFile, JSONFile } from './core/buildtime/code.js';
export { onAllPages } from './helpers/index.ts';
export { HTMLCodeFile, html } from './core/codegen/html/htmlCodegen.js';
export { jsx, jsxs, Fragment, jsxDEV } from './jsx-runtime.js';
export { js } from './core/treeshake/js.js';
export { isChrome, isFirefox, isContent, isPage, isBuild } from './core/treeshake/runtime.js';

// Constants
export const hello = () => 'Hello from browserrc!';
export const version = '1.0.0';

// Hooks namespace
import { onBuild } from './core/buildtime/index.js';
export const hooks = {
  onBuild
};

// ============================================================================
// Type Definitions
// ============================================================================

// JSON types
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Trie types
export interface TrieNodeOptions {
  action?: Function;
  forwardOnNonMatch?: boolean;
  metadata?: Record<string, any>;
}

export interface TrieOptions extends TrieNodeOptions {
  forwardOnNonMatch?: boolean;
}

export interface HookContext {
  executeAction: Function;
  keys: string[];
  mode?: string;
  currentNode: TrieNode;
  matchedPath: TrieNode[];
  [key: string]: unknown;
}

export interface TrieNodeHooks {
  onMatched: Hook<[HookContext, TrieNode]>;
  onNotMatched: Hook<[]>;
  onChildMatched: Hook<[]>;
  onChildBranchCompleted: Hook<[]>;
  onNoChildMatched: Hook<[]>;
  onNoChildBranchCompleted: Hook<[]>;
}

// Action system types
export type ExtractParams<F> = F extends (params: infer P) => any ? P : never;

export type OmitActionParams<P, AP> = Omit<P, keyof AP>;

export type IsEmpty<T> = keyof T extends never ? true : false;

export type ActionParams<Ctx> = {
  ctx: Ctx;
};

export type PageActionParams = ActionParams<PageContext>;

export type BackgroundActionParams = ActionParams<BackgroundContext>;

export type Environment = 'page' | 'background' | 'unknown';

export interface Context {
  environment: Environment;
}

export interface PageContext extends Context {
  environment: 'page';
}

export interface BackgroundContext extends Context {
  environment: 'background';
}

export type ActionHandler<Ctx = Context, I = {}, R = void> =
  (params: ActionParams<Ctx> & I) => Promise<R>;

export interface Action<Ctx = Context, I = {}, R = void> {
  id: string;
  handler: ActionHandler<Ctx, I, R>;
}

export type PageAction<I = {}, R = void> = Action<PageContext, I, R>;

export type BackgroundAction<I = {}, R = void> = Action<BackgroundContext, I, R>;

export function createAction<Ctx = Context, I = {}, R = void>(
  fn: ActionHandler<Ctx, I, R>
): Action<Ctx, I, R>;

export function createPageAction<I = {}, R = void>(
  fn: ActionHandler<PageContext, I, R>
): PageAction<I, R>;

export function createBackgroundAction<I = {}, R = void>(
  fn: ActionHandler<BackgroundContext, I, R>
): BackgroundAction<I, R>;

// Manifest types
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

export type HostPermission = string;

export type ManifestPermission = Permission | HostPermission;

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

export interface ManifestBackground {
  service_worker: string;
  type?: 'module';
}

export type ActionConfig = Partial<ManifestAction> & {
  popup?: Bun.HTMLBundle;
  onClick?: (tab: chrome.tabs.Tab) => void | Promise<void>;
} | (() => void);

export type ManifestProperties = {
  name?: string;
  version?: string;
  description?: string;
  permissions: Permission[];
  action?: ActionConfig;
  background?: ManifestBackground;
  readonly assign: (config: Partial<ExtendedJSONFile>) => void;
};

// Build types
export type BuildPlatform = 'chrome' | 'firefox';
export type BuildPlatforms = { chrome: true } | { firefox: true } | { chrome: true, firefox: true };

export interface BuildOptions {
  platforms: BuildPlatforms;
  rcpath?: string;
  outputDir: string;
  dev?: {
    minify?: boolean;
  };
}

// Content script types
export interface ContentScriptOptions {
  matches?: string[];
  run_at?: 'document_start' | 'document_end' | 'document_idle';
  all_frames?: boolean;
  platforms?: BuildPlatforms;
}

// Hooks namespace types (type-only declaration)
export declare const hooks: {
  onBuild: Hook<[BuildOptions]>;
};

// HTML Code Generation types are imported from the module

// Import the ExtendedJSONFile type from manifest
import type { ExtendedJSONFile } from './core/buildtime/manifest.ts';
