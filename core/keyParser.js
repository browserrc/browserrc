/**
 * Key parsing and placeholder resolution
 */

const PLACEHOLDERS = new Map();

/**
 * Modifier patterns for parsing key strings
 * 
 * This array defines how to extract modifier prefixes from vim-style key notation.
 * 
 * How it works:
 * 1. We check each pattern in order (top to bottom)
 * 2. If the key string starts with a pattern, we:
 *    - Set the corresponding modifier property to true
 *    - Remove that many characters from the string
 *    - Restart checking from the beginning (to catch multiple modifiers)
 * 3. Continue until no more modifiers are found
 * 
 * Example: "<C-M-S-x>" becomes:
 *   - Find "c-" → set ctrl=true, remove "c-", remaining: "m-s-x"
 *   - Find "m-" → set alt=true, remove "m-", remaining: "s-x"
 *   - Find "s-" → set shift=true, remove "s-", remaining: "x"
 *   - No more matches → "x" is the key
 * 
 * Vim notation mapping:
 *   C-     → Ctrl
 *   M-     → Alt/Meta
 *   A-     → Alt/Meta (alternative notation)
 *   S-     → Shift
 *   D-     → Super/Command key (macOS Command, Windows key)
 *   T-     → Meta key
 *   meta-  → Meta (longer form)
 * 
 * IMPORTANT: Order matters! Longer patterns (like "meta-") must come before
 * shorter patterns (like "m-") that could match the same prefix.
 */
let MODIFIER_PATTERNS = [
  { pattern: 'meta-', property: 'meta', length: 5 },  // Must come before "m-" to avoid partial match
  { pattern: 'c-', property: 'ctrl', length: 2 },     // Ctrl: <C-a>
  { pattern: 'm-', property: 'alt', length: 2 },      // Alt/Meta: <M-a>
  { pattern: 'a-', property: 'alt', length: 2 },      // Alt/Meta (alt notation): <A-a>
  { pattern: 's-', property: 'shift', length: 2 },    // Shift: <S-a>
  { pattern: 'd-', property: 'super', length: 2 },    // Super/Command: <D-a>
  { pattern: 't-', property: 'meta', length: 2 },      // Meta: <T-a>
];

/**
 * Register a custom modifier
 * @param {string} name - Modifier name (e.g., "hyper")
 * @param {string|string[]} properties - Internal modifier property(s) to set true
 * @param {string} [alias] - Optional alias (e.g., "H")
 */
export function registerModifier(name, properties, alias) {
  const props = Array.isArray(properties) ? properties : [properties];
  
  // Remove any existing pattern with the same name (case-insensitive)
  // This allows overwriting modifiers (e.g., redefining 'hyper')
  MODIFIER_PATTERNS = MODIFIER_PATTERNS.filter(p => {
    const patternName = p.pattern.slice(0, -1); // remove trailing '-'
    return patternName !== name.toLowerCase() && 
           (!alias || patternName !== alias.toLowerCase());
  });

  // Add main pattern
  MODIFIER_PATTERNS.push({
    pattern: name.toLowerCase() + '-',
    property: props,
    length: name.length + 1
  });

  // Add alias if provided
  if (alias) {
    MODIFIER_PATTERNS.push({
      pattern: alias.toLowerCase() + '-',
      property: props,
      length: alias.length + 1
    });
  }

  // Sort by length descending to ensure longest match first
  MODIFIER_PATTERNS.sort((a, b) => b.length - a.length);
}

// Register default complex modifiers
// Hyper: Command + Shift + Option + Control
registerModifier('hyper', ['super', 'shift', 'alt', 'ctrl']);
// Meh: Control + Option + Shift
registerModifier('meh', ['ctrl', 'alt', 'shift']);

