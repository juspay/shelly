import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import type { Platform } from './platformDetector.js';

interface PackageInfo {
  name: string;
  version: string;
  isPublic: boolean;
  isScoped: boolean;
  scope?: string;
}

interface WorkflowInfo {
  path: string;
  filename: string;
  hasIdTokenPermission: boolean;
  hasNpmTokenSecret: boolean;
  publishCommands: string[];
  usesSemanticRelease?: boolean;
  hasProvenanceConfig?: boolean;
  // Bitbucket-specific
  hasOidcEnabled?: boolean;
  hasBitbucketOidcToken?: boolean;
}

interface TrustedPublishingConfig {
  owner: string;
  repo: string;
  workflowFilename: string;
  environment?: string;
  platform?: Platform;
}

interface GitRepoInfo {
  owner: string;
  repo: string;
  platform: Platform;
}

export class NpmService {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Get npm version
   */
  async getNpmVersion(): Promise<string> {
    try {
      const version = execSync('npm --version', {
        encoding: 'utf8',
        cwd: this.cwd,
      }).trim();
      return version;
    } catch {
      throw new Error('npm is not installed or not accessible');
    }
  }

  /**
   * Check if npm version supports trusted publishing (>= 11.5)
   */
  async checkNpmVersionSupport(): Promise<{
    supported: boolean;
    version: string;
    minRequired: string;
  }> {
    const version = await this.getNpmVersion();
    const [major, minor] = version.split('.').map(Number);
    const supported = major > 11 || (major === 11 && minor >= 5);

    return {
      supported,
      version,
      minRequired: '11.5.0',
    };
  }

