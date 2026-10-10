#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const targets = ['src', 'index.html', 'vite.config.ts', 'vite.config.js'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.css']);
const forbidden = [
  {
    name: 'privileged Supabase key exposed through a Vite variable',
    pattern: /\bVITE_[A-Z0-9_]*(?:SERVICE_ROLE_KEY|SECRET_KEY|ACCESS_TOKEN|DB_PASSWORD)\b/i,
  },
  {
    name: 'privileged Supabase key reference in frontend source',
    pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD)\b/i,
  },
];

const files = [];
function collect(path) {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return;
  }
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      collect(join(path, name));
    }
    return;
  }
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (extensions.has(extension) || path.endsWith('index.html')) files.push(path);
}

for (const target of targets) collect(join(root, target));

const findings = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const rule of forbidden) {
      if (rule.pattern.test(lines[i])) {
        findings.push(`${relative(root, file)}:${i + 1}: ${rule.name}`);
      }
    }
  }
}

if (findings.length) {
  console.error('Security check failed. Remove privileged server secrets from frontend source:');
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log(`Security check passed: scanned ${files.length} frontend source files; no privileged Supabase key references found.`);
