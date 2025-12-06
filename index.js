// browserrc - A framework for making browser extensions using a single javascript file

const { TrieNode, Trie } = require('./core/trie.js');
const { Hook } = require('./core/hooks.js');
const { createAction } = require('./core/rpc.js');

module.exports = {
  hello: () => 'Hello from browserrc!',
  version: '1.0.0',
  TrieNode,
  Trie,
  Hook,
  createAction
};
