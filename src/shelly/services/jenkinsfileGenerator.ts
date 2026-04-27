import fs from 'fs/promises';
import path from 'path';

interface JenkinsfileVariables {
  projectName: string;
  workspace: string;
  repoName: string;
  gitUrl: string;
  s3Bucket: string;
}

export class JenkinsfileGenerator {
  /**
   * Generate Jenkinsfile from template with variable replacement
   */
  static async generateJenkinsfile(
    templatePath: string,
    outputPath: string,
    variables: JenkinsfileVariables
  ): Promise<void> {
    try {
      // Read template
      const template = await fs.readFile(templatePath, 'utf8');

      // Replace all variables
      let jenkinsfile = template;
      jenkinsfile = jenkinsfile.replace(
        /{{projectName}}/g,
        variables.projectName
      );
      jenkinsfile = jenkinsfile.replace(/{{workspace}}/g, variables.workspace);
      jenkinsfile = jenkinsfile.replace(/{{repoName}}/g, variables.repoName);
      jenkinsfile = jenkinsfile.replace(/{{gitUrl}}/g, variables.gitUrl);
      jenkinsfile = jenkinsfile.replace(/{{s3Bucket}}/g, variables.s3Bucket);

      // Write output
      await fs.writeFile(outputPath, jenkinsfile, 'utf8');
    } catch (error) {
      throw new Error(`Failed to generate Jenkinsfile: ${error.message}`);
    }
  }

  /**
   * Detect project variables from git and package.json
   */
  static async detectVariables(cwd: string): Promise<JenkinsfileVariables> {
    const packageJson = await this.readPackageJson(cwd);
    const gitUrl = await this.detectGitUrl(cwd);
    const { workspace, repoName } = this.parseGitUrl(gitUrl);

    return {
      projectName: this.extractProjectName(packageJson.name),
      workspace: workspace || 'BZ',
      repoName: repoName || this.extractProjectName(packageJson.name),
      gitUrl: gitUrl || 'bitbucket.juspay.net/scm/bz/your-project.git',
      s3Bucket: 'atoms-sdk', // Default S3 bucket for Breeze
    };
  }

  /**
   * Read package.json
   */
  static async readPackageJson(
    cwd: string
  ): Promise<{ name: string; [key: string]: unknown }> {
    try {
      const packagePath = path.join(cwd, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      return JSON.parse(content);
    } catch (_error) {
      return { name: 'my-project' };
    }
  }

  /**
   * Detect git remote URL
   */
  static async detectGitUrl(cwd: string): Promise<string> {
    try {
      const gitConfigPath = path.join(cwd, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf8');

      // Parse git config for remote URL
      const urlMatch = gitConfig.match(/url\s*=\s*(.+)/);
      if (urlMatch) {
        return urlMatch[1].trim();
      }

      return '';
    } catch (_error) {
      return '';
    }
  }

  /**
   * Parse git URL to extract workspace and repo name
   */
  static parseGitUrl(url: string): { workspace: string; repoName: string } {
    if (!url) {
      return { workspace: 'BZ', repoName: '' };
    }

    // Handle BitBucket SSH URL: git@bitbucket.juspay.net:BZ/project.git
    const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      return {
        workspace: sshMatch[1],
        repoName: sshMatch[2],
      };
    }

    // Handle BitBucket HTTPS URL: https://bitbucket.juspay.net/scm/BZ/project.git
    const httpsMatch = url.match(/\/scm\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (httpsMatch) {
      return {
        workspace: httpsMatch[1],
        repoName: httpsMatch[2],
      };
    }

    // Handle standard BitBucket URL: https://bitbucket.org/workspace/project.git
    const standardMatch = url.match(
      /bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (standardMatch) {
      return {
        workspace: standardMatch[1],
        repoName: standardMatch[2],
      };
    }

    return { workspace: 'BZ', repoName: '' };
  }

  /**
   * Extract clean project name from scoped package name
   */
  static extractProjectName(packageName: string): string {
    if (!packageName) return 'my-project';

    // Remove scope (@juspay/project-name -> project-name)
    const withoutScope = packageName.replace(/^@[^/]+\//, '');

    return withoutScope;
  }

  /**
   * Format variables for display
   */
  static formatVariablesTable(variables: JenkinsfileVariables): string {
    return `
┌─────────────────┬────────────────────────────────────────────┐
│ Variable        │ Value                                      │
├─────────────────┼────────────────────────────────────────────┤
│ Project Name    │ ${variables.projectName.padEnd(42, ' ')} │
│ Workspace       │ ${variables.workspace.padEnd(42, ' ')} │
│ Repository      │ ${variables.repoName.padEnd(42, ' ')} │
│ Git URL         │ ${this.truncate(variables.gitUrl, 42)} │
│ S3 Bucket       │ ${variables.s3Bucket.padEnd(42, ' ')} │
└─────────────────┴────────────────────────────────────────────┘
`.trim();
  }

  /**
   * Truncate long strings for display
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str.padEnd(maxLength, ' ');
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}
