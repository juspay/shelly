# [1.2.0](https://github.com/juspay/Shelly/compare/v1.1.0...v1.2.0) (2025-11-16)

### Bug Fixes

- **release:** resolve formatting, ESM compatibility, error handling, and pnpm detection bugs ([f2e4819](https://github.com/juspay/Shelly/commit/f2e48191b4131fd276c5a2b21d66a4748bd4e723))

### Features

- **organize:** add critical infrastructure templates and fix all linting issues ([c41debf](https://github.com/juspay/Shelly/commit/c41debfd5e60067873c7ab6ecfdfcfa530b7f397)), closes [#45](https://github.com/juspay/Shelly/issues/45)

# [1.1.0](https://github.com/juspay/Shelly/compare/v1.0.0...v1.1.0) (2025-11-03)

### Features

- **migration:** migrate entire codebase to TypeScript with enhanced build system ([bd3c2ba](https://github.com/juspay/Shelly/commit/bd3c2baba4831ccd61df6cadde805b8c50fafed7))

# 1.0.0 (2025-10-25)

### Bug Fixes

- **ci:** resolve matrix.shell validation errors in release workflow ([d70f4c7](https://github.com/juspay/Shelly/commit/d70f4c7dbbc946c033b043cad3e1d4690fa2607a))

### Features

- **cli:** comprehensive AI-powered project scaffolding and setup ([28355d9](https://github.com/juspay/Shelly/commit/28355d93bd194f2dc99841e62fb8cb5c2ac05504))
- **github:** add advanced GitHub repository configuration ([b7fc3f9](https://github.com/juspay/Shelly/commit/b7fc3f999becae7e54133bb86d1dbd711f4668ee))
- update provider settings and fix organize command ([496046d](https://github.com/juspay/Shelly/commit/496046db1db4673bb36a275741a74eaac94b61d1))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

#### 🔄 TypeScript Migration

- **Complete TypeScript migration** from JavaScript to TypeScript for improved type safety
- **Enhanced build process** with automated template file copying (`scripts/copy-templates.js`)
- **Fixed event listener warnings** with increased maxListeners limit for concurrent AI operations
- **Improved development experience** with better IDE support and type checking
- **Updated build script** to `tsc && npm run copy-templates` ensuring all assets are properly bundled
- **Maintained full compatibility** with all existing features (organize, memory, github setup)

### Added

#### 🏗️ Repository Organization System

- **Complete project scaffolding** with `shelly organize` command
- **GitHub integration** with automated templates, workflows, and issue templates
- **Package enhancement** with automatic @juspay/ prefix and metadata optimization
- **Smart file organization** with `--move` option to relocate misplaced files
- **Configuration management** for ESLint, Prettier, Commitlint, and semantic-release
- **Project initialization** with `shelly init` for new project creation
- **Repository status checking** with `shelly status` command
- **Project templates** support for different project types (React, TypeScript, CLI tools)

#### 🚀 GitHub Repository Automation System

- **Automated repository setup** with `shelly gh` and `shelly github setup` commands
- **Branch protection rules** with automated "release" ruleset (linear history, PR requirements, force push protection)
- **Repository merge settings** configured for rebase-only workflow (disabled merge commits and squash merge)
- **GitHub Pages automation** with docs folder setup and ready-to-publish structure
- **GitHub Actions integration** with workflow permissions and fork PR approval settings
- **NPM publishing guidance** with automated NPM token setup instructions for publishing workflows
- **Complete setup command** with `shelly setup` combining GitHub automation and repository organization
- **Comprehensive GitHub configuration** following industry best practices for professional repositories

#### 🧠 Memory Bank System

- **AI-assisted development context** with comprehensive Memory Bank implementation
- **Structured documentation** organized into project, technical, and current state files
- **Neurolink integration** for advanced AI-generated documentation using Google Vertex AI
- **Memory Bank management** with full CLI suite (`init`, `update`, `show`, `status`, `list`)
- **Development continuity** preserving context across sessions and team changes
- **Cline integration** with optimized .clinerules generation
- **Project knowledge management** with centralized decision tracking

#### 🔧 Enhanced CLI System

- **Dual CLI architecture** with main error analysis and secondary organization tools
- **Advanced command handling** with Commander.js integration
- **Intelligent directory handling** with safe current working directory access
- **Enhanced error handling** with user-friendly guidance and suggestions
- **Debug mode improvements** with comprehensive logging and troubleshooting

#### 🐚 Extended Shell Support

- **Tcsh/Csh support** added to existing bash and zsh compatibility
- **Improved shell detection** with fallback mechanisms
- **Enhanced alias generation** for seamless integration across shells
- **Better error recovery** for shell integration issues

### Enhanced

- **AI analysis improvements** with pattern recognition and learning capabilities
- **Command suggestion engine** with expanded correction algorithms
- **Cross-platform compatibility** with enhanced macOS and Linux support
- **Package.json enhancement** with smart merging and conflict resolution
- **Documentation generation** with AI-powered content creation

### Fixed

- **Shell history access** reliability improvements
- **Command parsing** edge cases and error handling
- **File system operations** with better error recovery
- **Memory management** optimizations for large projects

## [1.0.0] - 2025-01-01

### Added

- Initial release of Shelly
- AI-powered command analysis and error correction
- Support for bash and zsh shell history
- Intelligent command suggestions
- CLI interface with `shelly` command
- Integration with @juspay/neurolink for AI processing
- Interactive command correction workflow
- Support for multiple shell environments
- Extensible architecture for future enhancements

---

_This changelog is automatically updated by semantic-release based on commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification._
