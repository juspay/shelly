#!/usr/bin/env node
/**
 * Fixes node-pty spawn-helper permissions after installation.
 *
 * This script addresses an issue where pnpm (and sometimes npm) doesn't preserve
 * executable permissions on native binaries. The spawn-helper binary in node-pty
 * needs to be executable, otherwise posix_spawnp fails on macOS/Linux.
 */

import { chmod, access, constants } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fixPermissions() {
  // Skip on Windows - not affected by this issue
  if (platform() === 'win32') {
    return;
  }

  const currentPlatform = platform();
  const currentArch = arch();
  const prebuildDir = `${currentPlatform}-${currentArch}`;

  // Possible locations where node-pty might be installed
  const possiblePaths = [
    // pnpm with different versions
    resolve(
      __dirname,
      '../node_modules/.pnpm/node-pty@0.10.1/node_modules/node-pty/prebuilds',
      prebuildDir,
      'spawn-helper'
    ),
    resolve(
      __dirname,
      '../node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds',
      prebuildDir,
      'spawn-helper'
    ),
    // npm/yarn standard location
    resolve(
      __dirname,
      '../node_modules/node-pty/prebuilds',
      prebuildDir,
      'spawn-helper'
    ),
    // pnpm hoisted
    resolve(
      __dirname,
      '../../node_modules/node-pty/prebuilds',
      prebuildDir,
      'spawn-helper'
    ),
  ];

  for (const helperPath of possiblePaths) {
    try {
      // Check if file exists
      await access(helperPath, constants.F_OK);

      // Check if already executable
      try {
        await access(helperPath, constants.X_OK);
        console.log(
          `[fix-node-pty] spawn-helper already executable: ${helperPath}`
        );
        return;
      } catch {
        // Not executable, fix it
        await chmod(helperPath, 0o755);
        console.log(
          `[fix-node-pty] Fixed spawn-helper permissions: ${helperPath}`
        );
        return;
      }
    } catch {
      // File doesn't exist at this path, try next
      continue;
    }
  }

  // If we get here, we couldn't find spawn-helper - this might be okay
  // (e.g., running on a platform without prebuilds)
  console.log(
    `[fix-node-pty] spawn-helper not found for ${prebuildDir} - this may be expected`
  );
}

fixPermissions().catch((err) => {
  console.error('[fix-node-pty] Error fixing permissions:', err.message);
  // Don't fail the install - the user might not need node-pty functionality
  process.exit(0);
});
