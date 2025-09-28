import { AIContentGenerator } from '../utils/aiContentGenerator.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Memory Bank Service - Manages the creation, updating, and maintenance of project memory bank
 * Implements Cline's Memory Bank protocol for persistent project context
 */
export class MemoryBankService {
  constructor() {
    this.aiGenerator = new AIContentGenerator();
    this.templatesPath = 'src/shelly/templates/memory-bank';
    this.targetPath = 'memory-bank';
    
    // Memory Bank structure with organized folders
    this.structure = {
      'README.md': { template: 'README.md.template', generator: null },
      'project/projectbrief.md': { template: 'projectbrief.md.template', generator: 'generateProjectBrief' },
      'project/productContext.md': { template: 'productContext.md.template', generator: 'generateProductContext' },
      'technical/systemPatterns.md': { template: 'systemPatterns.md.template', generator: 'generateSystemPatterns' },
      'technical/techContext.md': { template: 'techContext.md.template', generator: 'generateTechContext' },
      'current/activeContext.md': { template: 'activeContext.md.template', generator: 'generateActiveContext' },
      'current/progress.md': { template: 'progress.md.template', generator: 'generateProgress' }
    };
    
    // Core Memory Bank files for backward compatibility
    this.coreFiles = Object.keys(this.structure).filter(file => file !== 'README.md');
  }

  /**
   * Initialize Memory Bank for a repository
   * @param {Object} packageInfo - Repository analysis data
   * @param {Object} options - Options for initialization
   * @returns {Promise<Object>} Initialization results
   */
  async initializeMemoryBank(packageInfo, options = {}) {
    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: []
    };

    console.log('🧠 Initializing Memory Bank with organized structure...');

    // Ensure memory-bank directory and subdirectories exist
    await fs.mkdir(this.targetPath, { recursive: true });
    await fs.mkdir(path.join(this.targetPath, 'project'), { recursive: true });
    await fs.mkdir(path.join(this.targetPath, 'technical'), { recursive: true });
    await fs.mkdir(path.join(this.targetPath, 'current'), { recursive: true });

    // Create or update each file in the structure
    for (const [filePath, fileConfig] of Object.entries(this.structure)) {
      try {
        const fullPath = path.join(this.targetPath, filePath);
        const exists = await this.fileExists(fullPath);

        if (exists && !options.force) {
          console.log(`⏭️  Preserving existing ${filePath}`);
          results.skipped.push(filePath);
          continue;
        }

        const content = await this.generateMemoryBankContent(filePath, packageInfo);
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
      errors: []
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
          size: stats.size
        });
      } else {
        files.push({
          name: fileName,
          exists: false,
          lastModified: null,
          size: 0
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

    // Extract base name from path for content generation
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
   * Analyze repository for Memory Bank context
   * @param {string} repositoryPath - Path to repository
   * @returns {Promise<Object>} Repository analysis
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
      lastUpdated: new Date().toISOString()
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
          repository: packageJson.repository?.url || analysis.repository
        });

        // Determine project type
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          analysis.repoType = 'React Project';
        } else if (packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript) {
          analysis.repoType = 'TypeScript Project';
        } else if (packageJson.dependencies?.express) {
          analysis.repoType = 'Express API Project';
        } else if (packageJson.bin) {
          analysis.repoType = 'CLI Tool';
        }
      }

      // Analyze project structure
      const srcExists = await this.fileExists(path.join(repositoryPath, 'src'));
      const testExists = await this.fileExists(path.join(repositoryPath, 'test'));
      const docsExists = await this.fileExists(path.join(repositoryPath, 'docs'));
      
      analysis.projectStructure = {
        hasSrc: srcExists,
        hasTests: testExists,
        hasDocs: docsExists
      };

    } catch (error) {
      console.warn('Warning: Could not fully analyze repository:', error.message);
    }

    return analysis;
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
      lastUpdated: null
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
