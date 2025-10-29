#!/usr/bin/env node

import { cpSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

const templatesSource = `${projectRoot}/src/shelly/templates`;
const templatesDestination = `${projectRoot}/dist/shelly/templates`;

console.log('📦 Copying template files...');
console.log(`   Source: ${templatesSource}`);
console.log(`   Destination: ${templatesDestination}`);

try {
  // Ensure destination directory exists
  mkdirSync(templatesDestination, { recursive: true });

  // Copy all template files recursively
  cpSync(templatesSource, templatesDestination, {
    recursive: true,
    force: true,
  });

  console.log('✅ Template files copied successfully!');
} catch (error) {
  console.error('❌ Error copying template files:', error.message);
  process.exit(1);
}
