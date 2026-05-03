import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIContentGenerator } from '../utils/aiContentGenerator.js';
import { memoryBankService } from '../services/memoryBankService.js';
import { PackageDetector } from '../services/packageDetector.js';
import { JenkinsfileGenerator } from '../services/jenkinsfileGenerator.js';
import { BreezeDetector } from '../services/breezeDetector.js';
import inquirer from 'inquirer';
import {
  SetupTier,
  getTierDisplayName,
  getTierDescription,
} from '../config/setupTiers.js';
import {
  shouldIncludeDirectory,
  shouldIncludeMemoryBank,
} from '../utils/tierFilters.js';
import { shouldIncludeFileByTier } from '../utils/fileTiers.js';

interface OrganizeOptions {
  force?: boolean;
  update?: boolean;
  move?: boolean;
  cwd?: string;
  githubAction?: boolean;
  ciSystem?: 'github' | 'jenkins';
  skipMcp?: boolean;
  platform?: 'github' | 'bitbucket';
  setupTier?: SetupTier;
}

interface ClassificationRule {
  extensions?: string[];
  patterns?: RegExp[];
  exclude?: string[];
}

interface ClassificationRules {
  [category: string]: ClassificationRule;
}

interface RedundancyRules {
  duplicates: [string, string][];
  commandEquivalents: Record<string, string[]>;
  complexRedundants: string[];
}

interface ESLintConfig {
  env?: Record<string, boolean>;
  extends?: string[];
  parserOptions?: {
    ecmaVersion?: string | number;
    sourceType?: 'script' | 'module';
  };
  parser?: string;
  plugins?: string[];
  rules?: Record<string, unknown>;
}

export class OrganizeCommand {
  force: boolean;
  update: boolean;
  move: boolean;
  githubAction: boolean;
  ciSystem: 'github' | 'jenkins';
  platform: 'github' | 'bitbucket';
  platformExplicit: boolean;
  workspace: string;
  skipMcp: boolean;
  preserveDocs: boolean;
  preserveTests: boolean;
  setupTier: SetupTier;
  cwd: string;
  aiGenerator: AIContentGenerator;
  templatesDir: string;

  constructor(options: OrganizeOptions = {}) {
    this.force = options.force || false;
    this.update = options.update || false;
    this.move = options.move || false;
    this.githubAction = options.githubAction || false;
    this.ciSystem = options.ciSystem || 'github';
    this.platform = options.platform || 'github';
    this.platformExplicit = !!options.platform;
    this.workspace = 'juspay';
    this.skipMcp = options.skipMcp || false;
    this.setupTier = options.setupTier || 'standard';

    // Initialize preservation flags
    this.preserveDocs = false;
    this.preserveTests = false;

    // Handle directory access safely
    try {
      this.cwd = options.cwd || process.cwd();
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'EPERM' || nodeError.code === 'ENOENT') {
        throw new Error(
          `❌ Cannot access current directory: ${nodeError.message}\n\n` +
            `💡 Solutions:\n` +
            `   1. Use: shelly organize --directory /path/to/your/project\n` +
            `   2. Navigate to a directory you have access to\n` +
            `   3. Check directory permissions\n\n` +
            `📁 Current directory issue: ${nodeError.code === 'EPERM' ? 'Permission denied' : 'Directory not found'}`
        );
      }
      throw error;
    }

    this.aiGenerator = new AIContentGenerator();

    // Calculate templates directory - works for both dev (src/) and prod (dist/)
    const currentDir = path.dirname(fileURLToPath(import.meta.url));

