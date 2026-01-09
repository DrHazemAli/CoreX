/**
 * ============================================================================
 * Domain Events - Event-Driven Architecture Types
 * ============================================================================
 *
 * Domain events represent facts that have happened in the system.
 * They enable loose coupling between components and support eventual consistency.
 *
 * Event-Driven Architecture Benefits:
 * -----------------------------------
 * 1. DECOUPLING: Publishers don't know about subscribers
 * 2. SCALABILITY: Events can be processed asynchronously
 * 3. AUDITABILITY: Events provide a log of what happened
 * 4. EXTENSIBILITY: New subscribers can be added without modifying publishers
 *
 * Event Design Principles:
 * -----------------------
 * - Events are IMMUTABLE facts (past tense naming)
 * - Events contain all necessary data (no lazy loading)
 * - Events are versioned for schema evolution
 * - Events have unique identifiers
 *
 * Performance Note:
 * -----------------
 * Events should be lightweight. Include only essential data.
 * For large payloads, include references/IDs and let consumers fetch details.
 *
 * ============================================================================
 */

import type { Brand } from "./base";

// ============================================================================
// EVENT METADATA
// ============================================================================

/**
 * Event identifier
 */
export type EventId = Brand<string, "EventId">;

/**
 * Correlation ID for tracing related events
 */
export type CorrelationId = Brand<string, "CorrelationId">;

/**
 * Causation ID linking to the event that caused this event
 */
export type CausationId = Brand<string, "CausationId">;

/**
 * Event metadata present on all events
 */
export interface EventMetadata {
  /**
   * Unique event identifier
   */
  readonly eventId: EventId;

  /**
   * Event type/name (e.g., "user.created")
   */
  readonly eventType: string;

  /**
   * Event schema version for evolution
   */
  readonly version: number;

  /**
   * When the event occurred
   */
  readonly timestamp: Date;

  /**
   * Correlation ID for request tracing
   */
  readonly correlationId?: CorrelationId;

  /**
   * ID of the event that caused this event
   */
  readonly causationId?: CausationId;

  /**
   * Who/what triggered the event
   */
  readonly triggeredBy?: {
    type: "user" | "system" | "plugin";
    id: string;
  };

  /**
   * Aggregate/entity this event relates to
   */
  readonly aggregate?: {
    type: string;
    id: string;
    version: number;
  };
}

// ============================================================================
// BASE EVENT
// ============================================================================

/**
 * Base domain event interface
 *
 * @template TPayload - Event payload type
 *
 * @example
 * interface UserCreatedEvent extends DomainEvent<{
 *   userId: string;
 *   email: string;
 *   createdAt: Date;
 * }> {
 *   readonly eventType: 'user.created';
 * }
 */
export interface DomainEvent<TPayload = unknown> {
  readonly metadata: EventMetadata;
  readonly payload: TPayload;
}

// ============================================================================
// COMMON DOMAIN EVENTS
// ============================================================================

/**
 * Entity created event payload
 */
export interface EntityCreatedPayload<T> {
  readonly entityType: string;
  readonly entityId: string;
  readonly entity: T;
}

/**
 * Entity updated event payload
 */
export interface EntityUpdatedPayload<T> {
  readonly entityType: string;
  readonly entityId: string;
  readonly before: Partial<T>;
  readonly after: Partial<T>;
  readonly changedFields: readonly string[];
}

/**
 * Entity deleted event payload
 */
export interface EntityDeletedPayload {
  readonly entityType: string;
  readonly entityId: string;
  readonly deletedAt: Date;
  readonly deletedBy?: string;
  readonly reason?: string;
}

// ============================================================================
// USER EVENTS
// ============================================================================

export interface UserCreatedPayload {
  readonly userId: string;
  readonly email: string;
  readonly role: string;
  readonly createdAt: Date;
}

export interface UserUpdatedPayload {
  readonly userId: string;
  readonly changes: Record<string, { before: unknown; after: unknown }>;
  readonly updatedAt: Date;
}

export interface UserDeletedPayload {
  readonly userId: string;
  readonly deletedAt: Date;
  readonly reason?: string;
}

export interface UserLoggedInPayload {
  readonly userId: string;
  readonly sessionId: string;
  readonly ip: string;
  readonly userAgent: string;
  readonly timestamp: Date;
}

export interface UserLoggedOutPayload {
  readonly userId: string;
  readonly sessionId: string;
  readonly timestamp: Date;
}

// ============================================================================
// EVENT STORE INTERFACE
// ============================================================================

/**
 * Event store query options
 */
