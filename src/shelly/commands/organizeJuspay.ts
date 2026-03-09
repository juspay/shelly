// organizeJuspay.ts: CLI command to scaffold a Juspay-ready repo
import { BitbucketSetupCommand } from './bitbucketSetup.js';
import { JenkinsScaffoldCommand } from './jenkinsScaffold.js';
import { PackagesCommand } from './packages.js';
import { BitbucketRepoConfig } from '../services/bitbucketService.js';
import { JenkinsfileParams } from '../services/jenkinsService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyTemplate(templateName: string, destName: string) {
  const src = path.resolve(__dirname, '../templates', templateName);
  const dest = path.resolve(process.cwd(), destName);
  await fs.copyFile(src, dest);
  console.log(`✅ Scaffolded ${destName}`);
}

export class OrganizeJuspayCommand {
  bitbucketConfig: BitbucketRepoConfig;
  jenkinsParams: JenkinsfileParams;
  packageJsonPath: string;

  constructor(
    bitbucketConfig: BitbucketRepoConfig,
    jenkinsParams: JenkinsfileParams,
    packageJsonPath: string = path.resolve('package.json')
  ) {
    this.bitbucketConfig = bitbucketConfig;
    this.jenkinsParams = jenkinsParams;
    this.packageJsonPath = packageJsonPath;
  }

  async execute() {
    console.log('🚀 Shelly Juspay Repo Scaffolding');
    console.log('============================\n');

    // 1. BitBucket setup
    const bitbucketCmd = new BitbucketSetupCommand(this.bitbucketConfig);
    await bitbucketCmd.execute();

    // 2. Jenkinsfile scaffolding
    const jenkinsCmd = new JenkinsScaffoldCommand(this.jenkinsParams);
    await jenkinsCmd.execute();

    // 3. Package detection/injection
    const packagesCmd = new PackagesCommand(this.packageJsonPath);
    await packagesCmd.execute();

    // 4. Scaffold config files from templates
    await copyTemplate('.env.example.template', '.env.example');
    await copyTemplate('.eslintrc.cjs.template', '.eslintrc.cjs');
    await copyTemplate('.prettierrc.template', '.prettierrc');
    await copyTemplate('.stylelintrc.template', '.stylelintrc');
    await copyTemplate('setup.js.template', 'setup.js');
    await copyTemplate('workflow.js.template', 'workflow.js');
    await copyTemplate('knip.config.ts.template', 'knip.config.ts');
    await copyTemplate('pre-commit.sh.template', 'pre-commit.sh');
    await copyTemplate('commit-msg.sh.template', 'commit-msg.sh');
    await copyTemplate(
      'prepare-commit-msg.sh.template',
      'prepare-commit-msg.sh'
    );
    await copyTemplate('pre-push.sh.template', 'pre-push.sh');

    console.log('✅ Juspay repo scaffolding complete!');
  }
}
