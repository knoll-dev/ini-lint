// Line-oriented parser for INI files. It does not try to interpret values
// (quoting, escapes, types) yet -- that belongs to a later pass. Its job is
// to turn source text into a sequence of sections and key/value pairs while
// keeping exact line/column positions for everything, since that is what
// makes the linter's error messages worth reading.

export interface ParseError {
  line: number;
  column: number;
  length: number;
  message: string;
}

export interface SectionHeader {
  kind: 'section';
  name: string;
  line: number;
  column: number;
}

export interface KeyValue {
  kind: 'pair';
  key: string;
  value: string;
  line: number;
  keyColumn: number;
  keyLength: number;
}

export type Entry = SectionHeader | KeyValue;

export interface ParseResult {
  entries: Entry[];
  errors: ParseError[];
}

function findSeparator(line: string): number {
  const eq = line.indexOf('=');
  const colon = line.indexOf(':');
  if (eq === -1) return colon;
  if (colon === -1) return eq;
  return Math.min(eq, colon);
}

export function parseIni(source: string): ParseResult {
  const lines = source.split(/\r\n|\r|\n/);
  const entries: Entry[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNumber = i + 1;
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) continue;
    if (trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    const leading = rawLine.match(/^[ \t]*/)?.[0].length ?? 0;

    if (trimmed.startsWith('[')) {
      const openIndex = rawLine.indexOf('[');
      const closeIndex = rawLine.indexOf(']');

      if (closeIndex === -1) {
        errors.push({
          line: lineNumber,
          column: openIndex + 1,
          length: rawLine.length - openIndex,
          message: 'section header is missing a closing "]"',
        });
        continue;
      }

      const name = rawLine.slice(openIndex + 1, closeIndex).trim();
      const after = rawLine.slice(closeIndex + 1).trim();

      if (name.length === 0) {
        errors.push({
          line: lineNumber,
          column: openIndex + 1,
          length: closeIndex - openIndex + 1,
          message: 'section name is empty',
        });
        continue;
      }

      if (after.length > 0 && !after.startsWith(';') && !after.startsWith('#')) {
        errors.push({
          line: lineNumber,
          column: closeIndex + 2,
          length: Math.max(rawLine.length - closeIndex - 1, 1),
          message: `unexpected text after section header: "${after}"`,
        });
      }

      entries.push({
        kind: 'section',
        name,
        line: lineNumber,
        column: openIndex + 2,
      });
      continue;
    }

    const separatorIndex = findSeparator(rawLine);
    if (separatorIndex === -1) {
      errors.push({
        line: lineNumber,
        column: leading + 1,
        length: trimmed.length,
        message: 'line is not a comment, a section header, or a key = value pair',
      });
      continue;
    }

    const rawKey = rawLine.slice(0, separatorIndex);
    const key = rawKey.trim();

    if (key.length === 0) {
      errors.push({
        line: lineNumber,
        column: leading + 1,
        length: Math.max(separatorIndex - leading, 1),
        message: 'missing key name before separator',
      });
      continue;
    }

    const value = rawLine.slice(separatorIndex + 1).trim();

    entries.push({
      kind: 'pair',
      key,
      value,
      line: lineNumber,
      keyColumn: leading + 1,
      keyLength: key.length,
    });
  }

  return { entries, errors };
}