export interface EventStoreQuery {
  /**
   * Filter by aggregate type
   */
  aggregateType?: string;

  /**
   * Filter by aggregate ID
   */
  aggregateId?: string;

  /**
   * Filter by event types
   */
  eventTypes?: string[];

  /**
   * Events after this timestamp
   */
  fromTimestamp?: Date;

  /**
   * Events before this timestamp
   */
  toTimestamp?: Date;

  /**
   * Filter by correlation ID
   */
  correlationId?: CorrelationId;

  /**
   * Maximum events to return
   */
  limit?: number;
}

/**
 * Stored event with position
 */
export interface StoredEvent<TPayload = unknown> extends DomainEvent<TPayload> {
  /**
   * Position in the event stream
   */
  readonly position: number;

  /**
   * When the event was stored
   */
  readonly storedAt: Date;
}

/**
 * Event store interface for event sourcing
 */
export interface EventStore {
  /**
   * Append events to the store
   */
  append<TPayload>(
    events: DomainEvent<TPayload>[],
    expectedVersion?: number,
  ): Promise<void>;

  /**
   * Query events
   */
  query(query: EventStoreQuery): Promise<StoredEvent[]>;

  /**
   * Get events for an aggregate
   */
  getEventsForAggregate(
    aggregateType: string,
    aggregateId: string,
    fromVersion?: number,
  ): Promise<StoredEvent[]>;

  /**
   * Get all events from a position
   */
  getAllFromPosition(position: number, limit?: number): Promise<StoredEvent[]>;
}

// ============================================================================
// EVENT BUS INTERFACE
// ============================================================================

/**
 * Event handler function
 */
export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => Promise<void> | void;

/**
 * Event subscription
 */
export interface EventSubscription {
  /**
   * Unsubscribe from events
   */
  unsubscribe(): void;

  /**
   * Check if still subscribed
   */
  readonly isActive: boolean;
}

/**
 * Event bus for publishing and subscribing to domain events
 */
export interface EventBus {
  /**
   * Publish a domain event
   */
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;

  /**
   * Publish multiple events atomically
   */
  publishAll<TPayload>(events: DomainEvent<TPayload>[]): Promise<void>;

  /**
   * Subscribe to events of a specific type
   */
  subscribe<TPayload>(
    eventType: string,
    handler: EventHandler<TPayload>,
  ): EventSubscription;

  /**
   * Subscribe to all events matching a pattern
   */
  subscribePattern(pattern: string, handler: EventHandler): EventSubscription;

  /**
   * One-time subscription
   */
  once<TPayload>(
    eventType: string,
    handler: EventHandler<TPayload>,
  ): EventSubscription;
}

// ============================================================================
// EVENT FACTORIES
// ============================================================================

/**
 * Create event metadata
 */
export function createEventMetadata(
  eventType: string,
  options: {
    version?: number;
    correlationId?: CorrelationId;
    causationId?: CausationId;
    triggeredBy?: EventMetadata["triggeredBy"];
    aggregate?: EventMetadata["aggregate"];
  } = {},
): EventMetadata {
  return {
    eventId: crypto.randomUUID() as EventId,
    eventType,
    version: options.version ?? 1,
    timestamp: new Date(),
    correlationId: options.correlationId,
    causationId: options.causationId,
    triggeredBy: options.triggeredBy,
    aggregate: options.aggregate,
  };
}

/**
 * Create a domain event
 */
export function createEvent<TPayload>(
  eventType: string,
  payload: TPayload,
  options?: Parameters<typeof createEventMetadata>[1],
): DomainEvent<TPayload> {
  return {
    metadata: createEventMetadata(eventType, options),
    payload,
  };
}

// ============================================================================
// EVENT TYPE REGISTRY
// ============================================================================

/**
 * Map of event types to their payload types
 * Extend this interface to add type-safe events
 */
export interface EventTypeMap {
  "user.created": UserCreatedPayload;
  "user.updated": UserUpdatedPayload;
  "user.deleted": UserDeletedPayload;
  "user.logged_in": UserLoggedInPayload;
  "user.logged_out": UserLoggedOutPayload;
  // Add more event types here as your domain grows
}

/**
 * Get payload type for an event type
 */
export type EventPayload<T extends keyof EventTypeMap> = EventTypeMap[T];

/**
 * Type-safe event creation
 */
export function createTypedEvent<T extends keyof EventTypeMap>(
  eventType: T,
  payload: EventTypeMap[T],
  options?: Parameters<typeof createEventMetadata>[1],
): DomainEvent<EventTypeMap[T]> {
  return createEvent(eventType, payload, options);
}
