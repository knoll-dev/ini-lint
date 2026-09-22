import { parseIni } from './parser';

export interface Finding {
  severity: 'error' | 'warning';
  rule: string;
  line: number;
  column: number;
  length: number;
  message: string;
}

export function lint(source: string): Finding[] {
  const { entries, errors } = parseIni(source);

  const findings: Finding[] = errors.map((error) => ({
    severity: 'error',
    rule: 'syntax',
    ...error,
  }));

  // name -> line of first declaration
  const seenSections = new Map<string, number>();
  // `${section}\0${key}` -> line of first assignment
  const seenKeys = new Map<string, number>();
  let currentSection = '';

  for (const entry of entries) {
    if (entry.kind === 'section') {
      const firstLine = seenSections.get(entry.name);
      if (firstLine !== undefined) {
        findings.push({
          severity: 'warning',
          rule: 'duplicate-section',
          line: entry.line,
          column: entry.column,
          length: entry.name.length,
          message: `section "${entry.name}" was already declared at line ${firstLine}`,
        });
      } else {
        seenSections.set(entry.name, entry.line);
      }
      currentSection = entry.name;
      continue;
    }

    const scopeKey = `${currentSection}\0${entry.key}`;
    const firstLine = seenKeys.get(scopeKey);
    if (firstLine !== undefined) {
      const where = currentSection ? `in section "${currentSection}"` : 'at the top level';
      findings.push({
        severity: 'warning',
        rule: 'duplicate-key',
        line: entry.line,
        column: entry.keyColumn,
        length: entry.keyLength,
        message: `key "${entry.key}" was already set at line ${firstLine} ${where}`,
      });
    } else {
      seenKeys.set(scopeKey, entry.line);
    }
  }

  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return findings;
}
