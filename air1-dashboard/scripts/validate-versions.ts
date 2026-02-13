#!/usr/bin/env bun

/**
 * Validate all version fields match config.yaml
 *
 * Usage:
 *   bun scripts/validate-versions.ts
 *
 * Exits with code 1 if versions don't match
 */

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const CONFIG_PATH = 'config.yaml';

interface VersionCheck {
  path: string;
  expected: string;
  actual: string;
  match: boolean;
}

async function readConfigVersion(): Promise<string> {
  const content = await readFile(CONFIG_PATH, 'utf-8');
  const config = parse(content) as { version: string };
  return config.version;
}

async function checkPackageJson(path: string, expected: string): Promise<VersionCheck> {
  const content = await readFile(path, 'utf-8');
  const pkg = JSON.parse(content);

  return {
    path,
    expected,
    actual: pkg.version,
    match: pkg.version === expected,
  };
}

async function checkRunSh(path: string, expected: string): Promise<VersionCheck> {
  const content = await readFile(path, 'utf-8');
  const versionMatch = content.match(/bashio::log\.info "Addon version: (.+?)"/);
  const actual = versionMatch ? versionMatch[1] : 'NOT FOUND';

  return {
    path,
    expected,
    actual,
    match: actual === expected,
  };
}

async function main() {
  try {
    const expectedVersion = await readConfigVersion();
    console.log(`Expected version (from ${CONFIG_PATH}): ${expectedVersion}\n`);

    const checks: VersionCheck[] = [
      await checkPackageJson('package.json', expectedVersion),
      await checkPackageJson('dashboard/package.json', expectedVersion),
      await checkPackageJson('server/package.json', expectedVersion),
      await checkRunSh('rootfs/usr/bin/run.sh', expectedVersion),
    ];

    let allMatch = true;

    console.log('Version Check Results:');
    console.log('='.repeat(60));

    for (const check of checks) {
      const status = check.match ? '✓' : '✗';
      const color = check.match ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${color}${status} ${check.path.padEnd(35)} ${check.actual}${reset}`);

      if (!check.match) {
        allMatch = false;
      }
    }

    console.log('='.repeat(60));

    if (allMatch) {
      console.log('\n✅ All versions match!');
      process.exit(0);
    } else {
      console.log('\n❌ Version mismatch detected!');
      console.log('\nRun this to sync versions:');
      console.log('  bun run version:sync');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
