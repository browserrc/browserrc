import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseKey, parseKeySequence, eventToKey, keyToString, registerModifier, setPlaceholder } from './keyParser.js';

describe('keyParser', () => {
  describe('parseKey', () => {
    test('parses simple keys', () => {
      assert.deepStrictEqual(parseKey('a'), {
        key: 'a',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: 'a'
      });
      assert.deepStrictEqual(parseKey('A'), {
        key: 'a',
        modifiers: { ctrl: false, alt: false, shift: true, meta: false, super: false },
        string: 'S-a'
      });
    });

    test('parses keys with modifiers', () => {
      assert.deepStrictEqual(parseKey('<C-a>'), {
        key: 'a',
        modifiers: { ctrl: true, alt: false, shift: false, meta: false, super: false },
        string: 'C-a'
      });
      assert.deepStrictEqual(parseKey('<C-S-a>'), {
        key: 'a',
        modifiers: { ctrl: true, alt: false, shift: true, meta: false, super: false },
        string: 'C-S-a'
      });
      assert.deepStrictEqual(parseKey('<M-A-a>'), {
        key: 'a',
        modifiers: { ctrl: false, alt: true, shift: false, meta: false, super: false },
        string: 'M-a'
      });
    });

    test('parses special keys', () => {
      assert.strictEqual(parseKey('<Esc>').key, 'escape');
      assert.strictEqual(parseKey('<Enter>').key, 'enter');
      assert.strictEqual(parseKey('<Space>').key, ' ');
      assert.strictEqual(parseKey('<Tab>').key, 'tab');
      assert.strictEqual(parseKey('<BS>').key, 'backspace');
      assert.strictEqual(parseKey('<Del>').key, 'delete');
    });

    test('parses arrow and function keys', () => {
      assert.strictEqual(parseKey('<Up>').key, 'up');
      assert.strictEqual(parseKey('<F1>').key, 'F1');
      assert.strictEqual(parseKey('<F12>').key, 'F12');
    });

    test('handles placeholders', () => {
      setPlaceholder('<leader>', '<C-b>');
      assert.deepStrictEqual(parseKey('<leader>'), parseKey('<C-b>'));
    });
  });

  describe('parseKeySequence', () => {
    test('parses sequence of keys', () => {
      const sequence = parseKeySequence('<C-b>w');
      assert.strictEqual(sequence.length, 2);
      assert.strictEqual(sequence[0].string, 'C-b');
      assert.strictEqual(sequence[1].string, 'w');
    });

    test('parses complex sequence', () => {
      setPlaceholder('<leader>', ' ');
      const sequence = parseKeySequence('<leader>ww');
      assert.strictEqual(sequence.length, 3);
      assert.strictEqual(sequence[0].key, ' ');
      assert.strictEqual(sequence[1].key, 'w');
      assert.strictEqual(sequence[2].key, 'w');
    });
  });

  describe('eventToKey', () => {
    test('converts KeyboardEvent to key object', () => {
      const event = {
        key: 'a',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false
      };
      const result = eventToKey(event);
      assert.strictEqual(result.key, 'a');
      assert.strictEqual(result.modifiers.ctrl, true);
      assert.strictEqual(result.string, 'C-a');
    });

    test('handles macOS Command key as super', () => {
      const event = {
        key: 'a',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: true
      };
      const result = eventToKey(event);
      assert.strictEqual(result.modifiers.super, true);
      assert.strictEqual(result.modifiers.meta, false);
      assert.strictEqual(result.string, 'D-a');
    });

    test('normalizes Arrow keys', () => {
      const event = {
        key: 'ArrowUp',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false
      };
      const result = eventToKey(event);
      assert.strictEqual(result.key, 'up');
      assert.strictEqual(result.string, '<Up>');
    });
  });

  describe('keyToString', () => {
    test('converts key object to string', () => {
      const keyObj = {
        key: 'a',
        modifiers: { ctrl: true, alt: false, shift: true, meta: false, super: false }
      };
      assert.strictEqual(keyToString(keyObj), 'C-S-a');
    });

    test('converts special keys to vim notation', () => {
      assert.strictEqual(keyToString({ key: 'escape', modifiers: {} }), '<Esc>');
      assert.strictEqual(keyToString({ key: ' ', modifiers: {} }), '<Space>');
      assert.strictEqual(keyToString({ key: '|', modifiers: {} }), '<Bar>');
    });
  });
});
