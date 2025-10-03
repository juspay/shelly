# Contributing to Shelly

Thank you for your interest in contributing to Shelly! We welcome contributions from the community to help enhance our AI-powered development assistant platform.

Shelly combines **Error Analysis**, **Repository Organization**, and **Memory Bank** features to create a comprehensive development workflow enhancement tool. Whether you're interested in improving AI integration, shell compatibility, or developer experience, there's a place for your contribution.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Shelly Architecture Overview](#shelly-architecture-overview)
- [Development Setup](#development-setup)
- [Feature Areas](#feature-areas)
- [Making Changes](#making-changes)
- [Testing Guidelines](#testing-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Issue Guidelines](#issue-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code and help us maintain a welcoming, inclusive community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Understand Shelly's architecture (see below)
5. Choose a feature area to contribute to
6. Make your changes
7. Test your changes thoroughly
8. Submit a pull request

## Shelly Architecture Overview

Shelly uses a **dual CLI architecture** with three main feature areas:

### 🔍 **Error Analysis** (`src/main.js`)
- **Purpose**: Analyzes failed shell commands and provides AI-powered suggestions
- **Key Services**: `analysisService.js`, `historyService.js`, `shellService.js`
- **Shell Support**: bash, zsh, tcsh compatibility
- **AI Integration**: Neurolink and Google AI services

### 🏗️ **Repository Organization** (`src/shelly/cli.js`)
- **Purpose**: Project scaffolding, GitHub integration, and file organization
- **Key Components**: `commands/organize.js`, template system, GitHub integration
- **Features**: `shelly organize`, `shelly status`, `shelly init`

### 🧠 **Memory Bank** (`src/shelly/commands/memory.js`)
- **Purpose**: AI context management and documentation generation
- **Key Services**: `memoryBankService.js`, `aiContentGenerator.js`
- **Features**: `shelly memory init`, `shelly memory update`, persistent context

### Component Flow
```
Error Analysis: Shell History → Analysis Service → AI Integration → User Interface
Repository Org: Project Analysis → Template System → GitHub Integration → File Organization
Memory Bank: Project Context → AI Content Generator → Structured Documentation
```

## Feature Areas

Choose an area that matches your interests and expertise:

### 🔍 **Error Analysis Contributions**
- **Good for**: AI/ML enthusiasts, shell scripting experts, CLI tool developers
- **Skills needed**: JavaScript, shell scripting, AI/prompt engineering
- **Example contributions**:
  - Improve command analysis accuracy
  - Add support for new shells (fish, PowerShell)
  - Enhance AI prompt engineering
  - Add new error pattern recognition

### 🏗️ **Repository Organization Contributions**  
- **Good for**: DevOps engineers, project template enthusiasts, GitHub automation experts
- **Skills needed**: JavaScript, GitHub API, project scaffolding, file system operations
- **Example contributions**:
  - Add new project templates
  - Improve GitHub integration
  - Enhance file organization intelligence
  - Add support for new project types

### 🧠 **Memory Bank Contributions**
- **Good for**: Documentation enthusiasts, AI context management, developer experience
- **Skills needed**: JavaScript, AI content generation, documentation systems
- **Example contributions**:
  - Improve AI-generated documentation
  - Add new Memory Bank templates
  - Enhance context tracking
  - Improve integration with AI assistants

### 🤖 **AI Integration Contributions**
- **Good for**: AI/ML engineers, API integration specialists
- **Skills needed**: JavaScript, AI APIs, prompt engineering
- **Example contributions**:
  - Add new AI provider support
  - Improve prompt engineering
  - Enhance error analysis accuracy
  - Add new AI-powered features

### 🐚 **Shell Integration Contributions**
- **Good for**: System administrators, shell experts, cross-platform developers
- **Skills needed**: Shell scripting, cross-platform development
- **Example contributions**:
  - Improve shell compatibility
  - Add new shell support
  - Enhance command history parsing
  - Cross-platform compatibility improvements

### 📚 **Documentation & UX Contributions**
- **Good for**: Technical writers, UX designers, developer advocates
- **Skills needed**: Documentation, user experience design
- **Example contributions**:
  - Improve documentation
  - Enhance CLI user experience
  - Add examples and tutorials
  - User interface improvements

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/juspay/shelly
   cd shelly
   ```

   Note: The `git clone` command will create a folder named `shelly` by default. If you want a different folder name, you can specify it:

   ```bash
   git clone https://github.com/juspay/shelly my-shelly-project
   cd my-shelly-project
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Test the CLI locally:**
   ```bash
   npm start
   ```

## Making Changes

1. **Create a new branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   npm test
   npm start # Test the CLI manually
   ```

## Submitting a Pull Request

1. **Push your changes:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with details about your changes

3. **PR Requirements:**
   - Include a clear description of the changes
   - Reference any related issues
   - Ensure all tests pass
   - Follow the commit message guidelines

## Issue Guidelines

When creating an issue, please:

- Use a clear and descriptive title
- Provide detailed steps to reproduce (for bugs)
- Include your environment details (OS, Node.js version, etc.)
- Add relevant labels
- Search existing issues to avoid duplicates

### Bug Reports

Include:

- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots or error messages (if applicable)

### Feature Requests

Include:

- Clear description of the feature
- Use case or problem it solves
- Proposed solution (if you have one)
- Alternative solutions considered

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic release management. Please format your commit messages as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools (dependency updates, CI/CD configs, build scripts, etc.)

### Examples

```
feat: add support for zsh history analysis
fix: resolve issue with command parsing in Windows
docs: update installation instructions
chore: update dependencies to latest versions
chore: configure GitHub Actions for automated testing
```

## Development Guidelines

### Code Style

- Use ESLint configuration provided in the project
- Follow existing naming conventions
- Write clear, self-documenting code
- Add comments for complex logic

### Testing

- Write tests for new features
- Ensure existing tests continue to pass
- Test manual CLI functionality before submitting

### Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new functions
- Update CLI help text if you add new commands

## Release Process

This project uses semantic-release for automated releases. When your PR is merged to the main branch:

1. Semantic-release analyzes commit messages
2. Determines the next version number
3. Generates release notes
4. Publishes to npm
5. Creates a GitHub release

## Getting Help

If you need help or have questions:

- Create a new issue with the "question" label
- Reach out to the maintainers

## Recognition

Contributors will be recognized in the project's README and release notes. Thank you for helping make Shelly better!
