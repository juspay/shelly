/**
 * AI Provider Implementation Template for @juspay/shelly
 *
 * This template provides a boilerplate for implementing AI provider adapters.
 * Follows the provider pattern used in neurolink for multi-provider AI support.
 *
 * @generated 2026-02-08
 * @owner juspay
 *
 * Usage:
 *   1. Copy this file to src/providers/<provider-name>Provider.ts
 *   2. Rename the class and update the provider name
 *   3. Implement the abstract methods
 *   4. Register in the provider factory
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AI Provider interface - all providers must implement this.
 */
export interface AIProvider {
  /** Provider name (e.g., 'openai', 'anthropic', 'vertex') */
  readonly name: string;

  /** Check if provider is available/configured */
  isAvailable(): Promise<boolean>;

  /** Generate text completion */
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;

  /** Generate embeddings for text */
  generateEmbedding(text: string | string[]): Promise<EmbeddingResult>;

  /** Stream text generation */
  streamText(options: GenerateTextOptions): AsyncGenerator<StreamChunk>;
}

/**
 * Options for text generation.
 */
export interface GenerateTextOptions {
  /** The prompt or messages to send */
  prompt?: string;
  messages?: ChatMessage[];

  /** Model to use (provider-specific) */
  model?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for randomness (0-1) */
  temperature?: number;

  /** Top-p sampling parameter */
  topP?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** System prompt */
  systemPrompt?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Chat message format.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Result of text generation.
 */
export interface GenerateTextResult {
  text: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  model: string;
}

/**
 * Token usage information.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Embedding result.
 */
export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: TokenUsage;
}

/**
 * Streaming chunk.
 */
export interface StreamChunk {
  text: string;
  isComplete: boolean;
}

/**
 * Provider configuration.
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  [key: string]: unknown;
}

// ============================================================================
// BASE PROVIDER CLASS
// ============================================================================

/**
 * Abstract base class for AI providers.
 * Provides common functionality and enforces the interface.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;

  protected config: ProviderConfig;
  protected defaultModel: string;

  constructor(config: ProviderConfig = {}) {
    this.config = this.validateConfig(config);
    this.defaultModel = this.config.model || this.getDefaultModel();
  }

  // --------------------------------------------------------------------------
  // ABSTRACT METHODS (must be implemented by subclasses)
  // --------------------------------------------------------------------------

  abstract isAvailable(): Promise<boolean>;

  abstract generateText(
    options: GenerateTextOptions
  ): Promise<GenerateTextResult>;

  abstract generateEmbedding(text: string | string[]): Promise<EmbeddingResult>;

  abstract streamText(
    options: GenerateTextOptions
  ): AsyncGenerator<StreamChunk>;

  protected abstract getDefaultModel(): string;

  // --------------------------------------------------------------------------
  // COMMON UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Validate and normalize configuration.
   */
  protected validateConfig(config: ProviderConfig): ProviderConfig {
    return {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Build messages array from options.
   */
  protected buildMessages(options: GenerateTextOptions): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.messages) {
      messages.push(...options.messages);
    } else if (options.prompt) {
      messages.push({ role: 'user', content: options.prompt });
    }

    return messages;
  }

  /**
   * Handle API errors with retry logic.
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Exponential backoff
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Check if error should not be retried.
   */
  protected isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid api key') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found') ||
      message.includes('bad request')
    );
  }

  /**
   * Sleep for specified milliseconds.
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log debug message.
   */
  protected log(
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'debug'
  ): void {
    if (process.env.DEBUG) {
      console[level](`[${this.name}] ${message}`);
    }
  }
}

// ============================================================================
// EXAMPLE PROVIDER IMPLEMENTATION
// ============================================================================

/**
 * Example provider implementation - replace with actual API integration.
 */
export class ExampleProvider extends BaseAIProvider {
  readonly name = 'example';

