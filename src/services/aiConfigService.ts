/**
 * AI Configuration Service
 * Manages AI provider settings and supports both free and paid tiers
 *
 * Supported neurolink providers:
 * google-ai, google, gemini, openai, anthropic, claude, ollama, local,
 * mistral, openrouter, huggingface, vertex, bedrock, azure
 *
 * Note on tier naming:
 * - "free" tier = lower-cost or free models (truly free for Ollama/OpenRouter)
 * - "paid" tier = premium models
 * For OpenAI and Mistral, both tiers require API keys with billing.
 */

export type AIProvider =
  | 'google'
  | 'ollama'
  | 'openrouter'
  | 'openai'
  | 'mistral';
export type AITier = 'free' | 'paid';

// Valid providers list for validation
const VALID_PROVIDERS: readonly AIProvider[] = [
  'google',
  'ollama',
  'openrouter',
  'openai',
  'mistral',
] as const;

// Valid tiers for validation
const VALID_TIERS: readonly AITier[] = ['free', 'paid'] as const;

// Pattern for valid model names (alphanumeric, hyphens, dots, slashes, colons)
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._:/-]+$/;

export interface AIConfig {
  provider: AIProvider;
  model: string;
  tier: AITier;
  apiKeyEnvVar?: string;
  baseURL?: string; // Changed from baseUrl to baseURL for consistency
}

interface ProviderConfig {
  free: AIConfig;
  paid: AIConfig;
}

// Provider configurations for free and paid tiers
// Note: Provider names must match neurolink's supported providers
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  google: {
    free: {
      provider: 'google',
      model: 'gemini-2.0-flash',
      tier: 'free',
      apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    },
    paid: {
      provider: 'google',
      model: 'gemini-1.5-pro',
      tier: 'paid',
      apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    },
  },
  ollama: {
    free: {
      provider: 'ollama',
      model: 'llama3.2',
      tier: 'free',
      baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434',
    },
    paid: {
      provider: 'ollama',
      model: 'llama3.2',
      tier: 'free', // Ollama is always free (local)
      baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434',
    },
  },
  openrouter: {
    free: {
      provider: 'openrouter',
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      tier: 'free',
      apiKeyEnvVar: 'OPENROUTER_API_KEY',
    },
    paid: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      tier: 'paid',
      apiKeyEnvVar: 'OPENROUTER_API_KEY',
    },
  },
  mistral: {
    free: {
      provider: 'mistral',
      model: 'mistral-small-latest',
      tier: 'free',
      apiKeyEnvVar: 'MISTRAL_API_KEY',
    },
    paid: {
      provider: 'mistral',
      model: 'mistral-large-latest',
      tier: 'paid',
      apiKeyEnvVar: 'MISTRAL_API_KEY',
    },
  },
  openai: {
    free: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      tier: 'free',
      apiKeyEnvVar: 'OPENAI_API_KEY',
    },
    paid: {
      provider: 'openai',
      model: 'gpt-4o',
      tier: 'paid',
      apiKeyEnvVar: 'OPENAI_API_KEY',
    },
  },
};

// Priority order for auto-detection (free tier first)
// Ollama first (completely free, local), then OpenRouter (has free models), then others
const FREE_TIER_PRIORITY: AIProvider[] = [
  'ollama',
  'openrouter',
  'google',
  'mistral',
  'openai',
];
const PAID_TIER_PRIORITY: AIProvider[] = [
  'google',
  'openai',
  'mistral',
  'openrouter',
  'ollama',
];

class AIConfigService {
  private currentConfig: AIConfig | null = null;
  private aiEnabled: boolean = true;

  /**
   * Get the current AI configuration
   * Auto-detects available providers if not explicitly set
   */
  getConfig(): AIConfig {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    // Auto-detect based on available API keys/services
    const config = this.autoDetectConfig();
    this.currentConfig = config;
    return config;
  }

  /**
   * Check if AI features are enabled
   */
  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  /**
   * Disable AI features (use fallback templates only)
   */
  disableAI(): void {
    this.aiEnabled = false;
  }

  /**
   * Enable AI features
   */
  enableAI(): void {
    this.aiEnabled = true;
  }

