import { BitbucketSetupCommand } from './bitbucketSetup.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const cwdIndex = args.indexOf('--cwd');
const cwd = cwdIndex !== -1 ? args[cwdIndex + 1] : process.cwd();

const command = new BitbucketSetupCommand({ cwd, dryRun, force });
command.execute().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
