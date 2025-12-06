// browserrc - A framework for making browser extensions using a single javascript file

import { onBuild } from './core/buildtime/index.js';

export { TrieNode, Trie } from './core/trie.js';
export { Hook } from './core/hooks.js';
export { createAction } from './core/rpc.js';
export { manifest } from './core/buildtime/manifest.js';
export { build } from './core/buildtime/index.js';
export { default as contentScripts } from './core/buildtime/contentScripts.js';
export { CodeFile, JSONFile } from './core/buildtime/code.js';

export const hello = () => 'Hello from browserrc!';
export const version = '1.0.0';

export const hooks = {
  onBuild
};
