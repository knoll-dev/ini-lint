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

function values(source: string): string[] {
  return parseIni(source).entries.flatMap((e) => (e.kind === 'pair' ? [e.value] : []));
}

test('parseIni strips inline comments that follow whitespace', () => {
  assert.deepStrictEqual(values('a = 1 ; one\nb = 2\t# two\nc = x;y\nd = p#q'), [
    '1',
    '2',
    'x;y',
    'p#q',
  ]);
});

test('parseIni unquotes values and keeps comment characters inside quotes', () => {
  assert.deepStrictEqual(
    values('a = "  padded ; kept  " ; note\nb = \'C:\\temp\'\nc = "say \\"hi\\"\\n"\nd = ""'),
    ['  padded ; kept  ', 'C:\\temp', 'say "hi"\n', ''],
  );
});

test('parseIni reports an unterminated quoted value', () => {
  const result = parseIni('key = "oops');

  assert.deepStrictEqual(result.entries, []);
  assert.deepStrictEqual(result.errors, [
    { line: 1, column: 7, length: 5, message: 'quoted value is missing a closing "' },
  ]);
});

test('parseIni reports text after a closing quote', () => {
  const result = parseIni('key = "a"  b');

  assert.deepStrictEqual(result.entries, []);
  assert.deepStrictEqual(result.errors, [
    { line: 1, column: 12, length: 1, message: 'unexpected text after quoted value: "b"' },
  ]);
});

test('parseIni tracks line numbers across CRLF and LF line endings', () => {
  const result = parseIni('[a]\r\nk = v\n[b]\r\n');

  assert.deepStrictEqual(
    result.entries.map((e) => e.line),
    [1, 2, 3],
  );
});
