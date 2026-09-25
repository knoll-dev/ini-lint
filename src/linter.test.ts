// Fixture-based: each case is a pair of files under test/fixtures, an
// `<name>.ini` input and an `<name>.json` array of the findings lint()
// should produce for it. Adding a case means dropping in a new pair, not
// editing this file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lint, Finding } from './linter';

const fixturesDir = join(__dirname, '..', 'test', 'fixtures');

const names = readdirSync(fixturesDir)
  .filter((file) => file.endsWith('.ini'))
  .map((file) => file.slice(0, -'.ini'.length));

for (const name of names) {
  test(`lint: ${name}`, () => {
    const source = readFileSync(join(fixturesDir, `${name}.ini`), 'utf8');
    const expected: Finding[] = JSON.parse(
      readFileSync(join(fixturesDir, `${name}.json`), 'utf8'),
    );
    assert.deepStrictEqual(lint(source), expected);
  });
}
