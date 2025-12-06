import { JSONFile } from "./code.js";

export function generateDefaultName() {
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
const MANIFESTS = {
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
 *
 * @param {Object} options - Content script configuration options
 * @param {string[]} options.matches - URL patterns to match for content script injection
 * @param {string[]} options.js - JavaScript files to inject
 * @param {string} [options.run_at='document_idle'] - When to run the content script
 * @param {boolean} [options.all_frames=false] - Whether to inject into all frames
 * @param {Object} options.platforms - Target platforms for the content script
 */
export function addContentScript(options) {
    const {
        matches,
        js,
        run_at = 'document_idle',
        all_frames = false,
        platforms = { chrome: true, firefox: true },
    } = options;

    const contentScriptEntry = {
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
export function buildManifests(outputDir, platforms) {
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