/**
 * Unit tests for keyProcessor.js
 *
 * Run with: node core/keyProcessor.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { KeyProcessor } from './keyProcessor.js';
import { Trie } from './trie.js';
import { Hook } from './hooks.js';

// Mock callback function for testing
function createMockCallback() {
  const calls = [];
  const callback = (metadata) => {
    calls.push({ metadata });
  };
  callback.getCalls = () => calls;
  return callback;
}

describe('KeyProcessor', () => {
  describe('Basic Initialization', () => {
    test('constructor with defaults', () => {
      const processor = new KeyProcessor();

      assert.strictEqual(processor.defaultMode, 'n');
      assert.strictEqual(processor.currentMode, 'n');
      assert.strictEqual(processor.keyTimeout, 1000);
      assert.strictEqual(processor.ambiguityTimeout, 300);
      assert.strictEqual(processor.isActive, true);
      assert.deepStrictEqual(processor.forceExecuteKeys, ['<Enter>']);
      assert.ok(processor.modes.has('n'));
      assert.ok(processor.currentRoot instanceof Trie);
      assert.ok(processor.onKey instanceof Hook);
      assert.ok(processor.onNodeMatched instanceof Hook);
      assert.ok(processor.onSequenceReset instanceof Hook);
      assert.ok(processor.onSequenceComplete instanceof Hook);
      assert.ok(processor.onAmbiguousTimeout instanceof Hook);
      assert.ok(processor.onRepeat instanceof Hook);
      assert.ok(processor.onRepeatStart instanceof Hook);
      assert.ok(processor.onRepeatEnd instanceof Hook);
    });

    test('constructor with custom options', () => {
      const customHook = new Hook('custom', 'Custom hook');
      const processor = new KeyProcessor({
        keyTimeout: 500,
        ambiguityTimeout: 100,
        repeatInterval: 25,
        defaultMode: 'insert',
        onKey: customHook
      });

      assert.strictEqual(processor.keyTimeout, 500);
      assert.strictEqual(processor.ambiguityTimeout, 100);
      assert.strictEqual(processor.defaultMode, 'insert');
      assert.strictEqual(processor.onKey, customHook);
    });

    test('configure method', () => {
      const processor = new KeyProcessor();

      processor.configure({
        keyTimeout: 750,
        ambiguityTimeout: 150,
        repeatInterval: 30,
        defaultMode: 'visual',
        forceExecuteKeys: ['<Space>', '<Enter>'],
        ctx: { test: 'context' }
      });

      assert.strictEqual(processor.keyTimeout, 750);
      assert.strictEqual(processor.ambiguityTimeout, 150);
      assert.strictEqual(processor.defaultMode, 'visual');
      assert.deepStrictEqual(processor.forceExecuteKeys, ['<Space>', '<Enter>']);
      assert.deepStrictEqual(processor.context, { test: 'context' });
    });
  });

  describe('Mode Management', () => {
    test('initMode and setMode', () => {
      const processor = new KeyProcessor();

      // Test initMode
      const trie = processor.initMode('visual');
      assert.ok(processor.modes.has('visual'));
      assert.ok(trie instanceof Trie);

      // Test setMode
      processor.setMode('visual');
      assert.strictEqual(processor.currentMode, 'visual');
      assert.strictEqual(processor.currentRoot, trie);
      assert.strictEqual(processor.currentNode, trie.root);
      assert.deepStrictEqual(processor.matchedPath, []);
    });

    test('clear and clearAll', () => {
      const processor = new KeyProcessor();

      // Set some keybindings
      processor.set('a');
      processor.set('bb');

      // Clear current mode
      processor.clear();
      assert.ok(processor.modes.has('n'));
      // Should have reset to a new trie
      const newTrie = processor.modes.get('n');
      assert.ok(newTrie instanceof Trie);

      // Add another mode and test clearAll
      processor.setMode('visual');
      processor.set('x');
      processor.clearAll();

      assert.strictEqual(processor.modes.size, 1);
      assert.ok(processor.modes.has('n'));
      assert.strictEqual(processor.currentMode, 'n');
    });
  });

  describe('Keybinding Registration', () => {
    test('set method with simple key', () => {
      const processor = new KeyProcessor();

      processor.set('a');

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeA = root.getChild('a');

      assert.ok(nodeA);
      assert.ok(nodeA.canComplete());
    });

    test('set method with sequence', () => {
      const processor = new KeyProcessor();

      processor.set('abc');

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeA = root.getChild('a');
      const nodeB = nodeA?.getChild('b');
      const nodeC = nodeB?.getChild('c');

      assert.ok(nodeA);
      assert.ok(nodeB);
      assert.ok(nodeC);
      assert.ok(nodeC.canComplete());
    });

    test('set method with modifiers', () => {
      const processor = new KeyProcessor();

      processor.set('<C-a>');
      processor.set('<S-b>');

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeCtrlA = root.getChild('C-a');
      const nodeShiftB = root.getChild('S-b');

      assert.ok(nodeCtrlA);
      assert.ok(nodeShiftB);
    });
  });

  describe('Key Processing', () => {
    test('processKeyParsed with simple key', () => {
      const processor = new KeyProcessor();

      processor.set('a');

      const key = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const result = processor.processKeyParsed(key);

      assert.strictEqual(result, true); // Should consume the key (true = consumed)
    });

    test('processKeyParsed with sequence', () => {
      const processor = new KeyProcessor();

      processor.set('ab');

      // First key
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultA = processor.processKeyParsed(keyA);
      assert.strictEqual(resultA, true); // Should consume and continue sequence

      // Second key
      const keyB = { string: 'b', key: 'b', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultB = processor.processKeyParsed(keyB);
      assert.strictEqual(resultB, true); // Should consume and complete sequence
    });

    test('processKeyParsed with invalid sequence', () => {
      const processor = new KeyProcessor();

      processor.set('ab');

      // First key (valid)
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA);

      // Invalid second key
      const keyX = { string: 'x', key: 'x', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultX = processor.processKeyParsed(keyX);

      assert.strictEqual(resultX, true); // Should consume invalid key (reset sequence)
    });

    test('processKeyEvent with KeyboardEvent', () => {
      const processor = new KeyProcessor();

      processor.set('a');

      // Mock KeyboardEvent
      const event = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      const result = processor.processKeyEvent(event);

      assert.strictEqual(result, true); // Should consume the event
    });

    test('processKeyEvent ignores modifier keys', () => {
      const processor = new KeyProcessor();

      const event = {
        key: 'Control',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      const result = processor.processKeyEvent(event);

      assert.strictEqual(result, false); // Should ignore modifier keys
    });
  });

  describe('Timeout and Sequence Reset', () => {
    test('sequence timeout reset', () => {
      const processor = new KeyProcessor();

      processor.set('ab');

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA);

      // Should be in sequence
      assert.ok(processor.currentNode !== processor.currentRoot.root);

      // Force timeout (simulate setTimeout)
      processor.clearTimeout();
      processor.resetToRoot();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);
    });

    test('resetToRoot', () => {
      const processor = new KeyProcessor();

      processor.set('ab');

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA);

      assert.ok(processor.currentNode !== processor.currentRoot.root);
      assert.ok(processor.matchedPath.length > 0);

      processor.resetToRoot();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);
      assert.deepStrictEqual(processor.matchedPath, []);
    });
  });

  describe('Hooks', () => {
    test('onKey hook consumption', () => {
      const processor = new KeyProcessor();

      let hookCalled = false;
      processor.onKey.register(() => {
        hookCalled = true;
        return true; // Consume the key
      });

      const key = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const result = processor.processKeyParsed(key);

      assert.strictEqual(hookCalled, true);
      assert.strictEqual(result, true); // Hook consumed the key
    });

    test('onKey hook forwarding', () => {
      const processor = new KeyProcessor();

      let hookCalled = false;
      processor.onKey.register(() => {
        hookCalled = true;
        return false; // Forward the key
      });

      const key = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const result = processor.processKeyParsed(key);

      assert.strictEqual(hookCalled, true);
      assert.strictEqual(result, false); // Key was forwarded
    });
  });

  describe('Context and State', () => {
    test('buildContextWithState', () => {
      const processor = new KeyProcessor();

      processor.context = { custom: 'value' };
      processor.set('ab', () => {});

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA);

      const context = processor.buildContextWithState();

      assert.deepStrictEqual(context.custom, 'value');
      assert.strictEqual(context.mode, 'n');
      assert.deepStrictEqual(context.keys, ['a']); // Should include the current key sequence
      assert.ok(context.currentNode);
      assert.ok(context.matchedPath.length > 0);
      assert.ok(typeof context.resetTimeout === 'function');
      assert.ok(typeof context.executeTrieAction === 'function');
    });
  });

  describe('Force Execute', () => {
    test('isForceExecuteKey', () => {
      const processor = new KeyProcessor();

      const enterKey = { string: '<Enter>', key: 'enter' };
      const spaceKey = { string: '<Space>', key: ' ' };

      assert.strictEqual(processor.isForceExecuteKey(enterKey), true);
      assert.strictEqual(processor.isForceExecuteKey(spaceKey), false);

      // Test custom force execute keys
      processor.configure({ forceExecuteKeys: ['<Space>', '<Tab>'] });
      assert.strictEqual(processor.isForceExecuteKey(spaceKey), true);
      assert.strictEqual(processor.isForceExecuteKey({ string: '<Tab>', key: 'tab' }), true);
      assert.strictEqual(processor.isForceExecuteKey(enterKey), false);
    });
  });

  describe('Utility Methods', () => {
    test('getMatchedSequence', () => {
      const processor = new KeyProcessor();

      processor.set('abc');

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const keyB = { string: 'b', key: 'b', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };

      processor.processKeyParsed(keyA);
      processor.processKeyParsed(keyB);

      const sequence = processor.getMatchedSequence();
      assert.deepStrictEqual(sequence, ['a', 'b']);
    });

    test('isInSequence check', () => {
      const processor = new KeyProcessor();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);

      processor.set('ab');

      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA);

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, true);

      processor.resetToRoot();
      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);
    });

    test('isActive flag', () => {
      const processor = new KeyProcessor();

      processor.isActive = false;

      const event = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      const result = processor.processKeyEvent(event);
      assert.strictEqual(result, false); // Should ignore when inactive
    });
  });
});
