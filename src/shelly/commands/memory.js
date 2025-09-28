import { memoryBankService } from '../services/memoryBankService.js';
import inquirer from 'inquirer';

/**
 * Memory Bank Command - Manages project memory bank independently
 * Provides subcommands for Memory Bank operations
 */
export class MemoryCommand {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
  }

  /**
   * Execute memory command with subcommands
   * @param {string} subcommand - The memory subcommand to execute
   * @param {Object} options - Command options
   */
  async execute(subcommand, options = {}) {
    try {
      switch (subcommand) {
        case 'init':
          await this.initCommand(options);
          break;
        case 'update':
          await this.updateCommand(options);
          break;
        case 'show':
          await this.showCommand(options);
          break;
        case 'status':
          await this.statusCommand(options);
          break;
        case 'list':
          await this.listCommand(options);
          break;
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error(`❌ Memory Bank error: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Initialize Memory Bank command
   */
  async initCommand(options) {
    console.log('🧠 Initializing Memory Bank...');

    // Analyze repository for context
    const repoAnalysis = await memoryBankService.analyzeRepository(this.cwd);
    
    const initOptions = {
      force: options.force || false
    };

    // Check if Memory Bank already exists
    const status = await memoryBankService.getMemoryBankStatus();
    
    if (status.exists && !options.force) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Memory Bank already exists. Reinitialize?',
          default: false
        }
      ]);

      if (!proceed) {
        console.log('⏭️ Memory Bank initialization cancelled');
        return;
      }
      initOptions.force = true;
    }

    const results = await memoryBankService.initializeMemoryBank(repoAnalysis, initOptions);
    
    console.log('\n📊 Memory Bank Initialization Results:');
    if (results.created.length > 0) {
      console.log(`✨ Created: ${results.created.join(', ')}`);
    }
    if (results.updated.length > 0) {
      console.log(`🔄 Updated: ${results.updated.join(', ')}`);
    }
    if (results.skipped.length > 0) {
      console.log(`⏭️ Skipped: ${results.skipped.join(', ')}`);
    }
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.map(e => `${e.file} (${e.error})`).join(', ')}`);
    }

    console.log('\n✅ Memory Bank initialization complete!');
  }

  /**
   * Update Memory Bank command
   */
  async updateCommand(options) {
    console.log('🧠 Updating Memory Bank...');

    // Check if Memory Bank exists
    const status = await memoryBankService.getMemoryBankStatus();
    
    if (!status.exists) {
      console.log('❌ Memory Bank not found. Run `shelly memory init` first.');
      return;
    }

    // Analyze repository for updated context
    const repoAnalysis = await memoryBankService.analyzeRepository(this.cwd);
    
    const fileName = options.file || null;
    const results = await memoryBankService.updateMemoryBank(fileName, repoAnalysis);
    
    console.log('\n📊 Memory Bank Update Results:');
    if (results.updated.length > 0) {
      console.log(`🔄 Updated: ${results.updated.join(', ')}`);
    }
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.map(e => `${e.file} (${e.error})`).join(', ')}`);
    }

    console.log('\n✅ Memory Bank update complete!');
  }

  /**
   * Show Memory Bank file command
   */
  async showCommand(options) {
    const fileName = options.file;
    
    if (!fileName) {
      console.log('❌ Please specify a file to show. Usage: shelly memory show <filename>');
      console.log('Available files: projectbrief.md, productContext.md, systemPatterns.md, techContext.md, activeContext.md, progress.md');
      return;
    }

    try {
      const content = await memoryBankService.readMemoryBankFile(fileName);
      console.log(`\n📄 Memory Bank File: ${fileName}\n`);
      console.log('═'.repeat(60));
      console.log(content);
      console.log('═'.repeat(60));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Memory Bank file '${fileName}' not found.`);
        console.log('Run `shelly memory status` to see available files.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Show Memory Bank status command
   */
  async statusCommand(options) {
    console.log('🧠 Memory Bank Status\n');

    const status = await memoryBankService.getMemoryBankStatus();
    
    if (!status.exists) {
      console.log('❌ Memory Bank not found');
      console.log('💡 Run `shelly memory init` to create Memory Bank');
      return;
    }

    console.log(`✅ Memory Bank exists`);
    console.log(`📈 Complete: ${status.complete ? 'Yes' : 'No'}`);
    
    if (status.lastUpdated) {
      console.log(`🕒 Last updated: ${status.lastUpdated.toISOString().split('T')[0]}`);
    }

    console.log('\n📁 File Status:');
    console.log('─'.repeat(40));
    
    Object.entries(status.files).forEach(([fileName, exists]) => {
      const icon = exists ? '✅' : '❌';
      console.log(`${icon} ${fileName}`);
    });

    if (status.missingFiles.length > 0) {
      console.log(`\n⚠️  Missing files: ${status.missingFiles.join(', ')}`);
      console.log('💡 Run `shelly memory update` to create missing files');
    }
  }

  /**
   * List Memory Bank files command
   */
  async listCommand(options) {
    console.log('🧠 Memory Bank Files\n');

    try {
      const files = await memoryBankService.listMemoryBankFiles();
      
      if (files.length === 0) {
        console.log('❌ No Memory Bank files found');
        console.log('💡 Run `shelly memory init` to create Memory Bank');
        return;
      }

      console.log('📁 Available Files:');
      console.log('─'.repeat(60));
      
      files.forEach(file => {
        const icon = file.exists ? '✅' : '❌';
        const size = file.exists ? `(${file.size} bytes)` : '(missing)';
        const modified = file.exists && file.lastModified ? 
          file.lastModified.toISOString().split('T')[0] : '';
        
        console.log(`${icon} ${file.name.padEnd(20)} ${size.padEnd(15)} ${modified}`);
      });

      console.log('\n💡 Use `shelly memory show <filename>` to view file contents');
      
    } catch (error) {
      console.log('❌ Error listing Memory Bank files:', error.message);
    }
  }

  /**
   * Show help for memory command
   */
  showHelp() {
    console.log(`
🧠 Shelly Memory Bank Commands

USAGE:
  shelly memory <subcommand> [options]

SUBCOMMANDS:
  init              Initialize Memory Bank for the current repository
  update [--file]   Update Memory Bank files (all or specific file)
  show <file>       Display contents of a Memory Bank file
  status            Show Memory Bank status and file availability
  list              List all Memory Bank files with details

OPTIONS:
  --force           Force operation (overwrite existing files)
  --file <name>     Specify a specific file for update operations

EXAMPLES:
  shelly memory init                    # Initialize Memory Bank
  shelly memory init --force            # Reinitialize existing Memory Bank
  shelly memory update                  # Update all Memory Bank files
  shelly memory update --file progress.md  # Update only progress.md
  shelly memory show projectbrief.md   # Show project brief content
  shelly memory status                  # Check Memory Bank status
  shelly memory list                    # List all files with details

MEMORY BANK FILES:
  projectbrief.md       Project mission, goals, and scope
  productContext.md     Problem statement and solution overview
  systemPatterns.md     Architecture and design patterns
  techContext.md        Technology stack and development setup
  activeContext.md      Current work focus and recent changes
  progress.md           Project status and completion tracking

The Memory Bank provides persistent project context for AI-assisted development,
ensuring continuity across development sessions and team collaboration.
`);
  }
}
