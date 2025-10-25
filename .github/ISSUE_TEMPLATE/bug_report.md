---
name: Bug report
about: Create a report to help us improve @juspay/shelly
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Shelly Feature Area

Which Shelly feature is affected? (check all that apply)

- [ ] 🔍 Error Analysis (command analysis, shell integration, AI suggestions)
- [ ] 🏗️ Repository Organization (project scaffolding, GitHub integration, file organization)
- [ ] 🧠 Memory Bank (AI context management, documentation generation)
- [ ] 🔧 CLI Interface (command parsing, argument handling)
- [ ] 🤖 AI Integration (Neurolink, Google AI services)

## Steps to Reproduce

Steps to reproduce the behavior:

1. Run command: `[specific shelly command]`
2. In directory: `[project type/structure]`
3. Expected result: `[what should happen]`
4. Actual result: `[error/unexpected behavior]`

## Command Context

**Command that failed:**

```bash
[paste the exact command that caused the issue]
```

**Shelly command used:**

```bash
[paste the shelly command that had the bug]
```

**Error output:**

```
[paste any error messages or unexpected output]
```

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Environment Information

**System Environment:**

- OS: [e.g. macOS 13.0, Ubuntu 22.04, etc.]
- Shell: [e.g. bash 5.1, zsh 5.8, tcsh 6.22]
- Node.js Version: [e.g. 18.17.0]
- @juspay/shelly Version: [e.g. 1.0.0]

**AI Integration:**

- [ ] Google AI Studio (free tier)
- [ ] Google Vertex AI (enterprise)
- [ ] Environment variables configured: [YES/NO]

**Project Context (if relevant):**

- Project type: [e.g. React, Node.js, CLI tool, etc.]
- Package manager: [e.g. npm, yarn, pnpm]
- Git repository: [YES/NO]
- Memory Bank initialized: [YES/NO]

## Shell Integration Details (for error analysis bugs)

**Shell alias setup:**

- [ ] Used `shelly --alias` command
- [ ] Added to shell configuration file (.bashrc, .zshrc, etc.)
- [ ] Shell configuration reloaded

**History access:**

- [ ] `fc` command available in shell
- [ ] History settings configured (HISTSIZE, SAVEHIST)
- [ ] Can access command history manually

## Repository Organization Details (for organize/init bugs)

**Project structure:**

- [ ] New project (created with `shelly init`)
- [ ] Existing project (enhanced with `shelly organize`)
- [ ] Package.json exists
- [ ] Git repository initialized

**Organization options used:**

- [ ] `--force` (overwrite existing files)
- [ ] `--update` (preserve existing files)
- [ ] `--move` (relocate misplaced files)
- [ ] `--directory` (specific target directory)

## Memory Bank Details (for memory command bugs)

**Memory Bank status:**

- [ ] Initialized with `shelly memory init`
- [ ] Files exist in memory-bank/ directory
- [ ] Neurolink integration working
- [ ] .clinerules file generated

**Memory Bank operations:**

- [ ] `memory init` - Initialization
- [ ] `memory update` - Updates
- [ ] `memory show` - File display
- [ ] `memory status` - Status check
- [ ] `memory list` - File listing

## Debug Information

**Debug mode output:**

```bash
# Run with debug mode and paste output
SHELLY_DEBUG=true shelly [your-command]
```

**Log files/Additional context:**

```
[Paste any relevant log output or additional context]
```

## Possible Solution

If you have suggestions on a fix for the bug, please describe it here.

## Additional Context

- Is this a regression from a previous version?
- Does this happen consistently or intermittently?
- Any workarounds you've discovered?
- Related issues or documentation you've consulted?