/**
 * Normalizes browser KeyboardEvent.key values to our internal format
 * 
 * The browser gives us keys like "ArrowUp", "F1", "Home", etc.
 * We need to convert these to consistent values like "Up", "F1", "Home"
 * 
 * How it works:
 * 1. We check each pattern in order (top to bottom)
 * 2. The first pattern whose test() function returns true wins
 * 3. We call that pattern's normalize() function to transform the key
 * 4. We stop checking (break) after the first match
 * 
 * Examples:
 * - Browser gives "ArrowUp" -> matches pattern #1 -> becomes "Up"
 * - Browser gives "F1" -> matches pattern #2 -> becomes "F1" (uppercase)
 * - Browser gives "f5" -> matches pattern #2 -> becomes "F5" (uppercase)
 * - Browser gives "A" -> matches pattern #3 -> becomes "a" (lowercase)
 * - Browser gives "Home" -> matches pattern #4 (catch-all) -> stays "Home"
 * - Browser gives "Escape" -> matches pattern #4 (catch-all) -> stays "Escape"
 * - Browser gives " " -> matches pattern #4 (catch-all) -> stays " "
 * 
 * IMPORTANT: Order matters! More specific patterns must come before general ones.
 */
const KEY_NORMALIZATION_PATTERNS = [
  // Arrow keys - browser gives "ArrowUp", we want "Up"
  {
    test: (key) => key.startsWith('Arrow'),
    normalize: (key) => key.replace('Arrow', ''), // "ArrowUp" -> "Up"
    description: 'Arrow keys (convert "ArrowUp" to "Up")',
  },
  
  // Function keys - browser gives "F1" or "f1", we want "F1" (uppercase)
  {
    test: (key) => /^F\d+$/i.test(key), // Matches F1, F2, ..., F12 (case-insensitive)
    normalize: (key) => key.toUpperCase(), // "f1" -> "F1", "F1" -> "F1"
    description: 'Function keys F1-F12 (ensure uppercase)',
  },
  
  // Regular letters - normalize capital letters to lowercase + shift modifier
  // We treat Shift+A and Caps Lock+A the same way - both become "a" with shift=true
  // This ensures users can map "A" in their config and it works regardless of caps lock state
  {
    test: (key) => /^[A-Za-z]$/.test(key), // Single letter
    normalize: (key) => key.toLowerCase(), // "A" -> "a", "B" -> "b"
    description: 'Regular letters (normalize to lowercase, capital = shift)',
    isCapital: (key) => /^[A-Z]$/.test(key), // Helper to detect capital letters
  },
  
  // Catch-all: return key as-is for everything else
  // This handles: space, special keys (Escape, Enter, Tab, etc.), 
  // navigation keys (Home, End, etc.), numbers, punctuation, etc.
  {
    test: () => true, // Matches everything (must be last!)
    normalize: (key) => key, // Return unchanged
    description: 'Catch-all: return key unchanged',
  },
];

/**
 * Set a placeholder value (e.g., "<leader>" -> "C-b")
 */
export function setPlaceholder(name, value) {
  PLACEHOLDERS.set(name, value);
}

/**
 * Get placeholder value
 */
export function getPlaceholder(name) {
  return PLACEHOLDERS.get(name);
}

/**
 * Parse a key string into a normalized key representation
 * Handles modifiers like C- (Ctrl), M- (Alt), S- (Shift)
 */
