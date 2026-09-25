# ini-lint

INI has no real specification. Every parser disagrees a little on comments,
duplicate keys, quoting, and what counts as a valid section header. That
means a typo -- a missing `]`, a key pasted in twice, a section declared in
two places -- usually fails silently: whichever library reads the file just
picks one of the possible interpretations and moves on. This is a linter
that reads an INI file and tells you, with exact line and column numbers,
where it's ambiguous or wrong.

## Usage

```
npm run build
node dist/cli.js bad.ini
```

Given `bad.ini`:

```ini
[server]
host = localhost
port = 8080
port = 9090

[server]
timeout = 30

[client
name = test
```

the output is:

```
bad.ini:4:1: warning [duplicate-key] key "port" was already set at line 3 in section "server"
  |
4 | port = 9090
  | ^^^^

bad.ini:6:2: warning [duplicate-section] section "server" was already declared at line 1
  |
6 | [server]
  |  ^^^^^^

bad.ini:8:1: error [syntax] section header is missing a closing "]"
  |
8 | [client
  | ^^^^^^^

```

Exit code is `1` if any finding is an error, `0` otherwise (warnings alone
don't fail the run).

## What it checks today

- malformed lines (not a comment, section header, or `key = value` pair)
- section headers missing a closing `]`
- empty section names (`[]`)
- text left over after a section header (`[server] oops`)
- keys with no name before the separator (`= value`)
- duplicate keys within the same section
- duplicate section declarations

Comments start a line with `;` or `#`. Keys and values can be separated by
`=` or `:`. Leading and trailing whitespace around keys, section names, and
values is trimmed.

## Library use

```ts
import { lint } from './src/linter';

const findings = lint(source);
// each finding: { severity, rule, line, column, length, message }
```

`lint` never throws on malformed input -- syntax problems come back as
findings with `rule: "syntax"`, same as any other check.

## Project layout

- `src/parser.ts` -- turns source text into sections and key/value pairs,
  tracking line/column for everything, including malformed lines.
- `src/linter.ts` -- runs semantic checks (duplicates) on top of the parse
  and produces the final, sorted list of findings.
- `src/cli.ts` -- reads files from argv and prints findings in a code-frame
  style with a caret under the offending span.

## Testing

```
npm test
```

Linter tests are fixture-based: each case in `test/fixtures/` is a pair of
files, `<name>.ini` and `<name>.json`, where the JSON file is the exact
array of findings `lint()` should produce for that input. Adding a
regression case means dropping in a new pair, not editing test code.
Parser tests cover line/column bookkeeping directly. Both run on Node's
built-in test runner, so there's nothing to install.

## Status

Early. No config for turning rules off, no handling of quoted values or
inline comments after a value. See the issues for what's next.
