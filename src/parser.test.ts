import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIni } from './parser';

test('parseIni skips blank lines and comments regardless of indentation', () => {
  const result = parseIni(['[a]', '', '  ; comment', '  # also a comment', 'k = v'].join('\n'));

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.entries, [
    { kind: 'section', name: 'a', line: 1, column: 2 },
    { kind: 'pair', key: 'k', value: 'v', line: 5, keyColumn: 1, keyLength: 1 },
  ]);
});

test('parseIni accepts ":" as a separator', () => {
  const result = parseIni('key: value');

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.entries, [
    { kind: 'pair', key: 'key', value: 'value', line: 1, keyColumn: 1, keyLength: 3 },
  ]);
});

test('parseIni reports the key column past leading whitespace', () => {
  const result = parseIni('  indented = value');

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.entries, [
    { kind: 'pair', key: 'indented', value: 'value', line: 1, keyColumn: 3, keyLength: 8 },
  ]);
});

test('parseIni tracks line numbers across CRLF and LF line endings', () => {
  const result = parseIni('[a]\r\nk = v\n[b]\r\n');

  assert.deepStrictEqual(
    result.entries.map((e) => e.line),
    [1, 2, 3],
  );
});
