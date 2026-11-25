#!/usr/bin/env node
/**
 * Exifear Privacy Violation Scanner
 *
 * Reads a file path from STDIN as JSON ({ "filePath": "..." }),
 * scans that file for privacy violations, and prints a pass/fail
 * report to stdout. Exit code is always 0 so the hook never blocks a save.
 *
 * Rules checked:
 *   Rule 1  – fetch() calls that are not OSM tile requests
 *   Rule 1  – XMLHttpRequest / sendBeacon / WebSocket usage
 *   Rule 10 – bare location declaratives ("your home", "you live at", etc.)
 *   Rule 11 – console.error() calls (must use dispatch SET_ERROR instead)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Read file path from STDIN (Kiro passes JSON context on stdin)
let raw = '';
try {
  raw = fs.readFileSync('/dev/stdin', 'utf8').trim();
} catch (_) {
  process.exit(0);
}

let filePath = '';
if (raw.startsWith('{')) {
  try {
    const ctx = JSON.parse(raw);
    filePath = ctx.filePath || ctx.file || ctx.path || '';
  } catch (_) {}
} else {
  filePath = raw; // plain-text path for manual invocation
}

if (!filePath) process.exit(0);
if (!path.isAbsolute(filePath)) filePath = path.resolve(process.cwd(), filePath);

let source = '';
try {
  source = fs.readFileSync(filePath, 'utf8');
} catch (_) {
  process.exit(0); // unreadable file is not a privacy violation
}

const lines = source.split('\n');

/** @type {{ line: number; rule: number; message: string }[]} */
const violations = [];

// Rule 1a – fetch() that is not an OSM tile request
// Annotate permitted non-OSM fetches with // osm-ok on the same line
lines.forEach((line, i) => {
  if (/\bfetch\s*\(/.test(line) &&
      !/openstreetmap|tile\.openstreetmap|osm-ok/i.test(line)) {
    violations.push({
      line: i + 1,
      rule: 1,
      message:
        'fetch() detected — confirm no photo data or EXIF metadata is ' +
        'in the request. If this is an OSM tile fetch add // osm-ok.',
    });
  }
});

// Rule 1b – prohibited outbound channel APIs
lines.forEach((line, i) => {
  const m = line.match(/\b(XMLHttpRequest|sendBeacon|WebSocket)\b/);
  if (m) {
    violations.push({
      line: i + 1,
      rule: 1,
      message:
        `${m[1]} detected — prohibited outbound channel. ` +
        'Photo data must never leave the browser via this API.',
    });
  }
});

// Rule 10 – bare location declaratives in string literals / JSX
lines.forEach((line, i) => {
  const m = line.match(/\b(your home|you live at|your workplace|your school)\b/i);
  if (m) {
    violations.push({
      line: i + 1,
      rule: 10,
      message:
        `Bare declarative "${m[1]}" — use qualified inference language ` +
        '(e.g. "you may spend…") and prefix output with "Inference:".',
    });
  }
});

// Rule 11 – console.error (use dispatch SET_ERROR instead)
lines.forEach((line, i) => {
  if (/\bconsole\.error\s*\(/.test(line)) {
    violations.push({
      line: i + 1,
      rule: 11,
      message:
        'console.error() — replace with dispatch({ type: "SET_ERROR", … }) ' +
        'so errors are handled in the reducer, not logged to the console.',
    });
  }
});

// Report
const name = path.basename(filePath);
if (violations.length === 0) {
  console.log(`EXIFEAR privacy check: PASS (${name})`);
} else {
  console.log(`EXIFEAR privacy check: ${violations.length} violation(s) in ${name}`);
  for (const v of violations) {
    console.log(`  [!] Line ${v.line} (rule ${v.rule}): ${v.message}`);
  }
}

process.exit(0);