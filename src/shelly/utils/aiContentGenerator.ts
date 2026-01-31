import { generateText, type TextGenerationOptions } from '@juspay/neurolink';
import fs from 'fs';
import path from 'path';
import { aiConfigService } from '../../services/aiConfigService.js';

interface PackageExport {
  types?: string;
  import?: string;
  default?: string;
  svelte?: string;
}

export class AIContentGenerator {
  generateOptions: {
    provider: string;
    model: string;
    baseURL?: string;
  };

  constructor() {
    // Increase max listeners to handle multiple concurrent AI generations
    // Memory Bank generation requires 6+ concurrent calls
    process.setMaxListeners(20);

    // Get AI configuration from the config service
    const aiConfig = aiConfigService.getNeuroLinkOptions();
    this.generateOptions = {
      provider: aiConfig.provider,
      model: aiConfig.model,
      ...(aiConfig.baseURL && { baseURL: aiConfig.baseURL }),
    };
  }

  /**
   * Check if AI is enabled and available
   */
  isAIAvailable(): boolean {
    return aiConfigService.isAIEnabled() && aiConfigService.hasValidApiKey();
  }

  /**
   * Generate enhanced README content based on package.json analysis
   * @param {Object} packageInfo - Package.json contents and repo analysis
   * @returns {Promise<string>} Enhanced README content
   */
  async generateReadme(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log('AI not available, using template-based README generation');
      return this.getFallbackReadme(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a professional README.md file for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Description: ${packageInfo.description || 'No description provided'}
- Main file: ${packageInfo.main || 'index.js'}
- Dependencies: ${JSON.stringify(packageInfo.dependencies || {})}
- Repository type: ${packageInfo.repoType || 'Node.js Project'}
- License: ${packageInfo.license || 'ISC'}

IMPORTANT: Return ONLY the raw markdown content starting with the # title. Do not include any explanations, preambles, or meta-commentary. Just return the clean README.md content.

Include:
- Header with badges
- Overview section
- Key Features
- Installation instructions
- Quick Start examples
- Documentation links
- Contributing section
- License information

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 2500,
        temperature: 0.7,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackReadme(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackReadme(packageInfo);
    }
  }

  /**
   * Generate enhanced CONTRIBUTING.md content
   * @param {Object} packageInfo - Package.json contents and repo analysis
   * @returns {Promise<string>} Enhanced CONTRIBUTING content
   */
  async generateContributing(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based CONTRIBUTING generation'
      );
      return this.getFallbackContributing(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a comprehensive CONTRIBUTING.md file for "${packageInfo.name}".

Project details:
- Type: ${packageInfo.repoType || 'JavaScript/Node.js project'}
- Main technologies: ${this.extractTechnologies(packageInfo)}
- License: ${packageInfo.license || 'ISC'}

IMPORTANT: Return ONLY the raw markdown content starting with the # title. Do not include any explanations, preambles, or meta-commentary. Just return the clean CONTRIBUTING.md content.

Include:
- Welcoming introduction
- Code of conduct reference
- Ways to contribute (bugs, features, documentation)
- Development setup instructions
- Pull request process
- Coding standards and style guide
- Testing requirements
- Community guidelines

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 1200,
        temperature: 0.6,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      return response.content || this.getFallbackContributing(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackContributing(packageInfo);
    }
  }

  /**
   * Generate package.json enhancements
   * @param {Object} currentPackage - Current package.json content
   * @param {string} repoName - Repository name
   * @param {string} workingDir - Working directory for the project
   * @returns {Object} Enhanced package.json
   */
  async enhancePackageJson(currentPackage, repoName, workingDir) {
    const enhanced = { ...currentPackage };

    // Update name to @juspay/ format if it matches pattern
    if (repoName && !enhanced.name.startsWith('@juspay/')) {
      enhanced.name = `@juspay/${repoName}`;
    }

    // Add missing essential fields
    if (!enhanced.description || enhanced.description.trim() === '') {
      enhanced.description = await this.generateProjectDescription(
        enhanced,
        repoName
      );
    }

    if (!enhanced.keywords || enhanced.keywords.length === 0) {
      enhanced.keywords = await this.generateRepoSpecificKeywords(
        enhanced,
        repoName
      );
    }

    // Add author information
    if (!enhanced.author) {
      enhanced.author = {
        name: 'Juspay Technologies',
        email: 'support@juspay.in',
        url: 'https://juspay.io',
      };
    }

    // Add license
    if (!enhanced.license) {
      enhanced.license = 'MIT';
    }

    // Add repository information
    if (!enhanced.repository) {
      enhanced.repository = {
        type: 'git',
        url: `git+https://github.com/juspay/${repoName}.git`,
      };
    }

    if (!enhanced.bugs) {
      enhanced.bugs = {
        url: `https://github.com/juspay/${repoName}/issues`,
      };
    }

    if (!enhanced.homepage) {
      enhanced.homepage = `https://github.com/juspay/${repoName}#readme`;
    }

    // Add engines requirement
    if (!enhanced.engines) {
      enhanced.engines = {
        node: '>=18.0.0',
        npm: '>=8.0.0',
        pnpm: '>=8.0.0',
      };
    }

    // Add files array
    if (!enhanced.files) {
      enhanced.files = ['src/', 'README.md', 'package.json', 'LICENSE'];
    }

    // Add PNPM configuration for security and build optimization (only if using pnpm)
    // Check if pnpm is the package manager by looking for pnpm-lock.yaml or pnpm in packageManager field
    const isPnpmProject =
      enhanced.packageManager?.startsWith('pnpm') ||
      (typeof process !== 'undefined' &&
        fs.existsSync(path.join(workingDir, 'pnpm-lock.yaml')));

    if (isPnpmProject && !enhanced.pnpm) {
      enhanced.pnpm = {
        onlyBuiltDependencies: [
          'esbuild',
          'protobufjs',
          'puppeteer',
          'sqlite3',
        ],
        overrides: {
          'esbuild@<=0.24.2': '>=0.25.0',
          'cookie@<0.7.0': '>=0.7.0',
          '@eslint/plugin-kit@<0.3.4': '>=0.3.4',
          'tmp@<=0.2.3': '>=0.2.4',
          'axios@<1.8.2': '>=1.8.2',
        },
      };
    }

    // Ensure essential dev dependencies
    enhanced.devDependencies = enhanced.devDependencies || {};

    const essentialDevDeps = {
      'semantic-release': '^22.0.0',
      '@semantic-release/changelog': '^6.0.3',
      '@semantic-release/commit-analyzer': '^11.0.0',
      '@semantic-release/git': '^10.0.1',
      '@semantic-release/github': '^9.0.0',
      '@semantic-release/npm': '^11.0.0',
      '@semantic-release/release-notes-generator': '^12.0.0',
      '@types/node': '^20.0.0',
      '@typescript-eslint/eslint-plugin': '^8.0.0',
      '@typescript-eslint/parser': '^8.0.0',
      '@eslint/js': '^9.0.0',
      eslint: '^9.0.0',
      globals: '^15.0.0',
      prettier: '^3.0.0',
      husky: '^9.1.7',
      'lint-staged': '^16.1.5',
      tsx: '^4.0.0',
      typescript: '^5.0.0',
      '@commitlint/cli': '^17.0.0',
      '@commitlint/config-conventional': '^17.0.0',
    };

    // Add missing essential dev dependencies
    Object.entries(essentialDevDeps).forEach(([dep, version]) => {
      if (!enhanced.devDependencies[dep] && !enhanced.dependencies?.[dep]) {
        enhanced.devDependencies[dep] = version;
      }
    });

    // Add scripts with comment-based organization
    const organizedScripts = {
      // Development & Build
      build: enhanced.scripts?.build || 'tsc',
      dev: enhanced.scripts?.dev || 'tsc --watch',
      'build:watch': enhanced.scripts?.['build:watch'] || 'tsc --watch',
      clean: enhanced.scripts?.clean || 'rm -rf dist node_modules/.cache',

      // Testing
      test: enhanced.scripts?.test || 'vitest run',
      'test:watch': enhanced.scripts?.['test:watch'] || 'vitest',
      'test:coverage':
        enhanced.scripts?.['test:coverage'] || 'vitest run --coverage',

      // Code Quality
      lint: enhanced.scripts?.lint || 'eslint .',
      'lint:fix': enhanced.scripts?.['lint:fix'] || 'eslint . --fix',
      format: enhanced.scripts?.format || 'prettier --write .',
      'format:check':
        enhanced.scripts?.['format:check'] || 'prettier --check .',

      // Documentation
      'docs:build':
        enhanced.scripts?.['docs:build'] || 'mkdocs build --strict --clean',
      'docs:serve': enhanced.scripts?.['docs:serve'] || 'mkdocs serve',
      'docs:gh-deploy':
        enhanced.scripts?.['docs:gh-deploy'] || 'mkdocs gh-deploy --force',

      // Validation
      validate:
        enhanced.scripts?.validate || 'npm run lint && npm run format:check',
      'validate:all':
        enhanced.scripts?.['validate:all'] ||
        'npm run validate && npm run test',

      // Git Hooks
      prepare: enhanced.scripts?.prepare || 'husky install',
      'pre-push': enhanced.scripts?.['pre-push'] || 'npm run validate:all',

      // Release
      release: enhanced.scripts?.release || 'semantic-release',
    };

    // Merge scripts: preserve all existing scripts and add/update with organized scripts
    enhanced.scripts = { ...(enhanced.scripts || {}), ...organizedScripts };

    // Add prettier configuration
    if (!enhanced.prettier) {
      enhanced.prettier = {
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      };
    }

    // Add lint-staged configuration
    if (!enhanced['lint-staged']) {
      enhanced['lint-staged'] = {
        'src/**/*.{js,ts,jsx,tsx}': ['eslint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      };
    }

    // Add modern package exports configuration
    // Merge with existing exports to preserve custom entrypoints
    const mainExport: PackageExport = {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    };

    // Add svelte field if Svelte is in dependencies
    if (
      enhanced.dependencies?.svelte ||
      enhanced.devDependencies?.svelte ||
      enhanced.peerDependencies?.svelte
    ) {
      mainExport.svelte = './dist/index.js';
    }

    // Build new exports object without overwriting existing ones
    const newExports: Record<string, PackageExport | string> = {
      '.': mainExport,
      './types': {
        types: './dist/types/index.d.ts',
        import: './dist/types/index.js',
        default: './dist/types/index.js',
      },
      './package.json': './package.json',
    };

    // If the project has a CLI (check for bin field), add CLI export
    if (enhanced.bin) {
      newExports['./cli'] = {
        types: './dist/cli/index.d.ts',
        import: './dist/cli/index.js',
        default: './dist/cli/index.js',
      };
    }

    // Merge with existing exports, preserving any custom entrypoints
    enhanced.exports = { ...(enhanced.exports || {}), ...newExports };

    return enhanced;
  }

  /**
   * Extract technologies from package.json dependencies
   * @param {Object} packageInfo
   * @returns {string}
   */
  extractTechnologies(packageInfo) {
    const deps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };
    const technologies = [];

    if (deps.react) technologies.push('React');
    if (deps.typescript) technologies.push('TypeScript');
    if (deps.express) technologies.push('Express');
    if (deps.vue) technologies.push('Vue');
    if (deps.angular) technologies.push('Angular');
    if (deps.svelte) technologies.push('Svelte');
    if (deps.next) technologies.push('Next.js');
    if (deps.nuxt) technologies.push('Nuxt.js');

    return technologies.length > 0
      ? technologies.join(', ')
      : 'JavaScript/Node.js';
  }

  /**
   * Generate project description using AI
   * @param {Object} packageInfo
   * @param {string} repoName
   * @returns {Promise<string>}
   */
  async generateProjectDescription(packageInfo, repoName) {
    // If AI is not available, use basic description
    if (!this.isAIAvailable()) {
      return `A ${this.extractTechnologies(packageInfo)} project`;
    }

    const prompt = `Generate a concise, professional description for a project named "${repoName}" based on these details:
- Technologies: ${this.extractTechnologies(packageInfo)}
- Main file: ${packageInfo.main || 'index.js'}
- Dependencies: ${Object.keys(packageInfo.dependencies || {})
      .slice(0, 5)
      .join(', ')}

Return only the description text, no additional formatting.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 100,
        temperature: 0.5,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      return (
        response.content?.trim() ||
        `A ${this.extractTechnologies(packageInfo)} project`
      );
    } catch (_error) {
      return `A ${this.extractTechnologies(packageInfo)} project`;
    }
  }

  /**
   * Generate relevant keywords using AI
   * @param {Object} packageInfo
   * @param {string} repoName
   * @returns {Promise<string[]>}
   */
  async generateKeywords(packageInfo, repoName) {
    // If AI is not available, use default keywords
    if (!this.isAIAvailable()) {
      return this.getDefaultKeywords(packageInfo, repoName);
    }

    const prompt = `Generate 5-8 relevant keywords for a project named "${repoName}" with technologies: ${this.extractTechnologies(packageInfo)}. Return as comma-separated values only.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 50,
        temperature: 0.4,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const keywords =
        response.content?.split(',').map((k) => k.trim().toLowerCase()) || [];
      return keywords.length > 0
        ? keywords
        : this.getDefaultKeywords(packageInfo, repoName);
    } catch (_error) {
      return this.getDefaultKeywords(packageInfo, repoName);
    }
  }

  /**
   * Fallback README content when AI fails
   */
  getFallbackReadme(packageInfo) {
    const projectName = packageInfo.name || 'project';
    const description =
      packageInfo.description ||
      `A powerful ${this.extractTechnologies(packageInfo)} project`;
    const license = packageInfo.license || 'ISC';
    const repoName =
      packageInfo.repoName || projectName.replace('@juspay/', '');
    const isCliTool =
      packageInfo.bin || repoName.includes('cli') || repoName.includes('tool');

    return `# ${projectName}

<p align="center">
  <a href="https://www.npmjs.com/package/${projectName}" target="_blank">
    <img src="https://img.shields.io/npm/v/${projectName}.svg" alt="npm version">
  </a>
  <a href="https://nodejs.org/en/download/" target="_blank">
    <img src="https://img.shields.io/badge/node-%3E%3D18.x-brightgreen.svg" alt="Node.js Version">
  </a>
  <a href="./LICENSE" target="_blank">
    <img src="https://img.shields.io/badge/License-${license}-blue.svg" alt="License: ${license}">
  </a>
  <a href="https://github.com/juspay/${repoName}/actions/workflows/ci.yml" target="_blank">
    <img src="https://github.com/juspay/${repoName}/actions/workflows/ci.yml/badge.svg" alt="Build Status">
  </a>
</p>

## 🚀 Overview

${description}

### ✨ Key Features

- **Modern ${this.extractTechnologies(packageInfo)}**: Built with the latest standards and best practices
- **Type Safety**: Full TypeScript support for better development experience
- **Production Ready**: Thoroughly tested and optimized for production use
- **Developer Friendly**: Intuitive API with comprehensive documentation
${isCliTool ? '- **CLI Interface**: Easy-to-use command-line interface' : ''}
- **Well Documented**: Extensive documentation and examples

## 📦 Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher (or yarn/pnpm equivalent)

### Install via npm

\`\`\`bash
npm install ${projectName}
\`\`\`

### Install via yarn

\`\`\`bash
yarn add ${projectName}
\`\`\`

### Install via pnpm

\`\`\`bash
pnpm add ${projectName}
\`\`\`

## 🚀 Quick Start

${isCliTool ? this.getCliUsageExample(projectName, repoName) : this.getLibraryUsageExample(projectName)}

## 📖 Documentation

For comprehensive documentation, examples, and API reference, visit:

- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Step-by-step setup guide
- **[Examples](./examples/)** - Real-world usage examples

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

### Development Setup

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/juspay/${repoName}.git
   cd ${repoName}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run development scripts**
   \`\`\`bash
   npm run dev        # Start development mode
   npm run test       # Run tests
   npm run lint       # Check code style
   \`\`\`

## 📄 License

This project is licensed under the **${license} License** - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the [Juspay](https://juspay.io) team
- Powered by modern JavaScript/TypeScript ecosystem
- Thanks to all contributors who help make this project better

## 📞 Support

- **Documentation**: Check our [docs](./docs/)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/juspay/${repoName}/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/juspay/${repoName}/discussions)

---

<p align="center">Made with ❤️ by <a href="https://juspay.io">Juspay</a></p>
`;
  }

  /**
   * Fallback CONTRIBUTING content when AI fails
   */
  getFallbackContributing(packageInfo) {
    return `# Contributing to ${packageInfo.name}

Thank you for your interest in contributing! We welcome contributions from everyone.

## Getting Started

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests for your changes
5. Run the test suite
6. Submit a pull request

## Development Setup

\`\`\`bash
npm install
npm test
\`\`\`

## Code Style

Please follow the existing code style and run the linter before submitting.

\`\`\`bash
npm run lint
\`\`\`
`;
  }

  /**
   * Generate repo-specific keywords using AI based on project analysis
   * @param {Object} packageInfo
   * @param {string} repoName
   * @returns {Promise<string[]>}
   */
  async generateRepoSpecificKeywords(packageInfo, repoName) {
    // If AI is not available, use default keywords
    if (!this.isAIAvailable()) {
      return this.getDefaultKeywords(packageInfo, repoName);
    }

    const deps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };
    const technologies = this.extractTechnologies(packageInfo);

    const prompt = `Analyze this JavaScript/Node.js project and generate 8-12 relevant, specific keywords for npm/GitHub discovery:

Project Details:
- Name: "${repoName}"
- Technologies: ${technologies}
- Dependencies: ${Object.keys(deps).slice(0, 8).join(', ')}
- Main file: ${packageInfo.main || 'index.js'}
- Has bin field: ${packageInfo.bin ? 'yes' : 'no'}

Consider:
- Core technologies and frameworks used
- Project purpose (CLI tool, library, API, frontend, etc.)
- Development tools and workflow
- Target audience and use cases
- Industry-specific terms

Return ONLY comma-separated keywords, no extra text. Focus on discoverability and accuracy.
Examples: "cli, command-line, typescript, react, api, testing, automation, development-tools"`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 80,
        temperature: 0.3,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      if (response.content) {
        const keywords = response.content
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter((k) => k.length > 0 && k.length < 25)
          .slice(0, 12); // Limit to 12 keywords

        if (keywords.length > 0) {
          return keywords;
        }
      }

      // Fallback to enhanced default keywords if AI fails
      return this.getDefaultKeywords(packageInfo, repoName);
    } catch (error) {
      console.warn(
        'AI keyword generation failed, using fallback:',
        error.message
      );
      return this.getDefaultKeywords(packageInfo, repoName);
    }
  }

  /**
   * Enhanced default keywords when AI generation fails
   */
  getDefaultKeywords(packageInfo, repoName) {
    const technologies = this.extractTechnologies(packageInfo).toLowerCase();
    const deps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };
    const keywords = new Set(['javascript', 'nodejs']);

    // Technology-based keywords
    if (technologies.includes('react')) {
      keywords.add('react');
      keywords.add('component');
      keywords.add('frontend');
    }
    if (technologies.includes('typescript')) {
      keywords.add('typescript');
      keywords.add('types');
    }
    if (technologies.includes('express')) {
      keywords.add('express');
      keywords.add('api');
      keywords.add('backend');
    }
    if (technologies.includes('vue')) keywords.add('vue');
    if (technologies.includes('angular')) keywords.add('angular');

    // CLI-specific keywords
    if (
      repoName.includes('cli') ||
      packageInfo.bin ||
      deps.commander ||
      deps.yargs
    ) {
      keywords.add('cli');
      keywords.add('command-line');
      keywords.add('terminal');
    }

    // Testing keywords
    if (deps.jest || deps.mocha || deps.vitest) {
      keywords.add('testing');
    }

    // Build tool keywords
    if (deps.webpack || deps.vite || deps.rollup) {
      keywords.add('build-tools');
    }

    // AI/ML keywords
    if (deps['@juspay/neurolink'] || repoName.includes('ai')) {
      keywords.add('ai');
      keywords.add('machine-learning');
    }

    // Development tools
    if (repoName.includes('dev') || repoName.includes('tool')) {
      keywords.add('development-tools');
      keywords.add('productivity');
    }

    return Array.from(keywords).slice(0, 10);
  }

  /**
   * Generate CLI usage example
   */
  getCliUsageExample(projectName, repoName) {
    return `### CLI Usage

\`\`\`bash
# Install globally for CLI usage
npm install -g ${projectName}

# Basic usage
${repoName} --help

# Example commands
${repoName} init my-project
${repoName} build --production
${repoName} deploy --environment staging
\`\`\`

### Programmatic Usage

\`\`\`javascript
import { ${this.toCamelCase(repoName)} } from '${projectName}';

// Initialize
const tool = new ${this.toPascalCase(repoName)}({
  config: './config.json'
});

// Execute commands
await tool.init('my-project');
await tool.build({ production: true });
\`\`\``;
  }

  /**
   * Generate library usage example
   */
  getLibraryUsageExample(projectName) {
    return `### Basic Usage

\`\`\`javascript
import { main } from '${projectName}';

// Simple usage
const result = await main({
  // Your configuration options
});

console.log(result);
\`\`\`

### Advanced Usage

\`\`\`javascript
import { main, configure } from '${projectName}';

// Configure the library
configure({
  apiEndpoint: 'https://api.example.com',
  timeout: 5000,
  retries: 3
});

// Use with custom options
const result = await main({
  input: 'your-input-data',
  options: {
    format: 'json',
    validate: true
  }
});
\`\`\``;
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + this.toCamelCase(str).slice(1);
  }

  /**
   * Clean AI-generated content to remove meta-commentary and ensure proper markdown
   */
  cleanAIContent(content) {
    if (!content) return null;

    // Remove common AI response patterns
    const cleanPatterns = [
      /^Here's [^:]*:?\s*/i,
      /^Here is [^:]*:?\s*/i,
      /^I'll [^:]*:?\s*/i,
      /^Let me [^:]*:?\s*/i,
      /^```markdown\s*/i,
      /```\s*$/,
      /^---\s*$/m,
    ];

    let cleaned = content.trim();

    // Apply cleaning patterns
    for (const pattern of cleanPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Find the first line that starts with # (markdown heading)
    const lines = cleaned.split('\n');
    const firstHeaderIndex = lines.findIndex((line) =>
      line.trim().startsWith('#')
    );

    if (firstHeaderIndex > 0) {
      // Remove everything before the first header
      cleaned = lines.slice(firstHeaderIndex).join('\n');
    }

    // Ensure content starts with proper markdown header
    const trimmed = cleaned.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      return null; // Return null to fall back to template
    }

    return trimmed || null;
  }

  /**
   * Generate Project Brief content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated project brief content
   */
  async generateProjectBrief(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based Project Brief generation'
      );
      return this.getFallbackProjectBrief(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a comprehensive Project Brief for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Description: ${packageInfo.description || 'No description provided'}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- License: ${packageInfo.license || 'MIT'}
- Dependencies: ${JSON.stringify(packageInfo.dependencies || {})}

IMPORTANT: Return ONLY raw markdown content starting with # Project Brief: ${packageInfo.name}

Include:
- Core mission and goals
- Key features and functionality
- Target users and use cases
- Success criteria
- Project scope (in/out of scope)
- Technical requirements
- Quality standards

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.6,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackProjectBrief(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackProjectBrief(packageInfo);
    }
  }

  /**
   * Generate Product Context content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated product context content
   */
  async generateProductContext(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based Product Context generation'
      );
      return this.getFallbackProductContext(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a Product Context document for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Description: ${packageInfo.description || 'No description provided'}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- Technologies: ${this.extractTechnologies(packageInfo)}

IMPORTANT: Return ONLY raw markdown content starting with # Product Context: ${packageInfo.name}

Include:
- Problem statement and pain points addressed
- Solution overview and value propositions
- User experience goals and workflows
- Competitive landscape and differentiation
- Product evolution and roadmap

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 1800,
        temperature: 0.6,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackProductContext(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackProductContext(packageInfo);
    }
  }

  /**
   * Generate System Patterns content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated system patterns content
   */
  async generateSystemPatterns(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based System Patterns generation'
      );
      return this.getFallbackSystemPatterns(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a System Patterns document for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- Dependencies: ${Object.keys(packageInfo.dependencies || {})
      .slice(0, 10)
      .join(', ')}
- Has Source: ${packageInfo.projectStructure?.hasSrc ? 'Yes' : 'No'}

IMPORTANT: Return ONLY raw markdown content starting with # System Patterns: ${packageInfo.name}

Include:
- Architecture overview and high-level structure
- Core components and their responsibilities
- Design patterns in use
- Data flow and state management
- Component relationships and dependencies
- Critical implementation paths

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.5,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackSystemPatterns(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackSystemPatterns(packageInfo);
    }
  }

  /**
   * Generate Tech Context content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated tech context content
   */
  async generateTechContext(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based Tech Context generation'
      );
      return this.getFallbackTechContext(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a Technical Context document for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- Dependencies: ${JSON.stringify(packageInfo.dependencies || {})}
- Dev Dependencies: ${JSON.stringify(packageInfo.devDependencies || {})}
- Scripts: ${JSON.stringify(packageInfo.scripts || {})}

IMPORTANT: Return ONLY raw markdown content starting with # Technical Context: ${packageInfo.name}

Include:
- Technology stack and versions
- Key dependencies and their purposes
- Development environment setup
- Build and deployment processes
- Testing strategy and tools
- Technical constraints and requirements

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.5,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackTechContext(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackTechContext(packageInfo);
    }
  }

  /**
   * Generate Active Context content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated active context content
   */
  async generateActiveContext(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log(
        'AI not available, using template-based Active Context generation'
      );
      return this.getFallbackActiveContext(packageInfo);
    }

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `Generate ONLY the markdown content for an Active Context document for "${packageInfo.name}".

This should capture the current state of work as of ${currentDate}.

Project Details:
- Name: ${packageInfo.name}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- Current focus should reflect recent development activity

IMPORTANT: Return ONLY raw markdown content starting with # Active Context: ${packageInfo.name}

Include:
- Current work focus and objectives
- Active features and tasks in progress
- Recent significant changes
- Active decisions and considerations
- Current patterns and preferences
- Immediate next steps and priorities

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 1800,
        temperature: 0.7,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackActiveContext(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackActiveContext(packageInfo);
    }
  }

  /**
   * Generate Progress content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated progress content
   */
  async generateProgress(packageInfo) {
    // If AI is not available, use fallback directly
    if (!this.isAIAvailable()) {
      console.log('AI not available, using template-based Progress generation');
      return this.getFallbackProgress(packageInfo);
    }

    const prompt = `Generate ONLY the markdown content for a Progress document for "${packageInfo.name}".