export function parseKey(keyString) {
  if (PLACEHOLDERS.has(keyString)) {
    return parseKey(PLACEHOLDERS.get(keyString));
  }

  // Special handling: convert ? to S-/ (Shift + /)
  // This allows users to write ? in config and it works correctly
  // Handles both standalone ? and <?> formats
  let processedKeyString = keyString;
  if (processedKeyString === '?' || processedKeyString === '<?>') {
    // Convert ? to S-/ format (Shift + /)
    processedKeyString = '<S-/>';
  }

  // Handle modifiers
  const modifiers = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    super: false,
  };

  let key = processedKeyString;
  let content = key;
  
  // Extract content from angle brackets if present
  // e.g., "<S-F1>" -> "S-F1", "<F1>" -> "F1"
  if (key.startsWith('<') && key.endsWith('>')) {
    content = key.slice(1, -1);
  }
  
  // Track if original had brackets for proper lookup
  // Use processedKeyString to check original format
  const hadBrackets = processedKeyString.startsWith('<') && processedKeyString.endsWith('>');
  
  // Check if the original key (before processing) is a capital letter
  // We need to check this before lowercasing, so we preserve the original case info
  const originalKeyIsCapital = !hadBrackets && /^[A-Z]$/.test(content);
  
  // Parse modifiers from content using pattern matching
  // Vim uses: C- (Ctrl), M- or A- (Alt/Meta), S- (Shift), D- (Super/Command), T- (Meta)
  let remaining = content.toLowerCase();
  let foundModifier = true;
  
  while (foundModifier) {
    foundModifier = false;
    for (const { pattern, property, length } of MODIFIER_PATTERNS) {
      if (remaining.startsWith(pattern)) {
        if (Array.isArray(property)) {
          property.forEach(p => modifiers[p] = true);
        } else {
          modifiers[property] = true;
        }
        remaining = remaining.slice(length);
        foundModifier = true;
        break; // Restart from beginning to check all patterns again
      }
    }
  }
  
  // Now remaining contains the key part (without brackets)
  key = remaining;
  
  // If the original key was a capital letter (and not already in brackets with explicit modifiers),
  // treat it as shift modifier. This makes "A" equivalent to "<S-a>"
  // This ensures users can write "A" in config and it matches both Shift+A and Caps Lock+A
  if (originalKeyIsCapital) {
    modifiers.shift = true;
  }

  // Handle special keys - comprehensive list matching vim's key-notation
  const specialKeys = {
    // Basic special keys
    '<esc>': 'Escape',
    '<escape>': 'Escape',
    'esc': 'Escape',
    'escape': 'Escape',
    '<enter>': 'Enter',
    '<cr>': 'Enter',
    '<return>': 'Enter',
    'enter': 'Enter',
    'cr': 'Enter',
    'return': 'Enter',
    '<space>': ' ',
    'space': ' ',
    '<tab>': 'Tab',
    'tab': 'Tab',
    '<backspace>': 'Backspace',
    '<bs>': 'Backspace',
    'backspace': 'Backspace',
    'bs': 'Backspace',
    '<delete>': 'Delete',
    '<del>': 'Delete',
    'delete': 'Delete',
    'del': 'Delete',
    
    // Arrow keys (normalize to Up, Down, Left, Right for vim compatibility)
    '<up>': 'Up',
    'up': 'Up',
    '<down>': 'Down',
    'down': 'Down',
    '<left>': 'Left',
    'left': 'Left',
    '<right>': 'Right',
    'right': 'Right',
    
    // Function keys F1-F12
    '<f1>': 'F1',
    'f1': 'F1',
    '<f2>': 'F2',
    'f2': 'F2',
    '<f3>': 'F3',
    'f3': 'F3',
    '<f4>': 'F4',
    'f4': 'F4',
    '<f5>': 'F5',
    'f5': 'F5',
    '<f6>': 'F6',
    'f6': 'F6',
    '<f7>': 'F7',
    'f7': 'F7',
    '<f8>': 'F8',
    'f8': 'F8',
    '<f9>': 'F9',
    'f9': 'F9',
    '<f10>': 'F10',
    'f10': 'F10',
    '<f11>': 'F11',
    'f11': 'F11',
    '<f12>': 'F12',
    'f12': 'F12',
    
    // Navigation keys
    '<home>': 'Home',
    'home': 'Home',
    '<end>': 'End',
    'end': 'End',
    '<pageup>': 'PageUp',
    'pageup': 'PageUp',
    '<pagedown>': 'PageDown',
    'pagedown': 'PageDown',
    '<insert>': 'Insert',
    'insert': 'Insert',
    
    // Other special keys
    '<nop>': 'Nop', // No operation
    'nop': 'Nop',
    '<bar>': '|',   // Pipe character
    'bar': '|',
    '<bslash>': '\\', // Backslash
    'bslash': '\\',
    '€': '2', // Mac Option+Shift+2 maps to Euro symbol, remap to 2
    '¡': '1', // Mac Option+1 maps to Inverted Exclamation, remap to 1
    '™': '2', // Mac Option+2 maps to Trademark, remap to 2
    '£': '3', // Mac Option+3 maps to Pound, remap to 3
    '¢': '4', // Mac Option+4 maps to Cent, remap to 4
    '∞': '5', // Mac Option+5 maps to Infinity, remap to 5
    '§': '6', // Mac Option+6 maps to Section, remap to 6
    '¶': '7', // Mac Option+7 maps to Paragraph, remap to 7
    '•': '8', // Mac Option+8 maps to Bullet, remap to 8
    'ª': '9', // Mac Option+9 maps to Feminine Ordinal, remap to 9
    'º': '0', // Mac Option+0 maps to Masculine Ordinal, remap to 0
    '⁄': '1', // Mac Option+Shift+1 maps to Fraction Slash (sometimes), remap to 1
    '‹': '3', // Mac Option+Shift+3 maps to Single Left-Pointing Angle Quotation Mark
    '›': '4', // Mac Option+Shift+4
    'ﬁ': '5', // Mac Option+Shift+5
    'ﬂ': '6', // Mac Option+Shift+6
    '‡': '7', // Mac Option+Shift+7
    '°': '8', // Mac Option+Shift+8
    '·': '9', // Mac Option+Shift+9
    '‚': '0', // Mac Option+Shift+0
  };

  // Try lookup with brackets first (if original had brackets), then without
  // Use processedKeyString to check original format
  const lookupKey = hadBrackets ? `<${key}>` : key;
  if (specialKeys[lookupKey]) {
    key = specialKeys[lookupKey];
  } else if (specialKeys[key]) {
    key = specialKeys[key];
  } else {
    // If not a special key, check if it's a function key pattern
    // Handle function keys that might not be in brackets (though vim uses brackets)
    if (/^f\d+$/.test(key)) {
      key = key.toUpperCase(); // f1 -> F1
    }
  }

  // Normalize key for internal representation
  // Function keys stay uppercase, others lowercase
  const internalKey = (key.startsWith('F') && /^F\d+$/.test(key))
    ? key
    : key.toLowerCase();

  // Build normalized string representation
  const keyObj = { key: key, modifiers };
  const normalizedString = keyToString(keyObj);

  return {
    key: internalKey,
    modifiers,
    string: normalizedString,
  };
}

