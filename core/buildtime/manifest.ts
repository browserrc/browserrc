import { JSONFile } from "./jsonFile.js";
import type { ActionConfig, BuildOptions } from "../../index.js";
import type { Permission, ManifestPermission, ManifestAction } from "../../index.js";
import { onBuild } from "./index.js";
import { ensureBackgroundBundle, usesBackground } from "./background.js";
import { isBuild } from "../treeshake/runtime.js";
// NOTE: fs/path/Bun are only used in build-only branches; Bun will tree-shake them away in bundles.


interface ContentScriptEntry {
    matches: string[];
    js: string[];
    run_at: 'document_start' | 'document_end' | 'document_idle';
    all_frames: boolean;
}

interface ContentScriptOptions {
    matches?: string[];
    run_at?: 'document_start' | 'document_end' | 'document_idle';
    all_frames?: boolean;
    platforms?: { chrome?: true; firefox?: true };
    js: string[];
}

export interface ExtendedJSONFile extends JSONFile {
    content_scripts: ContentScriptEntry[];
    permissions?: ManifestPermission[];
    manifest_version?: number;
    version?: string;
    name?: string;
    description?: string;
    action?: ManifestAction;
    background?: {
        service_worker?: string;
        scripts?: string[];
        page?: string;
    };
}

