/**
 * Unit tests for buildtime/code.js
 *
 * Run with: node core/buildtime/code.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CodeSegment, JavascriptFile, JSONFile } from './code.js';

// Helper function to create a temporary file and test the generated code
function testGeneratedCode(description, setupFileCallback, additionalChecks = () => {}) {
  test(description, () => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);

    try {
      const file = new JavascriptFile(tempFile);
      setupFileCallback(file);

      file.write();

      // Verify file was created
      assert.ok(fs.existsSync(tempFile), 'File should be created');

      // Read the generated code
      const generatedCode = fs.readFileSync(tempFile, 'utf8');
      assert.ok(generatedCode.length > 0, 'Generated code should not be empty');

      // Eval the code to ensure it's valid JavaScript
      // Use Function constructor to avoid syntax errors being caught
      try {
        new Function(generatedCode)();
      } catch (error) {
        assert.fail(`Generated code should be valid JavaScript: ${error.message}`);
      }

      // Run additional checks
      additionalChecks(file, generatedCode);

    } finally {
      // Clean up
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
}

describe('Code Validation', () => {
  test('validation functions are currently no-ops', () => {
    // The validation functions are currently no-ops, so any valid code should pass
    // We'll test this through the public API of CodeSegment.addLine
    const pageSegment = new CodeSegment('page');
    const backgroundSegment = new CodeSegment('background');

    assert.doesNotThrow(() => {
      pageSegment.addLine('console.log("test");');
      backgroundSegment.addLine('chrome.runtime.onMessage.addListener(() => {});');
    });
  });
});

describe('CodeSegment', () => {
  describe('Constructor', () => {
    test('creates CodeSegment with page environment', () => {
      const segment = new CodeSegment('page');

      assert.strictEqual(segment.environment, 'page');
      assert.strictEqual(segment.code, '');
    });

    test('creates CodeSegment with background environment', () => {
      const segment = new CodeSegment('background');

      assert.strictEqual(segment.environment, 'background');
      assert.strictEqual(segment.code, '');
    });
  });

  describe('addLine', () => {
    test('adds single line successfully', () => {
      const segment = new CodeSegment('page');
      const line = 'console.log("hello");';

      segment.addLine(line);

      assert.strictEqual(segment.code, line + '\n');
    });

    test('adds multiple lines with proper formatting', () => {
      const segment = new CodeSegment('page');

      segment.addLine('const a = 1;');
      segment.addLine('const b = 2;');
      segment.addLine('console.log(a + b);');

      const expected = 'const a = 1;\nconst b = 2;\nconsole.log(a + b);\n';
      assert.strictEqual(segment.code, expected);
    });

    test('throws error for empty line after trimming', () => {
      const segment = new CodeSegment('page');

      assert.throws(() => {
        segment.addLine('   ');
      }, /Invalid code line/);
    });

    test('throws error for line with newlines', () => {
      const segment = new CodeSegment('page');

      assert.throws(() => {
        segment.addLine('line1\nline2');
      }, /Invalid code line/);

      assert.throws(() => {
        segment.addLine('line1\r\nline2');
      }, /Invalid code line/);
    });

    test('throws error for single space (empty after trim)', () => {
      const segment = new CodeSegment('page');

      assert.throws(() => {
        segment.addLine(' ');
      }, /Invalid code line/);
    });

    test('trims whitespace from lines', () => {
      const segment = new CodeSegment('page');

      segment.addLine('  const x = 5;  '); // Should trim
      assert.strictEqual(segment.code, 'const x = 5;\n');
    });
  });

  describe('addLines', () => {
    test('adds multiple lines via addLines method', () => {
      const segment = new CodeSegment('page');

      segment.addLines(
        'const a = 1;',
        'const b = 2;',
        'return a + b;'
      );

      const expected = 'const a = 1;\nconst b = 2;\nreturn a + b;\n';
      assert.strictEqual(segment.code, expected);
    });

    test('handles empty addLines call', () => {
      const segment = new CodeSegment('page');

      segment.addLines();

      assert.strictEqual(segment.code, '');
    });

    test('validates each line in addLines', () => {
      const segment = new CodeSegment('page');

      assert.throws(() => {
        segment.addLines('valid line', '   ', 'another valid');
      }, /Invalid code line/);
    });

    test('trims whitespace from lines in addLines', () => {
      const segment = new CodeSegment('page');

      segment.addLines(
        '  const a = 1;  ',
        '  const b = 2;  '
      );

      const expected = 'const a = 1;\nconst b = 2;\n';
      assert.strictEqual(segment.code, expected);
    });
  });
});

describe('JavascriptFile', () => {
  describe('Constructor', () => {
    test('creates JavascriptFile with relPath and initializes properties', () => {
      const file = new JavascriptFile('/path/to/output.js');

      assert.strictEqual(file.relPath, '/path/to/output.js');
      assert.ok(file.constants instanceof Map);
      assert.strictEqual(file.constants.size, 0);
      assert.strictEqual(file.body, '');
    });
  });

  describe('includeSegment', () => {
    test('includes first segment', () => {
      const file = new JavascriptFile('/test.js');
      const segment = new CodeSegment('page');
      segment.addLine('console.log("test");');

      file.includeSegment(segment);

      assert.strictEqual(file.body, 'console.log("test");\n');
    });

    test('includes multiple segments with separator', () => {
      const file = new JavascriptFile('/test.js');

      const segment1 = new CodeSegment('page');
      segment1.addLine('const a = 1;');

      const segment2 = new CodeSegment('background');
      segment2.addLine('const b = 2;');

      file.includeSegment(segment1);
      file.includeSegment(segment2);

      const expected = 'const a = 1;\n\n\nconst b = 2;\n';
      assert.strictEqual(file.body, expected);
    });

    test('handles empty segments', () => {
      const file = new JavascriptFile('/test.js');
      const segment = new CodeSegment('page');

      file.includeSegment(segment);

      assert.strictEqual(file.body, '');
    });
  });

  describe('includeConstant', () => {
    test('adds constant to the map', () => {
      const file = new JavascriptFile('/test.js');

      file.includeConstant('VERSION', '"1.0.0"');
      file.includeConstant('DEBUG', 'true');

      assert.strictEqual(file.constants.get('VERSION'), '"1.0.0"');
      assert.strictEqual(file.constants.get('DEBUG'), 'true');
      assert.strictEqual(file.constants.size, 2);
    });
  });

  describe('write', () => {
    testGeneratedCode('writes file with constants and body', (file) => {
      // Add some constants
      file.includeConstant('NAME', '"test"');
      file.includeConstant('VALUE', '42');

      // Add some body content
      const segment = new CodeSegment('page');
      segment.addLine('console.log(NAME);');
      file.includeSegment(segment);
    }, (file, generatedCode) => {
      // Verify the generated code contains the expected constants and body
      assert.ok(generatedCode.includes('const NAME = "test";'), 'Should contain NAME constant');
      assert.ok(generatedCode.includes('const VALUE = 42;'), 'Should contain VALUE constant');
      assert.ok(generatedCode.includes('console.log(NAME);'), 'Should contain body code');
    });

    testGeneratedCode('writes file with only constants', (file) => {
      file.includeConstant('PI', '3.14159');
      file.includeConstant('E', '2.71828');
    }, (file, generatedCode) => {
      // Verify the generated code contains only constants
      assert.ok(generatedCode.includes('const PI = 3.14159;'), 'Should contain PI constant');
      assert.ok(generatedCode.includes('const E = 2.71828;'), 'Should contain E constant');
      assert.ok(generatedCode.endsWith('\n\n'), 'Should end with proper spacing');
    });

    testGeneratedCode('writes file with only body', (file) => {
      const segment = new CodeSegment('page');
      segment.addLine('function test() {');
      segment.addLine('return true;');
      segment.addLine('}');
      file.includeSegment(segment);
    }, (file, generatedCode) => {
      // Verify the generated code contains the function body
      assert.ok(generatedCode.includes('function test() {'), 'Should contain function definition');
      assert.ok(generatedCode.includes('return true;'), 'Should contain function body');
      assert.ok(generatedCode.startsWith('\n\n'), 'Should start with proper spacing for body-only');
    });

    testGeneratedCode('writes empty file when no constants or body', (file) => {
      // No setup needed - empty file
    }, (file, generatedCode) => {
      // Verify empty file contains minimal content
      assert.strictEqual(generatedCode, '\n\n', 'Empty file should contain only newlines');
    });
  });
});

describe('JSONFile', () => {
  describe('Constructor', () => {
    test('creates JSONFile with relPath', () => {
      const file = new JSONFile('manifest.json');

      assert.strictEqual(file.relPath, 'manifest.json');
    });
  });

  describe('Direct property manipulation', () => {
    test('allows setting properties directly like a regular object', () => {
      const file = new JSONFile('test.json');

      file.name = 'test-extension';
      file.version = '1.0.0';
      file.description = 'A test extension';

      assert.strictEqual(file.name, 'test-extension');
      assert.strictEqual(file.version, '1.0.0');
      assert.strictEqual(file.description, 'A test extension');
    });

    test('allows overwriting existing properties', () => {
      const file = new JSONFile('test.json');

      file.version = '1.0.0';
      file.version = '2.0.0';

      assert.strictEqual(file.version, '2.0.0');
    });

    test('supports complex object properties', () => {
      const file = new JSONFile('test.json');

      file.permissions = ['storage', 'activeTab'];
      file.manifest_version = 3;
      file.background = {
        service_worker: 'background.js',
        type: 'module'
      };

      assert.deepStrictEqual(file.permissions, ['storage', 'activeTab']);
      assert.strictEqual(file.manifest_version, 3);
      assert.deepStrictEqual(file.background, {
        service_worker: 'background.js',
        type: 'module'
      });
    });
  });


  describe('write', () => {
    test('writes valid JSON file with properties', () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);

      try {
        const file = new JSONFile(tempFile);
        file.name = 'test-extension';
        file.version = '1.0.0';
        file.description = 'A test extension';
        file.permissions = ['storage', 'activeTab'];

        file.write();

        // Verify file was created
        assert.ok(fs.existsSync(tempFile), 'File should be created');

        // Read and parse the generated JSON
        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        const parsedData = JSON.parse(generatedContent);

        // Verify the data matches what we set
        assert.strictEqual(parsedData.name, 'test-extension');
        assert.strictEqual(parsedData.version, '1.0.0');
        assert.strictEqual(parsedData.description, 'A test extension');
        assert.deepStrictEqual(parsedData.permissions, ['storage', 'activeTab']);

      } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('writes properly formatted JSON', () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);

      try {
        const file = new JSONFile(tempFile);
        file.nested = { key: 'value', array: [1, 2, 3] };

        file.write();

        const generatedContent = fs.readFileSync(tempFile, 'utf8');

        // Verify it's valid JSON and properly formatted with 2-space indentation
        const parsed = JSON.parse(generatedContent);
        assert.deepStrictEqual(parsed, { nested: { key: 'value', array: [1, 2, 3] } });

        // Check formatting (should have proper indentation)
        assert.ok(generatedContent.includes('  "nested": {'));
        assert.ok(generatedContent.includes('    "key": "value"'));

      } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('writes empty object when no properties set', () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);

      try {
        const file = new JSONFile(tempFile);
        file.write();

        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        assert.strictEqual(generatedContent, '{}');

      } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('writes the JSONFile instance itself as JSON, excluding relPath', () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);

      try {
        const file = new JSONFile(tempFile);
        file.name = 'test-extension';
        file.version = '1.0.0';
        file.permissions = ['storage', 'activeTab'];

        file.write();

        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        const parsedData = JSON.parse(generatedContent);

        // Verify the JSON contains the properties we set
        assert.strictEqual(parsedData.name, 'test-extension');
        assert.strictEqual(parsedData.version, '1.0.0');
        assert.deepStrictEqual(parsedData.permissions, ['storage', 'activeTab']);

        // Verify relPath is not included in the JSON
        assert.strictEqual(parsedData.relPath, undefined);

      } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });
});
