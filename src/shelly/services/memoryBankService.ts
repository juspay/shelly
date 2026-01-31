import { AIContentGenerator } from '../utils/aiContentGenerator.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { aiConfigService } from '../../services/aiConfigService.js';

const execAsync = promisify(exec);

/**
 * Escape a string for safe use in shell commands
 * Uses single quotes and escapes embedded single quotes
 */
function shellEscape(str: string): string {
  // Replace single quotes with escaped version: ' -> '\''
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Validate that a file path is safe for shell interpolation
 * Must be an absolute path with no shell special characters except / and .
 */
function isValidTempFilePath(filePath: string): boolean {
  // Must start with / (absolute) or temp directory
  const tempDir = os.tmpdir();
  if (!filePath.startsWith(tempDir) && !filePath.startsWith('/tmp')) {
    return false;
  }
  // Only allow alphanumeric, slashes, dots, hyphens, underscores
  return /^[a-zA-Z0-9/_.-]+$/.test(filePath);
}

interface MemoryBankFile {
  template?: string;
  generator?: string | null;
}

interface ProjectStructure {
  hasSrc: boolean;
  hasTests: boolean;
  hasDocs: boolean;
}

/**
 * Memory Bank Service - Manages the creation, updating, and maintenance of project memory bank
 * Implements Cline's Memory Bank protocol for persistent project context
 */
export class MemoryBankService {
  aiGenerator: AIContentGenerator;
  templatesPath: string;
  targetPath: string;
  structure: Record<string, MemoryBankFile>;
  rootFiles: Record<string, MemoryBankFile>;
  coreFiles: string[];

  constructor() {
    this.aiGenerator = new AIContentGenerator();
    this.templatesPath = 'src/shelly/templates/memory-bank';
    this.targetPath = 'memory-bank';

    // Memory Bank structure with organized folders
    this.structure = {
      'README.md': { template: 'README.md.template', generator: null },
      'project/projectbrief.md': {
        template: 'projectbrief.md.template',
        generator: 'generateProjectBrief',
      },
      'project/productContext.md': {
        template: 'productContext.md.template',
        generator: 'generateProductContext',
      },
      'technical/systemPatterns.md': {
        template: 'systemPatterns.md.template',
        generator: 'generateSystemPatterns',
      },
      'technical/techContext.md': {
        template: 'techContext.md.template',
        generator: 'generateTechContext',
      },
      'current/activeContext.md': {
        template: 'activeContext.md.template',
        generator: 'generateActiveContext',
      },
      'current/progress.md': {
        template: 'progress.md.template',
        generator: 'generateProgress',
      },
    };

    // Additional files to generate outside memory-bank directory
    this.rootFiles = {
      '.clinerules': { generator: 'generateClinerules' },
    };

    // Core Memory Bank files for backward compatibility
    this.coreFiles = Object.keys(this.structure).filter(
      (file) => file !== 'README.md'
    );
  }

  /**
   * Initialize Memory Bank for a repository
   * @param {Object} packageInfo - Repository analysis data
   * @param {Object} options - Options for initialization
   * @returns {Promise<Object>} Initialization results
   */
  async initializeMemoryBank(packageInfo, options: { force?: boolean } = {}) {
    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    console.log('🧠 Initializing Memory Bank with organized structure...');

    // Ensure memory-bank directory and subdirectories exist
    await fs.mkdir(this.targetPath, { recursive: true });
    await fs.mkdir(path.join(this.targetPath, 'project'), { recursive: true });
    await fs.mkdir(path.join(this.targetPath, 'technical'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.targetPath, 'current'), { recursive: true });

    // Create or update each file in the structure
    for (const [filePath, _fileConfig] of Object.entries(this.structure)) {
      try {
        const fullPath = path.join(this.targetPath, filePath);
        const exists = await this.fileExists(fullPath);

        if (exists && !options.force) {
          console.log(`⏭️  Preserving existing ${filePath}`);
          results.skipped.push(filePath);
          continue;
        }

        const content = await this.generateMemoryBankContent(
          filePath,
          packageInfo
        );
        await fs.writeFile(fullPath, content, 'utf8');

        if (exists) {
          console.log(`🔄 Updated ${filePath}`);
          results.updated.push(filePath);
        } else {
          console.log(`✨ Created ${filePath}`);
          results.created.push(filePath);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, error.message);
        results.errors.push({ file: filePath, error: error.message });
      }
    }

    // Generate .clinerules in root directory
    for (const [fileName, _fileConfig] of Object.entries(this.rootFiles)) {
      try {
        const exists = await this.fileExists(fileName);

        if (exists && !options.force) {
          console.log(`⏭️  Preserving existing ${fileName}`);
          results.skipped.push(fileName);
          continue;
        }

        const content = await this.generateClinerules(packageInfo);
        await fs.writeFile(fileName, content, 'utf8');

        if (exists) {
          console.log(`🔄 Updated ${fileName}`);
          results.updated.push(fileName);
        } else {
          console.log(`✨ Created ${fileName}`);
          results.created.push(fileName);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error.message);
        results.errors.push({ file: fileName, error: error.message });
      }
    }

    return results;
  }

  /**
   * Update specific Memory Bank file or all files
   * @param {string} fileName - Specific file to update (optional)
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<Object>} Update results
   */
  async updateMemoryBank(fileName = null, packageInfo) {
    const results = {
      updated: [],
      errors: [],
    };

    console.log('🧠 Updating Memory Bank...');

    const filesToUpdate = fileName ? [fileName] : this.coreFiles;

    for (const file of filesToUpdate) {
      try {
        const filePath = path.join(this.targetPath, file);
        const content = await this.generateMemoryBankContent(file, packageInfo);
        await fs.writeFile(filePath, content, 'utf8');

        console.log(`🔄 Updated ${file}`);
        results.updated.push(file);
      } catch (error) {
        console.error(`❌ Failed to update ${file}:`, error.message);
        results.errors.push({ file, error: error.message });
      }
    }

    return results;
  }

  /**
   * Read Memory Bank file content
   * @param {string} fileName - Memory Bank file to read
   * @returns {Promise<string>} File content
   */
  async readMemoryBankFile(fileName) {
    const filePath = path.join(this.targetPath, fileName);
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * List all Memory Bank files with their status
   * @returns {Promise<Array>} List of Memory Bank files and their status
   */
  async listMemoryBankFiles() {
    const files = [];

    for (const fileName of this.coreFiles) {
      const filePath = path.join(this.targetPath, fileName);
      const exists = await this.fileExists(filePath);

      if (exists) {
        const stats = await fs.stat(filePath);
        files.push({
          name: fileName,
          exists: true,
          lastModified: stats.mtime,
          size: stats.size,
        });
      } else {
        files.push({
          name: fileName,
          exists: false,
          lastModified: null,
          size: 0,
        });
      }
    }

    return files;
  }

  /**
   * Generate content for a specific Memory Bank file using AI
   * @param {string} fileName - Memory Bank file path
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated content
   */
  async generateMemoryBankContent(fileName, packageInfo) {
    // Handle README.md specially
    if (fileName === 'README.md') {
      return this.generateReadmeContent(packageInfo);
    }

    // If neurolink content is available, use it
    if (
      packageInfo.neurolinkContent &&
      packageInfo.neurolinkContent[fileName]
    ) {
      console.log(`🤖 Using neurolink content for ${fileName}`);
      return packageInfo.neurolinkContent[fileName];
    }

    // Fallback to individual AI generation
    console.log(`🔄 Using fallback AI generation for ${fileName}`);
    const baseName = path.basename(fileName, '.md');

    switch (baseName) {
      case 'projectbrief':
        return await this.aiGenerator.generateProjectBrief(packageInfo);
      case 'productContext':
        return await this.aiGenerator.generateProductContext(packageInfo);
      case 'systemPatterns':
        return await this.aiGenerator.generateSystemPatterns(packageInfo);
      case 'techContext':
        return await this.aiGenerator.generateTechContext(packageInfo);
      case 'activeContext':
        return await this.aiGenerator.generateActiveContext(packageInfo);
      case 'progress':
        return await this.aiGenerator.generateProgress(packageInfo);
      default:
        throw new Error(`Unknown Memory Bank file: ${fileName}`);
    }
  }

  /**
   * Generate README content for Memory Bank
   * @param {Object} packageInfo - Repository analysis data
   * @returns {string} README content
   */
  generateReadmeContent(packageInfo) {
    const projectName = packageInfo.name || 'Project';
    const currentDate = new Date().toISOString().split('T')[0];

    return `# 🧠 Memory Bank

> **AI-Assisted Development Context for ${projectName}**

This Memory Bank provides persistent project context for AI assistants like Cline, ensuring continuity and understanding across development sessions.

## 📁 Structure

\`\`\`
memory-bank/
├── README.md                    # This file - Memory Bank overview
├── project/                     # Project Definition & Strategy
│   ├── projectbrief.md         # Mission, goals, scope
│   └── productContext.md       # Problem statement, solution overview
├── technical/                   # Technical Architecture & Implementation
│   ├── systemPatterns.md       # Architecture patterns, design decisions
│   └── techContext.md          # Technology stack, setup, dependencies
└── current/                     # Active Development State
    ├── activeContext.md        # Current work focus, recent changes
    └── progress.md             # Status, completed features, roadmap
\`\`\`

## 🎯 Purpose

The Memory Bank serves as a comprehensive knowledge base that:

- **Preserves Context**: Maintains project understanding across sessions
- **Accelerates Onboarding**: Provides instant project context for new team members
- **Enhances AI Assistance**: Gives AI assistants rich project background
- **Documents Decisions**: Tracks architectural and product decisions over time
- **Tracks Progress**: Maintains current status and evolution history

## 📖 File Descriptions

### 📋 Project Files (\`project/\`)

- **\`projectbrief.md\`**: Core mission, primary goals, target users, success criteria, and project scope
- **\`productContext.md\`**: Problem analysis, solution overview, user workflows, competitive landscape

### 🔧 Technical Files (\`technical/\`)

- **\`systemPatterns.md\`**: Architecture overview, design patterns, data flow, component relationships
- **\`techContext.md\`**: Technology stack, development environment, build processes, technical constraints

### ⚡ Current State Files (\`current/\`)

- **\`activeContext.md\`**: Current work focus, active tasks, recent changes, immediate priorities
- **\`progress.md\`**: Project status, completed features, known issues, quality metrics

## 🚀 Usage

### For AI Assistants (Cline, etc.)
\`\`\`bash
# Initialize Memory Bank
shelly memory init

# Check status
shelly memory status

# View specific context
shelly memory show project/projectbrief.md
shelly memory show current/activeContext.md

# Update with latest changes
shelly memory update
\`\`\`

### For Developers
The Memory Bank is automatically maintained by Shelly but can be manually updated:

1. **Read** relevant context before starting work
2. **Update** active context and progress as you work  
3. **Review** technical decisions and patterns for consistency
4. **Reference** project goals to stay aligned

## 🔄 Maintenance

- **Automatic**: Updated during \`shelly organize\` and \`shelly memory\` commands
- **Manual**: Edit files directly or use \`shelly memory update\`
- **Frequency**: Update \`activeContext.md\` and \`progress.md\` regularly
- **Versioning**: Commit Memory Bank changes with your code

## 🎯 Best Practices

1. **Keep Current**: Update active context and progress frequently
2. **Be Specific**: Include concrete details, not just generic statements
3. **Link Decisions**: Reference why choices were made, not just what was chosen
4. **Track Evolution**: Document how the project has evolved over time
5. **Stay Relevant**: Remove outdated information, update priorities

## 🔗 Integration

This Memory Bank integrates with:
- **Shelly CLI**: Automated maintenance and updates
- **AI Assistants**: Rich context for code assistance
- **Development Workflow**: Project onboarding and knowledge transfer
- **Documentation**: Single source of truth for project state

---

**Generated**: ${currentDate} | **Project**: ${projectName} | **Tool**: Shelly Memory Bank
**Last Updated**: ${currentDate}

> 💡 **Tip**: Use \`shelly memory show <file>\` to view any Memory Bank file, or browse this directory directly.
`;
  }

  /**
   * Analyze repository for Memory Bank context using Neurolink
   * @param {string} repositoryPath - Path to repository
   * @returns {Promise<Object>} Repository analysis with neurolink content
   */
  async analyzeRepository(repositoryPath = '.') {
    const analysis = {
      name: '',
      description: '',
      version: '',
      repoType: 'Node.js Project',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      license: 'MIT',
      author: '',
      repository: '',
      lastUpdated: new Date().toISOString(),
      neurolinkContent: null as Record<string, string> | null,
      projectStructure: {
        hasSrc: false,
        hasTests: false,
        hasDocs: false,
      } as ProjectStructure,
    };

    try {
      // Read package.json
      const packagePath = path.join(repositoryPath, 'package.json');
      if (await this.fileExists(packagePath)) {
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);

        Object.assign(analysis, {
          name: packageJson.name || analysis.name,
          description: packageJson.description || analysis.description,
          version: packageJson.version || analysis.version,
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          scripts: packageJson.scripts || {},
          license: packageJson.license || analysis.license,
          author: packageJson.author || analysis.author,
          repository: packageJson.repository?.url || analysis.repository,
        });

        // Determine project type
        if (
          packageJson.dependencies?.react ||
          packageJson.devDependencies?.react
        ) {
          analysis.repoType = 'React Project';
        } else if (
          packageJson.dependencies?.typescript ||
          packageJson.devDependencies?.typescript
        ) {
          analysis.repoType = 'TypeScript Project';
        } else if (packageJson.dependencies?.express) {
          analysis.repoType = 'Express API Project';
        } else if (packageJson.bin) {
          analysis.repoType = 'CLI Tool';
        }
      }

      // Analyze project structure
      const srcExists = await this.fileExists(path.join(repositoryPath, 'src'));
      const testExists = await this.fileExists(
        path.join(repositoryPath, 'test')
      );
      const docsExists = await this.fileExists(
        path.join(repositoryPath, 'docs')
      );

      analysis.projectStructure = {
        hasSrc: srcExists,
        hasTests: testExists,
        hasDocs: docsExists,
      };

      // Generate comprehensive memory bank content using Neurolink
      console.log('🧠 Generating Memory Bank content with Neurolink...');
      analysis.neurolinkContent =
        await this.generateNeurolinkContent(repositoryPath);
    } catch (error) {
      console.warn(
        'Warning: Could not fully analyze repository:',
        error.message
      );
    }

    return analysis;
  }

  /**
   * Generate comprehensive memory bank content using Neurolink (Two-step process)
   * @param {string} repositoryPath - Path to repository
   * @returns {Promise<Object>} Parsed neurolink content by file
   */
  async generateNeurolinkContent(repositoryPath = '.') {
    // Check if AI is enabled and has valid API key
    if (!aiConfigService.isAIEnabled()) {
      console.log('AI is disabled, using template-based generation...');
      return null;
    }

    if (!aiConfigService.hasValidApiKey()) {
      console.log(
        'No AI API key configured, using template-based generation...'
      );
      console.log(
        '💡 Tip: Set GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, or use Ollama for AI features.'
      );
      return null;
    }

    try {
      // Step 1: Analyze repository structure and understand the project
      console.log(
        '🔍 Step 1: Analyzing repository structure with neurolink...'
      );
      const repositoryAnalysis =
        await this.analyzeRepositoryWithNeurolink(repositoryPath);

      if (!repositoryAnalysis) {
        throw new Error('Repository analysis failed');
      }

      // Step 2: Generate memory bank content using analysis + Cline rules
      console.log(
        '📝 Step 2: Generating memory bank content using analysis + Cline rules...'
      );
      return await this.generateMemoryBankWithAnalysis(
        repositoryAnalysis,
        repositoryPath
      );
    } catch (error) {
      console.warn('Neurolink generation failed:', error.message);
      console.log('🔄 Falling back to individual AI generation...');
      return null; // Will trigger fallback to individual file generation
    }
  }

  /**
   * Step 1: Analyze repository structure and understand everything about the project
   * @param {string} repositoryPath - Path to repository
   * @returns {Promise<string>} Comprehensive repository analysis
   */
  async analyzeRepositoryWithNeurolink(repositoryPath = '.') {
    try {
      const aiConfig = aiConfigService.getNeuroLinkOptions();
      const analysisPrompt = `REPOSITORY ANALYSIS REQUEST:

Please thoroughly analyze this repository (pwd: ${process.cwd()}) and provide a comprehensive understanding of the project.

ANALYZE ALL ASPECTS:
1. Project Type & Purpose:
   - What kind of project is this? (CLI tool, web app, library, API, etc.)
   - What problems does it solve?
   - Who are the target users?

2. Technical Architecture:
   - Main entry points and key files
   - Code structure and organization
   - Design patterns used
   - Component relationships

3. Technology Stack:
   - Programming languages
   - Dependencies and their purposes
   - Development tools and frameworks
   - Build and deployment setup

4. Functionality Analysis:
   - Core features and capabilities
   - Commands, APIs, or interfaces
   - Integration points
   - Configuration options

5. Project State:
   - Development phase and maturity
   - Recent changes and focus areas
   - Known issues or limitations
   - Future roadmap indicators

6. Development Context:
   - File structure and organization
   - Testing approach
   - Documentation state
   - Quality measures

Please provide a detailed, comprehensive analysis that covers all these aspects. Be specific and include actual details from the codebase, not generic statements.`;

      // Write prompt to temporary file to avoid shell injection
      const tempDir = os.tmpdir();
      const tempPromptFile = path.join(
        tempDir,
        `shelly-analysis-${Date.now()}.txt`
      );

      // Validate temp file path for safety
      if (!isValidTempFilePath(tempPromptFile)) {
        throw new Error('Invalid temporary file path');
      }

      await fs.writeFile(tempPromptFile, analysisPrompt, 'utf8');

      try {
        // Build command with configured provider and model
        // Provider and model are validated by aiConfigService
        let command = `npx @juspay/neurolink generate "$(cat ${shellEscape(tempPromptFile)})" --provider ${shellEscape(aiConfig.provider)} --model ${shellEscape(aiConfig.model)}`;
        if (aiConfig.baseURL) {
          command += ` --baseURL ${shellEscape(aiConfig.baseURL)}`;
        }

        const env = {
          ...process.env,
        };

        const { stdout, stderr } = await execAsync(command, {
          cwd: repositoryPath,
          env: env,
          maxBuffer: 1024 * 1024 * 10,
        });

        if (stderr) {
          console.warn('Repository analysis stderr:', stderr);
        }

        return stdout.trim();
      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempPromptFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.warn('Repository analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Step 2: Generate memory bank content using repository analysis + Cline rules
   * @param {string} repositoryAnalysis - Comprehensive repository analysis from step 1
   * @param {string} repositoryPath - Path to repository
   * @returns {Promise<Object>} Parsed neurolink content by file
   */
  async generateMemoryBankWithAnalysis(
    repositoryAnalysis,
    repositoryPath = '.'
  ) {
    try {
      // Read .clinerules template to provide context
      const clineruleTemplatePath = path.join(
        'src/shelly/templates/.clinerules.template'
      );
      let clinerules = '';

      if (await this.fileExists(clineruleTemplatePath)) {
        clinerules = await fs.readFile(clineruleTemplatePath, 'utf8');
      }

      // Create a temporary file for the complex prompt to avoid shell parsing issues
      const tempPromptFile = path.join(
        repositoryPath,
        '.temp_memory_prompt.txt'
      );
      const memoryBankPrompt = `CRITICAL: You MUST generate ALL 6 memory bank files. Do not generate partial responses.

MEMORY BANK GENERATION REQUEST:

Based on the comprehensive repository analysis provided below, generate Memory Bank documentation following Cline rules.

CLINE RULES FOR MEMORY BANK:
${clinerules}

REPOSITORY ANALYSIS (from Step 1):
${repositoryAnalysis}

MANDATORY REQUIREMENT: Generate exactly 6 separate memory bank files with these EXACT markers. You MUST include ALL 6 files in your response:

--- MEMORY_BANK_FILE: projectbrief.md ---
# Project Brief: [Project Name]

[Generate comprehensive Project Brief content here based on repository analysis]
[Include: Core requirements, goals, objectives, project scope, success metrics]
[Use actual project details from the analysis above]

--- MEMORY_BANK_FILE: productContext.md ---
# Product Context: [Project Name]

[Generate comprehensive Product Context content here based on repository analysis]
[Include: Problems solved, target users, user workflows, solution overview]
[Use actual project details from the analysis above]

--- MEMORY_BANK_FILE: systemPatterns.md ---
# System Patterns: [Project Name]

[Generate comprehensive System Patterns content here based on repository analysis]
[Include: Architecture overview, design patterns, component relationships, data flow]
[Use actual project details from the analysis above]

--- MEMORY_BANK_FILE: techContext.md ---
# Technical Context: [Project Name]

[Generate comprehensive Technical Context content here based on repository analysis]
[Include: Technology stack, dependencies, development setup, build processes]
[Use actual project details from the analysis above]

--- MEMORY_BANK_FILE: activeContext.md ---
# Active Context: [Project Name]

[Generate comprehensive Active Context content here based on repository analysis]
[Include: Current work focus, recent changes, active tasks, next steps]
[Use actual project details from the analysis above]

--- MEMORY_BANK_FILE: progress.md ---
# Progress: [Project Name]

[Generate comprehensive Progress content here based on repository analysis]
[Include: Current status, completed features, roadmap, known issues]
[Use actual project details from the analysis above]

CRITICAL REMINDER: Your response MUST contain ALL 6 files with the exact markers shown above. Each file should be comprehensive and follow Cline Memory Bank guidelines. Use the repository analysis to provide specific, accurate content for this project.`;

      // Write prompt to temporary file
      await fs.writeFile(tempPromptFile, memoryBankPrompt, 'utf8');

      // Validate temp file path for safety
      if (!isValidTempFilePath(tempPromptFile)) {
        throw new Error('Invalid temporary file path');
      }

      // Build command with configured provider and model
      // Provider and model are validated by aiConfigService
      const aiConfig = aiConfigService.getNeuroLinkOptions();
      let command = `npx @juspay/neurolink generate "$(cat ${shellEscape(tempPromptFile)})" --provider ${shellEscape(aiConfig.provider)} --model ${shellEscape(aiConfig.model)} --max 8000`;
      if (aiConfig.baseURL) {
        command += ` --baseURL ${shellEscape(aiConfig.baseURL)}`;
      }

      const env = {
        ...process.env,
      };

      const { stdout, stderr } = await execAsync(command, {
        cwd: repositoryPath,
        env: env,
        maxBuffer: 1024 * 1024 * 10,
      });

      // Clean up temporary file
      try {
        await fs.unlink(tempPromptFile);
      } catch (unlinkError) {
        console.warn(
          'Warning: Could not clean up temporary prompt file:',
          unlinkError.message
        );
      }

      if (stderr) {
        console.warn('Memory bank generation stderr:', stderr);
      }

      // Parse the neurolink output into individual files
      return this.parseNeurolinkOutput(stdout);
    } catch (error) {
      console.warn('Memory bank generation failed:', error.message);
      return null;
    }
  }

  /**
   * Parse neurolink output into individual memory bank files
   * @param {string} output - Raw neurolink output
   * @returns {Object} Parsed content by filename
   */
  parseNeurolinkOutput(output) {
    const parsedContent = {};
    const fileMarker = /--- MEMORY_BANK_FILE: ([^-]+) ---/g;

    // Split content by file markers
    const sections = output.split(fileMarker);

    // Process each section (skip first empty section)
    for (let i = 1; i < sections.length; i += 2) {
      const filename = sections[i].trim();
      const content = sections[i + 1] ? sections[i + 1].trim() : '';

      if (filename && content) {
        // Map filename to full path
        const fileMap = {
          'projectbrief.md': 'project/projectbrief.md',
          'productContext.md': 'project/productContext.md',
          'systemPatterns.md': 'technical/systemPatterns.md',
          'techContext.md': 'technical/techContext.md',
          'activeContext.md': 'current/activeContext.md',
          'progress.md': 'current/progress.md',
        };

        const fullPath = fileMap[filename] || filename;
        parsedContent[fullPath] = content;
      }
    }

    console.log(
      `✅ Parsed ${Object.keys(parsedContent).length} memory bank files from neurolink`
    );
    return parsedContent;
  }

  /**
   * Check if Memory Bank exists and is valid
   * @returns {Promise<Object>} Memory Bank status
   */
  async getMemoryBankStatus() {
    const status = {
      exists: false,
      complete: false,
      files: {},
      missingFiles: [],
      lastUpdated: null,
    };

    const directoryExists = await this.fileExists(this.targetPath);
    if (!directoryExists) {
      return status;
    }

    status.exists = true;
    let newestDate = null;

    for (const fileName of this.coreFiles) {
      const filePath = path.join(this.targetPath, fileName);
      const exists = await this.fileExists(filePath);

      status.files[fileName] = exists;

      if (!exists) {
        status.missingFiles.push(fileName);
      } else {
        const stats = await fs.stat(filePath);
        if (!newestDate || stats.mtime > newestDate) {
          newestDate = stats.mtime;
        }
      }
    }

    status.complete = status.missingFiles.length === 0;
    status.lastUpdated = newestDate;

    return status;
  }

  /**
   * Generate .clinerules content with project name only
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Template content with project name replaced
   */
  async generateClinerules(packageInfo) {
    console.log('🚀 Using .clinerules template with project name only');
    return this.loadTemplateWithProjectNameOnly(
      '.clinerules.template',
      packageInfo
    );
  }

  /**
   * Alternative neurolink generation (kept for future experimentation)
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Generated .clinerules content
   */
  async generateClinerulesWithNeurolink(packageInfo) {
    try {
      // Create comprehensive prompt for EXACT NeuroLink formatting and style
      const clinerulestPrompt = `EXACT NEUROLINK .CLINERULES REPLICATION:

Generate a .clinerules file that EXACTLY matches NeuroLink's formatting style and structure.

PROJECT ANALYSIS:
${JSON.stringify(packageInfo, null, 2)}

CRITICAL FORMATTING REQUIREMENTS:
1. Use EXACT NeuroLink header formatting with emojis
2. Follow NeuroLink bullet point style with **bold titles**: description
3. Use NeuroLink quote blocks with specific icons
4. Match NeuroLink code block formatting exactly
5. Include only relevant sections for this project
6. Use NeuroLink's precise language patterns

EXACT FORMAT TO FOLLOW:

# [Project Name] Project Rules

### **MIGRATION PATTERNS**
- **[Bold Pattern Name]**: [Description specific to this project]
- **[Bold Pattern Name]**: [Description specific to this project]  
- **[Bold Pattern Name]**: [Description specific to this project]

> **📚 Historical Learning Archive**: See \`memory-bank/\` for [project-specific context]
> **🎯 Current Focus**: [Current project focus based on analysis]

---

## 🏗️ [PROJECT-SPECIFIC ARCHITECTURE PATTERN NAME]

### **[Architecture Foundation Pattern] (CRITICAL)**
\`\`\`[language]
// [Project-specific architecture]
[actual file structure based on project analysis]
\`\`\`

### **Key Implementation Principles**
- **[PRINCIPLE NAME]**: [Project-specific implementation detail]
- **[PRINCIPLE NAME]**: [Project-specific implementation detail]
- **[PRINCIPLE NAME]**: [Project-specific implementation detail]
- **[PRINCIPLE NAME]**: [Project-specific implementation detail]
- **[PRINCIPLE NAME]**: [Project-specific implementation detail]

---

## 🛠️ ENTERPRISE DEVELOPMENT WORKFLOW

### **Complete Command Arsenal ([X]+ Commands)**

#### **[Category Name]**
\`\`\`bash
# [Description]
[actual project commands from analysis]

# [Description] 
[actual project commands from analysis]
\`\`\`

#### **[Category Name]**
\`\`\`bash
# [Description]
[actual project commands from analysis]
\`\`\`

[Continue with other relevant sections only if they apply to this project]

---

## 🔧 COMPLETE SDLC CYCLE

### **Phase 1: [Phase Name]**
\`\`\`bash
# 1. [Step description]
[actual commands for this project]

# 2. [Step description]  
[actual commands for this project]
\`\`\`

[Continue format for other phases]

---

## 🧪 COMPREHENSIVE TESTING & DEBUGGING STRATEGY

### **Testing Architecture ([X]-Layer System)**
\`\`\`
Layer 1: [Project-specific testing] → [Description]
Layer 2: [Project-specific testing] → [Description]  
Layer 3: [Project-specific testing] → [Description]
\`\`\`

### **Debugging Methodology (ESSENTIAL)**

#### **Step 1: [Step Name]**
\`\`\`[language]
// [Project-specific debugging code]
[actual code examples from project]
\`\`\`

[Continue with other relevant sections using EXACT NeuroLink formatting]

GENERATE ONLY RELEVANT SECTIONS FOR THIS PROJECT. Use the EXACT formatting style, structure, and language patterns from NeuroLink. Make it project-specific but follow NeuroLink's precise formatting conventions.`;

      // Write prompt to temporary file to avoid shell injection
      const tempDir = os.tmpdir();
      const tempClinerulestFile = path.join(
        tempDir,
        `shelly-clinerules-${Date.now()}.txt`
      );

      // Validate temp file path for safety
      if (!isValidTempFilePath(tempClinerulestFile)) {
        throw new Error('Invalid temporary file path');
      }

      await fs.writeFile(tempClinerulestFile, clinerulestPrompt, 'utf8');

      try {
        // Build command with configured provider and model
        // Provider and model are validated by aiConfigService
        const aiConfig = aiConfigService.getNeuroLinkOptions();
        let command = `npx --yes @juspay/neurolink generate "$(cat ${shellEscape(tempClinerulestFile)})" --provider ${shellEscape(aiConfig.provider)} --model ${shellEscape(aiConfig.model)} --max 8000`;
        if (aiConfig.baseURL) {
          command += ` --baseURL ${shellEscape(aiConfig.baseURL)}`;
        }

        const env = {
          ...process.env,
        };

        const { stdout, stderr } = await execAsync(command, {
          cwd: '.',
          env: env,
          maxBuffer: 1024 * 1024 * 10,
          timeout: 120000, // 2 minute timeout
        });

        if (stderr && !stderr.includes('Generating text')) {
          console.warn('.clinerules generation stderr:', stderr);
        }

        const result = stdout.trim();

        // Validate that we got comprehensive content
        if (result.length < 1000) {
          throw new Error(
            'Generated content too short, falling back to enhanced template'
          );
        }

        console.log('🤖 Generated comprehensive .clinerules using neurolink');
        return result;
      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempClinerulestFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.warn('.clinerules neurolink generation failed:', error.message);
      console.log('🔄 Using enhanced fallback generation...');

      // Fallback to enhanced template-based generation
      return this.generateEnhancedClinerules(packageInfo);
    }
  }

  /**
   * Generate enhanced .clinerules content as comprehensive fallback
   * @param {Object} packageInfo - Repository analysis data
   * @returns {string} Enhanced .clinerules content
   */
  generateEnhancedClinerules(packageInfo) {
    const projectName = packageInfo.name || 'Project';

    return `# ${projectName} Project Rules

### **MIGRATION PATTERNS**
- **Modular Architecture Enhancement**: ${this.getArchitecturePattern(packageInfo)} with extensible command processing
- **AI Integration Evolution**: Deep integration with Neurolink for intelligent error analysis and suggestions
- **Shell Environment Compatibility**: Universal shell support (bash, zsh, tcsh) with seamless integration

> **📚 Historical Learning Archive**: See \`memory-bank/\` for complete project context
> **🎯 Current Focus**: ${packageInfo.description || 'Intelligent CLI assistant development'}

---

## 🏗️ ARCHITECTURE PATTERNS (CRITICAL)

### **Core Module Structure**
\`\`\`javascript
${this.generateProjectStructure(packageInfo)}
\`\`\`

### **Key Implementation Principles**
- **Modular Design**: Service-oriented architecture with clear separation of concerns
- **Command Pattern**: CLI commands encapsulate actions for extensibility
- **Observer Pattern**: Monitors command execution for failure detection
- **Strategy Pattern**: Multiple suggestion algorithms based on error context
- **Factory Pattern**: Dynamic service instantiation and dependency injection

### **Component Relationships**
\`\`\`
CLI Interface → Command Parser → History Analyzer → AI Engine → Interactive UI
     ↓              ↓              ↓              ↓            ↓
Shell Integration  Error Detection  Context Analysis  Neurolink API  User Feedback
\`\`\`

---

## 🛠️ ENTERPRISE DEVELOPMENT WORKFLOW

### **Complete Command Arsenal (20+ Commands)**

#### **Core Development**
\`\`\`bash
${this.formatScripts(packageInfo.scripts)}

# Additional development commands
npm install                    # Install dependencies
npm run dev                   # Development mode
npm run build                 # Production build
npm run clean                 # Clean build artifacts
\`\`\`

#### **Quality & Testing**
\`\`\`bash
npm test                      # Run test suite
npm run test:watch           # Watch mode testing
npm run test:coverage        # Coverage analysis
npm run lint                 # ESLint validation
npm run lint:fix             # Auto-fix linting issues
npm run format               # Prettier formatting
npm run format:check         # Format validation
\`\`\`

#### **Memory Bank Management**
\`\`\`bash
node src/shelly/cli.js memory init        # Initialize memory bank
node src/shelly/cli.js memory status      # Check memory bank status
node src/shelly/cli.js memory update      # Update memory bank
node src/shelly/cli.js memory show <file> # Display specific file
\`\`\`

#### **Project Organization**
\`\`\`bash
node src/shelly/cli.js organize          # Project scaffolding
node src/shelly/cli.js organize --force  # Force reorganization
node src/shelly/cli.js status            # Project health check
\`\`\`

---

## 🔧 COMPLETE SDLC CYCLE

### **Phase 1: Development Setup**
\`\`\`bash
# 1. Environment preparation
npm install
npm run build

# 2. Verify system integration
node src/main.js --version
node src/shelly/cli.js --help
\`\`\`

### **Phase 2: Feature Development**
\`\`\`bash
# 1. Start development
npm run dev

# 2. Continuous testing
npm run test:watch

# 3. Code quality checks
npm run lint
npm run format
\`\`\`

### **Phase 3: Pre-Commit Validation**
\`\`\`bash
# 1. Complete quality check
npm run lint && npm run format && npm test

# 2. Build validation
npm run build

# 3. Memory bank update
node src/shelly/cli.js memory update
\`\`\`

### **Phase 4: Testing & Validation**
\`\`\`bash
# 1. Comprehensive testing
npm test
npm run test:coverage

# 2. Integration testing
node src/main.js "test command"
node src/shelly/cli.js organize
\`\`\`

### **Phase 5: Pre-Release**
\`\`\`bash
# 1. Final build
npm run build

# 2. Documentation sync
node src/shelly/cli.js memory update

# 3. Version preparation
npm version patch|minor|major
\`\`\`

### **Phase 6: Release & Deploy**
\`\`\`bash
# 1. Tag and release
git tag v$(npm pkg get version | tr -d '"')
git push origin main --tags

# 2. NPM publishing (if applicable)
npm publish
\`\`\`

---

## 🧪 COMPREHENSIVE TESTING & DEBUGGING STRATEGY

### **Testing Architecture (3-Layer System)**
\`\`\`
Layer 1: Unit Tests → Command parsing, history analysis, error detection
Layer 2: Integration Tests → Shell integration, AI suggestion flow
Layer 3: System Tests → End-to-end workflows, cross-platform compatibility
\`\`\`

### **Testing Commands by Category**
\`\`\`bash
# DEVELOPMENT TESTING
npm test                      # Full test suite
npm run test:watch           # Interactive testing
npm run test:coverage        # Coverage analysis

# INTEGRATION TESTING
node src/main.js --debug     # Debug mode testing
bash -c "false; node src/main.js"  # Error simulation
\`\`\`

### **Debugging Methodology (ESSENTIAL)**
\`\`\`javascript
// Step 1: Enable debug logging
DEBUG=shelly:* node src/main.js

// Step 2: Shell integration testing
export SHELL_DEBUG=1
node src/main.js --debug

// Step 3: AI integration validation
node src/shelly/cli.js memory init --debug
\`\`\`

---

## 🔐 AUTHENTICATION & INTEGRATION PATTERNS

### **Neurolink Integration (CRITICAL)**
\`\`\`bash
# Environment variable for Google AI (free tier)
export GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
\`\`\`

### **Shell Environment Integration**
\`\`\`bash
# Add to shell profile (.bashrc, .zshrc, etc.)
alias shelp='node /path/to/shelly/src/main.js'
alias s='node /path/to/shelly/src/main.js'

# Optional: Auto-analyze failed commands
trap 'node /path/to/shelly/src/main.js' ERR
\`\`\`

---

## 📖 MEMORY BANK MANAGEMENT PATTERNS

### **Memory Bank File Hierarchy**
\`\`\`
memory-bank/
├── project/                  # Project Definition & Strategy
│   ├── projectbrief.md      # Foundation document - shapes all others
│   └── productContext.md    # Why project exists, problems solved
├── technical/                # Technical Architecture & Implementation
│   ├── systemPatterns.md    # Architecture, technical decisions
│   └── techContext.md       # Technologies, setup, constraints
└── current/                  # Active Development State
    ├── activeContext.md     # Current work focus, recent changes
    └── progress.md          # What works, what's left, status
\`\`\`

### **When to Update Memory Bank**
1. **After implementing significant changes**
2. **When user requests "update memory bank"** (MUST review ALL files)
3. **Before major releases or milestones**
4. **When project patterns or architecture evolve**

---

## 💻 DEVELOPMENT STANDARDS

### **Code Organization Principles**
\`\`\`javascript
// Service-oriented architecture
src/
├── main.js                  // Primary CLI entry point
├── services/                // Core business logic
│   ├── analysisService.js   // Command analysis
│   ├── historyService.js    // Shell history management
│   └── shellService.js      // Shell integration
└── shelly/                  // Secondary CLI system
    ├── cli.js               // Shelly CLI entry point
    ├── commands/            // Command implementations
    ├── services/            // Shelly-specific services
    └── utils/               // Shared utilities
\`\`\`

### **Error Handling Standards**
\`\`\`javascript
// Graceful error handling with user guidance
const handleError = (error, context) => {
  console.error(\`❌ \${error.message}\`);
  
  if (context.suggestions) {
    console.log('💡 Suggestions:');
    context.suggestions.forEach(suggestion => {
      console.log(\`  • \${suggestion}\`);
    });
  }
};
\`\`\`

---

## ⚡ CRITICAL SUCCESS FACTORS

### **AI Suggestion Accuracy (ESSENTIAL)**
- **Neurolink Integration**: Properly configured with API keys and environment
- **Context Analysis**: Rich command history and error pattern recognition
- **User Feedback Loop**: Continuous improvement based on user interactions

### **Performance & Compatibility**
- **Shell Integration**: Universal support for bash, zsh, tcsh environments
- **Response Time**: AI suggestions delivered within 2-3 seconds
- **Memory Efficiency**: Minimal impact on terminal performance

### **Development Workflow Validation**
\`\`\`bash
# Complete validation pipeline
npm install && npm run build && npm test && npm run lint
node src/main.js --version
node src/shelly/cli.js memory status
\`\`\`

---

## 🎯 WORKING EXAMPLES (VERIFIED)

### **Basic Error Analysis**
\`\`\`bash
# Simulate failed command, then analyze
git push origin nonexistent-branch
node src/main.js  # Analyzes the failed git command

# Direct command analysis
node src/main.js "npm isntall express"
\`\`\`

### **Memory Bank Workflow**
\`\`\`bash
# Initialize comprehensive project documentation
node src/shelly/cli.js memory init

# Check current status
node src/shelly/cli.js memory status

# View specific context
node src/shelly/cli.js memory show project/projectbrief.md
\`\`\`

### **Project Organization**
\`\`\`bash
# Set up new project with Shelly enhancements
mkdir myproject && cd myproject
npm init -y
node ../shelly/src/shelly/cli.js organize
node ../shelly/src/shelly/cli.js memory init
\`\`\`

---

**🎯 OPERATIONAL EXCELLENCE**: This .clinerules file provides comprehensive operational knowledge for ${projectName} development. All patterns, workflows, and standards are production-tested and designed for seamless developer workflow integration.
`;
  }

  /**
   * Generate basic .clinerules content as fallback
   * @param {Object} packageInfo - Repository analysis data
   * @returns {string} Basic .clinerules content
   */
  generateBasicClinerules(packageInfo) {
    const projectName = packageInfo.name || 'Project';
    const projectType = packageInfo.repoType || 'Node.js Project';

    return `# ${projectName} Project Rules

### **PROJECT MISSION**
- **Core Purpose**: ${packageInfo.description || 'Development project'}
- **Project Type**: ${projectType}
- **Architecture Pattern**: ${this.getArchitecturePattern(packageInfo)}

> **📚 Memory Bank Integration**: See \`memory-bank/\` for complete project context and AI assistant continuity
> **🎯 Current Focus**: Active development and enhancement

---

## 🏗️ PROJECT ARCHITECTURE

### **Core Structure**
\`\`\`
${this.generateProjectStructure(packageInfo)}
\`\`\`

### **Key Technologies**
${this.formatDependencies(packageInfo.dependencies)}

### **Development Dependencies**
${this.formatDependencies(packageInfo.devDependencies)}

---

## 🛠️ DEVELOPMENT WORKFLOW

### **Available Scripts**
\`\`\`bash
${this.formatScripts(packageInfo.scripts)}
\`\`\`

### **Development Commands**
\`\`\`bash
# Install dependencies
npm install

# Development mode
npm run dev

# Testing
npm test

# Build
npm run build

# Linting
npm run lint
\`\`\`

---

## 🧪 TESTING & VALIDATION

### **Testing Strategy**
- **Unit Tests**: Core functionality validation
- **Integration Tests**: Component interaction testing
- **Quality Assurance**: Linting and formatting validation

### **Quality Commands**
\`\`\`bash
npm test                       # Run test suite
npm run lint                   # Code quality check
npm run format                 # Code formatting
\`\`\`

---

## 📖 MEMORY BANK INTEGRATION

### **Memory Bank Management**
\`\`\`bash
# Initialize memory bank
node src/shelly/cli.js memory init

# Check status
node src/shelly/cli.js memory status

# Update memory bank
node src/shelly/cli.js memory update
\`\`\`

### **Memory Bank Structure**
\`\`\`
memory-bank/
├── project/                   # Project definition & strategy
├── technical/                 # Technical architecture & implementation
└── current/                   # Active development state
\`\`\`

---

## ⚡ CRITICAL SUCCESS FACTORS

### **Project Validation**
- **Dependencies**: All required packages installed
- **Configuration**: Environment variables configured
- **Testing**: All tests passing
- **Documentation**: Memory bank up to date

### **Development Standards**
- **Code Quality**: Consistent formatting and linting
- **Testing Coverage**: Comprehensive test coverage
- **Documentation**: Clear and current documentation
- **Version Control**: Meaningful commit messages

---

**🎯 PROJECT EXCELLENCE**: This .clinerules file provides the operational knowledge for ${projectName} development. All patterns and workflows are specific to this project's architecture and requirements.
`;
  }

  /**
   * Get architecture pattern based on project analysis
   * @param {Object} packageInfo - Repository analysis data
   * @returns {string} Architecture pattern description
   */
  getArchitecturePattern(packageInfo) {
    if (packageInfo.dependencies?.react) return 'React Component Architecture';
    if (packageInfo.dependencies?.express)
      return 'Express REST API Architecture';
    if (packageInfo.bin) return 'CLI Tool Architecture';
    if (packageInfo.dependencies?.typescript)
      return 'TypeScript Modular Architecture';
    return 'Node.js Modular Architecture';
  }

  /**
   * Generate project structure representation
   * @param {Object} packageInfo - Repository analysis data
   * @returns {string} Project structure
   */
  generateProjectStructure(packageInfo) {
    let structure = `${packageInfo.name || 'project'}/\n├── package.json\n├── README.md`;

    if (packageInfo.projectStructure?.hasSrc) {
      structure += '\n├── src/\n│   └── main.js';
    }

    if (packageInfo.projectStructure?.hasTests) {
      structure += '\n├── test/';
    }

    if (packageInfo.projectStructure?.hasDocs) {
      structure += '\n├── docs/';
    }

    structure += '\n└── memory-bank/           # AI assistant context';

    return structure;
  }

  /**
   * Format dependencies for display
   * @param {Object} deps - Dependencies object
   * @returns {string} Formatted dependencies
   */
  formatDependencies(deps = {}) {
    if (Object.keys(deps).length === 0) return '- None specified';

    return Object.entries(deps)
      .map(([name, version]) => `- **${name}**: ${version}`)
      .join('\n');
  }

  /**
   * Format scripts for display
   * @param {Object} scripts - Scripts object
   * @returns {string} Formatted scripts
   */
  formatScripts(scripts = {}) {
    if (Object.keys(scripts).length === 0) return '# No scripts defined';

    return Object.entries(scripts)
      .map(([name, command]) => `npm run ${name}              # ${command}`)
      .join('\n');
  }

  /**
   * Load raw template content without any placeholder replacement
   * @param {string} templateName - Name of template file
   * @returns {Promise<string>} Raw template content
   */
  async loadRawTemplate(templateName) {
    const templatePath = path.join('src/shelly/templates', templateName);

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
   * @param {string} templateName - Name of template file
   * @param {Object} packageInfo - Repository analysis data
   * @returns {Promise<string>} Template content with project name replaced
   */
  async loadTemplateWithProjectNameOnly(templateName, packageInfo) {
    const templatePath = path.join('src/shelly/templates', templateName);

    try {
      const content = await fs.readFile(templatePath, 'utf8');
      // Only replace the project name placeholder
      const projectName = packageInfo.name || packageInfo.repoName || 'Project';
      return content.replace(/\{\{projectName\}\}/g, projectName);
    } catch (error) {
      console.warn(
        `Warning: Could not load template ${templateName}: ${error.message}`
      );
      return '';
    }
  }

  /**
   * Check if file or directory exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const memoryBankService = new MemoryBankService();