export function generateDefaultName(): string {
    const adjectives = [
        "adventurous",
        "brave",
        "clever",
        "curious",
        "determined",
        "energetic",
        "friendly",
        "generous",
        "helpful",
    ];
    const nouns = [
        "ardvark",
        "bear",
        "cat",
        "dog",
        "elephant",
        "fox",
        "giraffe",
        "hippo",
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}-${noun}`;
}

export const DEFAULT_VERSION = '0.0.1';
export const DEFAULT_DESCRIPTION = "A browser extension that nobody thought was important enough to write a description for, but is programmed using an awesome framework called browserrc";

type BuildState = {
    manifests: Record<string, ExtendedJSONFile>;
    permissions: Set<ManifestPermission>;
    actionConfig: ActionConfig | null;
};

let _buildState: BuildState | null = null;
let _runtimeActionConfig: any = null;

function getBuildState(): BuildState {
    if (_buildState) return _buildState;
    _buildState = {
        manifests: {
            chrome: Object.assign(new JSONFile('chrome/manifest.json'), { content_scripts: [], permissions: [] }),
            firefox: Object.assign(new JSONFile('firefox/manifest.json'), { content_scripts: [], permissions: [] }),
        },
        permissions: new Set(),
        actionConfig: null,
    };
    return _buildState;
}

/**
 * Handle popup bundling for Bun.HTMLBundle objects
 */
async function handlePopupBundling(popup: Bun.HTMLBundle, buildContext: BuildOptions) {
    // Lazy-load node APIs so they don't end up in browser bundles.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');

    const { outputDir, platforms } = buildContext;

    // Use Bun to bundle the HTML and all its dependencies
    const buildResult = await Bun.build({
        entrypoints: [popup.index],
        target: 'browser',
        minify: false,
    });

    if (!buildResult.success) {
        throw new Error(`Popup bundling failed: ${buildResult.logs.map(log => log.message).join(', ')}`);
    }

    // Write all output files to popup subdirectory
    for (const platform of ['chrome', 'firefox']) {
        if (platforms?.[platform]) {
            const popupOutputDir = path.join(outputDir, platform, 'popup');

            for (const output of buildResult.outputs) {
                const content = await output.text();
                let outputFilename: string;

                if (output.path.endsWith('.html')) {
                    // Always name the HTML file as popup.html
                    outputFilename = 'popup.html';
                } else {
                    // Keep original names for other assets (JS, CSS chunks)
                    outputFilename = path.basename(output.path);
                }

                const outputPath = path.join(popupOutputDir, outputFilename);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, content);
            }
        }
    }
}


// public, platform-agnostic, manifests API
// imported in browserrc file is `import {manifest} from 'browserrc'
export const manifest = {
    name: generateDefaultName(),
    version: DEFAULT_VERSION,
    description: DEFAULT_DESCRIPTION,

    /**
     * Get the current permissions array
     */
    get permissions(): Permission[] {
        if (!isBuild()) return [];
        return Array.from(getBuildState().permissions) as Permission[];
    },

    /**
     * Set permissions directly (replaces all existing permissions)
     */
    set permissions(perms: Permission[]) {
        if (!isBuild()) return;
        const state = getBuildState();
        state.permissions.clear();
        perms.forEach(perm => state.permissions.add(perm));
    },

    /**
     * Get the current action configuration
     */
    get action(): ActionConfig | null {
        if (!isBuild()) return _runtimeActionConfig;
        return getBuildState().actionConfig;
    },

    /**
     * Set the toolbar action configuration
     */
    set action(config: ActionConfig) {
        // Runtime/bundled behavior (background wiring) lives here too.
        if (!isBuild()) {
            _runtimeActionConfig = config as any;
            // Only wire onClick in background bundles.
            try {
                if (typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === "background") {
                    const onClick = (typeof config === 'function') ? config : (config as any)?.onClick;
                    if (!onClick) return;
                    chrome.action.onClicked.addListener(onClick as any);
                }
            } catch {
                // ignore (non-extension runtime)
            }
            return;
        }

        const state = getBuildState();

        if (typeof config === 'function') {
            state.actionConfig = {
                // use defaults from primary manifest
                default_title: manifest.name,
                onClick: config,
            };
            // Ensure the background bundle is generated
            ensureBackgroundBundle();
            return;
        }

        // Validate mutual exclusivity
        if (config.popup && config.onClick) {
            throw new Error('Action cannot have both popup and onClick. Choose one or the other.');
        }
        if (!config.popup && !config.onClick) {
            throw new Error('Action must have either popup or onClick.');
        }

        // Validate popup is a Bun.HTMLBundle
        if (config.popup && !(config.popup && typeof config.popup === 'object' && 'index' in config.popup)) {
            throw new Error('Popup must be a Bun.HTMLBundle from an HTML import (e.g., import popup from "./popup.html").');
        }

        state.actionConfig = config;
        state.actionConfig.default_title = (config as any).default_title || manifest.name;

        // Ensure the background bundle is generated if onClick is used.
        // The actual onClick handler wiring is added at runtime (same implementation),
        // so we don't generate background.js via CodeFile here.
        if (config.onClick) {
            ensureBackgroundBundle();
        }

        // Register onBuild hooks
        if (config.popup) {
            onBuild.register(async (buildContext) => {
                await handlePopupBundling(config.popup!, buildContext);
            });
        }
    },
    assign: (config: Partial<ExtendedJSONFile>) => {
        Object.assign(manifest, config);
    },
};


/**
 * Platform-agnostic API for adding content scripts
 */
export function addContentScript(options: ContentScriptOptions): void {
    if (!isBuild()) return;
    const state = getBuildState();
    const {
        matches = ['<all_urls>'],
        js,
        run_at = 'document_idle',
        all_frames = false,
        platforms = { chrome: true, firefox: true },
    } = options;

    // js is required for content scripts
    if (!js || js.length === 0) {
        throw new Error('Content script must specify js files');
    }

    const contentScriptEntry: ContentScriptEntry = {
        matches,
        js,
        run_at,
        all_frames
    };

    if (platforms?.chrome) {
        state.manifests.chrome.content_scripts.push(contentScriptEntry);
    }
    if (platforms?.firefox) {
        state.manifests.firefox.content_scripts.push(contentScriptEntry);
    }
}


/**
 * Merge user manifest with internal manifest state to produce the final manifest files, and write them
 */
export function buildManifests(outputDir: string, platforms: { chrome?: true; firefox?: true }): void {
    if (!isBuild()) return;
    const state = getBuildState();
    const permissions = Array.from(state.permissions);

    // Build action manifest entry
    let actionEntry: Partial<ManifestAction> | undefined;
    if (state.actionConfig) {
        actionEntry = {};

        // Copy manifest-safe properties from ACTION_CONFIG
        // ACTION_CONFIG is always an object at this point (processed in setter)
        const { popup, onClick, ...manifestProps } = state.actionConfig as any;
        Object.assign(actionEntry, manifestProps);

        // Override popup path to use subdirectory if popup is specified
        if (popup) {
            actionEntry.default_popup = 'popup/popup.html';
        }
    }

    if (platforms.chrome) {
        Object.assign(state.manifests.chrome, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
            ...(permissions.length > 0 && { permissions }),
            ...(usesBackground && { background: { service_worker: 'background.js' } }),
            ...(actionEntry && Object.keys(actionEntry).length > 0 && { action: actionEntry }),
        });
        state.manifests.chrome.write(outputDir);
    }

    if (platforms.firefox) {
        Object.assign(state.manifests.firefox, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
            ...(permissions.length > 0 && { permissions }),
            ...(usesBackground && { background: { scripts: ['background.js'] } }),
            ...(actionEntry && Object.keys(actionEntry).length > 0 && { action: actionEntry }),
        });
        state.manifests.firefox.write(outputDir);
    }
}