  /**
   * Set a specific provider and tier
   */
  setConfig(provider: AIProvider, tier: AITier = 'free'): void {
    const providerConfig = PROVIDER_CONFIGS[provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    this.currentConfig = providerConfig[tier];
  }

  /**
   * Validate that a provider string is a known provider
   */
  private isValidProvider(provider: string): provider is AIProvider {
    return VALID_PROVIDERS.includes(provider as AIProvider);
  }

  /**
   * Validate that a tier string is valid
   */
  private isValidTier(tier: string): tier is AITier {
    return VALID_TIERS.includes(tier as AITier);
  }

  /**
   * Validate that a model name is safe (no shell injection characters)
   */
  private isValidModelName(model: string): boolean {
    return SAFE_MODEL_PATTERN.test(model);
  }

  /**
   * Set configuration from environment variables
   * Supports: SHELLY_AI_PROVIDER, SHELLY_AI_MODEL, SHELLY_AI_TIER
   */
  loadFromEnv(): void {
    const rawProvider = process.env.SHELLY_AI_PROVIDER;
    const rawModel = process.env.SHELLY_AI_MODEL;
    const rawTier = process.env.SHELLY_AI_TIER;
    const disabled = process.env.SHELLY_AI_DISABLED === 'true';

    if (disabled) {
      this.aiEnabled = false;
      return;
    }

    // Validate tier with proper type safety
    let tier: AITier = 'free';
    if (rawTier !== undefined) {
      if (this.isValidTier(rawTier)) {
        tier = rawTier;
      } else {
        console.warn(
          `Warning: Invalid SHELLY_AI_TIER "${rawTier}". Using "free" instead.`
        );
      }
    }

    if (rawProvider) {
      // Validate provider against known list
      if (!this.isValidProvider(rawProvider)) {
        console.warn(
          `Warning: Unknown SHELLY_AI_PROVIDER "${rawProvider}". Ignoring.`
        );
        return;
      }

      const providerConfig = PROVIDER_CONFIGS[rawProvider];
      this.currentConfig = { ...providerConfig[tier] };

      // Validate and set custom model if provided
      if (rawModel) {
        if (this.isValidModelName(rawModel)) {
          this.currentConfig.model = rawModel;
        } else {
          console.warn(
            `Warning: Invalid SHELLY_AI_MODEL "${rawModel}". Using default model.`
          );
        }
      }
    }
  }

  /**
   * Auto-detect the best available AI configuration
   * Prefers free tier options first, unless preferPaid is set
   */
  private autoDetectConfig(): AIConfig {
    // Check if user prefers paid tier
    const preferPaid = process.env.SHELLY_AI_TIER === 'paid';
    const priority = preferPaid ? PAID_TIER_PRIORITY : FREE_TIER_PRIORITY;
    const tier = preferPaid ? 'paid' : 'free';

    for (const provider of priority) {
      const config = PROVIDER_CONFIGS[provider][tier];

      // Check if this provider is available
      if (this.isProviderAvailable(config)) {
        return config;
      }
    }

    // Default to Google (most common) even without API key
    // The actual AI calls will fail gracefully and use fallbacks
    return PROVIDER_CONFIGS.google[tier];
  }

  /**
   * Check if a provider is available (API key exists or service is running)
   */
  private isProviderAvailable(config: AIConfig): boolean {
    if (config.provider === 'ollama') {
      // For Ollama, check if OLLAMA_HOST is set (indicating configured Ollama)
      // We don't do a live check here to avoid blocking startup
      // The actual connection will fail gracefully if Ollama isn't running
      return !!process.env.OLLAMA_HOST;
    }

    // For API-based providers, check if the API key is set
    if (config.apiKeyEnvVar) {
      return !!process.env[config.apiKeyEnvVar];
    }

    return false;
  }

  /**
   * Get the API key for the current configuration
   */
  getApiKey(): string | undefined {
    const config = this.getConfig();
    if (config.apiKeyEnvVar) {
      return process.env[config.apiKeyEnvVar];
    }
    return undefined;
  }

  /**
   * Check if the current configuration has a valid API key
   */
  hasValidApiKey(): boolean {
    const config = this.getConfig();

    // Ollama doesn't need an API key
    if (config.provider === 'ollama') {
      return true;
    }

    return !!this.getApiKey();
  }

  /**
   * Get provider-specific options for neurolink
   */
  getNeuroLinkOptions(): {
    provider: string;
    model: string;
    baseURL?: string;
  } {
    const config = this.getConfig();

    const options: { provider: string; model: string; baseURL?: string } = {
      provider: config.provider,
      model: config.model,
    };

    if (config.baseURL) {
      options.baseURL = config.baseURL;
    }

    return options;
  }

  /**
   * Get a human-readable description of the current configuration
   */
  getConfigDescription(): string {
    const config = this.getConfig();
    const hasKey = this.hasValidApiKey();

    if (!this.aiEnabled) {
      return 'AI disabled (using templates only)';
    }

    const keyStatus = hasKey
      ? 'API key configured'
      : 'No API key (will use fallbacks)';
    return `${config.provider}/${config.model} (${config.tier} tier) - ${keyStatus}`;
  }

  /**
   * Get available providers and their status
   */
  getAvailableProviders(): Array<{
    provider: AIProvider;
    available: boolean;
    reason: string;
  }> {
    const providers: Array<{
      provider: AIProvider;
      available: boolean;
      reason: string;
    }> = [];

    for (const provider of Object.keys(PROVIDER_CONFIGS) as AIProvider[]) {
      const config = PROVIDER_CONFIGS[provider].free;
      const available = this.isProviderAvailable(config);

      let reason = '';
      if (available) {
        reason = provider === 'ollama' ? 'Local service' : 'API key found';
      } else {
        reason =
          provider === 'ollama' ? 'Service not detected' : 'API key not set';
      }

      providers.push({ provider, available, reason });
    }

    return providers;
  }
}

// Export singleton instance
export const aiConfigService = new AIConfigService();

// Initialize from environment on module load
aiConfigService.loadFromEnv();