Project Details:
- Name: ${packageInfo.name}
- Version: ${packageInfo.version || '1.0.0'}
- Type: ${packageInfo.repoType || 'Node.js Project'}
- Has Tests: ${packageInfo.projectStructure?.hasTests ? 'Yes' : 'No'}
- Has Docs: ${packageInfo.projectStructure?.hasDocs ? 'Yes' : 'No'}

IMPORTANT: Return ONLY raw markdown content starting with # Progress: ${packageInfo.name}

Include:
- Current status and completion percentage
- What works (completed features)
- What's left to build (pending features)
- Known issues and technical debt
- Decision evolution and pivots
- Quality metrics and performance
- Risks and blockers

Start the response directly with the # title line.`;

    try {
      const response = await generateText({
        prompt,
        maxTokens: 2200,
        temperature: 0.6,
        ...this.generateOptions,
      } as unknown as TextGenerationOptions);

      const cleanContent = this.cleanAIContent(response.content);
      return cleanContent || this.getFallbackProgress(packageInfo);
    } catch (error) {
      console.warn(
        'AI generation failed, using fallback content:',
        error.message
      );
      return this.getFallbackProgress(packageInfo);
    }
  }

  /**
   * Fallback content generators for Memory Bank files
   */
  getFallbackProjectBrief(packageInfo) {
    const name = packageInfo.name || 'Project';
    const description = packageInfo.description || 'A modern software project';
    const type = packageInfo.repoType || 'Node.js Project';

    return `# Project Brief: ${name}

## 1. Core Mission

${name} is ${description}.

### Primary Goals
- Deliver high-quality, maintainable code
- Provide excellent user experience
- Follow modern development best practices
- Ensure comprehensive testing and documentation

## 2. Key Features

### Core Functionality
- **Primary Feature**: Core ${type} functionality
- **Quality Assurance**: Comprehensive testing and validation
- **Documentation**: Complete API and user documentation
- **Performance**: Optimized for production use

## 3. Target Users

- **Developers**: Need reliable ${type.toLowerCase()} tools
- **End Users**: Require stable, performant solutions
- **Contributors**: Want clear contribution guidelines

## 4. Success Criteria

- Code coverage above 80%
- Comprehensive documentation
- Active community engagement
- Regular releases and updates

## 5. Project Scope

### In Scope
- Core ${type.toLowerCase()} functionality
- Testing infrastructure
- Documentation and examples
- CI/CD pipeline

### Out of Scope
- Features outside core mission
- Platform-specific optimizations (initial release)
- Advanced analytics (future release)

## 6. Technical Requirements

### Technology Stack
- **Language**: JavaScript/TypeScript
- **Runtime**: Node.js 18+
- **Key Dependencies**: Modern, well-maintained packages

### Quality Standards
- Code coverage: 80%+
- Documentation: Complete API docs
- Testing: Unit, integration, and e2e tests

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
  }

  getFallbackProductContext(packageInfo) {
    const name = packageInfo.name || 'Project';
    const type = packageInfo.repoType || 'Node.js Project';

    return `# Product Context: ${name}

## 1. Problem Statement

### What Problem Does This Solve?
${name} addresses the need for a reliable, modern ${type.toLowerCase()} solution that provides developers with the tools they need to build quality applications efficiently.

### Pain Points Addressed
- **Complexity**: Simplifies common development tasks
- **Reliability**: Provides stable, tested functionality
- **Developer Experience**: Intuitive API and comprehensive documentation

## 2. Solution Overview

### How It Works
${name} provides a well-designed ${type.toLowerCase()} solution that integrates seamlessly into existing development workflows.

### Key Value Propositions
- **Simplicity**: Easy to integrate and use
- **Reliability**: Thoroughly tested and production-ready
- **Flexibility**: Configurable to meet various use cases
- **Performance**: Optimized for production environments

## 3. User Experience Goals

### Primary User Workflows
- **Setup**: Quick and straightforward installation
- **Integration**: Seamless integration with existing tools
- **Usage**: Intuitive API and clear documentation
- **Maintenance**: Easy updates and troubleshooting

### User Success Metrics
- Setup time: Under 5 minutes
- Time to first success: Under 15 minutes
- Documentation clarity: 90%+ user satisfaction

## 4. Competitive Landscape

### Our Differentiation
- Modern architecture and best practices
- Comprehensive testing and documentation
- Active maintenance and community support
- Focus on developer experience

## 5. Product Evolution

### Current Phase
Initial development and core feature implementation

### Next Milestones
- **v1.0**: Core features and documentation
- **v1.1**: Performance optimizations and additional features
- **v2.0**: Advanced features and ecosystem expansion

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
  }

  getFallbackSystemPatterns(packageInfo) {
    const name = packageInfo.name || 'Project';

    return `# System Patterns: ${name}

## 1. Architecture Overview

### High-Level Structure
\`\`\`
${name}
├── src/           # Source code
├── test/          # Test files
├── docs/          # Documentation
└── examples/      # Usage examples
\`\`\`

### Core Components
- **Main Module**: Primary functionality and public API
- **Utilities**: Helper functions and shared utilities
- **Services**: Business logic and data processing
- **Tests**: Comprehensive test suite

## 2. Design Patterns

### Primary Patterns in Use
- **Module Pattern**: Clean separation of concerns
- **Factory Pattern**: Object creation and configuration
- **Observer Pattern**: Event handling and notifications
- **Strategy Pattern**: Configurable behavior selection

## 3. Data Flow

### Request/Response Flow
1. **Input Validation**: Validate and sanitize inputs
2. **Processing**: Execute core business logic
3. **Output Generation**: Format and return results
4. **Error Handling**: Graceful error management

### State Management
State is managed through well-defined interfaces with clear ownership and lifecycle management.

## 4. Key Relationships

### Component Dependencies
- Main → Services (core functionality)
- Services → Utilities (shared functions)
- Tests → All components (validation)

### External Integrations
- **Package Dependencies**: Minimal, well-maintained packages
- **File System**: Secure file operations
- **Environment**: Configuration through environment variables

## 5. Critical Implementation Paths

### Core Workflows
- **Initialization**: Setup and configuration
- **Processing**: Main functionality execution
- **Cleanup**: Resource management and cleanup

### Error Handling Strategy
Comprehensive error handling with clear error messages and recovery strategies.

## 6. Performance Considerations

### Optimization Patterns
- Lazy loading of expensive resources
- Caching of frequently accessed data
- Efficient algorithms and data structures

### Resource Management
Proper cleanup and resource management to prevent memory leaks.

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
  }

  getFallbackTechContext(packageInfo) {
    const name = packageInfo.name || 'Project';
    const deps = Object.keys(packageInfo.dependencies || {});
    const devDeps = Object.keys(packageInfo.devDependencies || {});

    return `# Technical Context: ${name}

## 1. Technology Stack

### Core Technologies
- **Language**: JavaScript/TypeScript
- **Runtime**: Node.js 18.0.0+
- **Package Manager**: npm/yarn/pnpm

### Key Dependencies
${
  deps.length > 0
    ? deps
        .slice(0, 5)
        .map((dep) => `- **${dep}**: Core functionality`)
        .join('\n')
    : '- No major dependencies'
}

### Development Dependencies
${
  devDeps.length > 0
    ? devDeps
        .slice(0, 5)
        .map((dep) => `- **${dep}**: Development tooling`)
        .join('\n')
    : '- Standard development tools'
}

## 2. Development Environment

### Prerequisites
- Node.js: 18.0.0+ (LTS recommended)
- npm: 8.0.0+ (or equivalent package manager)
- Git: For version control

### Setup Instructions
\`\`\`bash
# Clone repository
git clone <repository-url>
cd ${name}

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
\`\`\`

### Environment Variables
- \`NODE_ENV\`: Environment mode (development/production)
- \`LOG_LEVEL\`: Logging verbosity level

## 3. Build & Deployment

### Build Process
Standard Node.js build process with modern tooling and optimization.

### Testing Strategy
- **Unit Tests**: Jest/Vitest for isolated testing
- **Integration Tests**: End-to-end workflow validation
- **Linting**: ESLint for code quality
- **Formatting**: Prettier for consistent formatting

### Deployment Pipeline
CI/CD pipeline with automated testing, building, and deployment.

## 4. Technical Constraints

### Performance Requirements
- Startup time: < 1 second
- Memory usage: Efficient resource utilization
- Response time: Optimized for user experience

### Security Considerations
- Input validation and sanitization
- Secure dependency management
- Regular security audits

### Compatibility Requirements
- Node.js: 18.0.0+
- Cross-platform compatibility (Windows, macOS, Linux)

## 5. Tool Configuration

### Code Quality Tools
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates

### IDE/Editor Setup
- VSCode: Recommended extensions for optimal development
- EditorConfig: Consistent editor configuration

## 6. External Services

### APIs & Integrations
- Well-defined interfaces for external services
- Graceful handling of service unavailability
- Comprehensive error handling and retry logic
- GitHub API integration for repository automation
- GitHub Actions workflow management

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
  }

  getFallbackActiveContext(packageInfo) {
    const name = packageInfo.name || 'Project';
    const currentDate = new Date().toISOString().split('T')[0];

    return `# Active Context: ${name}

## 1. Current Work Focus

### Primary Objective
Implementing Memory Bank functionality to enhance project context management and AI-assisted development.

### Active Features/Tasks
- **Memory Bank Integration**: In Progress
  - Progress: 70%
  - Blockers: None
  - Next Steps: Complete AI content generation methods
- **GitHub Repository Setup**: Complete
  - Progress: 100%
  - Features: Branch protection, GitHub Pages, Actions permissions, NPM guidance
  - Commands: shelly gh, shelly github setup, shelly setup

## 2. Recent Changes

### Last 5 Significant Changes
- **${currentDate}**: Added GitHub repository setup automation
  - Impact: Automated GitHub best practices configuration
  - Files Modified: GitHubService, GitHubSetupCommand, CLI commands
  - Features: Branch protection, GitHub Pages, Actions settings
- **${currentDate}**: Added Memory Bank service and templates
  - Impact: Enhanced project documentation and context management
  - Files Modified: Memory Bank templates, service layer

## 3. Active Decisions & Considerations

### Technical Decisions
- **Memory Bank Architecture**: Service-based approach with AI content generation
  - Alternatives Considered: Manual templates only
  - Trade-offs: Complexity vs. automation benefits

### Product Decisions
- **Integration Strategy**: Seamless integration with existing organize command
  - User Impact: Enhanced project setup experience
  - Business Impact: Improved developer productivity

## 4. Current Patterns & Preferences

### Coding Patterns
- **Service Layer**: Clean separation of concerns
- **AI Integration**: Fallback patterns for reliability
- **Template System**: Flexible content generation

### Architecture Preferences
- Modular design with clear interfaces
- Comprehensive error handling
- Performance-focused implementations

## 5. Learning & Insights

### Key Discoveries
- **AI Content Quality**: Requires careful prompt engineering and content cleaning
- **Template Flexibility**: Balance between structure and customization
- **Integration Complexity**: Memory Bank requires thoughtful integration points

### Best Practices Established
- Always provide fallback content for AI generation
- Use clean, structured templates for consistency
- Implement comprehensive error handling

## 6. Immediate Next Steps

### Priority Queue
1. **Complete Memory Bank AI Methods** (High)
   - Estimate: 2 hours
   - Dependencies: None
   - Success Criteria: All 6 Memory Bank files generate properly

2. **Integrate with Organize Command** (High)
   - Estimate: 1 hour
   - Dependencies: AI methods complete
   - Success Criteria: Memory Bank created during organize

3. **Create Memory Command** (Medium)
   - Estimate: 2 hours
   - Dependencies: Service complete
   - Success Criteria: Standalone memory management commands

### Waiting For
- User feedback on Memory Bank integration approach

---
*Last Updated: ${currentDate} by Cline AI Assistant*
`;
  }

  getFallbackProgress(packageInfo) {
    const name = packageInfo.name || 'Project';

    return `# Progress: ${name}

## 1. Current Status

### Overall Completion
- **Phase**: Active Development
- **Progress**: 85%
- **Last Milestone**: Core functionality implementation
- **Next Milestone**: Memory Bank integration completion

### Feature Status
- **Core CLI**: Complete
  - Implementation: 100%
  - Testing: 85%
  - Documentation: 90%
- **Memory Bank**: In Progress
  - Implementation: 70%
  - Testing: 30%
  - Documentation: 50%
- **GitHub Repository Setup**: Complete
  - Implementation: 100%
  - Testing: 85%
  - Documentation: 95%

## 2. What Works

### Completed Features
- **Repository Organization**: Fully functional
  - Quality: High
  - Performance: Optimized
  - Test Coverage: 85%
- **AI Content Generation**: Core functionality complete
  - Quality: High with fallbacks
  - Performance: Good
  - Test Coverage: 75%
- **License Generation**: Multiple license types supported
  - Quality: High
  - Performance: Fast
  - Test Coverage: 90%
- **GitHub Repository Setup**: Automated configuration
  - Quality: High
  - Performance: Fast
  - Test Coverage: 85%
  - Features: Branch protection, GitHub Pages, Actions settings, NPM guidance

### Stable Components
- CLI interface: Stable (last changed: 2 weeks ago)
- File service: Stable (last changed: 1 month ago)
- Template system: Stable (last changed: 1 week ago)
- GitHub service: Stable (last changed: today)

## 3. What's Left to Build

### Pending Features
- **Memory Bank Commands**: High Priority
  - Effort: 4 hours
  - Dependencies: Service completion
  - Definition of Done: Full CLI integration with subcommands
- **Advanced AI Prompts**: Medium Priority
  - Effort: 6 hours
  - Dependencies: User feedback
  - Definition of Done: Enhanced content quality

### Technical Debt
- **Test Coverage**: Increase to 90%+
  - Priority: Medium
  - Effort: 8 hours
- **Documentation**: Complete API documentation
  - Priority: Medium
  - Effort: 4 hours

## 4. Known Issues

### Critical Issues
- None currently

### Non-Critical Issues
- AI content sometimes includes meta-commentary (Priority: Low)
- Template loading could be optimized (Priority: Low)

## 5. Decision Evolution

### Key Decisions Made
- **Memory Bank Integration**: Service-based architecture chosen
  - Context: Need for structured project documentation
  - Outcome: Flexible, AI-enhanced documentation system
  - Lessons: Balance automation with fallback reliability

### Pivots & Course Corrections
- **AI Prompt Strategy**: From generic to specific prompts
  - Reason: Better content quality and consistency
  - Impact: Improved user experience

## 6. Quality Metrics

### Code Quality
- **Lines of Code**: ~2,500
- **Test Coverage**: 80%
- **Code Complexity**: Low-Medium
- **Documentation Coverage**: 85%

### Performance Metrics
- CLI startup time: <500ms (Target: <1000ms)
- File generation time: <2s (Target: <5s)
- Memory usage: <50MB (Target: <100MB)

### User Metrics
- Setup success rate: 95% (Improving)
- User satisfaction: High based on feedback

## 7. Risks & Blockers

### Current Risks
- **AI Service Availability**: Low / Medium
  - Mitigation: Comprehensive fallback system
  - Owner: Development team

### Active Blockers
- None currently

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
*Next Review: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}*
`;
  }
}
