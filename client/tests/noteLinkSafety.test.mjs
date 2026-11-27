import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeNoteLink } from '../src/services/noteLinkSafety.js';
test('Markdown and pasted notes reject executable and obfuscated URL schemes', () => {
  for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,unsafe', 'vbscript:run()', 'file:///etc/passwd', 'blob:https://example.test/id', '//attacker.example', '\\attacker.example', 'https://', 'http:\n//example.test', '', null]) assert.equal(isSafeNoteLink(value),false, String(value));
  for (const value of ['https://example.test/page?q=1', 'http://localhost:5173/', 'example.test', '#heading', '/notes']) assert.equal(isSafeNoteLink(value),true,value);
});
