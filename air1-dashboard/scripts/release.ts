#!/usr/bin/env bun

/**
 * Release automation script
 *
 * Workflow:
 *   1. Validate all versions are synced
 *   2. Run git-cliff to determine next version
 *   3. Update config.yaml with next version
 *   4. Sync version to all files
 *   5. Generate CHANGELOG.md
 *   6. Create git commit and tag
 *   7. Push if not --dry-run
 *
 * Usage:
 *   bun scripts/release.ts [--dry-run]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { $ } from 'bun';
import { parse, stringify } from 'yaml';

const isDryRun = process.argv.includes('--dry-run');

interface ConfigYaml {
  version: string;
  [key: string]: unknown;
}

async function validateVersionsSync() {
  console.log('Validating version sync...');
  const proc = await $`bun scripts/validate-versions.ts`.quiet();

  if (proc.exitCode !== 0) {
    throw new Error('Versions are not synced. Run: bun run version:sync');
  }

  console.log('✓ Versions validated\n');
}

async function getCurrentVersion(): Promise<string> {
  const content = await readFile('config.yaml', 'utf-8');
  const config = parse(content) as ConfigYaml;
  return config.version;
}

async function getNextVersion(): Promise<string> {
  console.log('Calculating next version with git-cliff...');

  // git-cliff --bumped-version returns just the version number
  const proc = await $`git-cliff --bumped-version`.text();
  const nextVersion = proc.trim().replace(/^v/, '');

  console.log(`✓ Next version: ${nextVersion}\n`);
  return nextVersion;
}

async function updateConfigYaml(version: string) {
  console.log(`Updating config.yaml to ${version}...`);

  const content = await readFile('config.yaml', 'utf-8');
  const config = parse(content) as ConfigYaml;
  config.version = version;

  await writeFile('config.yaml', stringify(config));
  console.log('✓ config.yaml updated\n');
}

async function syncVersions() {
  console.log('Syncing versions to all files...');
  await $`bun scripts/sync-version.ts`.quiet();
  console.log('✓ Versions synced\n');
}

async function generateChangelog(version: string) {
  console.log('Generating CHANGELOG.md...');
  await $`git-cliff --tag v${version} --output CHANGELOG.md`;
  console.log('✓ CHANGELOG generated\n');
}

async function createCommitAndTag(version: string) {
  console.log('Creating git commit and tag...');

  if (isDryRun) {
    console.log('[DRY RUN] Would run:');
    console.log('  git add -A');
    console.log(`  git commit -m "chore(release): ${version}"`);
    console.log(`  git tag -a v${version} -m "Release v${version}"`);
    return;
  }

  await $`git add -A`;
  await $`git commit -m "chore(release): ${version}"`;
  await $`git tag -a v${version} -m "Release v${version}"`;

  console.log(`✓ Committed and tagged v${version}\n`);
}

async function pushChanges(version: string) {
  console.log('Pushing changes...');

  if (isDryRun) {
    console.log('[DRY RUN] Would run:');
    console.log('  git push origin main');
    console.log(`  git push origin v${version}`);
    return;
  }

  await $`git push origin main`;
  await $`git push origin v${version}`;

  console.log('✓ Changes pushed\n');
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log(isDryRun ? '🔍 RELEASE DRY RUN' : '🚀 RELEASE');
    console.log('='.repeat(60));
    console.log();

    // 1. Validate current state
    await validateVersionsSync();

    const currentVersion = await getCurrentVersion();
    console.log(`Current version: ${currentVersion}\n`);

    // 2. Calculate next version
    const nextVersion = await getNextVersion();

    if (nextVersion === currentVersion) {
      console.log('⚠️  No version bump needed (no commits to bump)');
      console.log('Current version remains:', currentVersion);
      process.exit(0);
    }

    // 3. Update config.yaml
    if (!isDryRun) {
      await updateConfigYaml(nextVersion);
      await syncVersions();
    } else {
      console.log(`[DRY RUN] Would update version: ${currentVersion} → ${nextVersion}\n`);
    }

    // 4. Generate changelog
    if (!isDryRun) {
      await generateChangelog(nextVersion);
    } else {
      console.log('[DRY RUN] Would generate CHANGELOG.md\n');
    }

    // 5. Commit and tag
    await createCommitAndTag(nextVersion);

    // 6. Push
    await pushChanges(nextVersion);

    console.log('='.repeat(60));
    console.log(isDryRun ? '✅ DRY RUN COMPLETE' : '✅ RELEASE COMPLETE');
    console.log('='.repeat(60));
    console.log();
    console.log(`Version: ${nextVersion}`);
    console.log(`Tag: v${nextVersion}`);

    if (isDryRun) {
      console.log('\nRun without --dry-run to actually release');
    }
  } catch (error) {
    console.error('❌ Release failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
