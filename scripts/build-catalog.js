#!/usr/bin/env node
'use strict';
/*
 * Regenerates catalog.json from the app files in this repository.
 *
 * Any *.html/*.htm file (anywhere in the repo, except .git/.github/
 * node_modules/scripts) whose content starts with a manifest comment
 * of the form:
 *
 *   <!--GUIOS-APP {"id":"...", "name":"...", ...}-->
 *   <!--N5-APP    {"id":"...", "name":"...", ...}-->
 *
 * is treated as an installable app. catalog.json is the index that the
 * GUIOS app store (GUIOS/index.html's RemoteCatalog module, and Nebula
 * 5 Gate's Catalog module) fetches at:
 *
 *   https://raw.githubusercontent.com/prak59459-create/GUIOSappstore/main/catalog.json
 *
 * and each entry's "url" points straight at the app's own raw .html
 * file on the same branch, so installing it is just downloading that
 * file into the OS's sandbox -- no separate packaging step.
 *
 * Usage:  node scripts/build-catalog.js
 * Also run automatically by .github/workflows/build-catalog.yml on
 * every push that touches an .html file.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RAW_BASE = 'https://raw.githubusercontent.com/prak59459-create/GUIOSappstore/main/';
const OUT_FILE = path.join(ROOT, 'catalog.json');
const IGNORE_DIRS = new Set(['.git', '.github', 'node_modules', 'scripts']);
const MANIFEST_RE = /^\uFEFF?\s*<!--\s*(?:GUIOS|N5)-APP\s*([\s\S]*?)-->/;

function isHexColor(v) { return /^#[0-9a-fA-F]{3,8}$/.test(String(v || '')); }
function slugify(s) {
  const b = String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return b || 'app';
}

function findHtmlFiles(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      findHtmlFiles(full, out);
    } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function readManifest(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(MANIFEST_RE);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return (data && typeof data === 'object') ? data : null;
  } catch (err) {
    console.warn('[build-catalog] skip ' + path.relative(ROOT, file) + ': invalid manifest JSON (' + err.message + ')');
    return null;
  }
}

function buildEntry(file, manifest) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const id = slugify(manifest.id || path.basename(file, path.extname(file)));
  return {
    id: id,
    name: String(manifest.name || id).slice(0, 40),
    version: String(manifest.version || '1.0.0').slice(0, 20),
    icon: String(manifest.icon || '▣').slice(0, 4),
    color: isHexColor(manifest.color) ? manifest.color : '#6b769a',
    description: String(manifest.description || '').slice(0, 140),
    author: String(manifest.author || '不明').slice(0, 40),
    url: RAW_BASE + rel
  };
}

function main() {
  const files = findHtmlFiles(ROOT).sort();
  const seen = new Map();
  const entries = [];
  const skipped = [];

  for (const file of files) {
    const manifest = readManifest(file);
    if (!manifest) { skipped.push(path.relative(ROOT, file)); continue; }
    const entry = buildEntry(file, manifest);
    if (seen.has(entry.id)) {
      console.warn('[build-catalog] duplicate app id "' + entry.id + '" in ' + path.relative(ROOT, file) +
        ' (already used by ' + seen.get(entry.id) + '); keeping the first one');
      continue;
    }
    seen.set(entry.id, path.relative(ROOT, file));
    entries.push(entry);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));

  const json = JSON.stringify(entries, null, 2) + '\n';
  const prev = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;

  if (prev === json) {
    console.log('[build-catalog] catalog.json already up to date (' + entries.length + ' app(s))');
    return;
  }
  fs.writeFileSync(OUT_FILE, json, 'utf8');
  console.log('[build-catalog] wrote catalog.json with ' + entries.length + ' app(s)' +
    (skipped.length ? ', skipped ' + skipped.length + ' non-app html file(s): ' + skipped.join(', ') : ''));
}

main();
