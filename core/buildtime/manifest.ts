import { JSONFile } from "./code.js";
import type { BuildPlatforms } from "../../index.js";

interface ContentScriptEntry {
    matches: string[];
    js: string[];
    run_at: 'document_start' | 'document_end' | 'document_idle';
    all_frames: boolean;
}

interface ExtendedJSONFile extends JSONFile {
    content_scripts: ContentScriptEntry[];
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
    chrome: Object.assign(new JSONFile('chrome/manifest.json'), { content_scripts: [] }),
    firefox: Object.assign(new JSONFile('firefox/manifest.json'), { content_scripts: [] }),
};

// public, platform-agnostic, manifests API
// imported in browserrc file is `import {manifest} from 'browserrc'
export const manifest = {
    name: generateDefaultName(),
    version: DEFAULT_VERSION,
    description: DEFAULT_DESCRIPTION,
};

/**
 * Platform-agnostic API for adding content scripts
 */
export function addContentScript(options: import("../../index.js").ContentScriptOptions): void {
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
export function buildManifests(outputDir: string, platforms: BuildPlatforms): void {
    if (platforms.chrome) {
        Object.assign(MANIFESTS.chrome, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
        });
        MANIFESTS.chrome.write(outputDir);
    }

    if (platforms.firefox) {
        Object.assign(MANIFESTS.firefox, {
            manifest_version: 3,
            version: manifest.version,
            name: manifest.name,
            description: manifest.description,
        });
        MANIFESTS.firefox.write(outputDir);
    }
}