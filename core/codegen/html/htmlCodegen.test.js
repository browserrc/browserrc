import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { HTMLCodeFile, html } from './htmlCodegen.js';
import { onBuild } from '../../buildtime/index.js';

describe('HTMLCodeFile', () => {
  test('constructor appends .html extension if missing', () => {
    const file = new HTMLCodeFile({ relPath: 'index', htmlContent: '<h1>Hello</h1>' });
    assert.strictEqual(file.relPath, 'index.html');
  });

  test('constructor keeps .html extension if present', () => {
    const file = new HTMLCodeFile({ relPath: 'about.html', htmlContent: '<p>About</p>' });
    assert.strictEqual(file.relPath, 'about.html');
  });

  test('write method writes content to the filesystem', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browserrc-test-'));
    try {
      const relPath = 'test.html';
      const content = '<div>test</div>';
      const file = new HTMLCodeFile({ relPath, htmlContent: content });

      file.write(tempDir);

      const writtenContent = fs.readFileSync(path.join(tempDir, relPath), 'utf8');
      assert.strictEqual(writtenContent, content);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('html function', () => {
  beforeEach(() => {
    onBuild.clear();
  });

  test('handles string content', async () => {
    const content = '<html><body>Hi</body></html>';
    const codeFile = await html('index.html', content);
    assert.strictEqual(codeFile.html, content);
  });

  test('handles function content', async () => {
    const content = () => '<html><body>Hi from function</body></html>';
    const codeFile = await html('index.html', content);
    assert.strictEqual(codeFile.html, content());
  });

  test('handles Promise content', async () => {
    const content = Promise.resolve('<html><body>Hi from promise</body></html>');
    const codeFile = await html('index.html', content);
    assert.strictEqual(codeFile.html, await content);
  });

  test('registers onBuild hook', async () => {
    assert.strictEqual(onBuild.count, 0);
    await html('index.html', 'content');
    assert.strictEqual(onBuild.count, 1);
  });

  test('onBuild hook writes to platform directories', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browserrc-build-test-'));
    try {
      const relPath = 'popup.html';
      const content = '<h1>Popup</h1>';
      await html(relPath, content);

      // Trigger onBuild
      await Promise.all(onBuild.trigger({
        outputDir: tempDir,
        platforms: { chrome: true, firefox: true }
      }));

      const chromePath = path.join(tempDir, 'chrome', relPath);
      const firefoxPath = path.join(tempDir, 'firefox', relPath);

      assert.ok(fs.existsSync(chromePath), 'Chrome output should exist');
      assert.ok(fs.existsSync(firefoxPath), 'Firefox output should exist');
      assert.strictEqual(fs.readFileSync(chromePath, 'utf8'), content);
      assert.strictEqual(fs.readFileSync(firefoxPath, 'utf8'), content);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('onBuild hook respects platform options', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browserrc-build-test-opt-'));
    try {
      const relPath = 'popup.html';
      await html(relPath, 'content');

      await Promise.all(onBuild.trigger({
        outputDir: tempDir,
        platforms: { chrome: true, firefox: false }
      }));

      assert.ok(fs.existsSync(path.join(tempDir, 'chrome', relPath)), 'Chrome output should exist');
      assert.ok(!fs.existsSync(path.join(tempDir, 'firefox', relPath)), 'Firefox output should NOT exist');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
