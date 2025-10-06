# System Patterns: Shelly - AI-Powered Development Assistant

## **Architecture Overview**

Shelly employs a sophisticated dual CLI architecture that supports three primary domains: error analysis, repository organization, and AI-assisted development context management. The system integrates multiple AI services, comprehensive template systems, and robust shell integration to provide a seamless development experience.

## **Core Architecture Patterns**

### **🏗️ Dual CLI Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Shelly Platform                          │
├─────────────────────────────────────────────────────────────┤
│  Main CLI (src/main.js)          │  Secondary CLI           │
│  ┌─────────────────────────────┐  │  (src/shelly/cli.js)    │
│  │ Error Analysis Engine       │  │  ┌─────────────────────┐ │
│  │ - Shell Integration         │  │  │ Repository Organizer│ │
│  │ - Command History Access    │  │  │ Memory Bank Manager │ │
│  │ - AI Error Analysis         │  │  │ Project Initializer │ │
│  │ - Real-time Suggestions     │  │  │ Status Checker      │ │
│  └─────────────────────────────┘  │  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **🔄 Service-Oriented Architecture**

```
┌───────────────────────────────────────────────────────────────┐
│                     Service Layer                             │
├───────────────────────────────────────────────────────────────┤
│ Analysis Service │ History Service │ Command Service          │
│ Memory Bank Svc  │ File Service    │ UI Service               │
│ Rule Service     │ Shell Service   │ AI Content Generator     │
└───────────────────────────────────────────────────────────────┘
```

## **Design Patterns Implementation**

### **🎯 Command Pattern (Enhanced)**
- **Primary CLI Commands**: Error analysis with shell integration
- **Secondary CLI Commands**: Repository organization, Memory Bank management
- **Commander.js Integration**: Professional argument parsing and validation
- **Command Composition**: Complex operations built from atomic commands

### **📋 Strategy Pattern (Multi-layered)**
- **AI Provider Strategy**: Google AI Studio vs. Vertex AI selection
- **Shell Detection Strategy**: bash/zsh/tcsh identification and integration
- **Content Generation Strategy**: Template-based vs. AI-generated content
- **File Organization Strategy**: Rule-based file classification and placement

### **👁️ Observer Pattern (Extended)**
- **Shell History Monitoring**: Real-time command execution tracking
- **File System Watching**: Repository change detection
- **Memory Bank Updates**: Context synchronization triggers
- **AI Service Health**: Provider availability monitoring

### **🏭 Factory Pattern (Comprehensive)**
- **Service Factory**: Dynamic service instantiation and dependency injection
- **Template Factory**: Context-aware template selection and instantiation
- **Command Factory**: CLI command creation with proper error handling
- **Content Factory**: AI-powered content generation with fallback strategies

### **🔗 Adapter Pattern (Multi-shell)**
- **Shell Adapters**: Unified interface for bash, zsh, tcsh interactions
- **AI Provider Adapters**: Consistent interface across different AI services
- **Template Adapters**: Format conversion for different project types
- **File System Adapters**: Cross-platform file operation abstraction

## **Component Architecture**

### **🔍 Error Analysis Subsystem**

```
┌─────────────────────────────────────────────────────────────────┐
│                Error Analysis Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│  Shell Integration Layer                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐ │
│  │ Bash/Zsh    │ │ Tcsh/Csh    │ │ Fallback (History Files)    │ │
│  │ fc command  │ │ history cmd │ │ Process tree analysis       │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Analysis Engine                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Command Parser  │ │ Error Classifier│ │ Context Analyzer  │ │
│  │ History Context │ │ Pattern Match   │ │ AI Integration    │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Suggestion Engine                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Rule-based      │ │ AI-powered      │ │ Interactive UI    │ │
│  │ Pattern Match   │ │ Neurolink       │ │ User Selection    │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **🏗️ Repository Organization Subsystem**

```
┌─────────────────────────────────────────────────────────────────┐
│            Repository Organization Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│  Project Analysis Layer                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Package.json    │ │ File Structure  │ │ Dependency        │ │
│  │ Analysis        │ │ Detection       │ │ Analysis          │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Enhancement Engine                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Template System │ │ GitHub          │ │ Configuration     │ │
│  │ Content Gen     │ │ Integration     │ │ Management        │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  File Organization                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Classification  │ │ Smart Movement  │ │ Structure         │ │
│  │ Rules Engine    │ │ Operations      │ │ Generation        │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **🧠 Memory Bank Subsystem**

