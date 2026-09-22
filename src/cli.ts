#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { lint, Finding } from './linter';

function formatFinding(filePath: string, source: string, finding: Finding): string {
  const lines = source.split(/\r\n|\r|\n/);
  const lineText = lines[finding.line - 1] ?? '';
  const gutter = String(finding.line);
  const pad = ' '.repeat(gutter.length);
  const caretOffset = Math.max(finding.column - 1, 0);
  const caretLength = Math.max(finding.length, 1);
  const caret = ' '.repeat(caretOffset) + '^'.repeat(caretLength);

  return [
    `${filePath}:${finding.line}:${finding.column}: ${finding.severity} [${finding.rule}] ${finding.message}`,
    `${pad} |`,
    `${gutter} | ${lineText}`,
    `${pad} | ${caret}`,
  ].join('\n');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('usage: ini-lint <file.ini> [file2.ini ...]\n');
    process.exit(2);
  }

  let hasErrors = false;

  for (const filePath of args) {
    let source: string;
    try {
      source = readFileSync(filePath, 'utf8');
    } catch (err) {
      process.stderr.write(`ini-lint: could not read ${filePath}: ${(err as Error).message}\n`);
      hasErrors = true;
      continue;
    }

    const findings = lint(source);
    if (findings.length === 0) continue;

    if (findings.some((f) => f.severity === 'error')) {
      hasErrors = true;
    }

    for (const finding of findings) {
      process.stdout.write(formatFinding(filePath, source, finding) + '\n\n');
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

main();
