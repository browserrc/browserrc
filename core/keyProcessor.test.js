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
      assert.strictEqual(processor.repeatInterval, 50);
      assert.strictEqual(processor.isActive, true);
      assert.deepStrictEqual(processor.forceExecuteKeys, ['<Enter>']);
      assert.ok(processor.modes.has('n'));
      assert.ok(processor.currentRoot instanceof Trie);
      assert.ok(processor.onKey instanceof Hook);
      assert.ok(processor.onNodeMatched instanceof Hook);
      assert.ok(processor.onSequenceReset instanceof Hook);
      assert.ok(processor.onActionExecuted instanceof Hook);
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
      assert.strictEqual(processor.repeatInterval, 25);
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
      assert.strictEqual(processor.repeatInterval, 30);
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
      const callbackA = createMockCallback();
      const callbackBB = createMockCallback();
      const callbackX = createMockCallback();

      // Set some keybindings
      processor.set('a', callbackA);
      processor.set('bb', callbackBB);

      // Clear current mode
      processor.clear();
      assert.ok(processor.modes.has('n'));
      // Should have reset to a new trie
      const newTrie = processor.modes.get('n');
      assert.ok(newTrie instanceof Trie);

      // Add another mode and test clearAll
      processor.setMode('visual');
      processor.set('x', callbackX);
      processor.clearAll();

      assert.strictEqual(processor.modes.size, 1);
      assert.ok(processor.modes.has('n'));
      assert.strictEqual(processor.currentMode, 'n');
    });
  });

  describe('Keybinding Registration', () => {
    test('set method with simple key', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('a', callback);

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeA = root.getChild('a');

      assert.ok(nodeA);
      assert.ok(nodeA.isLeaf());
      assert.strictEqual(nodeA.action, callback);
    });

    test('set method with sequence', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('abc', callback);

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeA = root.getChild('a');
      const nodeB = nodeA?.getChild('b');
      const nodeC = nodeB?.getChild('c');

      assert.ok(nodeA);
      assert.ok(nodeB);
      assert.ok(nodeC);
      assert.ok(nodeC.isLeaf());
      assert.strictEqual(nodeC.action, callback);
    });

    test('set method with modifiers', () => {
      const processor = new KeyProcessor();
      const callbackA = createMockCallback();
      const callbackB = createMockCallback();

      processor.set('<C-a>', callbackA);
      processor.set('<S-b>', callbackB);

      const trie = processor.currentRoot;
      const root = trie.root;
      const nodeCtrlA = root.getChild('C-a');
      const nodeShiftB = root.getChild('S-b');

      assert.ok(nodeCtrlA);
      assert.ok(nodeShiftB);
      assert.strictEqual(nodeCtrlA.action, callbackA);
      assert.strictEqual(nodeShiftB.action, callbackB);
    });
  });

  describe('Key Processing', () => {
    test('processKeyParsed with simple key', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('a', callback);

      const key = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const result = processor.processKeyParsed(key, () => {}); // executeAction callback no longer used

      assert.strictEqual(result, true); // Should consume the key (true = consumed)
      assert.strictEqual(callback.getCalls().length, 1);
      assert.deepStrictEqual(callback.getCalls()[0].metadata.keySequence, ['a']);
    });

    test('processKeyParsed with sequence', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('ab', callback);

      // First key
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultA = processor.processKeyParsed(keyA, () => {});
      assert.strictEqual(resultA, true); // Should consume and continue sequence
      assert.strictEqual(callback.getCalls().length, 0); // Should not execute yet

      // Second key
      const keyB = { string: 'b', key: 'b', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultB = processor.processKeyParsed(keyB, () => {});
      assert.strictEqual(resultB, true); // Should consume and execute
      assert.strictEqual(callback.getCalls().length, 1);
      assert.deepStrictEqual(callback.getCalls()[0].metadata.keySequence, ['a', 'b']);
    });

    test('processKeyParsed with invalid sequence', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('ab', callback);

      // First key (valid)
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA, () => {});

      // Invalid second key
      const keyX = { string: 'x', key: 'x', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const resultX = processor.processKeyParsed(keyX, () => {});

      assert.strictEqual(resultX, true); // Should consume invalid key (reset sequence)
      assert.strictEqual(callback.getCalls().length, 0); // Should not execute
    });

    test('processKeyEvent with KeyboardEvent', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('a', callback);

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

      const result = processor.processKeyEvent(event, () => {});

      assert.strictEqual(result, true); // Should consume the event
      assert.strictEqual(callback.getCalls().length, 1);
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

      const result = processor.processKeyEvent(event, () => {});

      assert.strictEqual(result, false); // Should ignore modifier keys
    });
  });

  describe('Timeout and Sequence Reset', () => {
    test('sequence timeout reset', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('ab', callback);

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA, () => {});

      // Should be in sequence
      assert.ok(processor.currentNode !== processor.currentRoot.root);

      // Force timeout (simulate setTimeout)
      processor.clearTimeout();
      processor.resetToRoot();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);
      assert.strictEqual(callback.getCalls().length, 0); // Should not have executed
    });

    test('resetToRoot', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('ab', callback);

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA, () => {});

      assert.ok(processor.currentNode !== processor.currentRoot.root);
      assert.ok(processor.matchedPath.length > 0);

      processor.resetToRoot();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);
      assert.deepStrictEqual(processor.matchedPath, []);
      assert.strictEqual(processor.pendingAmbiguousAction, null);
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
      const result = processor.processKeyParsed(key, () => {});

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
      const result = processor.processKeyParsed(key, () => {});

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
      processor.processKeyParsed(keyA, () => {});

      const context = processor.buildContextWithState(() => {});

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

  describe('Key Repeat', () => {
    test('key repeat functionality', () => {
      const processor = new KeyProcessor();
      const callbackX = createMockCallback();
      const callbackY = createMockCallback();

      // Set up a repeating action
      processor.set('x', callbackX);
      processor.currentRoot.insert(['x'], callbackX, { repeat: true });

      const key = { string: 'x', key: 'x', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };

      // Process the key
      processor.processKeyParsed(key, () => {});

      // Should have started repeating
      assert.ok(processor.heldKeys.has('x'));

      // Stop repeating
      processor.stopRepeating('x');
      assert.strictEqual(processor.heldKeys.has('x'), false);

      // Stop all repeating
      processor.startRepeating('y', callbackY, () => {});
      assert.ok(processor.heldKeys.has('y'));
      processor.stopAllRepeating();
      assert.strictEqual(processor.heldKeys.size, 0);
    });

    test('handleKeyUp stops repeating', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('x', callback);
      processor.currentRoot.insert(['x'], callback, { repeat: true });

      const key = { string: 'x', key: 'x', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(key, () => {});

      assert.ok(processor.heldKeys.has('x'));

      // Simulate keyup event
      const event = {
        key: 'x',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false
      };

      processor.handleKeyUp(event);
      assert.strictEqual(processor.heldKeys.has('x'), false);
    });
  });

  describe('Utility Methods', () => {
    test('getMatchedSequence', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      processor.set('abc', callback);

      // Start sequence
      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      const keyB = { string: 'b', key: 'b', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };

      processor.processKeyParsed(keyA, () => {});
      processor.processKeyParsed(keyB, () => {});

      const sequence = processor.getMatchedSequence();
      assert.deepStrictEqual(sequence, ['a', 'b']);
    });

    test('isInSequence check', () => {
      const processor = new KeyProcessor();
      const callback = createMockCallback();

      assert.strictEqual(processor.currentNode !== processor.currentRoot.root, false);

      processor.set('ab', callback);

      const keyA = { string: 'a', key: 'a', modifiers: { ctrl: false, alt: false, shift: false, meta: false } };
      processor.processKeyParsed(keyA, () => {});

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

      const result = processor.processKeyEvent(event, () => {});
      assert.strictEqual(result, false); // Should ignore when inactive
    });
  });
});
