# Error Analysis Demo Videos Guide

## Actual Video Asset

### ✅ shelly-core-demo.mov
**Duration**: 60 seconds (actual duration from your recording)
**Purpose**: Demonstrates Shelly's core error analysis feature
**Content**: Shows complete workflow from command failure to AI-powered solution

**What this video demonstrates**:
- Real command failure scenario (e.g., `grp` typo instead of `grep`)
- Running `shelly` command to get AI analysis
- Shelly's Neurolink AI providing intelligent suggestion
- Developer applying the suggested fix
- Successful command execution

**Key Features Shown**:
- ✅ Command error detection
- ✅ AI-powered analysis
- ✅ Clear fix suggestions
- ✅ Real-time workflow integration

**Duration**: 60-75 seconds
**Purpose**: Show AI's intelligent pattern recognition and learning
**Script**:
```bash
# Scene 1: Git typo pattern (20s)
$ git psuh origin main
git: 'psuh' is not a git command. See 'git --help'.

$ shelly
Analyzing previous command: "git psuh origin main"
Maybe you meant: git push origin main

# Scene 2: NPM typo pattern (20s)
$ npm isntall express
npm ERR! Unknown command: "isntall"

$ shelly
Maybe you meant: npm install express

# Scene 3: Multiple command suggestions (25s)
$ pythn app.py
pythn: command not found

$ shelly
Analyzing previous command: "pythn app.py"

--- Neurolink Analysis ---
Command 'pythn' not found. Based on file extension and context:

Suggestions:
1. python app.py (most likely)
2. python3 app.py (if using Python 3)
3. py app.py (Windows alternative)

Did you mean one of these?
- python
- python3
- pypy
--------------------------

# Scene 4: Success with chosen command (10s)
$ python3 app.py
Server running on port 3000...
```

**Narration Script**:
- "Shelly recognizes common typing patterns across different tools"
- "AI learns from context to provide better suggestions"
- "Multiple alternatives ranked by probability and context"
- "Smart suggestions that understand your development environment"

## Video Production Guidelines

### Technical Specifications
- **Resolution**: 1080p minimum, 1440p preferred
- **Frame Rate**: 60fps for smooth terminal interactions
- **Audio**: Clear narration with background music (optional)
- **Formats**: Both MP4 (H.264) and WebM (VP9) for web compatibility
- **Subtitles**: Include closed captions for accessibility

### Visual Style
- **Terminal Theme**: Dark theme with good contrast
- **Font Size**: Large enough to read clearly (14pt minimum)
- **Screen Recording**: Full terminal window, not just command area
- **Cursor**: Visible and smooth movement
- **Timing**: Natural typing speed, not too fast or slow

### Recording Tips
- **Real Sessions**: Use actual Shelly installation, not simulated
- **Clean Environment**: Remove personal information, clean history
- **Smooth Workflow**: Practice commands beforehand for smooth recording
- **Error Timing**: Let errors fully display before running shelly
- **AI Response**: Show full AI analysis, don't cut it short

### Post-Production
- **Editing**: Clean cuts between scenes, smooth transitions
- **Annotations**: Add text overlays for key features
- **Branding**: Include Juspay/Shelly logo and branding
- **Music**: Subtle background music that doesn't interfere with narration
- **Call-to-Action**: End with clear next steps for viewers

## Common Scenarios for Recording

### Scenario Bank
```bash
# Typo corrections
grp → grep
gti → git
pythn → python
npm isntall → npm install
git psuh → git push

# Permission errors
sudo npm install -g
mkdir /usr/local/restricted

# Missing dependencies
node app.js (missing express)
npm test (missing jest)
python app.py (missing modules)

# Configuration issues
npm start (missing scripts)
git push (no upstream)
docker run (missing image)
```

### Error Variety
- Command not found errors
- Permission denied issues
- Missing dependency problems
- Configuration mistakes
- Network connectivity issues
- File system problems