    // In production, compiled files are in dist/shelly/commands/
    // Templates should be in dist/shelly/templates/
    // In development, source files are in src/shelly/commands/
    // Templates are in src/shelly/templates/
    this.templatesDir = path.join(currentDir, '../templates');
  }

  /**
   * Main organize command execution
   */
  async execute() {
    const tierName = getTierDisplayName(this.setupTier);
    console.log(`🚀 Starting repository organization (${tierName} tier)...`);

    try {
      // Step 0: Detect platform (explicit flag → auto-detect from remote → ask user)
      this.platform = await this.detectPlatform();
      if (this.platform === 'bitbucket') {
        this.ciSystem = 'jenkins';
      }
      // Always detect workspace from git remote (even when --platform flag was given)
      if (this.workspace === 'juspay') {
        try {
          const gitInfo = await BreezeDetector.detectGitRemote(this.cwd);
          if (gitInfo?.workspace)
            this.workspace = gitInfo.workspace.toLowerCase();
        } catch {
          // no git remote — use default workspace
        }
      }
      console.log(
        `🌐 Platform: ${this.platform === 'bitbucket' ? 'Bitbucket (Jenkins CI)' : 'GitHub'}`
      );

      // Step 1: Analyze current repository and set preservation flags
      const repoAnalysis = await this.analyzeRepository();
      await this.setPreservationFlags();
      console.log(`📊 Analyzed repository: ${repoAnalysis.name}`);

      // Step 2: Create directory structure
      await this.createDirectoryStructure(repoAnalysis);
      console.log('📁 Created standard directory structure');

      // Step 2.5: Move misplaced files (if --move flag is used)
      await this.moveMisplacedFiles(repoAnalysis);

      // Step 3: Enhance package.json
      await this.enhancePackageJson(repoAnalysis);
      console.log('📦 Enhanced package.json');

      // Step 4: Create/enhance project files
      await this.createProjectFiles(repoAnalysis);
      console.log('📝 Created/enhanced project files');

      // Step 5: Create CI/CD + platform-specific templates
      if (this.platform === 'bitbucket') {
        await this.createJenkinsfile(repoAnalysis);
        console.log('🔧 Created Jenkinsfile for Jenkins CI');
        await this.copyBitbucketTemplates(repoAnalysis);
        console.log('🪝 Created Bitbucket git hooks and commitlint');
      } else {
        await this.createGitHubTemplates(repoAnalysis);
        console.log('🔧 Created GitHub templates and workflows');
      }

      // Step 5.5: Detect and recommend Juspay packages
      await this.detectAndRecommendPackages(repoAnalysis);

      // Step 5.6: Setup Breeze AI & MCP (if applicable)
      await this.setupBreezeMCP(repoAnalysis);

      // Step 6: Create configuration files
      await this.createConfigFiles(repoAnalysis);
      console.log('⚙️ Created configuration files');

      // Step 7: Initialize Memory Bank (Complete tier only)
      if (shouldIncludeMemoryBank(this.setupTier)) {
        await this.initializeMemoryBank(repoAnalysis);
        console.log('🧠 Initialized Memory Bank');
      }

      console.log('✅ Repository organization complete!');

      // Show summary
      this.showSummary(repoAnalysis);
    } catch (error) {
      console.error('❌ Error during organization:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze the current repository
   */
  async analyzeRepository() {
    const packageJsonPath = path.join(this.cwd, 'package.json');

    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Extract repository name
      const repoName = this.extractRepoName(packageJson);

      // Determine repository type
      const repoType = this.determineRepoType(packageJson);

      return {
        ...packageJson,
        repoName,
        repoType,
        hasExistingFiles: await this.checkExistingFiles(),
      };
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  /**
   * Extract repository name from package.json or directory
   */
  extractRepoName(packageJson) {
    if (packageJson.name) {
      // Remove @juspay/ prefix if present
      return packageJson.name.replace('@juspay/', '');
    }

    // Fall back to directory name
    return path.basename(this.cwd);
  }

  /**
   * Determine repository type based on dependencies
   */
  determineRepoType(packageJson) {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps.react) return 'React Application';
    if (deps.vue) return 'Vue Application';
    if (deps.angular) return 'Angular Application';
    if (deps.express) return 'Express API';
    if (deps.typescript) return 'TypeScript Project';
    if (deps['@juspay/neurolink']) return 'Neurolink Project';

    return 'Node.js Project';
  }

  /**
   * Set preservation flags based on existing directories
   */
  async setPreservationFlags() {
    // Check for docs directory
    const docsPath = path.join(this.cwd, 'docs');
    if (await this.fileExists(docsPath)) {
      this.preserveDocs = true;
      console.log(
        '🔒 Preservation mode: Will not modify existing docs directory'
      );
    }

    // Check for test/tests directories
    const testPath = path.join(this.cwd, 'test');
    const testsPath = path.join(this.cwd, 'tests');

    if (
      (await this.fileExists(testPath)) ||
      (await this.fileExists(testsPath))
    ) {
      this.preserveTests = true;
      console.log(
        '🔒 Preservation mode: Will not modify existing test directories'
      );
    }
  }

  /**
   * Check for existing important files
   */
  async checkExistingFiles() {
    const importantFiles = [
      'README.md',
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      '.gitignore',
      '.eslintrc.js',
      '.prettierrc',
    ];

    const existing = {};

    for (const file of importantFiles) {
      try {
        await fs.access(path.join(this.cwd, file));
        existing[file] = true;
      } catch {
        existing[file] = false;
      }
    }

    return existing;
  }

  /**
   * Move misplaced files to their correct directories
   */
  async moveMisplacedFiles(_repoAnalysis) {
    if (!this.move) {
      return; // Only run if --move flag is specified
    }

    console.log('🔍 Scanning for misplaced files...');

    try {
      const rootFiles = await fs.readdir(this.cwd, { withFileTypes: true });
      const filesToMove = [];

      // Comprehensive list of files that should NEVER be moved from root
      const protectedFiles = [
        // Critical project files
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'bun.lockb',
        '.gitignore',
        '.gitattributes',
        '.nvmrc',
        '.node-version',

        // Environment files
        '.env',
        '.env.example',
        '.env.local',
        '.env.production',
        '.env.development',

        // Configuration files for build tools and frameworks
        'webpack.config.js',
        'webpack.config.ts',
        'vite.config.js',
        'vite.config.ts',
        'rollup.config.js',
        'rollup.config.ts',
        'esbuild.config.js',
        'esbuild.config.ts',
        'next.config.js',
        'next.config.ts',
        'nuxt.config.js',
        'nuxt.config.ts',
        'angular.json',
        'vue.config.js',
        'svelte.config.js',
        'astro.config.js',

        // Test configuration files
        'jest.config.js',
        'jest.config.ts',
        'vitest.config.js',
        'vitest.config.ts',
        'playwright.config.js',
        'playwright.config.ts',
        'cypress.config.js',
        'cypress.config.ts',
        'karma.conf.js',
        'protractor.conf.js',

        // TypeScript and JavaScript configuration
        'tsconfig.json',
        'tsconfig.*.json',
        'jsconfig.json',

        // Linting and formatting configuration
        '.eslintrc.js',
        '.eslintrc.json',
        '.eslintrc.yaml',
        '.eslintrc.yml',
        'eslint.config.js',
        'eslint.config.ts',
        '.prettierrc',
        '.prettierrc.json',
        'prettier.config.js',
        'prettier.config.ts',

        // Other development tool configurations
        'tailwind.config.js',
        'tailwind.config.ts',
        'postcss.config.js',
        'postcss.config.ts',
        'babel.config.js',
        'babel.config.json',
        '.babelrc',
        '.babelrc.json',
        'commitlint.config.js',
        'commitlint.config.ts',
        'husky.config.js',
        'lint-staged.config.js',
        '.lintstagedrc',
        '.clinerules',

        // Docker and containerization
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        '.dockerignore',

        // Build system files
        'Makefile',
        'CMakeLists.txt',
        'build.gradle',
        'pom.xml',
        'Cargo.toml',

        // Deployment and hosting configuration
        'vercel.json',
        'netlify.toml',
        '.vercelignore',
        '.netlifyignore',
        'app.json',
        'Procfile',
        'railway.json',

        // Documentation that should stay in root
        'README.md',
        'CHANGELOG.md',
        'CONTRIBUTING.md',
        'CODE_OF_CONDUCT.md',
        'LICENSE',
        'LICENSE.md',
        'LICENSE.txt',
        'SECURITY.md',

        // Editor and IDE configuration
        '.editorconfig',
        '.vscode',
        '.idea',

        // GitHub configuration (these should stay in root, not be moved to .github)
        '.github',
      ];

      // GitHub-specific files that should be moved to .github directory
      const githubFiles = new Map([
        // Workflow files
        ['ci.yml', '.github/workflows'],
        ['build.yml', '.github/workflows'],
        ['test.yml', '.github/workflows'],
        ['deploy.yml', '.github/workflows'],
        ['release.yml', '.github/workflows'],
        ['publish.yml', '.github/workflows'],
        ['docs.yml', '.github/workflows'],
        ['copilot-review.yml', '.github/workflows'],
        ['dependency-review.yml', '.github/workflows'],
        ['single-commit-enforcement.yml', '.github/workflows'],

        // Issue and PR templates
        ['PULL_REQUEST_TEMPLATE.md', '.github'],
        ['bug_report.md', '.github/ISSUE_TEMPLATE'],
        ['feature_request.md', '.github/ISSUE_TEMPLATE'],
        ['bug_report.yml', '.github/ISSUE_TEMPLATE'],
        ['feature_request.yml', '.github/ISSUE_TEMPLATE'],

        // GitHub configuration files
        ['CODEOWNERS', '.github'],
        ['dependabot.yml', '.github'],
        ['settings.yml', '.github'],
        ['copilot-review.json', '.github'],
        ['BRANCH_PROTECTION_CONFIG.md', '.github'],
        ['SINGLE_COMMIT_POLICY.md', '.github'],
        ['FUNDING.yml', '.github'],
      ]);

      // Prioritized classification rules (order matters!)
      const classificationRules = {
        // Priority 1: Test files (most specific patterns first)
        test: {
          extensions: [
            '.test.js',
            '.test.ts',
            '.test.jsx',
            '.test.tsx',
            '.spec.js',
            '.spec.ts',
            '.spec.jsx',
            '.spec.tsx',
          ],
          patterns: [
            /\.test\.(js|ts|jsx|tsx|mjs|cjs)$/i,
            /\.spec\.(js|ts|jsx|tsx|mjs|cjs)$/i,
            /^test.*\.(js|ts|jsx|tsx|mjs|cjs)$/i,
          ],
        },

        // Priority 2: Source files
        src: {
          extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'],
          patterns: [
            /^(index|main|app|server|client)\.(js|ts|jsx|tsx|mjs|cjs)$/i,
          ],
          exclude: protectedFiles, // Reference the comprehensive protected list
        },

        // Priority 3: Documentation files (excluding important root docs)
        docs: {
          extensions: ['.md', '.txt'],
          patterns: [/\.(md|txt|rst|adoc)$/i],
          exclude: [
            'README.md',
            'CHANGELOG.md',
            'CONTRIBUTING.md',
            'CODE_OF_CONDUCT.md',
            'LICENSE.md',
            'SECURITY.md',
            'AUTHORS.md',
            'MAINTAINERS.md',
          ],
        },

        // Priority 4: Script files
        scripts: {
          extensions: ['.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'],
          patterns: [/\.(sh|bash|zsh|fish|ps1|bat|cmd)$/i],
          exclude: [
            // Common root-level scripts that should stay
            'build.sh',
            'deploy.sh',
            'start.sh',
            'stop.sh',
            'install.sh',
            'setup.sh',
            'bootstrap.sh',
            'run.sh',
          ],
        },
      };

      // Scan files in root directory
      for (const dirent of rootFiles) {
        if (!dirent.isFile()) continue;

        const fileName = dirent.name;

        // Skip protected files (must stay in root)
        if (protectedFiles.includes(fileName)) continue;

        // Skip hidden files (starting with .) unless specifically handled
        if (fileName.startsWith('.') && !githubFiles.has(fileName)) continue;

        let targetDir = null;
        let targetPath = null;

        // Priority 1: Check GitHub-specific files
        if (githubFiles.has(fileName)) {
          const githubDir = githubFiles.get(fileName);
          const githubDirPath = path.join(this.cwd, githubDir);

          if (await this.fileExists(githubDirPath)) {
            targetDir = githubDir;
            targetPath = path.join(githubDirPath, fileName);
          }
        }

        // Priority 2: Apply general classification rules if not a GitHub file
        if (!targetDir) {
          targetDir = this.classifyFile(fileName, classificationRules);
          if (targetDir) {
            const targetDirPath = path.join(this.cwd, targetDir);
            if (await this.fileExists(targetDirPath)) {
              targetPath = path.join(targetDirPath, fileName);
            } else {
              targetDir = null; // Directory doesn't exist, skip moving
            }
          }
        }

        // Add to move list if we found a valid target
        if (targetDir && targetPath) {
          filesToMove.push({
            fileName,
            from: path.join(this.cwd, fileName),
            to: targetPath,
            category: targetDir,
          });
        }
      }

      if (filesToMove.length === 0) {
        console.log('✅ No misplaced files found');
        return;
      }

      // Show what files would be moved
      console.log(`\n📋 Found ${filesToMove.length} misplaced file(s):`);
      for (const file of filesToMove) {
        console.log(`   ${file.fileName} → ${file.category}/`);
      }

      // Ask for confirmation
      const shouldMove = await this.promptForFileMoves(filesToMove);
      if (!shouldMove) {
        console.log('⏭️ Skipping file moves');
        return;
      }

      // Move the files
      let movedCount = 0;
      for (const file of filesToMove) {
        try {
          await fs.rename(file.from, file.to);
          console.log(`📦 Moved ${file.fileName} to ${file.category}/`);
          movedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to move ${file.fileName}: ${error.message}`);
        }
      }

      console.log(`✅ Successfully moved ${movedCount} file(s)`);
    } catch (error) {
      console.warn(`⚠️ Error during file moving: ${error.message}`);
    }
  }

  /**
   * Classify a file based on its name and extension
   */
  classifyFile(fileName: string, rules: ClassificationRules): string | null {
    for (const [category, rule] of Object.entries(rules)) {
      // Check if file is explicitly excluded
      if (rule.exclude && rule.exclude.includes(fileName)) {
        continue;
      }

      // Check extension matches
      if (rule.extensions) {
        for (const ext of rule.extensions) {
          if (fileName.endsWith(ext)) {
            return category;
          }
        }
      }

      // Check pattern matches
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          if (pattern.test(fileName)) {
            return category;
          }
        }
      }
    }

    return null; // No classification found
  }

  /**
   * Prompt user for confirmation before moving files
   */
  async promptForFileMoves(filesToMove) {
    if (this.force) return true;

    const { shouldMove } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldMove',
        message: `Move these ${filesToMove.length} file(s) to their correct directories?`,
        default: true,
      },
    ]);

    return shouldMove;
  }

  /**
   * Create standard directory structure
   */
  async createDirectoryStructure(repoAnalysis) {
    const allDirectories = [
      '.changeset',
      '.husky',
      '.ai/workflows',
      '.claude/commands',
      'config',
      'src',
      'src/commands',
      'src/providers',
      'src/services',
      'scripts',
      'docs',
      'tests',
      'examples',
      'tools',
      'tools/automation',
      'tools/testing',
      'tools/development',
      'tools/content',
      'todos',
      `${repoAnalysis.repoName}-demo`,
      'test',
    ];

    // Only add GitHub-specific directories if using GitHub CI
    if (this.ciSystem === 'github') {
      allDirectories.push('.github/ISSUE_TEMPLATE', '.github/workflows');
    }

    // Filter directories based on tier
    const directories = allDirectories.filter((dir) => {
      if (dir === `${repoAnalysis.repoName}-demo`) {
        return this.setupTier === 'complete';
      }
      return shouldIncludeDirectory(dir, this.setupTier);
    });

    for (const dir of directories) {
      const dirPath = path.join(this.cwd, dir);

      // Skip docs folder if it already exists to preserve user's existing documentation
      if (dir === 'docs' && (await this.fileExists(dirPath))) {
        console.log(`📁 Preserving existing ${dir} directory`);
        continue;
      }

      // Skip test folder if either 'test' or 'tests' already exists
      if (dir === 'test') {
        const testPath = path.join(this.cwd, 'test');
        const testsPath = path.join(this.cwd, 'tests');

        // Check if ANY test directory exists - if so, skip creating 'test'
        if (
          (await this.fileExists(testPath)) ||
          (await this.fileExists(testsPath))
        ) {
          const existingType = (await this.fileExists(testPath))
            ? 'test'
            : 'tests';
          console.log(`📁 Preserving existing ${existingType} directory`);
          continue;
        }
      }

      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.warn(
            `Warning: Could not create directory ${dir}: ${error.message}`
          );
        }
      }
    }
  }

  /**
   * Enhance package.json with AI assistance
   */
  async enhancePackageJson(repoAnalysis) {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    const exists = await this.fileExists(packageJsonPath);

    // Get enhanced package.json
    const enhanced = await this.aiGenerator.enhancePackageJson(
      repoAnalysis,
      repoAnalysis.repoName,
      this.cwd,
      this.platform
    );

    // In update mode, intelligently merge instead of preserving completely
    if (exists && this.update) {
      const existingContent = await fs.readFile(packageJsonPath, 'utf8');
      const existingPackage = JSON.parse(existingContent);

      // Smart merge: preserve existing, add missing
      const smartMerged = this.smartMergePackageJson(existingPackage, enhanced);

      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(smartMerged, null, 2) + '\n',
        'utf8'
      );
      console.log('🔄 Intelligently enhanced package.json');
      return;
    }

    // In normal mode (not force), ask for confirmation
    if (exists && !this.force && !this.update) {
      const shouldUpdate = await this.promptForOverwrite('package.json');
      if (!shouldUpdate) {
        console.log('⏭️ Skipping package.json update');
        return;
      }
    }

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(enhanced, null, 2) + '\n',
      'utf8'
    );
  }

  /**
   * Smart merge package.json preserving existing content while adding enhancements
   */
  smartMergePackageJson(existing, enhanced) {
    const merged = { ...existing };

    // Enhance name with @juspay/ prefix if not already present
    if (enhanced.name && !existing.name.startsWith('@juspay/')) {
      merged.name = enhanced.name;
    }

    // Add missing top-level fields
    const fieldsToAdd = [
      'repository',
      'bugs',
      'homepage',
      'license',
      'engines',
      'type',
    ];
    fieldsToAdd.forEach((field) => {
      if (enhanced[field] && !existing[field]) {
        merged[field] = enhanced[field];
      }
    });

    // Smart merge dependencies with version conflict resolution
    if (enhanced.dependencies) {
      merged.dependencies = this.mergeDependenciesWithVersionResolution(
        existing.dependencies || {},
        enhanced.dependencies
      );
    }

    // Smart merge devDependencies with version conflict resolution
    if (enhanced.devDependencies) {
      merged.devDependencies = this.mergeDependenciesWithVersionResolution(
        existing.devDependencies || {},
        enhanced.devDependencies
      );
    }

    // Smart merge scripts with deduplication
    if (enhanced.scripts) {
      merged.scripts = this.mergeScriptsWithDeduplication(
        existing.scripts || {},
        enhanced.scripts
      );
    }

    // Add missing keywords (merge arrays)
    if (enhanced.keywords && Array.isArray(enhanced.keywords)) {
      const existingKeywords = existing.keywords || [];
      const newKeywords = enhanced.keywords.filter(
        (keyword) => !existingKeywords.includes(keyword)
      );
      merged.keywords = [...existingKeywords, ...newKeywords];
    }

    // Add other missing configuration objects
    const configFields = ['lint-staged', 'husky', 'prettier', 'eslintConfig'];
    configFields.forEach((field) => {
      if (enhanced[field] && !existing[field]) {
        merged[field] = enhanced[field];
      }
    });

    return merged;
  }

  /**
   * Merge dependencies with intelligent version conflict resolution
   */
  mergeDependenciesWithVersionResolution(
    existing: Record<string, string>,
    enhanced: Record<string, string>
  ): Record<string, string> {
    const merged = { ...existing };

    for (const [pkg, enhancedVersion] of Object.entries(enhanced)) {
      if (!merged[pkg]) {
        // Add new dependency
        merged[pkg] = enhancedVersion;
      } else {
        // Resolve version conflict by choosing the higher version
        const existingVersion = merged[pkg];
        const resolvedVersion = this.resolveVersionConflict(
          existingVersion,
          enhancedVersion
        );
        merged[pkg] = resolvedVersion;
      }
    }

    return merged;
  }

  /**
   * Merge scripts with intelligent deduplication
   */
  mergeScriptsWithDeduplication(
    existing: Record<string, string>,
    enhanced: Record<string, string>
  ): Record<string, string> {
    // Start with existing scripts
    const merged = { ...existing };

    // Define script equivalence and redundancy rules
    const redundancyRules: RedundancyRules = {
      // Exact duplicates (same command, different name)
      duplicates: [
        ['release', 'semantic-release'], // Both typically run 'semantic-release'
      ],

      // Command-based redundancy (same command content)
      commandEquivalents: {
        'semantic-release': ['release'], // If command is 'semantic-release', remove 'release'
        'lint-staged': ['lint:staged'], // If command is 'lint-staged', remove 'lint:staged'
        'prettier --write .': ['format'],
        'prettier --check .': ['format:check'],
      },

      // Complex redundants - remove these entirely if they exist
      complexRedundants: [
        'quality:check', // Usually just combines other scripts
        'precommit', // Usually redundant with husky + lint-staged
      ],
    };

    // Step 1: Remove complex redundant scripts
    redundancyRules.complexRedundants.forEach((scriptName) => {
      if (merged[scriptName]) {
        console.log(`🧹 Removing redundant script: ${scriptName}`);
        delete merged[scriptName];
      }
    });

    // Step 2: Handle exact duplicates
    redundancyRules.duplicates.forEach(([script1, script2]) => {
      const has1 = merged[script1];
      const has2 = merged[script2];

      if (has1 && has2) {
        // Both exist, keep the more semantic one
        if (script1 === 'release' && script2 === 'semantic-release') {
          console.log(
            `🧹 Removing duplicate script: ${script1} (keeping ${script2})`
          );
          delete merged[script1];
        } else {
          console.log(
            `🧹 Removing duplicate script: ${script2} (keeping ${script1})`
          );
          delete merged[script2];
        }
      }
    });

    // Step 3: Handle command-based equivalents
    for (const [command, equivalentNames] of Object.entries(
      redundancyRules.commandEquivalents
    )) {
      // Find scripts that have this exact command
      const scriptsWithCommand = Object.entries(merged).filter(
        ([_name, cmd]) => cmd === command
      );

      if (scriptsWithCommand.length > 0) {
        // Remove any equivalent named scripts
        equivalentNames.forEach((equivName) => {
          if (
            merged[equivName] &&
            scriptsWithCommand.some(([_name]) => _name !== equivName)
          ) {
            console.log(
              `🧹 Removing equivalent script: ${equivName} (command '${command}' exists)`
            );
            delete merged[equivName];
          }
        });
      }
    }

    // Step 4: Add enhanced scripts (only if they don't conflict)
    for (const [scriptName, scriptCommand] of Object.entries(enhanced)) {
      if (!merged[scriptName]) {
        // Check if this would create a redundancy
        const wouldBeRedundant = this.wouldCreateRedundancy(
          scriptName,
          scriptCommand,
          merged,
          redundancyRules
        );

        if (!wouldBeRedundant) {
          merged[scriptName] = scriptCommand;
        } else {
          console.log(`🧹 Skipping redundant enhanced script: ${scriptName}`);
        }
      }
    }

    return merged;
  }

  /**
   * Check if adding a script would create redundancy
   */
  wouldCreateRedundancy(
    scriptName: string,
    scriptCommand: string,
    existing: Record<string, string>,
    redundancyRules: RedundancyRules
  ): boolean {
    // Check against complex redundants
    if (redundancyRules.complexRedundants.includes(scriptName)) {
      return true;
    }

    // Check against duplicates
    for (const [script1, script2] of redundancyRules.duplicates) {
      if (scriptName === script1 && existing[script2]) return true;
      if (scriptName === script2 && existing[script1]) return true;
    }

    // Check command equivalents
    for (const [command, equivalentNames] of Object.entries(
      redundancyRules.commandEquivalents
    )) {
      if (scriptCommand === command) {
        // This script has a command that makes other scripts redundant
        if (equivalentNames.some((name) => existing[name])) {
          return true;
        }
      }

      if (equivalentNames.includes(scriptName)) {
        // This script name is equivalent to an existing command
        const hasEquivalentCommand = Object.values(existing).includes(command);
        if (hasEquivalentCommand) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Resolve version conflicts by choosing the higher version
   */
  resolveVersionConflict(version1: string, version2: string): string {
    // Check for special protocol/reference types first
    const specialProtocols = [
      'workspace:',
      'file:',
      'git+',
      'link:',
      'portal:',
    ];
    const isSpecial1 = specialProtocols.some((proto) =>
      version1.startsWith(proto)
    );
    const isSpecial2 = specialProtocols.some((proto) =>
      version2.startsWith(proto)
    );

    // If either is a special protocol, preserve the existing one
    if (isSpecial1 || isSpecial2) {
      return version1;
    }

    // Simple version comparison - prioritize newer versions
    const cleanVersion1 = version1.replace(/[^0-9.]/g, '');
    const cleanVersion2 = version2.replace(/[^0-9.]/g, '');

    const parts1 = cleanVersion1.split('.').map(Number);
    const parts2 = cleanVersion2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return version1;
      if (part2 > part1) return version2;
    }

    // If versions are equal, prefer the enhanced version (likely more modern)
    return version2;
  }

  /**
   * Create/enhance project files with AI-generated content
   */
  async createProjectFiles(repoAnalysis) {
    const files = [
      {
        name: 'README.md',
        generator: () => this.aiGenerator.generateReadme(repoAnalysis),
      },
      {
        name: 'CONTRIBUTING.md',
        generator: () => this.aiGenerator.generateContributing(repoAnalysis),
      },
      {
        name: 'CODE_OF_CONDUCT.md',
        generator: () =>
          this.loadTemplate('CODE_OF_CONDUCT.template.md', repoAnalysis),
      },
      {
        name: '.gitignore',
        generator: () => this.loadTemplate('.gitignore.template', repoAnalysis),
      },
      {
        name: 'CHANGELOG.md',
        generator: () => this.generateChangelog(repoAnalysis),
      },
      {
        name: 'LICENSE',
        generator: () => this.generateLicense(repoAnalysis),
      },
      {
        name: '.clinerules',
        generator: () =>
          this.loadTemplateWithProjectNameOnly(
            '.clinerules.template',
            repoAnalysis
          ),
      },
      {
        name: '.env.example',
        generator: () =>
          this.loadTemplate('.env.example.template', repoAnalysis),
      },
      {
        name: '.env.test',
        generator: () => this.loadTemplate('.env.test.template', repoAnalysis),
      },
      {
        name: '.editorconfig',
        generator: () => this.loadTemplateRaw('.editorconfig.template'),
      },
      {
        name: '.nvmrc',
        generator: () => this.loadTemplateRaw('.nvmrc.template'),
      },
      {
        name: '.gitattributes',
        generator: () => this.loadTemplateRaw('.gitattributes.template'),
      },
      {
        name: 'mkdocs.yml',
        generator: () => this.loadTemplate('mkdocs.yml.template', repoAnalysis),
      },
      {
        name: 'biome.json',
        generator: () => this.loadTemplate('biome.json.template', repoAnalysis),
      },
      {
        name: 'eslint.config.js',
        generator: () =>
          this.loadTemplate('eslint.config.js.template', repoAnalysis),
      },
      {
        name: '.prettierignore',
        generator: () =>
          this.loadTemplate('.prettierignore.template', repoAnalysis),
      },
      {
        name: '.gitleaksrc.json',
        generator: () =>
          this.loadTemplate('.gitleaksrc.json.template', repoAnalysis),
      },
      {
        name: '.gitleaksignore',
        generator: () =>
          this.loadTemplate('.gitleaksignore.template', repoAnalysis),
      },
      {
        name: 'CLAUDE.md',
        generator: () => this.loadTemplate('CLAUDE.md.template', repoAnalysis),
      },
      {
        name: 'SECURITY.md',
        generator: () =>
          this.loadTemplate('SECURITY.md.template', repoAnalysis),
      },
      {
        name: '.markdownlint.json',
        generator: () => this.loadTemplateRaw('.markdownlint.json.template'),
      },
      {
        name: 'typedoc.json',
        generator: () =>
          this.loadTemplate('typedoc.json.template', repoAnalysis),
      },
      {
        name: '.mcp-servers.example.json',
        generator: () =>
          this.loadTemplate('.mcp-servers.example.json.template', repoAnalysis),
      },
      {
        name: '.releaserc.json',
        generator: () => {
          const tpl =
            this.platform === 'bitbucket'
              ? '.releaserc.json.bitbucket.template'
              : '.releaserc.json.template';
          return this.loadTemplate(tpl, repoAnalysis);
        },
      },
      {
        name: 'tsconfig.json',
        generator: () =>
          this.loadTemplate('tsconfig.json.template', repoAnalysis),
      },
      {
        name: 'tsconfig.cli.json',
        generator: () =>
          this.loadTemplate('tsconfig.cli.json.template', repoAnalysis),
      },
      {
        name: 'vitest.config.ts',
        generator: () =>
          this.loadTemplate('vitest.config.ts.template', repoAnalysis),
      },
      {
        name: 'scripts/pre-commit.sh',
        generator: () =>
          this.loadTemplate('pre-commit.sh.template', repoAnalysis),
      },
      {
        name: 'scripts/build-validations.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/build-validations.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/commit-validation.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/commit-validation.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/env-validation.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/env-validation.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/security-check.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/security-check.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/smart-test.cjs',
        generator: () =>
          this.loadTemplate('scripts/smart-test.cjs.template', repoAnalysis),
      },
      {
        name: 'scripts/organize-project.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/organize-project.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/mcp-test.cjs',
        generator: () =>
          this.loadTemplate('scripts/mcp-test.cjs.template', repoAnalysis),
      },
      {
        name: 'scripts/postinstall.cjs',
        generator: () =>
          this.loadTemplate('scripts/postinstall.cjs.template', repoAnalysis),
      },
      {
        name: 'scripts/quality-metrics.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/quality-metrics.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/format-staged.cjs',
        generator: () =>
          this.loadTemplate('scripts/format-staged.cjs.template', repoAnalysis),
      },
      {
        name: 'scripts/format-changelog.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/format-changelog.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: 'scripts/semantic-release-format-plugin.cjs',
        generator: () =>
          this.loadTemplate(
            'scripts/semantic-release-format-plugin.cjs.template',
            repoAnalysis
          ),
      },
      {
        name: '.npmrc',
        generator: () => this.loadTemplate('.npmrc.template', repoAnalysis),
      },
      {
        name: '.mcp-servers.json',
        generator: () =>
          this.loadTemplate('.mcp-servers.json.template', repoAnalysis),
      },
    ];

    // Add action.yml only if --github-action flag is specified
    if (this.githubAction) {
      files.push({
        name: 'action.yml',
        generator: () => this.loadTemplate('action.yml.template', repoAnalysis),
      });
    }

    // Filter files based on tier configuration
    const filteredFiles = files.filter((file) => {
      // Check if file should be included in current tier
      return shouldIncludeFileByTier(file.name, this.setupTier);
    });

    for (const file of filteredFiles) {
      await this.createOrUpdateFile(file.name, file.generator, repoAnalysis);
    }

    // Make scripts executable
    try {
      const preCommitScript = path.join(this.cwd, 'scripts/pre-commit.sh');
      if (await this.fileExists(preCommitScript)) {
        await fs.chmod(preCommitScript, 0o755);
      }
    } catch (error) {
      console.warn(
        `⚠️ Could not make pre-commit.sh executable: ${error.message}`
      );
    }
  }

  /**
   * Create GitHub templates and workflows
   */
  async createGitHubTemplates(repoAnalysis) {
    const templates = [
      // Issue and PR templates
      {
        source: '.github/ISSUE_TEMPLATE/bug_report.yml.template',
        target: '.github/ISSUE_TEMPLATE/bug_report.yml',
      },
      {
        source: '.github/ISSUE_TEMPLATE/bug_report.md.template',
        target: '.github/ISSUE_TEMPLATE/bug_report.md',
      },
      {
        source: '.github/ISSUE_TEMPLATE/feature_request.md.template',
        target: '.github/ISSUE_TEMPLATE/feature_request.md',
      },
      {
        source: '.github/ISSUE_TEMPLATE/feature_request.yml.template',
        target: '.github/ISSUE_TEMPLATE/feature_request.yml',
      },
      {
        source: '.github/ISSUE_TEMPLATE/config.yml.template',
        target: '.github/ISSUE_TEMPLATE/config.yml',
      },
      {
        source: '.github/mlc_config.json.template',
        target: '.github/mlc_config.json',
      },
      {
        source: '.github/PULL_REQUEST_TEMPLATE.md',
        target: '.github/PULL_REQUEST_TEMPLATE.md',
      },
      // Workflow files
      {
        source: '.github/workflows/ci.yml',
        target: '.github/workflows/ci.yml',
      },
      {
        source: '.github/workflows/copilot-review.yml.template',
        target: '.github/workflows/copilot-review.yml',
      },
      {
        source: '.github/workflows/dependency-review.yml.template',
        target: '.github/workflows/dependency-review.yml',
      },
      {
        source: '.github/workflows/docs.yml.template',
        target: '.github/workflows/docs.yml',
      },
      {
        source: '.github/workflows/release.yml.template',
        target: '.github/workflows/release.yml',
      },
      {
        source: '.github/workflows/single-commit-enforcement.yml.template',
        target: '.github/workflows/single-commit-enforcement.yml',
      },
      // GitHub configuration files
      {
        source: '.github/BRANCH_PROTECTION_CONFIG.md.template',
        target: '.github/BRANCH_PROTECTION_CONFIG.md',
      },
      {
        source: '.github/SINGLE_COMMIT_POLICY.md.template',
        target: '.github/SINGLE_COMMIT_POLICY.md',
      },
      {
        source: '.github/copilot-review.json.template',
        target: '.github/copilot-review.json',
      },
      {
        source: '.github/dependabot.yml.template',
        target: '.github/dependabot.yml',
      },
      {
        source: '.github/settings.yml.template',
        target: '.github/settings.yml',
      },
      // New workflow templates
      {
        source: '.github/workflows/update-major-tag.yml.template',
        target: '.github/workflows/update-major-tag.yml',
      },
      {
        source: '.github/workflows/docs-deploy.yml.template',
        target: '.github/workflows/docs-deploy.yml',
      },
      {
        source: '.github/workflows/docs-pr-validation.yml.template',
        target: '.github/workflows/docs-pr-validation.yml',
      },
      // New GitHub templates
      {
        source: '.github/CODEOWNERS.template',
        target: '.github/CODEOWNERS',
      },
      {
        source: '.github/PULL_REQUEST_TEMPLATE.md.template',
        target: '.github/PULL_REQUEST_TEMPLATE.md',
      },
      {
        source: '.github/ISSUE_TEMPLATE/documentation.md.template',
        target: '.github/ISSUE_TEMPLATE/documentation.md',
      },
      // Documentation files
      {
        source: 'docs/API.md.template',
        target: 'docs/API.md',
      },
      {
        source: 'docs/GETTING_STARTED.md.template',
        target: 'docs/GETTING_STARTED.md',
      },
    ];

    // Filter templates based on tier
    const filteredTemplates = templates.filter((template) =>
      shouldIncludeFileByTier(template.target, this.setupTier)
    );

    for (const template of filteredTemplates) {
      const content = await this.loadTemplate(template.source, repoAnalysis);
      await this.writeFileIfNeeded(template.target, content);
    }

    // Create directory template files
    await this.createDirectoryTemplateFiles(repoAnalysis);
  }

  /**
   * Create template files for development directories
   */
  async createDirectoryTemplateFiles(repoAnalysis) {
    const directoryTemplates = [
      // Changeset templates
      {
        source: '.changeset/README.md.template',
        target: '.changeset/README.md',
      },
      {
        source: '.changeset/config.json.template',
        target: '.changeset/config.json',
      },
      // Husky templates
      {
        source: '.husky/README.md.template',
        target: '.husky/README.md',
      },
      {
        source: '.husky/pre-commit.template',
        target: '.husky/pre-commit',
      },
      {
        source: '.husky/commit-msg.template',
        target: '.husky/commit-msg',
      },
      {
        source: '.husky/pre-push.template',
        target: '.husky/pre-push',
      },
      // Config templates
      {
        source: 'config/README.md.template',
        target: 'config/README.md',
      },
      {
        source: 'config/default.json.template',
        target: 'config/default.json',
      },
      // Examples templates
      {
        source: 'examples/README.md.template',
        target: 'examples/README.md',
      },
      {
        source: 'examples/basic-example.js.template',
        target: 'examples/basic-example.js',
      },
      // Tools templates
      {
        source: 'tools/README.md.template',
        target: 'tools/README.md',
      },
      // Todos templates
      {
        source: 'todos/ROADMAP.md.template',
        target: 'todos/ROADMAP.md',
      },
      // Tests templates
      {
        source: 'tests/setup.ts.template',
        target: 'tests/setup.ts',
      },
      // Source boilerplate templates
      {
        source: 'src/commands/command.ts.template',
        target: 'src/commands/command.example.ts',
      },
      {
        source: 'src/providers/provider.ts.template',
        target: 'src/providers/provider.example.ts',
      },
      {
        source: 'src/services/service.ts.template',
        target: 'src/services/service.example.ts',
      },
      // AI Workflow templates
      {
        source: 'workflows/README.md.template',
        target: '.ai/workflows/README.md',
      },
      {
        source: 'workflows/code-review.json.template',
        target: '.ai/workflows/code-review.json',
      },
      {
        source: 'workflows/content-creation.json.template',
        target: '.ai/workflows/content-creation.json',
      },
      {
        source: 'workflows/data-analysis.json.template',
        target: '.ai/workflows/data-analysis.json',
      },
      {
        source: 'workflows/documentation.json.template',
        target: '.ai/workflows/documentation.json',
      },
      // Claude Code commands
      {
        source: '.claude/commands/commit.md.template',
        target: '.claude/commands/commit.md',
      },
      {
        source: '.claude/commands/refactor-code.md.template',
        target: '.claude/commands/refactor-code.md',
      },
      {
        source: '.claude/commands/ultra-think.md.template',
        target: '.claude/commands/ultra-think.md',
      },
      {
        source: '.claude/commands/update-docs.md.template',
        target: '.claude/commands/update-docs.md',
      },
      {
        source:
          '.claude/commands/create-architecture-documentation.md.template',
        target: '.claude/commands/create-architecture-documentation.md',
      },
      // Claude settings
      {
        source: '.claude/settings.local.json.template',
        target: '.claude/settings.local.json',
      },
      // Tools directory READMEs
      {
        source: 'tools/automation/README.md.template',
        target: 'tools/automation/README.md',
      },
      {
        source: 'tools/testing/README.md.template',
        target: 'tools/testing/README.md',
      },
      {
        source: 'tools/development/README.md.template',
        target: 'tools/development/README.md',
      },
      {
        source: 'tools/content/README.md.template',
        target: 'tools/content/README.md',
      },
    ];

    // Filter directory templates based on tier
    const filteredDirectoryTemplates = directoryTemplates.filter((template) =>
      shouldIncludeFileByTier(template.target, this.setupTier)
    );

    for (const template of filteredDirectoryTemplates) {
      const content = await this.loadTemplate(template.source, repoAnalysis);
      await this.writeFileIfNeeded(template.target, content);
    }

    // Make husky hooks executable (only if in standard or complete tier)
    try {
      const huskyHooks = [
        path.join(this.cwd, '.husky/pre-commit'),
        path.join(this.cwd, '.husky/commit-msg'),
        path.join(this.cwd, '.husky/pre-push'),
      ];
      for (const hook of huskyHooks) {
        if (await this.fileExists(hook)) {
          await fs.chmod(hook, 0o755);
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ Could not make husky hooks executable: ${error.message}`
      );
    }
  }

  /**
   * Create configuration files
   */
  async createConfigFiles(repoAnalysis) {
    // ESLint configuration
    const eslintConfig: ESLintConfig = {
      env: {
        browser: true,
        es2021: true,
        node: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        indent: ['error', 2],
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
      },
    };

    // Add TypeScript configuration if TypeScript is detected
    if (
      repoAnalysis.devDependencies?.typescript ||
      repoAnalysis.dependencies?.typescript
    ) {
      eslintConfig.parser = '@typescript-eslint/parser';
      eslintConfig.plugins = ['@typescript-eslint'];
      eslintConfig.extends.push('@typescript-eslint/recommended');
    }

    await this.writeFileIfNeeded(
      '.eslintrc.js',
      `module.exports = ${JSON.stringify(eslintConfig, null, 2)};`
    );

    // Prettier configuration
    const prettierConfig = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    };

    await this.writeFileIfNeeded(
      '.prettierrc',
      JSON.stringify(prettierConfig, null, 2)
    );

    // Commitlint configuration
    const commitlintConfig = `module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci']
    ]
  }
};`;

    // Bitbucket projects use commitlint.config.cjs (BZ-ticket format) written by copyBitbucketTemplates
    if (
      this.platform !== 'bitbucket' &&
      shouldIncludeFileByTier('commitlint.config.js', this.setupTier)
    ) {
      await this.writeFileIfNeeded('commitlint.config.js', commitlintConfig);
    }
  }

  /**
   * Load template file and replace placeholders
   */
  async loadTemplate(templateName, repoAnalysis) {
    const templatePath = path.join(this.templatesDir, templateName);

    try {
      const content = await fs.readFile(templatePath, 'utf8');
      return this.replacePlaceholders(content, repoAnalysis);
    } catch (error) {
      console.warn(
        `Warning: Could not load template ${templateName}: ${error.message}`
      );
      return '';
    }
  }

  /**
   * Load template file without replacing placeholders (raw template content)
   */
  async loadTemplateRaw(templateName) {
    const templatePath = path.join(this.templatesDir, templateName);

    try {
      const content = await fs.readFile(templatePath, 'utf8');
      return content;
    } catch (error) {
      console.warn(
        `Warning: Could not load template ${templateName}: ${error.message}`
      );
      return '';
    }
  }

  /**
   * Load template file and only replace project name placeholder
   */
  async loadTemplateWithProjectNameOnly(templateName, repoAnalysis) {
    const templatePath = path.join(this.templatesDir, templateName);

    try {
      const content = await fs.readFile(templatePath, 'utf8');
      // Only replace the project name placeholder
      const projectName = repoAnalysis.name || repoAnalysis.repoName;
      return content.replace(/\{\{projectName\}\}/g, projectName);
    } catch (error) {
      console.warn(
        `Warning: Could not load template ${templateName}: ${error.message}`
      );
      return '';
    }
  }

  /**
   * Replace placeholders in template content
   */
  replacePlaceholders(content, repoAnalysis) {
    // Extract author information properly
    let authorName = 'Juspay Technologies';
    if (repoAnalysis.author) {
      if (typeof repoAnalysis.author === 'string') {
        authorName = repoAnalysis.author;
      } else if (
        typeof repoAnalysis.author === 'object' &&
        repoAnalysis.author.name
      ) {
        authorName = repoAnalysis.author.name;
      }
    }

    // Convert project name to kebab-case for binName
    const projectName = repoAnalysis.name || repoAnalysis.repoName;
    const binName = projectName
      .replace('@juspay/', '')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();

    const replacements = {
      '{{projectName}}': projectName,
      '{{packageName}}':
        repoAnalysis.name || `@juspay/${repoAnalysis.repoName}`,
      '{{repoName}}': repoAnalysis.repoName,
      '{{description}}': repoAnalysis.description || 'A JavaScript project',
      '{{license}}': repoAnalysis.license || 'ISC',
      '{{repositoryUrl}}':
        this.platform === 'bitbucket'
          ? `https://bitbucket.juspay.net/scm/${this.workspace}/${repoAnalysis.repoName}`
          : `https://github.com/juspay/${repoAnalysis.repoName}`,
      '{{siteUrl}}':
        this.platform === 'bitbucket'
          ? `https://bitbucket.juspay.net/projects/${this.workspace.toUpperCase()}/repos/${repoAnalysis.repoName}/browse`
          : `https://${repoAnalysis.repoName}.github.io/`,
      '{{owner}}': 'juspay',
      '{{maintainerUsername}}': 'juspay-maintainers',
      '{{contactEmail}}': 'opensource@juspay.in',
      '{{moduleName}}': this.toCamelCase(repoAnalysis.repoName),
      '{{apiDescription}}': `Main function for ${repoAnalysis.repoName}`,
      '{{returnType}}': 'Promise<any>',
      '{{CURRENT_DATE}}': new Date().toISOString(),
      '{{currentYear}}': new Date().getFullYear().toString(),
      '{{date}}': new Date().toISOString().split('T')[0],
      '{{author}}': authorName,
      // New placeholders for comprehensive template support
      '{{projectRoot}}': path.basename(this.cwd),
      '{{version}}': repoAnalysis.version || '0.0.0-development',
      '{{repoType}}': 'public',
      '{{binName}}': binName,
      '{{packageManager}}': this.detectPackageManager(),
    };

    let result = content;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      // Use split/join for safe string replacement without regex
      // This avoids any regex special character handling issues
      result = result.split(placeholder).join(value);
    });

    return result;
  }

  /**
   * Generate CHANGELOG.md content
   */
  generateChangelog(repoAnalysis) {
    return `# Changelog

All notable changes to ${repoAnalysis.name} will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Basic functionality

## [${repoAnalysis.version || '1.0.0'}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
`;
  }

  /**
   * Generate LICENSE file content using templates
   */
  generateLicense(repoAnalysis) {
    const licenseType = (repoAnalysis.license || 'MIT').toUpperCase();

    // Map license types to template files
    const licenseTemplateMap = {
      MIT: 'LICENSE_MIT.template',
      'APACHE-2.0': 'LICENSE_APACHE.template',
      APACHE: 'LICENSE_APACHE.template',
      ISC: 'LICENSE_ISC.template',
      'BSD-3-CLAUSE': 'LICENSE_BSD.template',
      BSD: 'LICENSE_BSD.template',
      'GPL-3.0': 'LICENSE_GPL.template',
      GPL: 'LICENSE_GPL.template',
    };

    // Get the appropriate template file
    const templateFile =
      licenseTemplateMap[licenseType] || 'LICENSE_MIT.template';

    // Load and process the template
    return this.loadTemplate(templateFile, repoAnalysis);
  }

  /**
   * Create or update a file with confirmation
   */
  async createOrUpdateFile(filename, contentGenerator, _repoAnalysis) {
    const filePath = path.join(this.cwd, filename);
    const exists = await this.fileExists(filePath);

    // In update mode, skip existing files completely
    if (exists && this.update) {
      console.log(`⏭️ Preserving existing ${filename}`);
      return;
    }

    // In normal mode (not force), ask for confirmation
    if (exists && !this.force && !this.update) {
      const shouldUpdate = await this.promptForOverwrite(filename);
      if (!shouldUpdate) {
        console.log(`⏭️ Skipping ${filename}`);
        return;
      }
    }

    const content = await contentGenerator();
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`${exists ? '✏️ Updated' : '✨ Created'} ${filename}`);
  }

  /**
   * Write file only if it doesn't exist or force is enabled
   */
  async writeFileIfNeeded(filename, content) {
    const filePath = path.join(this.cwd, filename);
    const exists = await this.fileExists(filePath);

    // Check preservation flags to prevent writing to preserved directories
    if (this.preserveDocs && filename.startsWith('docs/')) {
      console.log(
        `🔒 Preserving existing docs directory - skipping ${filename}`
      );
      return;
    }

    if (
      this.preserveTests &&
      (filename.startsWith('test/') || filename.startsWith('tests/'))
    ) {
      console.log(
        `🔒 Preserving existing test directory - skipping ${filename}`
      );
      return;
    }

    // In update mode, skip existing files completely
    if (exists && this.update) {
      console.log(`⏭️ Preserving existing ${filename}`);
      return;
    }

    // In normal mode (not force), skip existing files with message
    if (exists && !this.force && !this.update) {
      console.log(`⏭️ Skipping ${filename} (already exists)`);
      return;
    }

    await fs.writeFile(filePath, content, 'utf8');
    console.log(`${exists ? '✏️ Updated' : '✨ Created'} ${filename}`);
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user for file overwrite confirmation
   */
  async promptForOverwrite(filename) {
    if (this.force) return true;

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `${filename} already exists. Overwrite?`,
        default: false,
      },
    ]);

    return overwrite;
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  /**
   * Detect package manager based on lock files
   */
  detectPackageManager(): string {
    if (existsSync(path.join(this.cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(path.join(this.cwd, 'yarn.lock'))) return 'yarn';
    if (existsSync(path.join(this.cwd, 'bun.lockb'))) return 'bun';
    return 'npm';
  }

  /**
   * Initialize Memory Bank for the repository
   */
  async initializeMemoryBank(repoAnalysis) {
    try {
      // Check if Memory Bank already exists
      const status = await memoryBankService.getMemoryBankStatus();

      if (status.exists && !this.force) {
        console.log('🧠 Memory Bank already exists - skipping initialization');
        console.log(
          '💡 Use --force to recreate or use `shelly memory update` to refresh'
        );
        return;
      }

      // Prepare Memory Bank data with project structure analysis
      const memoryBankData = {
        ...repoAnalysis,
        projectStructure: await this.analyzeProjectStructure(),
      };

      // Initialize Memory Bank with appropriate options based on organize mode
      const options = {
        force: this.force,
      };

      const results = await memoryBankService.initializeMemoryBank(
        memoryBankData,
        options
      );

      // Report results
      if (results.created.length > 0) {
        console.log(
          `🧠 Created Memory Bank files: ${results.created.join(', ')}`
        );
      }
      if (results.updated.length > 0) {
        console.log(
          `🔄 Updated Memory Bank files: ${results.updated.join(', ')}`
        );
      }
      if (results.skipped.length > 0) {
        console.log(
          `⏭️ Preserved existing Memory Bank files: ${results.skipped.join(', ')}`
        );
      }
      if (results.errors.length > 0) {
        console.warn(
          `⚠️ Memory Bank errors: ${results.errors.map((e) => e.file).join(', ')}`
        );
      }
    } catch (error) {
      console.warn(`⚠️ Memory Bank initialization failed: ${error.message}`);
      // Don't fail the entire organize process for Memory Bank issues
    }
  }

  /**
   * Analyze project structure for Memory Bank context
   */
  async analyzeProjectStructure() {
    const structure = {
      hasSrc: false,
      hasTests: false,
      hasDocs: false,
      hasExamples: false,
      hasScripts: false,
      hasConfig: false,
    };

    const checkDirs = [
      { key: 'hasSrc', paths: ['src', 'lib'] },
      { key: 'hasTests', paths: ['test', 'tests', '__tests__', 'spec'] },
      { key: 'hasDocs', paths: ['docs', 'documentation'] },
      { key: 'hasExamples', paths: ['examples', 'example'] },
      { key: 'hasScripts', paths: ['scripts', 'bin'] },
      { key: 'hasConfig', paths: ['config', 'configuration'] },
    ];

    for (const { key, paths } of checkDirs) {
      for (const dirPath of paths) {
        if (await this.fileExists(path.join(this.cwd, dirPath))) {
          structure[key] = true;
          break;
        }
      }
    }

    return structure;
  }

  /**
   * Detect platform: explicit flag → auto from git remote → ask user interactively
   */
  async detectPlatform(): Promise<'github' | 'bitbucket'> {
    if (this.platformExplicit) return this.platform;

    try {
      const gitInfo = await BreezeDetector.detectGitRemote(this.cwd);
      if (gitInfo) {
        // detectGitRemote returns non-null only for Bitbucket-domain remotes,
        // so a match here already means Bitbucket regardless of the URL text.
        if (gitInfo.workspace) this.workspace = gitInfo.workspace.toLowerCase();
        return 'bitbucket';
      }
    } catch (_e) {
      // no remote — fall through to prompt
    }

    const { platform } = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'No git remote detected. Choose your platform:',
        choices: [
          { name: '🐙 GitHub  (GitHub Actions workflows)', value: 'github' },
          { name: '🪣 Bitbucket  (Jenkins + git hooks)', value: 'bitbucket' },
        ],
        default: 'github',
      },
    ]);
    return platform;
  }

  /**
   * Generate Bitbucket-specific local files:
   * - scripts/git-hooks/*.sh  (cadence-style hooks)
   * - .husky/* hooks that proxy to git-hooks scripts
   * - commitlint.config.cjs  with Juspay BZ-ticket pattern
   */
  async copyBitbucketTemplates(repoAnalysis) {
    const pkg =
      repoAnalysis.packageManager || this.detectPackageManager() || 'npm';
    const workspace =
      repoAnalysis.workspace || this.workspace?.toUpperCase() || 'BZ';
    const ticketPrefix = workspace.toUpperCase();

    const replace = (content: string) =>
      content
        .replace(/\{\{PACKAGE_MANAGER\}\}/g, pkg)
        .replace(/\{\{TICKET_PREFIX\}\}/g, ticketPrefix);

    const hooksDir = path.join(this.cwd, 'scripts/git-hooks');
    const huskyDir = path.join(this.cwd, '.husky');

    const hookFiles = [
      'pre-commit.sh',
      'commit-msg.sh',
      'prepare-commit-msg.sh',
      'pre-push.sh',
      'post-commit.sh',
    ];

    await fs.mkdir(hooksDir, { recursive: true });
    await fs.mkdir(huskyDir, { recursive: true });

    for (const hook of hookFiles) {
      const rel = `scripts/git-hooks/${hook}`;
      if (!shouldIncludeFileByTier(rel, this.setupTier)) continue;
      const tplPath = path.join(
        this.templatesDir,
        'scripts',
        'git-hooks',
        `${hook}.template`
      );
      try {
        const raw = await fs.readFile(tplPath, 'utf8');
        await this.writeFileIfNeeded(rel, replace(raw));
        await fs.chmod(path.join(this.cwd, rel), 0o755);
      } catch (_e) {
        // template missing — skip
      }
    }

    // .husky hooks — thin proxies that call scripts/git-hooks/
    const huskyProxies = [
      { husky: 'pre-commit', script: 'pre-commit.sh' },
      { husky: 'commit-msg', script: 'commit-msg.sh "$1"' },
      {
        husky: 'prepare-commit-msg',
        script: 'prepare-commit-msg.sh "$1" "$2"',
      },
      { husky: 'pre-push', script: 'pre-push.sh' },
      { husky: 'post-commit', script: 'post-commit.sh' },
    ];

    for (const { husky, script } of huskyProxies) {
      const rel = `.husky/${husky}`;
      if (!shouldIncludeFileByTier(rel, this.setupTier)) continue;
      const content = `#!/bin/sh\n./scripts/git-hooks/${script}\n`;
      await this.writeFileIfNeeded(rel, content);
      await fs.chmod(path.join(this.cwd, rel), 0o755);
    }

    // commitlint with Juspay BZ-ticket pattern
    const commitlintTpl = path.join(
      this.templatesDir,
      'commitlint.config.cjs.bitbucket.template'
    );
    try {
      const raw = await fs.readFile(commitlintTpl, 'utf8');
      await this.writeFileIfNeeded('commitlint.config.cjs', replace(raw));
    } catch (_e) {
      // template missing — skip
    }
  }

  /**
   * Create Jenkinsfile with variable replacement
   */
  async createJenkinsfile(_repoAnalysis) {
    console.log('\n🤖 Generating Jenkinsfile...');

    try {
      const templatePath = path.join(this.templatesDir, 'Jenkinsfile.template');
      const outputPath = path.join(this.cwd, 'Jenkinsfile');

      // Check if Jenkinsfile already exists
      if ((await this.fileExists(outputPath)) && !this.force) {
        console.log(
          '   ℹ️  Jenkinsfile already exists (use --force to overwrite)'
        );
        return;
      }

      // Detect project variables
      const variables = await JenkinsfileGenerator.detectVariables(this.cwd);

      // Show detected variables
      console.log('\n📋 Detected Project Variables:');
      console.log(JenkinsfileGenerator.formatVariablesTable(variables));

      // Generate Jenkinsfile
      await JenkinsfileGenerator.generateJenkinsfile(
        templatePath,
        outputPath,
        variables
      );

      console.log('\n✅ Jenkinsfile created successfully!');
      console.log('   📄 Location: Jenkinsfile');
      console.log('\n💡 Next steps:');
      console.log('   1. Review the generated Jenkinsfile');
      console.log(
        '   2. Configure Jenkins credentials (see docs/JENKINSFILE_TEMPLATE.md)'
      );
      console.log('   3. Commit the Jenkinsfile to your repository');
      console.log('   4. Jenkins will automatically detect and use it');
    } catch (error) {
      console.error(`   ❌ Failed to create Jenkinsfile: ${error.message}`);
      if (this.force) {
        // In force mode, log warning but continue
        console.log('   ⚠️  Continuing without Jenkinsfile...');
      } else {
        // In normal mode, fail hard for explicit --ci jenkins request
        throw new Error(
          `Jenkinsfile generation failed: ${error.message}\nUse --force to skip Jenkinsfile creation and continue.`
        );
      }
    }
  }

  /**
   * Detect and recommend Juspay packages
   */
  async detectAndRecommendPackages(repoAnalysis) {
    console.log('\n🔍 Analyzing tech stack...');

    try {
      // Analyze project context
      const context = await PackageDetector.analyzeProject(this.cwd);

      // Show project summary
      const techStack = PackageDetector.formatProjectSummary(context);
      if (techStack.length > 0) {
        console.log(`   📊 Detected: ${techStack.join(', ')}`);
        console.log(`   📦 Package Manager: ${context.packageManager}`);
      }

      // Detect recommended Juspay packages
      const packageJson = repoAnalysis;
      const recommendedPackages = PackageDetector.detectJuspayPackages(
        packageJson,
        context
      );

      if (recommendedPackages.length === 0) {
        console.log(
          '   ✅ All recommended Juspay packages are already installed'
        );
        return;
      }

      // Show recommendations
      console.log(
        `\n💡 Recommended Juspay packages (${recommendedPackages.length}):`
      );
      recommendedPackages.forEach((pkg) => {
        console.log(`   • ${pkg}`);
      });

      // Ask user if they want to install (unless force mode)
      if (!this.force) {
        const { installPackages } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'installPackages',
            message: `Install ${recommendedPackages.length} recommended package(s)?`,
            default: true,
          },
        ]);

        if (!installPackages) {
          console.log('   ⏭️  Skipping package installation');
          console.log(`\n   💡 To install later, run:`);
          console.log(
            `      ${PackageDetector.getInstallCommand(context.packageManager, recommendedPackages)}`
          );
          return;
        }
      }

      // Install packages
      console.log('\n📦 Installing recommended packages...');
      const installCmd = PackageDetector.getInstallCommand(
        context.packageManager,
        recommendedPackages
      );
      console.log(`   Running: ${installCmd}`);

      try {
        const { execSync } = await import('child_process');
        execSync(installCmd, { cwd: this.cwd, stdio: 'inherit' });
        console.log('   ✅ Packages installed successfully!');
      } catch (error) {
        console.error(`   ⚠️  Installation failed: ${error.message}`);
        console.log(`\n   💡 Install manually:`);
        console.log(`      ${installCmd}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Package detection failed: ${error.message}`);
      // Don't fail the entire operation
      console.log('   ⚠️  Continuing without package recommendations...');
    }
  }

  /**
   * Setup Breeze AI & MCP infrastructure
   */
  async setupBreezeMCP(repoAnalysis) {
    // Skip if flag is set
    if (this.skipMcp) {
      console.log('\n⏭️  Skipping MCP setup (--skip-mcp flag)');
      return;
    }

    try {
      console.log('\n🌊 Checking for Breeze project...');

      // Detect if this is a Breeze project
      const breezeInfo = await BreezeDetector.detectBreezeProject(this.cwd);

      // For Bitbucket projects: always set up PR automation if we have a git remote.
      // For GitHub projects: only set up if it's a recognised Breeze workspace/package.
      const hasBitbucketRemote = !!(
        breezeInfo.workspace && breezeInfo.repoSlug
      );
      const shouldSetup =
        this.platform === 'bitbucket'
          ? hasBitbucketRemote
          : breezeInfo.isBreezeProject;

      if (!shouldSetup) {
        console.log('   ℹ️  Not a Breeze project - skipping MCP setup');
        return;
      }

      // Show detected info
      const infoLines = BreezeDetector.formatProjectInfo(breezeInfo);
      infoLines.forEach((line) => console.log(line));

      // Check if MCP is already setup
      const hasScripts = await this.checkMCPScripts();
      if (hasScripts && !this.force) {
        console.log(
          '\n   ✅ MCP already configured (use --force to reconfigure)'
        );
        return;
      }

      // Ask user if they want to setup MCP (unless force mode)
      if (!this.force) {
        const { setupMcp } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'setupMcp',
            message: 'Setup Breeze AI & MCP infrastructure (PR automation)?',
            default: true,
          },
        ]);

        if (!setupMcp) {
          console.log('   ⏭️  Skipping MCP setup');
          return;
        }
      }

      console.log('\n🔧 Setting up Breeze AI & MCP...');

      // Step 1: Create scripts directory if it doesn't exist
      const scriptsDir = path.join(this.cwd, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Step 2: Copy PR automation scripts
      await this.createPRAutomationScripts(breezeInfo);

      // Step 3: Create .env template
      await this.createMCPEnvTemplate(breezeInfo);

      // Step 4: Update package.json with scripts
      await this.addMCPScripts(repoAnalysis);

      console.log('   ✅ MCP infrastructure setup complete!');
      console.log('\n   📝 Next steps:');
      console.log('      1. Fill in .env.breeze with your credentials');
      console.log('      2. Copy to .env: cp .env.breeze .env');
      console.log('      3. Test PR automation: pnpm run pr:describe <pr-id>');
    } catch (error) {
      console.warn(`   ⚠️  MCP setup failed: ${error.message}`);
      console.log('   ⚠️  Continuing without MCP setup...');
    }
  }

  /**
   * Check if MCP scripts are already configured
   */
  async checkMCPScripts(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.cwd, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check for namespaced scripts pointing to the correct files
      const hasDescribe =
        packageJson.scripts?.['pr:describe']?.includes('pr-scribe.js');
      const hasReview =
        packageJson.scripts?.['pr:review']?.includes('pr-police.js');

      return !!(hasDescribe && hasReview);
    } catch {
      return false;
    }
  }

  /**
   * Create PR automation scripts
   */
  async createPRAutomationScripts(breezeInfo) {
    console.log('   📝 Creating PR automation scripts...');

    const scriptsDir = path.join(this.cwd, 'scripts');

    // Read templates
    const scribeTemplate = await fs.readFile(
      path.join(this.templatesDir, 'pr-scribe.js.template'),
      'utf8'
    );

    const policeTemplate = await fs.readFile(
      path.join(this.templatesDir, 'pr-police.js.template'),
      'utf8'
    );

    // Replace variables
    const workspace = breezeInfo.workspace || 'BZ';
    const repoSlug = breezeInfo.repoSlug || 'your-repo';

    const scribeContent = scribeTemplate
      .replace(/{{workspaceName}}/g, workspace)
      .replace(/{{repoSlug}}/g, repoSlug);

    const policeContent = policeTemplate
      .replace(/{{workspaceName}}/g, workspace)
      .replace(/{{repoSlug}}/g, repoSlug);

    // Write scripts (relative paths — writeFileIfNeeded prefixes this.cwd internally)
    await this.writeFileIfNeeded('scripts/pr-scribe.js', scribeContent);
    await this.writeFileIfNeeded('scripts/pr-police.js', policeContent);

    // Make executable
    await fs.chmod(path.join(scriptsDir, 'pr-scribe.js'), 0o755);
    await fs.chmod(path.join(scriptsDir, 'pr-police.js'), 0o755);

    console.log('      ✅ scripts/pr-scribe.js');
    console.log('      ✅ scripts/pr-police.js');
  }

  /**
   * Create .env template for MCP
   */
  async createMCPEnvTemplate(_breezeInfo) {
    console.log('   📝 Creating .env template...');

    const envTemplate = await fs.readFile(
      path.join(this.templatesDir, '.env.breeze.template'),
      'utf8'
    );

    const envPath = path.join(this.cwd, '.env.breeze');

    // Check if .env.breeze already exists
    if ((await this.fileExists(envPath)) && !this.force) {
      console.log(
        '      ℹ️  .env.breeze already exists (use --force to overwrite)'
      );
      return;
    }

    await fs.writeFile(envPath, envTemplate);
    console.log('      ✅ .env.breeze (template)');
  }

  /**
   * Add MCP scripts to package.json
   */
  async addMCPScripts(_repoAnalysis) {
    console.log('   📝 Adding MCP scripts to package.json...');

    const packageJsonPath = path.join(this.cwd, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    // Add scripts if they don't exist
    packageJson.scripts = packageJson.scripts || {};

    if (!packageJson.scripts['pr:describe']) {
      packageJson.scripts['pr:describe'] = 'node scripts/pr-scribe.js';
    }

    if (!packageJson.scripts['pr:review']) {
      packageJson.scripts['pr:review'] = 'node scripts/pr-police.js';
    }

    // Save package.json
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );

    console.log('      ✅ Added "pr:describe" and "pr:review" scripts');
  }

  /**
   * Show summary of changes
   */
  showSummary(repoAnalysis) {
    const tierName = getTierDisplayName(this.setupTier);
    const tierDesc = getTierDescription(this.setupTier);

    console.log('\n📋 Summary of changes:');
    console.log(`   Repository: ${repoAnalysis.name}`);
    console.log(`   Type: ${repoAnalysis.repoType}`);
    console.log(`   Setup Tier: ${tierName} - ${tierDesc}`);
    console.log(
      `   Enhanced package.json with @juspay/${repoAnalysis.repoName}`
    );
    console.log('   Created/updated documentation files');
    console.log('   Set up GitHub templates and CI/CD workflows');
    console.log('   Configured ESLint, Prettier, and Commitlint');

    if (shouldIncludeMemoryBank(this.setupTier)) {
      console.log('   Initialized Memory Bank for AI-assisted development');
    }

    if (this.move) {
      console.log('   Moved misplaced files to their correct directories');
    }

    console.log('\n🎉 Your repository is now ready for publishing!');
    console.log('\n💡 What you got:');

    if (this.setupTier === 'essential') {
      console.log('   ✓ Core documentation (README, CONTRIBUTING, etc.)');
      console.log('   ✓ Essential configs (.gitignore, .prettierrc, etc.)');
      console.log('   ✓ Basic GitHub CI workflow');
    } else if (this.setupTier === 'standard') {
      console.log('   ✓ Core documentation (README, CONTRIBUTING, etc.)');
      console.log('   ✓ GitHub templates and CI/CD workflows');
      console.log('   ✓ Code quality tools (ESLint, Prettier, Husky)');
      console.log('   ✓ Testing setup and examples');
      console.log('   ✓ Release automation');
    } else {
      console.log('   ✓ Everything in Standard tier');
      console.log('   ✓ AI workflows & Claude commands');
      console.log('   ✓ Memory Bank system');
      console.log('   ✓ Advanced security & workflows');
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Review the generated files');
    console.log('   2. Install new dependencies: npm install');

    if (this.setupTier !== 'essential') {
      console.log('   3. Set up Husky hooks: npm run prepare');
    }

    console.log(
      `   ${this.setupTier === 'essential' ? '3' : '4'}. Commit your changes: git add . && git commit -m "feat: organize repository with shelly"`
    );

    if (this.setupTier !== 'complete') {
      console.log(
        `\n💡 Upgrade tip: Run "shelly organize --${this.setupTier === 'essential' ? 'standard' : 'complete'}" to add more features`
      );
    }

    if (this.move) {
      console.log(
        '\n💡 File moving tip: Use --move flag to automatically organize misplaced files'
      );
    }
  }
}