  /**
   * Get package.json information
   */
  async getPackageInfo(): Promise<PackageInfo | null> {
    try {
      const packagePath = path.join(this.cwd, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(content);

      const isScoped = pkg.name?.startsWith('@');
      const scope = isScoped ? pkg.name.split('/')[0] : undefined;

      return {
        name: pkg.name,
        version: pkg.version,
        isPublic: !pkg.private,
        isScoped,
        scope,
      };
    } catch {
      return null;
    }
  }

  /**
   * Find workflow files (GitHub Actions or Bitbucket Pipelines)
   */
  async findWorkflowFiles(): Promise<string[]> {
    const files: string[] = [];

    // Check for GitHub Actions workflows
    const githubWorkflowsDir = path.join(this.cwd, '.github', 'workflows');
    try {
      const githubFiles = await fs.readdir(githubWorkflowsDir);
      files.push(
        ...githubFiles
          .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
          .map((f) => path.join(githubWorkflowsDir, f))
      );
    } catch {
      // Directory doesn't exist
    }

    // Check for Bitbucket Pipelines
    const bitbucketPipeline = path.join(this.cwd, 'bitbucket-pipelines.yml');
    try {
      await fs.access(bitbucketPipeline);
      files.push(bitbucketPipeline);
    } catch {
      // File doesn't exist
    }

    return files;
  }

  /**
   * Analyze a workflow file for npm publishing configuration
   * Supports both GitHub Actions and Bitbucket Pipelines
   */
  async analyzeWorkflow(workflowPath: string): Promise<WorkflowInfo> {
    const content = await fs.readFile(workflowPath, 'utf8');
    const filename = path.basename(workflowPath);
    const isBitbucket = filename === 'bitbucket-pipelines.yml';

    if (isBitbucket) {
      return this.analyzeBitbucketPipeline(workflowPath, content);
    }

    // GitHub Actions analysis
    // Check for id-token: write permission
    const hasIdTokenPermission =
      /permissions:\s*[\s\S]*?id-token:\s*write/i.test(content) ||
      /id-token:\s*write/i.test(content);

    // Check for NPM_TOKEN secret usage (not commented out)
    const hasNpmTokenSecret =
      /^[^#]*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/im.test(content) ||
      /^[^#]*NODE_AUTH_TOKEN.*secrets\.NPM_TOKEN/im.test(content);

    // Check for semantic-release usage
    const usesSemanticRelease =
      /semantic-release/i.test(content) || /npx\s+semantic-release/i.test(content);

    // Check for NPM_CONFIG_PROVENANCE
    const hasProvenanceConfig = /NPM_CONFIG_PROVENANCE:\s*true/i.test(content);

    // Find npm publish commands
    const publishCommands: string[] = [];
    const publishMatches = content.match(/npm\s+publish[^\n]*/g);
    if (publishMatches) {
      publishCommands.push(...publishMatches);
    }

    // If using semantic-release, add it as a "publish command" for display
    if (usesSemanticRelease) {
      publishCommands.push('npx semantic-release (uses @semantic-release/npm)');
    }

    return {
      path: workflowPath,
      filename,
      hasIdTokenPermission,
      hasNpmTokenSecret,
      publishCommands,
      usesSemanticRelease,
      hasProvenanceConfig,
    };
  }

  /**
   * Analyze Bitbucket Pipelines configuration
   */
  private analyzeBitbucketPipeline(
    workflowPath: string,
    content: string
  ): WorkflowInfo {
    const filename = path.basename(workflowPath);

    // Check for oidc: true in any step
    const hasOidcEnabled = /oidc:\s*true/i.test(content);

    // Check for BITBUCKET_STEP_OIDC_TOKEN usage
    const hasBitbucketOidcToken = /BITBUCKET_STEP_OIDC_TOKEN/i.test(content);

    // Check for NPM_TOKEN usage (traditional auth)
    const hasNpmTokenSecret = /\$\{?NPM_TOKEN\}?/i.test(content);

    // Check for provenance
    const hasProvenanceConfig =
      /--provenance/i.test(content) ||
      /NPM_CONFIG_PROVENANCE:\s*true/i.test(content);

    // Find npm publish commands
    const publishCommands: string[] = [];
    const publishMatches = content.match(/npm\s+publish[^\n]*/g);
    if (publishMatches) {
      publishCommands.push(...publishMatches);
    }

    return {
      path: workflowPath,
      filename,
      hasIdTokenPermission: hasOidcEnabled,
      hasNpmTokenSecret,
      publishCommands,
      hasProvenanceConfig,
      hasOidcEnabled,
      hasBitbucketOidcToken,
    };
  }

  /**
   * Find the release/publish workflow
   * Supports both GitHub Actions and Bitbucket Pipelines
   */
  async findReleaseWorkflow(): Promise<WorkflowInfo | null> {
    const workflowFiles = await this.findWorkflowFiles();

    // Check for Bitbucket Pipelines first (single file)
    const bitbucketPipeline = workflowFiles.find(
      (f) => path.basename(f) === 'bitbucket-pipelines.yml'
    );
    if (bitbucketPipeline) {
      const info = await this.analyzeWorkflow(bitbucketPipeline);
      if (info.publishCommands.length > 0) {
        return info;
      }
    }

    // Priority order for finding GitHub release workflow
    const priorityNames = [
      'release.yml',
      'release.yaml',
      'publish.yml',
      'publish.yaml',
      'npm-publish.yml',
      'npm-publish.yaml',
      'ci.yml',
      'ci.yaml',
    ];

    // Filter to only GitHub workflow files
    const githubWorkflows = workflowFiles.filter(
      (f) => path.basename(f) !== 'bitbucket-pipelines.yml'
    );

    // First, check for workflows with publish commands
    const workflowsWithPublish: WorkflowInfo[] = [];

    for (const file of githubWorkflows) {
      const info = await this.analyzeWorkflow(file);
      if (info.publishCommands.length > 0) {
        workflowsWithPublish.push(info);
      }
    }

    // If we found workflows with publish commands, return the highest priority one
    if (workflowsWithPublish.length > 0) {
      for (const name of priorityNames) {
        const match = workflowsWithPublish.find((w) => w.filename === name);
        if (match) return match;
      }
      // Return the first one found if no priority match
      return workflowsWithPublish[0];
    }

    // Fallback: check for files by name even without publish commands
    for (const name of priorityNames) {
      const file = githubWorkflows.find((f) => path.basename(f) === name);
      if (file) {
        return await this.analyzeWorkflow(file);
      }
    }

    // Fallback to Bitbucket pipeline even without publish commands
    if (bitbucketPipeline) {
      return await this.analyzeWorkflow(bitbucketPipeline);
    }

    return null;
  }

  /**
   * Update workflow file with OIDC permissions
   * Supports both GitHub Actions and Bitbucket Pipelines
   */
  async updateWorkflowForOIDC(workflowPath: string): Promise<{
    updated: boolean;
    changes: string[];
  }> {
    const filename = path.basename(workflowPath);

    if (filename === 'bitbucket-pipelines.yml') {
      return this.updateBitbucketPipelineForOIDC(workflowPath);
    }

    return this.updateGitHubWorkflowForOIDC(workflowPath);
  }

  /**
   * Update GitHub Actions workflow for OIDC
   */
  private async updateGitHubWorkflowForOIDC(workflowPath: string): Promise<{
    updated: boolean;
    changes: string[];
  }> {
    let content = await fs.readFile(workflowPath, 'utf8');
    const changes: string[] = [];
    let updated = false;

    // Check if using semantic-release
    const usesSemanticRelease =
      /semantic-release/i.test(content) || /npx\s+semantic-release/i.test(content);

    // Add id-token permission if missing
    if (!/id-token:\s*write/i.test(content)) {
      // Check if there's already a permissions block
      if (/^permissions:/m.test(content)) {
        // Add id-token to existing permissions block
        content = content.replace(
          /^(permissions:)/m,
          'permissions:\n  id-token: write'
        );
        changes.push('Added id-token: write to existing permissions block');
      } else {
        // Add new permissions block after 'on:' block
        const onBlockMatch = content.match(/^on:[\s\S]*?(?=\n[a-z])/m);
        if (onBlockMatch) {
          const insertPosition =
            (onBlockMatch.index || 0) + onBlockMatch[0].length;
          content =
            content.slice(0, insertPosition) +
            '\n\npermissions:\n  id-token: write\n  contents: read' +
            content.slice(insertPosition);
          changes.push('Added permissions block with id-token: write');
        }
      }
      updated = true;
    }

    // For semantic-release: Add NPM_CONFIG_PROVENANCE environment variable
    if (usesSemanticRelease && !/NPM_CONFIG_PROVENANCE:\s*true/i.test(content)) {
      // Find env block near semantic-release and detect its indentation
      // Match pattern: env:\n          KEY: value
      const envBlockMatch = content.match(
        /(env:\s*\n)(\s+)(\w+_TOKEN:\s*\$\{\{[^}]+\}\})/i
      );
      if (envBlockMatch && envBlockMatch.index !== undefined) {
        // Insert after "env:\n" with the same indentation as existing env vars
        const insertPoint = envBlockMatch.index + envBlockMatch[1].length;
        const indent = envBlockMatch[2]; // Use same indentation as existing env vars
        content =
          content.slice(0, insertPoint) +
          `${indent}NPM_CONFIG_PROVENANCE: true\n` +
          content.slice(insertPoint);
        changes.push(
          'Added NPM_CONFIG_PROVENANCE: true for semantic-release provenance'
        );
        updated = true;
      }
    }

    // Update npm publish commands to include --provenance if missing
    if (
      content.includes('npm publish') &&
      !content.includes('--provenance')
    ) {
      content = content.replace(
        /npm\s+publish(?!\s+--provenance)/g,
        'npm publish --provenance'
      );
      changes.push('Added --provenance flag to npm publish commands');
      updated = true;
    }

    // Comment out NODE_AUTH_TOKEN if present (not already commented)
    if (/^[^#]*NODE_AUTH_TOKEN.*secrets\.NPM_TOKEN/im.test(content)) {
      content = content.replace(
        /^(\s*)(NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\})/gim,
        '$1# $2  # Removed: Using OIDC trusted publishing instead'
      );
      changes.push(
        'Commented out NODE_AUTH_TOKEN (OIDC replaces token-based auth)'
      );
      updated = true;
    }

    if (updated) {
      await fs.writeFile(workflowPath, content, 'utf8');
    }

    return { updated, changes };
  }

  /**
   * Update Bitbucket Pipelines for OIDC
   */
  private async updateBitbucketPipelineForOIDC(workflowPath: string): Promise<{
    updated: boolean;
    changes: string[];
  }> {
    let content = await fs.readFile(workflowPath, 'utf8');
    const changes: string[] = [];
    let updated = false;

    // Find publish step and add oidc: true if missing
    if (!content.includes('oidc: true')) {
      // Look for npm publish command and add oidc: true to its step
      const publishStepMatch = content.match(
        /(-\s*step:[\s\S]*?name:\s*[^\n]*[Pp]ublish[^\n]*\n)/
      );
      if (publishStepMatch && publishStepMatch.index !== undefined) {
        const insertPoint =
          publishStepMatch.index + publishStepMatch[0].length;
        // Detect indentation
        const indentMatch = publishStepMatch[0].match(/^(\s*)-\s*step:/m);
        const baseIndent = indentMatch ? indentMatch[1] : '      ';
        content =
          content.slice(0, insertPoint) +
          `${baseIndent}  oidc: true\n` +
          content.slice(insertPoint);
        changes.push('Added oidc: true to publish step');
        updated = true;
      }
    }

    // Replace NPM_TOKEN with BITBUCKET_STEP_OIDC_TOKEN
    if (
      content.includes('NPM_TOKEN') &&
      !content.includes('BITBUCKET_STEP_OIDC_TOKEN')
    ) {
      content = content.replace(
        /\$\{?NPM_TOKEN\}?/g,
        '${BITBUCKET_STEP_OIDC_TOKEN}'
      );
      changes.push('Replaced NPM_TOKEN with BITBUCKET_STEP_OIDC_TOKEN');
      updated = true;
    }

    // Add --provenance flag to npm publish if missing
    if (
      content.includes('npm publish') &&
      !content.includes('--provenance')
    ) {
      content = content.replace(
        /npm\s+publish(?!\s+--provenance)/g,
        'npm publish --provenance'
      );
      changes.push('Added --provenance flag to npm publish commands');
      updated = true;
    }

    if (updated) {
      await fs.writeFile(workflowPath, content, 'utf8');
    }

    return { updated, changes };
  }

  /**
   * Generate the npm trusted publishing setup URL
   */
  generateSetupUrl(packageName: string): string {
    // For scoped packages like @juspay/shelly, don't encode the @ and /
    // npm expects: /package/@scope/name not /package/%40scope%2Fname
    return `https://www.npmjs.com/package/${packageName}/access`;
  }

  /**
   * Generate setup instructions for npm trusted publishing
   */
  generateSetupInstructions(
    packageName: string,
    config: TrustedPublishingConfig
  ): string {
    return `
📦 NPM Trusted Publishing Setup Instructions
=============================================

Package: ${packageName}
Repository: ${config.owner}/${config.repo}
Workflow: ${config.workflowFilename}

🔧 Step 1: Configure Trusted Publisher on npmjs.com
---------------------------------------------------
1. Go to: https://www.npmjs.com/package/${packageName}/access
2. Scroll to "Trusted Publisher" section
3. Click "GitHub Actions" button
4. Fill in the form:
   • Organization/User: ${config.owner}
   • Repository: ${config.repo}
   • Workflow filename: ${config.workflowFilename}
   • Environment: ${config.environment || '(leave empty)'}
5. Click "Set up connection"

🔒 Step 2: Verify Workflow Configuration
----------------------------------------
Your workflow should have:
   permissions:
     id-token: write
     contents: read

And publish with:
   npm publish --provenance

🗑️  Step 3: Clean Up (Optional)
-------------------------------
You can now safely remove the NPM_TOKEN secret from:
https://github.com/${config.owner}/${config.repo}/settings/secrets/actions

✅ Step 4: Test
---------------
Trigger your release workflow and verify:
• Package publishes successfully
• Green checkmark appears on npm package page
• Provenance badge is visible

📖 Documentation
----------------
• npm Trusted Publishing: https://docs.npmjs.com/trusted-publishers
• GitHub OIDC: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
`;
  }

  /**
   * Get the npm package access URL
   */
  getPackageAccessUrl(packageName: string): string {
    // For scoped packages like @juspay/shelly, don't encode the @ and /
    // npm expects: /package/@scope/name not /package/%40scope%2Fname
    return `https://www.npmjs.com/package/${packageName}/access`;
  }

  /**
   * Get compact config values for display/clipboard
   */
  getConfigValues(config: TrustedPublishingConfig): {
    owner: string;
    repo: string;
    workflow: string;
    environment: string;
  } {
    return {
      owner: config.owner,
      repo: config.repo,
      workflow: config.workflowFilename,
      environment: config.environment || '',
    };
  }

  /**
   * Check if package exists on npm registry
   */
  async checkPackageExists(packageName: string): Promise<boolean> {
    try {
      execSync(`npm view ${packageName} version`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository info from git config
   * Supports both GitHub and Bitbucket
   */
  async getGitRepoInfo(): Promise<GitRepoInfo | null> {
    try {
      const gitConfigPath = path.join(this.cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      // Extract remote origin URL
      const urlMatch = gitConfig.match(
        /\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/
      );
      if (!urlMatch) return null;

      const url = urlMatch[1].trim();

      // Parse GitHub URL (handles URLs with or without embedded credentials)
      // HTTPS: https://github.com/owner/repo.git or https://user:token@github.com/owner/repo.git
      const githubHttpsMatch = url.match(
        /https:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (githubHttpsMatch) {
        return {
          owner: githubHttpsMatch[1],
          repo: githubHttpsMatch[2],
          platform: 'github',
        };
      }

      // SSH: git@github.com:owner/repo.git
      const githubSshMatch = url.match(
        /git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (githubSshMatch) {
        return {
          owner: githubSshMatch[1],
          repo: githubSshMatch[2],
          platform: 'github',
        };
      }

      // Bitbucket HTTPS: https://bitbucket.org/workspace/repo.git
      const bitbucketHttpsMatch = url.match(
        /https:\/\/(?:[^@]+@)?bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (bitbucketHttpsMatch) {
        return {
          owner: bitbucketHttpsMatch[1],
          repo: bitbucketHttpsMatch[2],
          platform: 'bitbucket',
        };
      }

      // Bitbucket SSH: git@bitbucket.org:workspace/repo.git
      const bitbucketSshMatch = url.match(
        /git@bitbucket\.org:([^/]+)\/([^/]+?)(?:\.git)?$/
      );
      if (bitbucketSshMatch) {
        return {
          owner: bitbucketSshMatch[1],
          repo: bitbucketSshMatch[2],
          platform: 'bitbucket',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get platform-specific secrets URL
   */
  getSecretsUrl(owner: string, repo: string, platform: Platform): string {
    if (platform === 'bitbucket') {
      return `https://bitbucket.org/${owner}/${repo}/admin/pipelines/repository-variables`;
    }
    return `https://github.com/${owner}/${repo}/settings/secrets/actions`;
  }

  /**
   * Generate platform-aware setup instructions
   */
  generatePlatformSetupInstructions(
    packageName: string,
    config: TrustedPublishingConfig
  ): string {
    const platform = config.platform || 'github';

    if (platform === 'bitbucket') {
      return this.generateBitbucketSetupInstructions(packageName, config);
    }

    return this.generateSetupInstructions(packageName, config);
  }

  /**
   * Generate Bitbucket-specific setup instructions
   */
  private generateBitbucketSetupInstructions(
    packageName: string,
    config: TrustedPublishingConfig
  ): string {
    return `
📦 NPM Trusted Publishing Setup Instructions (Bitbucket)
=========================================================

Package: ${packageName}
Repository: ${config.owner}/${config.repo}
Pipeline: bitbucket-pipelines.yml

🔧 Step 1: Configure Trusted Publisher on npmjs.com
---------------------------------------------------
1. Go to: https://www.npmjs.com/package/${packageName}/access
2. Scroll to "Trusted Publisher" section
3. Click "Bitbucket Pipelines" button
4. Fill in the form:
   • Workspace: ${config.owner}
   • Repository: ${config.repo}
   • Pipeline UUID: (get from Bitbucket repository settings)
   • Environment: ${config.environment || '(leave empty)'}
5. Click "Set up connection"

🔒 Step 2: Verify Pipeline Configuration
-----------------------------------------
Your pipeline should have in the publish step:
   oidc: true

And use the OIDC token:
   npm config set //registry.npmjs.org/:_authToken "\${BITBUCKET_STEP_OIDC_TOKEN}"
   npm publish --provenance --access public

🗑️  Step 3: Clean Up (Optional)
-------------------------------
You can now safely remove the NPM_TOKEN variable from:
https://bitbucket.org/${config.owner}/${config.repo}/admin/pipelines/repository-variables

✅ Step 4: Test
---------------
Trigger a release by pushing a version tag:
• git tag v1.0.0
• git push origin v1.0.0

📖 Documentation
----------------
• npm Trusted Publishing: https://docs.npmjs.com/trusted-publishers
• Bitbucket OIDC: https://support.atlassian.com/bitbucket-cloud/docs/deploy-with-oidc/
`;
  }
}