```
┌─────────────────────────────────────────────────────────────────┐
│               Memory Bank Architecture                           │
├─────────────────────────────────────────────────────────────────┤
│  Context Management Layer                                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Project Context │ │ Technical       │ │ Current State     │ │
│  │ Strategy & Goals│ │ Architecture    │ │ Active Work       │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  AI Content Generation                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Neurolink       │ │ Template        │ │ Smart Merging     │ │
│  │ Integration     │ │ Fallback        │ │ Conflict Resolve  │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Persistence & Synchronization                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ File Management │ │ Version Control │ │ AI Assistant      │ │
│  │ Structured Dirs │ │ Git Integration │ │ Integration       │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## **Data Flow Architecture**

### **🔄 Error Analysis Flow**

```
User Command Execution
         ↓
Shell Integration (bash/zsh/tcsh)
         ↓
Command History Capture
         ↓
Error Detection & Analysis
         ↓
AI-Powered Suggestion Generation
         ↓
Interactive User Interface
         ↓
Command Correction & Execution
```

### **🏗️ Repository Organization Flow**

```
Project Discovery & Analysis
         ↓
Package.json Enhancement
         ↓
Directory Structure Creation
         ↓
Template-based File Generation
         ↓
GitHub Integration Setup
         ↓
Configuration Management
         ↓
File Organization & Cleanup
         ↓
Memory Bank Initialization
```

### **🧠 Memory Bank Flow**

```
Repository Analysis
         ↓
Neurolink Content Generation
         ↓
Template-based Fallback
         ↓
Structured Documentation Creation
         ↓
AI Assistant Integration (.clinerules)
         ↓
Continuous Context Updates
         ↓
Team Collaboration Support
```

## **Integration Patterns**

### **🔌 AI Service Integration**

```
┌─────────────────────────────────────────────────────────────────┐
│                AI Service Architecture                           │
├─────────────────────────────────────────────────────────────────┤
│  Provider Abstraction Layer                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Google AI       │ │ Vertex AI       │ │ Neurolink         │ │
│  │ Studio (Free)   │ │ (Enterprise)    │ │ (Advanced)        │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Service Selection & Failover                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Provider        │ │ Fallback        │ │ Error Recovery    │ │
│  │ Detection       │ │ Strategies      │ │ & Retry Logic     │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **🐚 Shell Integration Patterns**

```
┌─────────────────────────────────────────────────────────────────┐
│               Shell Integration Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│  Shell Detection & Adaptation                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ Environment     │ │ Feature         │ │ Capability        │ │
│  │ Analysis        │ │ Detection       │ │ Testing           │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Command Execution & History Access                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ fc/history      │ │ Process Tree    │ │ File System       │ │
│  │ Commands        │ │ Analysis        │ │ Fallback          │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## **Security & Reliability Patterns**

### **🛡️ Security Architecture**

- **Input Validation**: Comprehensive sanitization of user inputs and file paths
- **File System Safety**: Careful permission handling and path validation
- **API Security**: Secure handling of AI service credentials and rate limiting
- **Shell Injection Prevention**: Proper command escaping and validation

### **🔄 Reliability Patterns**

- **Graceful Degradation**: Fallback mechanisms for AI service failures
- **Error Recovery**: Comprehensive error handling with user guidance
- **Idempotent Operations**: Safe retry mechanisms for file operations
- **State Management**: Consistent state across concurrent operations

## **Performance Optimization Patterns**

### **⚡ Efficiency Strategies**

- **Lazy Loading**: On-demand service initialization and resource loading
- **Caching**: Intelligent caching of AI responses and template content
- **Parallel Processing**: Concurrent file operations and AI requests
- **Resource Pooling**: Efficient management of system resources

### **📊 Monitoring & Observability**

- **Debug Mode**: Comprehensive logging and troubleshooting capabilities
- **Performance Metrics**: Response time and success rate tracking
- **Error Reporting**: Structured error collection and analysis
- **Usage Analytics**: Feature adoption and performance insights

## **Extensibility & Maintenance Patterns**

### **🔧 Plugin Architecture**

- **Service Registration**: Dynamic service discovery and registration
- **Template System**: Extensible template library for new project types
- **Command Extensions**: Pluggable command system for community contributions
- **AI Provider Extensions**: Support for additional AI service providers

### **📈 Evolution Strategy**

- **Backward Compatibility**: Maintaining API stability across versions
- **Feature Flags**: Gradual feature rollout and testing
- **Migration Support**: Automated migration for configuration changes
- **Community Integration**: Clear contribution guidelines and extension points

This comprehensive architecture enables Shelly to function as a robust, scalable, and maintainable AI-powered development assistant that can evolve with changing requirements and technologies.
