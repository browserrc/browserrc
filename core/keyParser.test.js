import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseKey, parseKeySequence, eventToKey, keyToString } from './keyParser.js';

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
      assert.deepStrictEqual(parseKey('<M-S-x>'), {
        key: 'x',
        modifiers: { ctrl: false, alt: true, shift: true, meta: false, super: false },
        string: 'M-S-x'
      });
    });

    test('parses special keys', () => {
      assert.deepStrictEqual(parseKey('<Esc>'), {
        key: 'escape',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: '<Esc>'
      });
      assert.deepStrictEqual(parseKey('Enter'), {
        key: 'enter',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: '<Enter>'
      });
      assert.deepStrictEqual(parseKey('<Space>'), {
        key: ' ',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: '<Space>'
      });
    });

    test('parses question mark special case', () => {
      assert.deepStrictEqual(parseKey('?'), {
        key: '/',
        modifiers: { ctrl: false, alt: false, shift: true, meta: false, super: false },
        string: 'S-/'
      });
    });
  });

  describe('eventToKey', () => {
    test('converts simple KeyboardEvent', () => {
      const event = { key: 'a', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      assert.deepStrictEqual(eventToKey(event), {
        key: 'a',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: 'a'
      });
    });

    test('converts KeyboardEvent with modifiers', () => {
      const event = { key: 'A', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false };
      assert.deepStrictEqual(eventToKey(event), {
        key: 'a',
        modifiers: { ctrl: false, alt: false, shift: true, meta: false, super: false },
        string: 'S-a'
      });
    });

    test('converts macOS Command key to super', () => {
      const event = { key: 's', ctrlKey: false, altKey: false, shiftKey: false, metaKey: true };
      assert.deepStrictEqual(eventToKey(event), {
        key: 's',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: true },
        string: 'D-s'
      });
    });

    test('handles special keys in eventToKey', () => {
      const event = { key: 'Escape', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      assert.deepStrictEqual(eventToKey(event), {
        key: 'escape',
        modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false },
        string: '<Esc>'
      });
    });
  });

  describe('keyToString', () => {
    test('converts key object to string', () => {
      const keyObj = { key: 'a', modifiers: { ctrl: true, alt: false, shift: false, meta: false, super: false } };
      assert.strictEqual(keyToString(keyObj), 'C-a');
    });

    test('converts special keys to vim notation', () => {
      assert.strictEqual(keyToString({ key: 'Escape', modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false } }), '<Esc>');
      assert.strictEqual(keyToString({ key: ' ', modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false } }), '<Space>');
    });
  });

  describe('parseKeySequence', () => {
    test('parses simple sequence', () => {
      const sequence = parseKeySequence('abc');
      assert.strictEqual(sequence.length, 3);
      assert.strictEqual(sequence[0].key, 'a');
      assert.strictEqual(sequence[1].key, 'b');
      assert.strictEqual(sequence[2].key, 'c');
    });

    test('parses sequence with modifiers', () => {
      const sequence = parseKeySequence('<C-a>b<M-c>');
      assert.strictEqual(sequence.length, 3);
      assert.strictEqual(sequence[0].string, 'C-a');
      assert.strictEqual(sequence[1].string, 'b');
      assert.strictEqual(sequence[2].string, 'M-c');
    });
  });
});