  constructor(config: ProviderConfig = {}) {
    super({
      apiKey: process.env.EXAMPLE_API_KEY,
      baseUrl: process.env.EXAMPLE_BASE_URL || 'https://api.example.com/v1',
      ...config,
    });
  }

  protected getDefaultModel(): string {
    return 'example-model-v1';
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    if (!this.config.apiKey) {
      return false;
    }

    // Optionally verify API connectivity
    // await this.testConnection();
    return true;
  }

  async generateText(
    options: GenerateTextOptions
  ): Promise<GenerateTextResult> {
    const messages = this.buildMessages(options);
    const model = options.model || this.defaultModel;

    return this.withRetry(async () => {
      this.log(`Generating text with model: ${model}`);

      // [TEMPLATE] Replace with actual API call
      // const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.config.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     model,
      //     messages,
      //     max_tokens: options.maxTokens,
      //     temperature: options.temperature,
      //   }),
      // });

      // Placeholder response
      return {
        text: `[Example response for: ${messages[messages.length - 1]?.content}]`,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        finishReason: 'stop' as const,
        model,
      };
    });
  }

  async generateEmbedding(text: string | string[]): Promise<EmbeddingResult> {
    const inputs = Array.isArray(text) ? text : [text];

    return this.withRetry(async () => {
      this.log(`Generating embeddings for ${inputs.length} inputs`);

      // [TEMPLATE] Replace with actual API call
      // Placeholder - return random embeddings
      const embeddings = inputs.map(() =>
        Array.from({ length: 1536 }, () => Math.random() - 0.5)
      );

      return {
        embeddings,
        model: 'example-embedding-v1',
        usage: {
          promptTokens: Math.ceil(
            inputs.reduce((sum, t) => sum + t.length / 4, 0)
          ),
          completionTokens: 0,
          totalTokens: Math.ceil(
            inputs.reduce((sum, t) => sum + t.length / 4, 0)
          ),
        },
      };
    });
  }

  async *streamText(options: GenerateTextOptions): AsyncGenerator<StreamChunk> {
    const messages = this.buildMessages(options);
    const model = options.model || this.defaultModel;

    this.log(`Streaming text with model: ${model}`);

    // [TEMPLATE] Replace with actual streaming API call
    // Placeholder - simulate streaming
    const response = `This is a simulated streaming response for: ${messages[messages.length - 1]?.content}`;
    const words = response.split(' ');

    for (let i = 0; i < words.length; i++) {
      yield {
        text: words[i] + (i < words.length - 1 ? ' ' : ''),
        isComplete: i === words.length - 1,
      };
      await this.sleep(50); // Simulate network delay
    }
  }
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Factory for creating AI provider instances.
 */
export class ProviderFactory {
  private static providers: Map<string, () => AIProvider> = new Map();

  /**
   * Register a provider constructor.
   */
  static register(name: string, factory: () => AIProvider): void {
    this.providers.set(name.toLowerCase(), factory);
  }

  /**
   * Create a provider instance by name.
   */
  static create(name: string): AIProvider {
    const factory = this.providers.get(name.toLowerCase());
    if (!factory) {
      throw new Error(
        `Unknown provider: ${name}. Available: ${this.getAvailableProviders().join(', ')}`
      );
    }
    return factory();
  }

  /**
   * Get list of registered provider names.
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check which providers are available (configured).
   */
  static async getConfiguredProviders(): Promise<string[]> {
    const results: string[] = [];

    for (const name of this.providers.keys()) {
      try {
        const provider = this.create(name);
        if (await provider.isAvailable()) {
          results.push(name);
        }
      } catch {
        // Provider not available
      }
    }

    return results;
  }
}

// ============================================================================
// REGISTER DEFAULT PROVIDERS
// ============================================================================

// Register example provider
ProviderFactory.register('example', () => new ExampleProvider());

// [TEMPLATE] Register actual providers
// ProviderFactory.register('openai', () => new OpenAIProvider());
// ProviderFactory.register('anthropic', () => new AnthropicProvider());
// ProviderFactory.register('vertex', () => new VertexAIProvider());
