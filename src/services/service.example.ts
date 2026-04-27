/**
 * Service Template for @juspay/shelly
 *
 * This template provides a boilerplate for creating singleton services
 * with factory pattern and proper initialization lifecycle.
 *
 * @generated 2026-02-08
 * @owner juspay
 *
 * Patterns implemented:
 * - Singleton: Single instance per process
 * - Factory: Configurable instance creation
 * - Lazy initialization: Initialize on first use
 * - Async initialization: Support for async setup
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Service configuration options.
 */
export interface ServiceConfig {
  /** Enable debug logging */
  debug?: boolean;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Cache TTL in milliseconds */
  cacheTtl?: number;

  /** Custom options */
  [key: string]: unknown;
}

/**
 * Service status information.
 */
export interface ServiceStatus {
  initialized: boolean;
  healthy: boolean;
  uptime: number;
  lastError?: string;
  stats?: Record<string, number>;
}

/**
 * Base service interface.
 */
export interface IService {
  readonly name: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): ServiceStatus;
  isHealthy(): Promise<boolean>;
}

// ============================================================================
// ABSTRACT BASE SERVICE
// ============================================================================

/**
 * Abstract base class for services with common functionality.
 */
export abstract class BaseService implements IService {
  abstract readonly name: string;

  protected config: ServiceConfig;
  protected initialized = false;
  protected startTime: number | null = null;
  protected lastError: string | undefined;
  protected stats: Record<string, number> = {};

  constructor(config: ServiceConfig = {}) {
    this.config = this.validateConfig(config);
  }

  // --------------------------------------------------------------------------
  // ABSTRACT METHODS
  // --------------------------------------------------------------------------

  /**
   * Initialize service resources.
   * Override to set up connections, load data, etc.
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Cleanup service resources.
   * Override to close connections, flush buffers, etc.
   */
  protected abstract onShutdown(): Promise<void>;

  /**
   * Check service health.
   * Override to verify connections, resources, etc.
   */
  protected abstract checkHealth(): Promise<boolean>;

  // --------------------------------------------------------------------------
  // LIFECYCLE METHODS
  // --------------------------------------------------------------------------

  /**
   * Initialize the service.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('Already initialized');
      return;
    }

    try {
      this.log('Initializing...');
      await this.onInitialize();
      this.lastError = undefined; // Clear previous error on success
      this.initialized = true;
      this.startTime = Date.now();
      this.log('Initialized successfully');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.log(`Initialization failed: ${this.lastError}`, 'error');
      throw error;
    }
  }

  /**
   * Shutdown the service.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      this.log('Shutting down...');
      await this.onShutdown();
      this.initialized = false;
      this.log('Shutdown complete');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.log(`Shutdown error: ${this.lastError}`, 'error');
      throw error;
    }
  }

  /**
   * Get service status.
   */
  getStatus(): ServiceStatus {
    return {
      initialized: this.initialized,
      healthy: this.initialized && !this.lastError,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastError: this.lastError,
      stats: { ...this.stats },
    };
  }

