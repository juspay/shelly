import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIContentGenerator } from '../utils/aiContentGenerator.js';
import { memoryBankService } from '../services/memoryBankService.js';
import inquirer from 'inquirer';

export class OrganizeCommand {
  constructor(options = {}) {
    this.force = options.force || false;
    this.update = options.update || false;
    
    // Initialize preservation flags
    this.preserveDocs = false;
    this.preserveTests = false;
    
    // Handle directory access safely
    try {
      this.cwd = options.cwd || process.cwd();
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'ENOENT') {
        throw new Error(`❌ Cannot access current directory: ${error.message}\n\n` +
          `💡 Solutions:\n` +
          `   1. Use: shelly organize --directory /path/to/your/project\n` +
          `   2. Navigate to a directory you have access to\n` +
          `   3. Check directory permissions\n\n` +
          `📁 Current directory issue: ${error.code === 'EPERM' ? 'Permission denied' : 'Directory not found'}`);
      }
      throw error;
    }
    
    this.aiGenerator = new AIContentGenerator();
    this.templatesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../templates');
  }

  /**
   * Main organize command execution
   */
  async execute() {
    console.log('🚀 Starting repository organization...');
    
    try {
      // Step 1: Analyze current repository and set preservation flags
      const repoAnalysis = await this.analyzeRepository();
      await this.setPreservationFlags();
      console.log(`📊 Analyzed repository: ${repoAnalysis.name}`);

      // Step 2: Create directory structure
      await this.createDirectoryStructure(repoAnalysis);
      console.log('📁 Created standard directory structure');

      // Step 3: Enhance package.json
      await this.enhancePackageJson(repoAnalysis);
      console.log('📦 Enhanced package.json');

      // Step 4: Create/enhance project files
      await this.createProjectFiles(repoAnalysis);
      console.log('📝 Created/enhanced project files');

      // Step 5: Create GitHub templates and workflows
      await this.createGitHubTemplates(repoAnalysis);
      console.log('🔧 Created GitHub templates and workflows');

      // Step 6: Create configuration files
      await this.createConfigFiles(repoAnalysis);
      console.log('⚙️ Created configuration files');

      // Step 7: Initialize Memory Bank
      await this.initializeMemoryBank(repoAnalysis);
      console.log('🧠 Initialized Memory Bank');

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
        hasExistingFiles: await this.checkExistingFiles()
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
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
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
      console.log('🔒 Preservation mode: Will not modify existing docs directory');
    }

    // Check for test/tests directories
    const testPath = path.join(this.cwd, 'test');
    const testsPath = path.join(this.cwd, 'tests');
    
    if (await this.fileExists(testPath) || await this.fileExists(testsPath)) {
      this.preserveTests = true;
      console.log('🔒 Preservation mode: Will not modify existing test directories');
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
      '.prettierrc'
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
   * Create standard directory structure
   */
  async createDirectoryStructure(repoAnalysis) {
    const directories = [
      '.github/ISSUE_TEMPLATE',
      '.github/workflows',
      'src',
      'dist',
      'scripts',
      'docs',
      `${repoAnalysis.repoName}-demo`,
      'test'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.cwd, dir);
      
      // Skip docs folder if it already exists to preserve user's existing documentation
      if (dir === 'docs' && await this.fileExists(dirPath)) {
        console.log(`📁 Preserving existing ${dir} directory`);
        continue;
      }
      
      // Skip test folder if either 'test' or 'tests' already exists
      if (dir === 'test') {
        const testPath = path.join(this.cwd, 'test');
        const testsPath = path.join(this.cwd, 'tests');
        
        // Check if ANY test directory exists - if so, skip creating 'test'
        if (await this.fileExists(testPath) || await this.fileExists(testsPath)) {
          const existingType = await this.fileExists(testPath) ? 'test' : 'tests';
          console.log(`📁 Preserving existing ${existingType} directory`);
          continue;
        }
      }
      
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.warn(`Warning: Could not create directory ${dir}: ${error.message}`);
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
    const enhanced = await this.aiGenerator.enhancePackageJson(repoAnalysis, repoAnalysis.repoName);

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
    const fieldsToAdd = ['repository', 'bugs', 'homepage', 'license', 'engines', 'type'];
    fieldsToAdd.forEach(field => {
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
      const newKeywords = enhanced.keywords.filter(keyword => !existingKeywords.includes(keyword));
      merged.keywords = [...existingKeywords, ...newKeywords];
    }

    // Add other missing configuration objects
    const configFields = ['lint-staged', 'husky', 'prettier', 'eslintConfig'];
    configFields.forEach(field => {
      if (enhanced[field] && !existing[field]) {
        merged[field] = enhanced[field];
      }
    });

    return merged;
  }

  /**
   * Merge dependencies with intelligent version conflict resolution
   */
  mergeDependenciesWithVersionResolution(existing, enhanced) {
    const merged = { ...existing };

    for (const [pkg, enhancedVersion] of Object.entries(enhanced)) {
      if (!merged[pkg]) {
        // Add new dependency
        merged[pkg] = enhancedVersion;
      } else {
        // Resolve version conflict by choosing the higher version
        const existingVersion = merged[pkg];
        const resolvedVersion = this.resolveVersionConflict(existingVersion, enhancedVersion);
        merged[pkg] = resolvedVersion;
      }
    }

    return merged;
  }

  /**
   * Merge scripts with intelligent deduplication
   */
  mergeScriptsWithDeduplication(existing, enhanced) {
    // Start with existing scripts
    let merged = { ...existing };
    
    // Define script equivalence and redundancy rules
    const redundancyRules = {
      // Exact duplicates (same command, different name)
      duplicates: [
        ['release', 'semantic-release'], // Both typically run 'semantic-release'
      ],
      
      // Command-based redundancy (same command content)
      commandEquivalents: {
        'semantic-release': ['release'], // If command is 'semantic-release', remove 'release'
        'lint-staged': ['lint:staged'], // If command is 'lint-staged', remove 'lint:staged'
        'prettier --write .': ['format'],
        'prettier --check .': ['format:check']
      },
      
      // Complex redundants - remove these entirely if they exist
      complexRedundants: [
        'quality:check', // Usually just combines other scripts
        'precommit' // Usually redundant with husky + lint-staged
      ]
    };

    // Step 1: Remove complex redundant scripts
    redundancyRules.complexRedundants.forEach(scriptName => {
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
          console.log(`🧹 Removing duplicate script: ${script1} (keeping ${script2})`);
          delete merged[script1];
        } else {
          console.log(`🧹 Removing duplicate script: ${script2} (keeping ${script1})`);
          delete merged[script2];
        }
      }
    });

    // Step 3: Handle command-based equivalents
    for (const [command, equivalentNames] of Object.entries(redundancyRules.commandEquivalents)) {
      // Find scripts that have this exact command
      const scriptsWithCommand = Object.entries(merged).filter(([name, cmd]) => cmd === command);
      
      if (scriptsWithCommand.length > 0) {
        // Remove any equivalent named scripts
        equivalentNames.forEach(equivName => {
          if (merged[equivName] && scriptsWithCommand.some(([name]) => name !== equivName)) {
            console.log(`🧹 Removing equivalent script: ${equivName} (command '${command}' exists)`);
            delete merged[equivName];
          }
        });
      }
    }

    // Step 4: Add enhanced scripts (only if they don't conflict)
    for (const [scriptName, scriptCommand] of Object.entries(enhanced)) {
      if (!merged[scriptName]) {
        // Check if this would create a redundancy
        const wouldBeRedundant = this.wouldCreateRedundancy(scriptName, scriptCommand, merged, redundancyRules);
        
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
  wouldCreateRedundancy(scriptName, scriptCommand, existing, redundancyRules) {
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
    for (const [command, equivalentNames] of Object.entries(redundancyRules.commandEquivalents)) {
      if (scriptCommand === command) {
        // This script has a command that makes other scripts redundant
        if (equivalentNames.some(name => existing[name])) {
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
  resolveVersionConflict(version1, version2) {
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
        generator: () => this.aiGenerator.generateReadme(repoAnalysis)
      },
      {
        name: 'CONTRIBUTING.md',
        generator: () => this.aiGenerator.generateContributing(repoAnalysis)
      },
      {
        name: 'CODE_OF_CONDUCT.md',
        generator: () => this.loadTemplate('CODE_OF_CONDUCT.template.md', repoAnalysis)
      },
      {
        name: '.gitignore',
        generator: () => this.loadTemplate('.gitignore.template', repoAnalysis)
      },
      {
        name: 'CHANGELOG.md',
        generator: () => this.generateChangelog(repoAnalysis)
      },
      {
        name: 'LICENSE',
        generator: () => this.generateLicense(repoAnalysis)
      },
      {
        name: '.clinerules',
        generator: () => this.loadTemplate('.clinerules.template', repoAnalysis)
      },
      {
        name: '.env.example',
        generator: () => this.loadTemplate('.env.example.template', repoAnalysis)
      },
      {
        name: 'mkdocs.yml',
        generator: () => this.loadTemplate('mkdocs.yml.template', repoAnalysis)
      }
    ];

    for (const file of files) {
      await this.createOrUpdateFile(file.name, file.generator, repoAnalysis);
    }
  }

  /**
   * Create GitHub templates and workflows
   */
  async createGitHubTemplates(repoAnalysis) {
    const templates = [
      // Issue and PR templates
      {
        source: '.github/ISSUE_TEMPLATE/bug_report.yml',
        target: '.github/ISSUE_TEMPLATE/bug_report.yml'
      },
      {
        source: '.github/ISSUE_TEMPLATE/bug_report.md.template',
        target: '.github/ISSUE_TEMPLATE/bug_report.md'
      },
      {
        source: '.github/ISSUE_TEMPLATE/feature_request.md.template',
        target: '.github/ISSUE_TEMPLATE/feature_request.md'
      },
      {
        source: '.github/ISSUE_TEMPLATE/feature_request.yml.template',
        target: '.github/ISSUE_TEMPLATE/feature_request.yml'
      },
      {
        source: '.github/PULL_REQUEST_TEMPLATE.md',
        target: '.github/PULL_REQUEST_TEMPLATE.md'
      },
      // Workflow files
      {
        source: '.github/workflows/ci.yml',
        target: '.github/workflows/ci.yml'
      },
      {
        source: '.github/workflows/copilot-review.yml.template',
        target: '.github/workflows/copilot-review.yml'
      },
      {
        source: '.github/workflows/dependency-review.yml.template',
        target: '.github/workflows/dependency-review.yml'
      },
      {
        source: '.github/workflows/docs.yml.template',
        target: '.github/workflows/docs.yml'
      },
      {
        source: '.github/workflows/release.yml.template',
        target: '.github/workflows/release.yml'
      },
      {
        source: '.github/workflows/singlecommitenforcement.yml.template',
        target: '.github/workflows/singlecommitenforcement.yml'
      },
      // GitHub configuration files
      {
        source: '.github/BRANCH_PROTECTION_CONFIG.md.template',
        target: '.github/BRANCH_PROTECTION_CONFIG.md'
      },
      {
        source: '.github/SINGLE_COMMIT_POLICY.md.template',
        target: '.github/SINGLE_COMMIT_POLICY.md'
      },
      {
        source: '.github/copilot-review.json.template',
        target: '.github/copilot-review.json'
      },
      {
        source: '.github/dependabot.yml.template',
        target: '.github/dependabot.yml'
      },
      {
        source: '.github/settings.yml.template',
        target: '.github/settings.yml'
      },
      // Documentation files
      {
        source: 'docs/API.md.template',
        target: 'docs/API.md'
      },
      {
        source: 'docs/GETTING_STARTED.md.template',
        target: 'docs/GETTING_STARTED.md'
      }
    ];

    for (const template of templates) {
      const content = await this.loadTemplate(template.source, repoAnalysis);
      await this.writeFileIfNeeded(template.target, content);
    }

    // Create CODEOWNERS file
    const codeownersContent = `# Global owners
* @juspay/${repoAnalysis.repoName}-maintainers

# Documentation
*.md @juspay/docs-team

# GitHub workflows
/.github/ @juspay/devops-team
`;
    await this.writeFileIfNeeded('.github/CODEOWNERS', codeownersContent);
  }

  /**
   * Create configuration files
   */
  async createConfigFiles(repoAnalysis) {
    // ESLint configuration
    const eslintConfig = {
      env: {
        browser: true,
        es2021: true,
        node: true
      },
      extends: [
        'eslint:recommended'
      ],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        'indent': ['error', 2],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
      }
    };

    // Add TypeScript configuration if TypeScript is detected
    if (repoAnalysis.devDependencies?.typescript || repoAnalysis.dependencies?.typescript) {
      eslintConfig.parser = '@typescript-eslint/parser';
      eslintConfig.plugins = ['@typescript-eslint'];
      eslintConfig.extends.push('@typescript-eslint/recommended');
    }

    await this.writeFileIfNeeded('.eslintrc.js', `module.exports = ${JSON.stringify(eslintConfig, null, 2)};`);

    // Prettier configuration
    const prettierConfig = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false
    };

    await this.writeFileIfNeeded('.prettierrc', JSON.stringify(prettierConfig, null, 2));

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

    await this.writeFileIfNeeded('commitlint.config.js', commitlintConfig);
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
      console.warn(`Warning: Could not load template ${templateName}: ${error.message}`);
      return '';
    }
  }

  /**
   * Replace placeholders in template content
   */
  replacePlaceholders(content, repoAnalysis) {
    const replacements = {
      '{{projectName}}': repoAnalysis.name || repoAnalysis.repoName,
      '{{packageName}}': repoAnalysis.name || `@juspay/${repoAnalysis.repoName}`,
      '{{repoName}}': repoAnalysis.repoName,
      '{{description}}': repoAnalysis.description || 'A JavaScript project',
      '{{license}}': repoAnalysis.license || 'ISC',
      '{{repositoryUrl}}': `https://github.com/juspay/${repoAnalysis.repoName}`,
      '{{maintainerUsername}}': 'juspay-maintainers',
      '{{contactEmail}}': 'opensource@juspay.in',
      '{{moduleName}}': this.toCamelCase(repoAnalysis.repoName),
      '{{apiDescription}}': `Main function for ${repoAnalysis.repoName}`,
      '{{returnType}}': 'Promise<any>',
      '{{CURRENT_DATE}}': new Date().toISOString(),
      '{{currentYear}}': new Date().getFullYear().toString()
    };

    let result = content;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
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
   * Generate LICENSE file content based on package.json license field
   */
  generateLicense(repoAnalysis) {
    const licenseType = (repoAnalysis.license || 'MIT').toUpperCase();
    const currentYear = new Date().getFullYear();
    const projectName = repoAnalysis.name || repoAnalysis.repoName;
    const author = repoAnalysis.author || 'Juspay Technologies';
    
    switch (licenseType) {
      case 'MIT':
        return `MIT License

Copyright (c) ${currentYear} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

      case 'APACHE-2.0':
      case 'APACHE':
        return `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction,
and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity granting the License.

"Legal Entity" shall mean the union of the acting entity and all
other entities that control, are controlled by, or are under common
control with that entity. For the purposes of this definition,
"control" means (i) the power, direct or indirect, to cause the
direction or management of such entity, whether by contract or
otherwise, or (ii) ownership of fifty percent (50%) or more of the
outstanding shares, or (iii) beneficial ownership of such entity.

"You" (or "Your") shall mean an individual or Legal Entity
exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications,
including but not limited to software source code, documentation
source, and configuration files.

"Object" form shall mean any form resulting from mechanical
transformation or translation of a Source form, including but
not limited to compiled object code, generated documentation,
and conversions to other media types.

"Work" shall mean the work of authorship, whether in Source or
Object form, made available under the License, as indicated by a
copyright notice that is included in or attached to the work
(which shall not include communications that are conspicuously
marked or otherwise designated in writing by the copyright owner
as "Not a Contribution").

"Derivative Works" shall mean any work, whether in Source or Object
form, that is based upon (or derived from) the Work and for which the
editorial revisions, annotations, elaborations, or other modifications
represent, as a whole, an original work of authorship. For the purposes
of this License, Derivative Works shall not include works that remain
separable from, or merely link (or bind by name) to the interfaces of,
the Work and derivative works thereof.

"Contribution" shall mean any work of authorship, including
the original version of the Work and any modifications or additions
to that Work or Derivative Works thereof, that is intentionally
submitted to Licensor for inclusion in the Work by the copyright owner
or by an individual or Legal Entity authorized to submit on behalf of
the copyright owner. For the purposes of this definition, "submitted"
means any form of electronic, verbal, or written communication sent
to the Licensor or its representatives, including but not limited to
communication on electronic mailing lists, source code control
systems, and issue tracking systems that are managed by, or on behalf
of, the Licensor for the purpose of discussing and improving the Work,
but excluding communication that is conspicuously marked or otherwise
designated in writing by the copyright owner as "Not a Contribution".

2. Grant of Copyright License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
copyright license to use, reproduce, modify, display, perform,
sublicense, and distribute the Work and such Derivative Works in
Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
(except as stated in this section) patent license to make, have made,
use, offer to sell, sell, import, and otherwise transfer the Work,
where such license applies only to those patent claims licensable
by such Contributor that are necessarily infringed by their
Contribution(s) alone or by combination of their Contribution(s)
with the Work to which such Contribution(s) was submitted. If You
institute patent litigation against any entity (including a
cross-claim or counterclaim in a lawsuit) alleging that the Work
or a Contribution incorporated within the Work constitutes direct
or contributory patent infringement, then any patent licenses
granted to You under this License for that Work shall terminate
as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
Work or Derivative Works thereof in any medium, with or without
modifications, and in Source or Object form, provided that You
meet the following conditions:

(a) You must give any other recipients of the Work or
Derivative Works a copy of this License; and

(b) You must cause any modified files to carry prominent notices
stating that You changed the files; and

(c) You must retain, in the Source form of any Derivative Works
that You distribute, all copyright, patent, trademark, and
attribution notices from the Source form of the Work,
excluding those notices that do not pertain to any part of
the Derivative Works; and

(d) If the Work includes a "NOTICE" text file as part of its
distribution, then any Derivative Works that You distribute must
include a readable copy of the attribution notices contained
within such NOTICE file, excluding those notices that do not
pertain to any part of the Derivative Works, in at least one
of the following places: within a NOTICE text file distributed
as part of the Derivative Works; within the Source form or
documentation, if provided along with the Derivative Works; or,
within a display generated by the Derivative Works, if and
wherever such third-party notices normally appear. The contents
of the NOTICE file are for informational purposes only and
do not modify the License. You may add Your own attribution
notices within Derivative Works that You distribute, alongside
or as an addendum to the NOTICE text from the Work, provided
that such additional attribution notices cannot be construed
as modifying the License.

You may add Your own copyright notice to Your modifications and
may provide additional or different license terms and conditions
for use, reproduction, or distribution of Your modifications, or
for any such Derivative Works as a whole, provided Your use,
reproduction, and distribution of the Work otherwise complies with
the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
any Contribution intentionally submitted for inclusion in the Work
by You to the Licensor shall be under the terms and conditions of
this License, without any additional terms or conditions.
Notwithstanding the above, nothing herein shall supersede or modify
the terms of any separate license agreement you may have executed
with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
names, trademarks, service marks, or product names of the Licensor,
except as required for reasonable and customary use in describing the
origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
agreed to in writing, Licensor provides the Work (and each
Contributor provides its Contributions) on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied, including, without limitation, any warranties or conditions
of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
PARTICULAR PURPOSE. You are solely responsible for determining the
appropriateness of using or redistributing the Work and assume any
risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
whether in tort (including negligence), contract, or otherwise,
unless required by applicable law (such as deliberate and grossly
negligent acts) or agreed to in writing, shall any Contributor be
liable to You for damages, including any direct, indirect, special,
incidental, or consequential damages of any character arising as a
result of this License or out of the use or inability to use the
Work (including but not limited to damages for loss of goodwill,
work stoppage, computer failure or malfunction, or any and all
other commercial damages or losses), even if such Contributor
has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. When redistributing
the Work or Derivative Works thereof, You may choose to offer,
and charge a fee for, acceptance of support, warranty, indemnity,
or other liability obligations and/or rights consistent with this
License. However, in accepting such obligations, You may act only
on Your own behalf and on Your sole responsibility, not on behalf
of any other Contributor, and only if You agree to indemnify,
defend, and hold each Contributor harmless for any liability
incurred by, or claims asserted against, such Contributor by reason
of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

Copyright ${currentYear} ${author}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

      case 'ISC':
        return `ISC License

Copyright (c) ${currentYear} ${author}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

      case 'BSD-3-CLAUSE':
      case 'BSD':
        return `BSD 3-Clause License

Copyright (c) ${currentYear} ${author}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

      case 'GPL-3.0':
      case 'GPL':
        return `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${currentYear} ${author}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`;

      default:
        // Default to MIT if unknown license type
        return this.generateLicense({ ...repoAnalysis, license: 'MIT' });
    }
  }

  /**
   * Create or update a file with confirmation
   */
  async createOrUpdateFile(filename, contentGenerator, repoAnalysis) {
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
      console.log(`🔒 Preserving existing docs directory - skipping ${filename}`);
      return;
    }

    if (this.preserveTests && (filename.startsWith('test/') || filename.startsWith('tests/'))) {
      console.log(`🔒 Preserving existing test directory - skipping ${filename}`);
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
        default: false
      }
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
   * Initialize Memory Bank for the repository
   */
  async initializeMemoryBank(repoAnalysis) {
    try {
      // Check if Memory Bank already exists
      const status = await memoryBankService.getMemoryBankStatus();
      
      if (status.exists && !this.force) {
        console.log('🧠 Memory Bank already exists - skipping initialization');
        console.log('💡 Use --force to recreate or use `shelly memory update` to refresh');
        return;
      }

      // Prepare Memory Bank data with project structure analysis
      const memoryBankData = {
        ...repoAnalysis,
        projectStructure: await this.analyzeProjectStructure()
      };

      // Initialize Memory Bank with appropriate options based on organize mode
      const options = {
        force: this.force
      };

      const results = await memoryBankService.initializeMemoryBank(memoryBankData, options);

      // Report results
      if (results.created.length > 0) {
        console.log(`🧠 Created Memory Bank files: ${results.created.join(', ')}`);
      }
      if (results.updated.length > 0) {
        console.log(`🔄 Updated Memory Bank files: ${results.updated.join(', ')}`);
      }
      if (results.skipped.length > 0) {
        console.log(`⏭️ Preserved existing Memory Bank files: ${results.skipped.join(', ')}`);
      }
      if (results.errors.length > 0) {
        console.warn(`⚠️ Memory Bank errors: ${results.errors.map(e => e.file).join(', ')}`);
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
      hasConfig: false
    };

    const checkDirs = [
      { key: 'hasSrc', paths: ['src', 'lib'] },
      { key: 'hasTests', paths: ['test', 'tests', '__tests__', 'spec'] },
      { key: 'hasDocs', paths: ['docs', 'documentation'] },
      { key: 'hasExamples', paths: ['examples', 'example'] },
      { key: 'hasScripts', paths: ['scripts', 'bin'] },
      { key: 'hasConfig', paths: ['config', 'configuration'] }
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
   * Show summary of changes
   */
  showSummary(repoAnalysis) {
    console.log('\n📋 Summary of changes:');
    console.log(`   Repository: ${repoAnalysis.name}`);
    console.log(`   Type: ${repoAnalysis.repoType}`);
    console.log(`   Enhanced package.json with @juspay/${repoAnalysis.repoName}`);
    console.log('   Created/updated documentation files');
    console.log('   Set up GitHub templates and CI/CD workflows');
    console.log('   Configured ESLint, Prettier, and Commitlint');
    console.log('   Initialized Memory Bank for AI-assisted development');
    console.log('\n🎉 Your repository is now ready for publishing!');
    console.log('\nNext steps:');
    console.log('   1. Review the generated files');
    console.log('   2. Install new dependencies: npm install');
    console.log('   3. Set up Husky hooks: npm run prepare');
    console.log('   4. Commit your changes: git add . && git commit -m "feat: organize repository with shelly"');
  }
}
