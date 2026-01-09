/**
 * ============================================================================
 * Service Container - Dependency Injection Container
 * ============================================================================
 *
 * Lightweight DI container with:
 * - O(1) service resolution
 * - Lazy instantiation
 * - Lifecycle management
 * - Scoped containers
 * - Type-safe service retrieval
 *
 * Why Dependency Injection?
 * -------------------------
 * 1. TESTABILITY: Services can be mocked easily
 * 2. LOOSE COUPLING: Components depend on interfaces, not implementations
 * 3. SINGLE SOURCE OF TRUTH: One place for service configuration
 * 4. LIFECYCLE CONTROL: Container manages creation and disposal
 *
 * Usage Example:
 * ```typescript
 * const container = new ServiceContainerImpl();
 *
 * // Register services
 * container.register('logger', () => new ConsoleLogger());
 * container.registerSingleton('cache', () => new RedisCache());
 *
 * // Resolve services
 * const logger = container.get<LoggerService>('logger');
 * ```
 *
 * ============================================================================
 */

import type { ServiceContainer } from "@/types/services";

/**
 * Service registration options
 */
export interface ServiceOptions {
  /** Lifecycle: 'transient' creates new instance each time, 'singleton' reuses */
  lifecycle?: "singleton" | "transient" | "scoped";
  /** Optional tags for filtering */
  tags?: string[];
}

/**
 * Service descriptor
 */
interface ServiceDescriptor<T = unknown> {
  factory: () => T;
  lifecycle: "singleton" | "transient" | "scoped";
  instance?: T;
  tags: string[];
}

/**
 * Dependency injection container implementation
 */
export class ServiceContainerImpl implements ServiceContainer {
  private readonly services = new Map<string, ServiceDescriptor>();
  private readonly scopedInstances = new Map<string, unknown>();
  private readonly parent?: ServiceContainerImpl;
  private disposed = false;

  constructor(parent?: ServiceContainerImpl) {
    this.parent = parent;
  }

  /**
   * Register a service factory
   */
  register<T>(
    id: string,
    factory: () => T,
    options: ServiceOptions = {},
  ): void {
    this.ensureNotDisposed();

    if (this.services.has(id)) {
      throw new Error(`Service '${id}' is already registered`);
    }

    this.services.set(id, {
      factory,
      lifecycle: options.lifecycle ?? "transient",
      tags: options.tags ?? [],
    });
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    id: string,
    factory: () => T,
    options: Omit<ServiceOptions, "lifecycle"> = {},
  ): void {
    this.register(id, factory, { ...options, lifecycle: "singleton" });
  }

  /**
   * Register a scoped service (one instance per scope)
   */
  registerScoped<T>(
    id: string,
    factory: () => T,
    options: Omit<ServiceOptions, "lifecycle"> = {},
  ): void {
    this.register(id, factory, { ...options, lifecycle: "scoped" });
  }

  /**
   * Register an existing instance as singleton
   */
  registerInstance<T>(id: string, instance: T, tags: string[] = []): void {
    this.ensureNotDisposed();

    if (this.services.has(id)) {
      throw new Error(`Service '${id}' is already registered`);
    }

    this.services.set(id, {
      factory: () => instance,
      lifecycle: "singleton",
      instance,
      tags,
    });
  }

  /**
   * Get a service by ID - throws if not found
   */
  get<T>(id: string): T {
    const service = this.resolve<T>(id);

    if (service === undefined) {
      throw new Error(`Service '${id}' not found`);
    }

    return service;
  }

  /**
   * Get a service by ID - returns undefined if not found
   */
  getOptional<T>(id: string): T | undefined {
    return this.resolve<T>(id);
  }

  /**
   * Check if a service is registered
   */
  has(id: string): boolean {
    if (this.services.has(id)) {
      return true;
    }
    return this.parent?.has(id) ?? false;
  }

  /**
   * Get all services with a specific tag
   */
  getByTag<T>(tag: string): T[] {
    const results: T[] = [];

    for (const [id, descriptor] of this.services) {
      if (descriptor.tags.includes(tag)) {
        results.push(this.get<T>(id));
      }
    }

    // Include parent services
    if (this.parent) {
      results.push(...this.parent.getByTag<T>(tag));
    }

    return results;
  }

  /**
   * Create a child scope
   */
  createScope(): ServiceContainerImpl {
    return new ServiceContainerImpl(this);
  }

  /**
   * Resolve a service
   */
  private resolve<T>(id: string): T | undefined {
    this.ensureNotDisposed();

    // Check local services first
    const descriptor = this.services.get(id);

    if (descriptor) {
      return this.instantiate<T>(id, descriptor);
    }

    // Check parent container
    if (this.parent) {
      return this.parent.resolve<T>(id);
    }

    return undefined;
  }

  /**
   * Instantiate a service based on lifecycle
   */
  private instantiate<T>(id: string, descriptor: ServiceDescriptor): T {
    switch (descriptor.lifecycle) {
      case "singleton":
        // Return cached instance or create new
        if (descriptor.instance === undefined) {
          descriptor.instance = descriptor.factory();
        }
        return descriptor.instance as T;

      case "scoped":
        // Return scoped instance or create new
        if (!this.scopedInstances.has(id)) {
          this.scopedInstances.set(id, descriptor.factory());
        }
        return this.scopedInstances.get(id) as T;

      case "transient":
      default:
        // Always create new instance
        return descriptor.factory() as T;
    }
  }

  /**
   * Dispose of all services
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;

    // Dispose scoped instances
    for (const instance of this.scopedInstances.values()) {
      await this.disposeInstance(instance);
    }
    this.scopedInstances.clear();

    // Dispose singleton instances (only if we own them)
    for (const descriptor of this.services.values()) {
      if (descriptor.lifecycle === "singleton" && descriptor.instance) {
        await this.disposeInstance(descriptor.instance);
      }
    }

    this.services.clear();
    this.disposed = true;
  }

  /**
   * Dispose a single instance
   */
  private async disposeInstance(instance: unknown): Promise<void> {
    if (
      instance &&
      typeof instance === "object" &&
      "dispose" in instance &&
      typeof instance.dispose === "function"
    ) {
      await instance.dispose();
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error("ServiceContainer has been disposed");
    }
  }

  /**
   * Get container statistics
   */
  getStats(): {
    totalServices: number;
    singletons: number;
    scoped: number;
    transient: number;
  } {
    let singletons = 0;
    let scoped = 0;
    let transient = 0;

    for (const descriptor of this.services.values()) {
      switch (descriptor.lifecycle) {
        case "singleton":
          singletons++;
          break;
        case "scoped":
          scoped++;
          break;
        case "transient":
          transient++;
          break;
      }
    }

    return {
      totalServices: this.services.size,
      singletons,
      scoped,
      transient,
    };
  }
}

/**
 * Create a new service container
 */
export function createServiceContainer(): ServiceContainerImpl {
  return new ServiceContainerImpl();
}