/**
 * Parse a keybinding string into an array of key objects
 * e.g., "<leader>ww" -> [parsedLeader, parsedW, parsedW]
 */
export function parseKeySequence(keySequenceString) {
  // Split by angle brackets or single characters
  const parts = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < keySequenceString.length; i++) {
    const char = keySequenceString[i];
    
    if (char === '<') {
      if (current) {
        // Add any accumulated single characters
        parts.push(...current.split(''));
        current = '';
      }
      inBracket = true;
      current = '<';
    } else if (char === '>') {
      current += '>';
      parts.push(current);
      current = '';
      inBracket = false;
    } else {
      current += char;
      if (!inBracket && i === keySequenceString.length - 1) {
        // Last character, add remaining
        parts.push(...current.split(''));
      }
    }
  }

  return parts.map(part => parseKey(part));
}

/**
 * Convert a KeyboardEvent to a normalized key representation
 */
export function eventToKey(event) {
  const modifiers = {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    super: false, // Super/Command key is typically metaKey on macOS, but we track separately
  };

  // On macOS, Command key is metaKey, but vim uses D- for Super/Command
  // We'll treat metaKey as super when appropriate, but also support meta separately
  // For now, we'll use metaKey for super on macOS (D- in vim)
  if (event.metaKey) {
    modifiers.super = true;
    modifiers.meta = false; // Don't double-count
  }

  let key = event.key;
  
  // Special handling: convert ? with shift to / with shift
  // Chrome sends key: "?" with shiftKey: true, but we want to normalize to "/" with shift
  if (key === '?' && event.shiftKey) {
    key = '/';
    // shift modifier is already set from event.shiftKey above, so we're good
  }
  
  // Normalization for mac option+shift key combos which produce symbols
  // We do this BEFORE pattern matching to ensure the key is normalized correctly
  const specialKeys = {
    // Mac Option+Shift+Numbers
    '⁄': '1',
    '€': '2', 
    '‹': '3', 
    '›': '4', 
    'ﬁ': '5', 
    'ﬂ': '6', 
    '‡': '7', 
    '°': '8', 
    '·': '9', 
    '‚': '0', 
    // Mac Option+Numbers (without Shift)
    '¡': '1', 
    '™': '2', 
    '£': '3', 
    '¢': '4', 
    '∞': '5', 
    '§': '6', 
    '¶': '7', 
    '•': '8', 
    'ª': '9', 
    'º': '0',
  };

  if (specialKeys[key]) {
    key = specialKeys[key];
  }
  
  // Normalize the key name using pattern matching
  // We check each pattern in order until one matches, then use its normalize function
  let normalizedKey = key;
  for (const pattern of KEY_NORMALIZATION_PATTERNS) {
    if (pattern.test(key)) {
      normalizedKey = pattern.normalize(key);
      
      // Special handling: if it's a capital letter, treat it as shift modifier
      // This makes Shift+A and Caps Lock+A equivalent (both become "a" with shift=true)
      if (pattern.isCapital && pattern.isCapital(key)) {
        modifiers.shift = true;
      }
      
      break; // First match wins, stop checking
    }
  }

  // For the internal key representation, use lowercase for consistency
  // except for special keys that need to match vim notation
  const internalKey = (normalizedKey.startsWith('F') && /^F\d+$/i.test(normalizedKey)) 
    ? normalizedKey 
    : normalizedKey.toLowerCase();

  return {
    key: internalKey,
    modifiers,
    string: keyToString({ key: normalizedKey, modifiers }),
  };
}

