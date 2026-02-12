#!/usr/bin/env bun

/**
 * Sync version from config.yaml to all package.json files and run.sh
 *
 * Usage:
 *   bun scripts/sync-version.ts
 */

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';

const CONFIG_PATH = 'config.yaml';
const FILES_TO_SYNC = ['package.json', 'dashboard/package.json', 'server/package.json', 'rootfs/usr/bin/run.sh'];

interface ConfigYaml {
  version: string;
  [key: string]: unknown;
}

async function readConfigVersion(): Promise<string> {
  const content = await readFile(CONFIG_PATH, 'utf-8');
  const config = parse(content) as ConfigYaml;

  if (!config.version) {
    throw new Error(`No version found in ${CONFIG_PATH}`);
  }

  return config.version;
}

async function updatePackageJson(path: string, version: string): Promise<void> {
  const content = await readFile(path, 'utf-8');
  const pkg = JSON.parse(content);

  if (pkg.version === version) {
    console.log(`✓ ${path} already at ${version}`);
    return;
  }

  pkg.version = version;
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`✓ Updated ${path}: ${version}`);
}

async function updateRunSh(path: string, version: string): Promise<void> {
  const content = await readFile(path, 'utf-8');
  const versionLineRegex = /^bashio::log\.info "Addon version: .*"$/m;
  const newLine = `bashio::log.info "Addon version: ${version}"`;

  if (content.includes(newLine)) {
    console.log(`✓ ${path} already at ${version}`);
    return;
  }

  const updated = content.replace(versionLineRegex, newLine);
  await writeFile(path, updated);
  console.log(`✓ Updated ${path}: ${version}`);
}

async function main() {
  try {
    console.log('Reading version from config.yaml...');
    const version = await readConfigVersion();
    console.log(`Source version: ${version}\n`);

    console.log('Syncing versions...');

    // Update package.json files
    await updatePackageJson('package.json', version);
    await updatePackageJson('dashboard/package.json', version);
    await updatePackageJson('server/package.json', version);

    // Update run.sh
    await updateRunSh('rootfs/usr/bin/run.sh', version);

    console.log('\n✅ All versions synced successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review changes: git diff');
    console.log("  2. Commit if needed: git add -A && git commit -m 'chore: sync versions'");
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
