#!/usr/bin/env node
// Copies the two single-source-of-truth folders that live OUTSIDE Frontend/
// into the places Angular actually serves from:
//
//   design/photos/*.jpg  -> Frontend/public/img/
//   jsons/landing/*.json -> Frontend/public/mock/landing/
//
// Both public/img and public/mock are generated artifacts (see .gitignore) —
// never edit the copies, only their sources. Safe to run repeatedly.

import { existsSync } from 'node:fs';
import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> Frontend/ -> project root
const projectRoot = join(scriptDir, '..', '..');

const jobs = [
  {
    label: 'photos',
    sourceDir: join(projectRoot, 'design', 'photos'),
    targetDir: join(scriptDir, '..', 'public', 'img'),
    extension: '.jpg',
  },
  {
    label: 'landing mocks',
    sourceDir: join(projectRoot, 'jsons', 'landing'),
    targetDir: join(scriptDir, '..', 'public', 'mock', 'landing'),
    extension: '.json',
  },
];

async function runJob({ label, sourceDir, targetDir, extension }) {
  if (!existsSync(sourceDir)) {
    console.error(`sync-assets: source folder for ${label} does not exist: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === extension)
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    console.warn(`sync-assets: no ${extension} files found in ${sourceDir}`);
  }

  await mkdir(targetDir, { recursive: true });

  for (const fileName of files) {
    await copyFile(join(sourceDir, fileName), join(targetDir, fileName));
    console.log(`sync-assets: copied ${label} -> ${fileName}`);
  }

  console.log(`sync-assets: ${files.length} ${label} synced to ${targetDir}`);
}

for (const job of jobs) {
  await runJob(job);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
