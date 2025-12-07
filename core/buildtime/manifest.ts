import { JSONFile } from "./code.js";
import type { ActionConfig, BuildOptions } from "../../index.js";
import type { Permission, ManifestPermission, ManifestAction } from "../../index.js";
import { onBuild } from "./index.js";
import background, { BACKGROUND_CODE_FILE } from "./background.js";
import path from "path";
import fs from "fs";


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

interface ExtendedJSONFile extends JSONFile {
    content_scripts: ContentScriptEntry[];
    permissions?: ManifestPermission[];
    manifest_version?: number;
    version?: string;
    name?: string;
    description?: string;
    action?: ManifestAction;
    background?: {
        service_worker: string;
    };
}

interface ActionConfig extends Partial<ManifestAction> {
    popup?: Bun.HTMLBundle; // Bun.HTMLBundle from HTML import
    onClick?: Function;
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

// internal manifest files state
const MANIFESTS: Record<string, ExtendedJSONFile> = {
    chrome: Object.assign(new JSONFile('chrome/manifest.json'), { content_scripts: [], permissions: [] }),
    firefox: Object.assign(new JSONFile('firefox/manifest.json'), { content_scripts: [], permissions: [] }),
};

// internal permissions state
const PERMISSIONS: Set<ManifestPermission> = new Set();

// internal action state
let ACTION_CONFIG: ActionConfig | null = null;

/**
 * Handle popup bundling for Bun.HTMLBundle objects
 */
async function handlePopupBundling(popup: Bun.HTMLBundle, buildContext: BuildOptions) {
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
        return Array.from(PERMISSIONS) as Permission[];
    },

    /**
     * Set permissions directly (replaces all existing permissions)
     */
    set permissions(perms: Permission[]) {
        PERMISSIONS.clear();
        perms.forEach(perm => PERMISSIONS.add(perm));
    },

    /**
     * Get the current action configuration
     */
    get action(): ActionConfig | null {
        return ACTION_CONFIG;
    },

    /**
     * Set the toolbar action configuration
     */
    set action(config: ActionConfig) {
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

        ACTION_CONFIG = config;

        // Handle onClick by adding to global background script
        if (config.onClick) {
            const backgroundCode = background.code;

            // Include the user-defined onClick handler function
            backgroundCode.includeFunction(config.onClick, 'handleActionClick');

            // Add the onClick listener code
            backgroundCode
                .addLine('chrome.action.onClicked.addListener(async (tab) => {')
                .addLine('    // Call user-defined onClick handler')
                .addLine('    await handleActionClick(tab);')
                .addLine('});');
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
        MANIFESTS.chrome.content_scripts.push(contentScriptEntry);
    }
    if (platforms?.firefox) {
        MANIFESTS.firefox.content_scripts.push(contentScriptEntry);
    }
}


/**
 * Merge user manifest with internal manifest state to produce the final manifest files, and write them
 */
export function buildManifests(outputDir: string, platforms: { chrome?: true; firefox?: true }): void {
    const permissions = Array.from(PERMISSIONS);

    // Build action manifest entry
    let actionEntry: Partial<ManifestAction> | undefined;
    if (ACTION_CONFIG) {
        actionEntry = {};

        // Copy manifest-safe properties from ACTION_CONFIG
        const { popup, onClick, ...manifestProps } = ACTION_CONFIG;
        Object.assign(actionEntry, manifestProps);

        // Override popup path to use subdirectory if popup is specified
        if (popup) {
            actionEntry.default_popup = 'popup/popup.html';
        }
    }

    if (platforms.chrome) {
        Object.assign(MANIFESTS.chrome, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
            ...(permissions.length > 0 && { permissions }),
            ...(BACKGROUND_CODE_FILE && { background: { service_worker: 'background.js' } }),
            ...(actionEntry && Object.keys(actionEntry).length > 0 && { action: actionEntry }),
        });
        MANIFESTS.chrome.write(outputDir);
    }

    if (platforms.firefox) {
        Object.assign(MANIFESTS.firefox, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
            ...(permissions.length > 0 && { permissions }),
            ...(BACKGROUND_CODE_FILE && { background: { service_worker: 'background.js' } }),
            ...(actionEntry && Object.keys(actionEntry).length > 0 && { action: actionEntry }),
        });
        MANIFESTS.firefox.write(outputDir);
    }
}