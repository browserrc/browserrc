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
    chrome: new JSONFile('chrome/manifest.json'),
    firefox: new JSONFile('firefox/manifest.json'),
};

// public, platform-agnostic, manifests API
// imported in browserrc file is `import {manifest} from 'browserrc'
export const manifest = {
    name: generateDefaultName(),
    version: DEFAULT_VERSION,
    description: DEFAULT_DESCRIPTION,
};


/**
 * Merge user manifest with internal manifest state to produce the final manifest files, and write them
 */
export function buildManifests(outputDir, platforms) {
    if (platforms.chrome) {
        Object.assign(MANIFESTS.chrome, {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
        });
        MANIFESTS.chrome.write(outputDir);
    }
    
    if (platforms.firefox) {
        Object.assign(MANIFESTS.firefox, {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
        });
        MANIFESTS.firefox.write(outputDir);
    }
    
    console.debug('Final Manifests: ', MANIFESTS);
}