  /**
   * Check if service is healthy.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      return await this.checkHealth();
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  /**
   * Ensure service is initialized before operation.
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `${this.name} service not initialized. Call initialize() first.`
      );
    }
  }

  /**
   * Validate configuration.
   */
  protected validateConfig(config: ServiceConfig): ServiceConfig {
    return {
      debug: false,
      timeout: 30000,
      maxRetries: 3,
      cacheTtl: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Increment a stat counter.
   */
  protected incrementStat(name: string, value = 1): void {
    this.stats[name] = (this.stats[name] || 0) + value;
  }

  /**
   * Log a message.
   */
  protected log(
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'debug'
  ): void {
    if (this.config.debug || level !== 'debug') {
      console[level](`[${this.name}] ${message}`);
    }
  }
}

// ============================================================================
// SINGLETON SERVICE PATTERN
// ============================================================================

/**
 * Example singleton service implementation.
 *
 * Use this pattern for services that should have exactly one instance
 * throughout the application lifecycle.
 */
export class ExampleSingletonService extends BaseService {
  readonly name = 'ExampleService';

  // Singleton instance
  private static instance: ExampleSingletonService | null = null;
  private static initPromise: Promise<ExampleSingletonService> | null = null;

  // Service-specific state
  private cache: Map<string, { value: unknown; expires: number }> = new Map();

  // Private constructor for singleton
  private constructor(config: ServiceConfig = {}) {
    super(config);
  }

  // --------------------------------------------------------------------------
  // SINGLETON ACCESS
  // --------------------------------------------------------------------------

  /**
   * Get or create the singleton instance.
   * Lazy initialization - creates on first access.
   */
  static getInstance(config?: ServiceConfig): ExampleSingletonService {
    if (!ExampleSingletonService.instance) {
      ExampleSingletonService.instance = new ExampleSingletonService(config);
    }
    return ExampleSingletonService.instance;
  }

  /**
   * Get initialized instance (async).
   * Use when initialization is required before use.
   */
  static async getInitializedInstance(
    config?: ServiceConfig
  ): Promise<ExampleSingletonService> {
    if (!ExampleSingletonService.initPromise) {
      ExampleSingletonService.initPromise = (async () => {
        const instance = ExampleSingletonService.getInstance(config);
        try {
          await instance.initialize();
          return instance;
        } catch (error) {
          ExampleSingletonService.initPromise = null;
          throw error;
        }
      })();
    }
    return ExampleSingletonService.initPromise;
  }

  /**
   * Reset singleton (for testing).
   */
  static async reset(): Promise<void> {
    if (ExampleSingletonService.instance) {
      await ExampleSingletonService.instance.shutdown();
      ExampleSingletonService.instance = null;
      ExampleSingletonService.initPromise = null;
    }
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE IMPLEMENTATION
  // --------------------------------------------------------------------------

  protected async onInitialize(): Promise<void> {
    // Initialize resources
    this.cache.clear();
    // await this.connectToDatabase();
    // await this.loadConfiguration();
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup resources
    this.cache.clear();
    // await this.disconnectFromDatabase();
    // await this.flushBuffers();
  }

  protected async checkHealth(): Promise<boolean> {
    // Verify service health
    // return await this.pingDatabase();
    return true;
  }

  // --------------------------------------------------------------------------
  // SERVICE METHODS
  // --------------------------------------------------------------------------

  /**
   * Example cached operation.
   */
  async getCached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    this.ensureInitialized();

    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      this.incrementStat('cacheHits');
      return cached.value as T;
    }

    // Generate value
    this.incrementStat('cacheMisses');
    const value = await factory();

    // Store in cache
    this.cache.set(key, {
      value,
      expires: Date.now() + (this.config.cacheTtl ?? 300000),
    });

    return value;
  }

  /**
   * Clear cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Example operation with retry.
   */
  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    this.ensureInitialized();

    const maxRetries = this.config.maxRetries || 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.incrementStat('operations');
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.incrementStat('retries');

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.incrementStat('failures');
    throw lastError || new Error('Operation failed');
  }
}

// ============================================================================
// SERVICE FACTORY PATTERN
// ============================================================================

/**
 * Factory for creating and managing service instances.
 */
export class ServiceFactory {
  private static services: Map<string, IService> = new Map();
  private static factories: Map<string, (config?: ServiceConfig) => IService> =
    new Map();
  private static inFlight: Map<string, Promise<IService>> = new Map();

  /**
   * Register a service factory.
   */
  static register(
    name: string,
    factory: (config?: ServiceConfig) => IService
  ): void {
    this.factories.set(name.toLowerCase(), factory);
  }

  /**
   * Get or create a service instance.
   */
  static async get<T extends IService>(
    name: string,
    config?: ServiceConfig
  ): Promise<T> {
    const key = name.toLowerCase();

    // Return existing instance
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Return in-flight initialization if already in progress
    if (this.inFlight.has(key)) {
      return (await this.inFlight.get(key)) as T;
    }

    // Create new instance
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(
        `Unknown service: ${name}. Available: ${this.getAvailable().join(', ')}`
      );
    }

    // Track in-flight initialization to prevent double-initialization on concurrent calls
    const initPromise = (async () => {
      const service = factory(config);
      await service.initialize();
      this.services.set(key, service);
      return service;
    })();

    this.inFlight.set(key, initPromise);

    try {
      const service = await initPromise;
      return service as T;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Shutdown all services.
   */
  static async shutdownAll(): Promise<void> {
    const shutdowns = Array.from(this.services.values()).map((s) =>
      s.shutdown()
    );
    await Promise.all(shutdowns);
    this.services.clear();
  }

  /**
   * Get list of available service names.
   */
  static getAvailable(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get status of all running services.
   */
  static getAllStatus(): Record<string, ServiceStatus> {
    const status: Record<string, ServiceStatus> = {};
    for (const [name, service] of this.services) {
      status[name] = service.getStatus();
    }
    return status;
  }
}

// ============================================================================
// REGISTER DEFAULT SERVICES
// ============================================================================

ServiceFactory.register('example', (config) =>
  ExampleSingletonService.getInstance(config)
);

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Get the example service instance.
 */
export const getExampleService = (): ExampleSingletonService => {
  return ExampleSingletonService.getInstance();
};

/**
 * Get initialized example service.
 */
export const getInitializedExampleService =
  (): Promise<ExampleSingletonService> => {
    return ExampleSingletonService.getInitializedInstance();
  };
