import fs from 'fs/promises';
import path from 'path';

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface ProjectContext {
  hasTypeScript: boolean;
  hasReact: boolean;
  hasNode: boolean;
  hasRust: boolean;
  hasPrettier: boolean;
  hasESLint: boolean;
  hasPlaywright: boolean;
  hasJest: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn';
}

export class PackageDetector {
  /**
   * Detect Juspay-specific packages that should be installed
   */
  static detectJuspayPackages(
    packageJson: PackageJson,
    _context: ProjectContext
  ): string[] {
    const packages: string[] = [];

    // Core Breeze AI & MCP Stack (for all Breeze projects)
    if (!this.hasPackage(packageJson, '@juspay/neurolink')) {
      packages.push('@juspay/neurolink');
    }

    if (!this.hasPackage(packageJson, '@nexus2520/bitbucket-mcp-server')) {
      packages.push('@nexus2520/bitbucket-mcp-server');
    }

    return packages;
  }

  /**
   * Analyze project to determine tech stack and context
   */
  static async analyzeProject(cwd: string): Promise<ProjectContext> {
    const packageJson = await this.readPackageJson(cwd);

    const context: ProjectContext = {
      hasTypeScript: await this.checkTypeScript(cwd, packageJson),
      hasReact: this.checkReact(packageJson),
      hasNode: true, // Assuming Node.js if package.json exists
      hasRust: await this.checkRust(cwd),
      hasPrettier: this.checkPrettier(packageJson),
      hasESLint: this.checkESLint(packageJson),
      hasPlaywright: this.checkPlaywright(packageJson),
      hasJest: this.checkJest(packageJson),
      packageManager: await this.detectPackageManager(cwd),
    };

    return context;
  }

  /**
   * Read and parse package.json
   */
  static async readPackageJson(cwd: string): Promise<PackageJson> {
    try {
      const packagePath = path.join(cwd, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  /**
   * Check if project uses TypeScript
   */
  static async checkTypeScript(
    cwd: string,
    packageJson: PackageJson
  ): Promise<boolean> {
    // Check for typescript dependency
    if (this.hasPackage(packageJson, 'typescript')) {
      return true;
    }

    // Check for tsconfig.json
    try {
      await fs.access(path.join(cwd, 'tsconfig.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if project uses React
   */
  static checkReact(packageJson: PackageJson): boolean {
    return (
      this.hasPackage(packageJson, 'react') ||
      this.hasPackage(packageJson, 'next') ||
      this.hasPackage(packageJson, 'preact')
    );
  }

  /**
   * Check if project has Rust components
   */
  static async checkRust(cwd: string): Promise<boolean> {
    try {
      await fs.access(path.join(cwd, 'Cargo.toml'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if project uses Prettier
   */
  static checkPrettier(packageJson: PackageJson): boolean {
    return this.hasPackage(packageJson, 'prettier');
  }

  /**
   * Check if project uses ESLint
   */
  static checkESLint(packageJson: PackageJson): boolean {
    return this.hasPackage(packageJson, 'eslint');
  }

  /**
   * Check if project uses Playwright
   */
  static checkPlaywright(packageJson: PackageJson): boolean {
    return this.hasPackage(packageJson, '@playwright/test');
  }

  /**
   * Check if project uses Jest
   */
  static checkJest(packageJson: PackageJson): boolean {
    return this.hasPackage(packageJson, 'jest');
  }

  /**
   * Detect package manager being used
   */
  static async detectPackageManager(
    cwd: string
  ): Promise<'npm' | 'pnpm' | 'yarn'> {
    // Check for lock files
    try {
      await fs.access(path.join(cwd, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch (_e) {
      // File doesn't exist, continue checking
    }

    try {
      await fs.access(path.join(cwd, 'yarn.lock'));
      return 'yarn';
    } catch (_e) {
      // File doesn't exist, fall through to default
    }

    // Default to npm
    return 'npm';
  }

  /**
   * Check if a package exists in dependencies or devDependencies
   */
  static hasPackage(packageJson: PackageJson, packageName: string): boolean {
    return !!(
      packageJson.dependencies?.[packageName] ||
      packageJson.devDependencies?.[packageName]
    );
  }

  /**
   * Generate install command for package manager
   */
  static getInstallCommand(
    packageManager: 'npm' | 'pnpm' | 'yarn',
    packages: string[],
    isDev = true
  ): string {
    const packagesStr = packages.join(' ');

    switch (packageManager) {
      case 'pnpm':
        return `pnpm add ${isDev ? '-D' : ''} ${packagesStr}`;
      case 'yarn':
        return `yarn add ${isDev ? '-D' : ''} ${packagesStr}`;
      case 'npm':
      default:
        return `npm install ${isDev ? '--save-dev' : '--save'} ${packagesStr}`;
    }
  }

  /**
   * Get project summary for display
   */
  static formatProjectSummary(context: ProjectContext): string[] {
    const summary: string[] = [];

    if (context.hasTypeScript) summary.push('TypeScript');
    if (context.hasReact) summary.push('React');
    if (context.hasRust) summary.push('Rust');
    if (context.hasPrettier) summary.push('Prettier');
    if (context.hasESLint) summary.push('ESLint');
    if (context.hasPlaywright) summary.push('Playwright');
    if (context.hasJest) summary.push('Jest');

    return summary;
  }
}
