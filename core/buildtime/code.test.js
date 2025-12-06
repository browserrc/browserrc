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
import { CodeFile } from './code.js';

describe('CodeFile', () => {
  describe('Constructor', () => {
    test('creates CodeFile with relPath', () => {
      const file = new CodeFile({ relPath: 'test.js' });
      assert.strictEqual(file.relPath, 'test.js');
      assert.ok(file.constants instanceof Map);
      assert.strictEqual(file.code, '');
      assert.deepStrictEqual(file.context, {});
    });

    test('creates CodeFile without relPath', () => {
      const file = new CodeFile();
      assert.strictEqual(file.relPath, null);
      assert.ok(file.constants instanceof Map);
      assert.strictEqual(file.code, '');
      assert.deepStrictEqual(file.context, {});
    });

    test('new CodeFile() creates a segment', () => {
      const segment = new CodeFile();
      assert.strictEqual(segment.relPath, null);
      assert.ok(segment.constants instanceof Map);
      assert.strictEqual(segment.code, '');
      assert.deepStrictEqual(segment.context, {});
    });

    test('new CodeFile({ relPath }) creates a file', () => {
      const file = new CodeFile({ relPath: 'output.js' });
      assert.strictEqual(file.relPath, 'output.js');
      assert.ok(file.constants instanceof Map);
      assert.strictEqual(file.code, '');
      assert.deepStrictEqual(file.context, {});
    });

    test('constructor accepts props object', () => {
      const file = new CodeFile({
        relPath: 'test.js',
        code: 'console.log("hello");',
        constants: [['VERSION', '1.0.0'], ['DEBUG', true]],
        context: { enabled: true, count: 5 }
      });

      assert.strictEqual(file.relPath, 'test.js');
      assert.strictEqual(file.code, 'console.log("hello");');
      assert.strictEqual(file.constants.get('VERSION'), '1.0.0');
      assert.strictEqual(file.constants.get('DEBUG'), true);
      assert.deepStrictEqual(file.context, { enabled: true, count: 5 });
    });

  });

  describe('Context Management', () => {
    test('setContext with key-value pair', () => {
      const file = new CodeFile();
      file.setContext('enabled', true);

      assert.deepStrictEqual(file.getContext(), { enabled: true });
    });

    test('setContext with object', () => {
      const file = new CodeFile();
      file.setContext({ enabled: true, debug: false });

      assert.deepStrictEqual(file.getContext(), { enabled: true, debug: false });
    });

    test('setContext merges multiple calls', () => {
      const file = new CodeFile();
      file.setContext('enabled', true);
      file.setContext({ debug: false, count: 5 });

      assert.deepStrictEqual(file.getContext(), { enabled: true, debug: false, count: 5 });
    });

    test('setContext returns this for chaining', () => {
      const file = new CodeFile();
      const result = file.setContext('test', 'value');

      assert.strictEqual(result, file);
    });

    test('clearContext removes all context', () => {
      const file = new CodeFile();
      file.setContext({ a: 1, b: 2 });
      file.clearContext();

      assert.deepStrictEqual(file.getContext(), {});
    });

    test('renderTemplate uses stored context', () => {
      const file = new CodeFile();
      file.code = 'const enabled = {{enabled}};';
      file.setContext('enabled', true);

      const rendered = file.renderTemplate();

      assert.strictEqual(rendered.code, 'const enabled = true;');
      assert.notStrictEqual(rendered, file); // Should return new instance
    });

    test('renderTemplate merges additional context', () => {
      const file = new CodeFile();
      file.code = 'const enabled = {{enabled}}, debug = {{debug}};';
      file.setContext('enabled', true);

      const rendered = file.renderTemplate({ debug: false });

      assert.strictEqual(rendered.code, 'const enabled = true, debug = false;');
    });

    test('renderTemplate prioritizes additional context', () => {
      const file = new CodeFile();
      file.code = 'const value = {{key}};';
      file.setContext('key', 'stored');

      const rendered = file.renderTemplate({ key: 'additional' });

      assert.strictEqual(rendered.code, 'const value = additional;');
    });
  });

  describe('includeFileContent', () => {
    test('includes file content as code block', async () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-file-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);
      const testContent = 'console.log("Hello from included file!");\nconst x = 42;';

      try {
        // Create a test file
        fs.writeFileSync(tempFile, testContent);

        const file = new CodeFile();
        file.includeFileContent(tempFile);

        assert.strictEqual(file.code, testContent);

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('includes multiple files with proper separation', async () => {
      const tempDir = os.tmpdir();
      const tempFile1 = path.join(tempDir, `test-file1-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);
      const tempFile2 = path.join(tempDir, `test-file2-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);
      const content1 = 'const a = 1;';
      const content2 = 'const b = 2;';

      try {
        // Create test files
        fs.writeFileSync(tempFile1, content1);
        fs.writeFileSync(tempFile2, content2);

        const file = new CodeFile();
        file.includeFileContent(tempFile1);
        file.includeFileContent(tempFile2);

        const expected = content1 + '\n\n' + content2;
        assert.strictEqual(file.code, expected);

      } finally {
        if (fs.existsSync(tempFile1)) {
          fs.unlinkSync(tempFile1);
        }
        if (fs.existsSync(tempFile2)) {
          fs.unlinkSync(tempFile2);
        }
      }
    });

    test('throws error for non-existent file', () => {
      const file = new CodeFile();

      assert.throws(() => {
        file.includeFileContent('/non/existent/file.js');
      }, /Failed to read file/);
    });

    test('returns this for chaining', async () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-chain-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);
      const testContent = 'console.log("test");';

      try {
        fs.writeFileSync(tempFile, testContent);

        const file = new CodeFile();
        const result = file.includeFileContent(tempFile);

        assert.strictEqual(result, file);
        assert.strictEqual(file.code, testContent);

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });

  describe('write', () => {
    test('writes file with relPath', async () => {
      const tempDir = os.tmpdir();
      const filename = `test-write-relpath-${Date.now()}-${Math.random().toString(36).substring(7)}.js`;
      const tempFile = path.join(tempDir, filename);

      try {
        const file = new CodeFile({ relPath: filename });
        file.addBlock('console.log("test");');


        file.write(tempDir);

        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        assert.ok(generatedContent.includes('console.log("test");'));

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('writes file with outputPath parameter', async () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-write-outputpath-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);

      try {
        const file = new CodeFile(); // No relPath set
        file.addBlock('console.log("test");');

        file.write(tempFile);

        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        assert.ok(generatedContent.includes('console.log("test");'));

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('writes file with outputPath and outputDir', async () => {
      const tempDir = os.tmpdir();
      const filename = `test-write-both-${Date.now()}-${Math.random().toString(36).substring(7)}.js`;
      const tempFile = path.join(tempDir, filename);

      try {
        const file = new CodeFile();
        file.addBlock('console.log("test");');

        file.write(filename, tempDir);

        const generatedContent = fs.readFileSync(tempFile, 'utf8');
        assert.ok(generatedContent.includes('console.log("test");'));

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test('throws error without relPath or outputPath', () => {
      const file = new CodeFile();
      file.addBlock('console.log("test");');

      assert.throws(() => {
        file.write();
      }, /Cannot write file without relPath/);
    });

    test('returns this for chaining', async () => {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `test-write-chain-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);

      try {
        const file = new CodeFile();
        file.addBlock('console.log("test");');

        const result = file.write(tempFile);

        assert.strictEqual(result, file);

      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });
});
