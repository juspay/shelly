import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rulesDir = path.join(__dirname, '..', 'rules');

export async function loadRules() {
  const rules = [];
  const files = fs.readdirSync(rulesDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const rule = await import(path.join(rulesDir, file));
      rules.push(rule);
    }
  }
  return rules;
}
