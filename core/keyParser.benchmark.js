import { parseKey, eventToKey, keyToString } from './keyParser.js';

const iterations = 100000;

function benchmark(name, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(4)}ms for ${iterations} iterations`);
  return end - start;
}

console.log('--- keyParser Benchmark ---');

benchmark('parseKey("a")', () => {
  parseKey('a');
});

benchmark('parseKey("<C-S-a>")', () => {
  parseKey('<C-S-a>');
});

benchmark('parseKey("<Esc>")', () => {
  parseKey('<Esc>');
});

const event = {
  key: 'a',
  ctrlKey: true,
  altKey: false,
  shiftKey: false,
  metaKey: false
};
benchmark('eventToKey(event)', () => {
  eventToKey(event);
});

const specialEvent = {
  key: 'ArrowUp',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false
};
benchmark('eventToKey(specialEvent)', () => {
  eventToKey(specialEvent);
});

const keyObj = {
  key: 'a',
  modifiers: { ctrl: true, alt: false, shift: true, meta: false, super: false }
};
benchmark('keyToString(keyObj)', () => {
  keyToString(keyObj);
});

const specialKeyObj = {
  key: 'Escape',
  modifiers: { ctrl: false, alt: false, shift: false, meta: false, super: false }
};
benchmark('keyToString(specialKeyObj)', () => {
  keyToString(specialKeyObj);
});