/**
 * Modifier to string mapping for keyToString
 * Order matters - should match vim's modifier order: C-, M-, S-, D-, T-
 */
const MODIFIER_TO_STRING = [
  { property: 'ctrl', prefix: 'C-' },
  { property: 'alt', prefix: 'M-' },
  { property: 'shift', prefix: 'S-' },
  { property: 'super', prefix: 'D-' },
  { property: 'meta', prefix: 'T-' },
];

/**
 * Convert a key object to a string representation
 */
export function keyToString(keyObj) {
  let str = '';
  
  // Build modifier prefix string using data-driven approach
  for (const { property, prefix } of MODIFIER_TO_STRING) {
    if (keyObj.modifiers[property]) {
      str += prefix;
    }
  }
  
  // Handle special keys - map to vim notation
  const reverseSpecial = {
    'Escape': '<Esc>',
    'Enter': '<Enter>',
    ' ': '<Space>',
    'Tab': '<Tab>',
    'Backspace': '<Backspace>',
    'Delete': '<Delete>',
    'Up': '<Up>',
    'Down': '<Down>',
    'Left': '<Left>',
    'Right': '<Right>',
    'Home': '<Home>',
    'End': '<End>',
    'PageUp': '<PageUp>',
    'PageDown': '<PageDown>',
    'Insert': '<Insert>',
    'F1': '<F1>',
    'F2': '<F2>',
    'F3': '<F3>',
    'F4': '<F4>',
    'F5': '<F5>',
    'F6': '<F6>',
    'F7': '<F7>',
    'F8': '<F8>',
    'F9': '<F9>',
    'F10': '<F10>',
    'F11': '<F11>',
    'F12': '<F12>',
    'Nop': '<Nop>',
    '|': '<Bar>',
    '\\': '<Bslash>',
  };

  str += reverseSpecial[keyObj.key] || keyObj.key;
  return str;
}

/**
 * Check if two key objects match
 */
export function keysMatch(key1, key2) {
  return (
    key1.key === key2.key &&
    key1.modifiers.ctrl === key2.modifiers.ctrl &&
    key1.modifiers.alt === key2.modifiers.alt &&
    key1.modifiers.shift === key2.modifiers.shift &&
    key1.modifiers.meta === key2.modifiers.meta &&
    key1.modifiers.super === key2.modifiers.super
  );
}
