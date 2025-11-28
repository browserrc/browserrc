declare module 'browserrc' {
  /**
   * Returns a greeting message from browserrc
   */
  export function hello(): string;

  /**
   * The current version of browserrc
   */
  export const version: string;

  /**
   * Re-export Hook class from hooks module
   */
  export { Hook, Action } from './types/hooks';

  /**
   * Re-export Trie classes and types from trie module
   */
  export {
    TrieNode,
    Trie,
    TrieNodeOptions,
    TrieOptions,
    HookContext,
    TrieNodeHooks
  } from './types/trie';
}
