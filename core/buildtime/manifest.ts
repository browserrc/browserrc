import { JSONFile } from "./code.js";
import type { Permission, ManifestPermission } from "../../index.js";

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

// public, platform-agnostic, manifests API
// imported in browserrc file is `import {manifest} from 'browserrc'
export const manifest = {
    name: generateDefaultName(),
    version: DEFAULT_VERSION,
    description: DEFAULT_DESCRIPTION,

    /**
     * Get the current permissions array
     */
    get permissions(): ManifestPermission[] {
        return Array.from(PERMISSIONS);
    },

    /**
     * Set permissions directly (replaces all existing permissions)
     */
    set permissions(perms: ManifestPermission[]) {
        PERMISSIONS.clear();
        perms.forEach(perm => PERMISSIONS.add(perm));
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

    if (platforms.chrome) {
        Object.assign(MANIFESTS.chrome, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
            ...(permissions.length > 0 && { permissions }),
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
        });
        MANIFESTS.firefox.write(outputDir);
    }
}