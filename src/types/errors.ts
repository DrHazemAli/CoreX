/**
 * ============================================================================
 * Error Types - Result Pattern & Error Handling
 * ============================================================================
 *
 * This module defines error types and the Result pattern for explicit
 * error handling without exceptions.
 *
 * Why Result Pattern?
 * -------------------
 * 1. EXPLICIT: Errors are part of the return type, not hidden in throws
 * 2. TYPE-SAFE: Compiler ensures you handle both success and error cases
 * 3. COMPOSABLE: Results can be chained with map/flatMap
 * 4. NO SURPRISES: No unexpected exceptions bubbling up
 *
 * Error Hierarchy:
 * ---------------
 * AppError (base)
 * ├── ValidationError
 * ├── NotFoundError
 * ├── UnauthorizedError
 * ├── ForbiddenError
 * ├── ConflictError
 * ├── RateLimitError
 * └── InternalError
 *
 * Performance Note:
 * -----------------
 * Result pattern has minimal overhead. The discriminated union
 * is optimized by TypeScript/V8 and adds no runtime cost.
 *
 * ============================================================================
 */

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error codes
 * Use these for consistent error identification across the application
 */
export const ErrorCode = {
  // Validation errors (400)
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Authorization errors (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  RESOURCE_ACCESS_DENIED: "RESOURCE_ACCESS_DENIED",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ENTITY_NOT_FOUND: "ENTITY_NOT_FOUND",

  // Conflict errors (409)
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // Rate limit errors (429)
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  MAINTENANCE_MODE: "MAINTENANCE_MODE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// BASE ERROR
// ============================================================================

/**
 * Base application error
 *
 * @example
 * throw new AppError('Something went wrong', 'INTERNAL_ERROR', 500);
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = ErrorCode.INTERNAL_ERROR,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AppError";

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }

  /**
   * Create from unknown error
   */
  static from(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCode.INTERNAL_ERROR,
        500,
        undefined,
        error,
      );
    }

    return new AppError(
      typeof error === "string" ? error : "An unknown error occurred",
      ErrorCode.INTERNAL_ERROR,
      500,
    );
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, details, cause);
    this.name = "ValidationError";
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    details?: Record<string, unknown>,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404, {
      resource,
      identifier,
      ...details,
    });
    this.name = "NotFoundError";
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = "Authentication required",
    code: string = ErrorCode.UNAUTHORIZED,
    details?: Record<string, unknown>,
  ) {
    super(message, code, 401, details);
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = "Access denied",
    details?: Record<string, unknown>,
  ) {
    super(message, ErrorCode.FORBIDDEN, 403, details);
    this.name = "ForbiddenError";
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    code: string = ErrorCode.CONFLICT,
    details?: Record<string, unknown>,
  ) {
    super(message, code, 409, details);
    this.name = "ConflictError";
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "Rate limit exceeded",
    public readonly retryAfter?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, ErrorCode.RATE_LIMITED, 429, { retryAfter, ...details });
    this.name = "RateLimitError";
  }
}

/**
 * Internal error (500)
 */
export class InternalError extends AppError {
  constructor(
    message: string = "Internal server error",
    cause?: Error,
    details?: Record<string, unknown>,
  ) {
    super(message, ErrorCode.INTERNAL_ERROR, 500, details, cause);
    this.name = "InternalError";
  }
}

// ============================================================================
// RESULT TYPE (Discriminated Union)
// ============================================================================

/**
 * Success result
 */
export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Failure result
 */
export interface Failure<E = AppError> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type for operations that can fail
 *
 * @template T - Success value type
 * @template E - Error type (defaults to AppError)
 *
 * @example
 * async function getUser(id: string): Promise<Result<User>> {
 *   const user = await db.users.findById(id);
 *   if (!user) {
 *     return Result.fail(new NotFoundError('User', id));
 *   }
 *   return Result.ok(user);
 * }
 *
 * // Usage
 * const result = await getUser('123');
 * if (result.ok) {
 *   console.log(result.value.name);
 * } else {
 *   console.error(result.error.message);
 * }
 */
export type Result<T, E = AppError> = Success<T> | Failure<E>;

// ============================================================================
// RESULT CONSTRUCTORS
// ============================================================================

/**
 * Result helper object with constructors
 */
export const Result = {
  /**
   * Create a success result
   */
  ok<T>(value: T): Success<T> {
    return { ok: true, value };
  },

  /**
   * Create a failure result
   */
  fail<E = AppError>(error: E): Failure<E> {
    return { ok: false, error };
  },

  /**
   * Check if result is success
   */
  isOk<T, E>(result: Result<T, E>): result is Success<T> {
    return result.ok === true;
  },

  /**
   * Check if result is failure
   */
  isFail<T, E>(result: Result<T, E>): result is Failure<E> {
    return result.ok === false;
  },

  /**
   * Map success value
   */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.ok) {
      return Result.ok(fn(result.value));
    }
    return result;
  },

  /**
   * Map error value
   */
  mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.ok) {
      return Result.fail(fn(result.error));
    }
    return result;
  },

  /**
   * Flat map success value
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    if (result.ok) {
      return fn(result.value);
    }
    return result;
  },

  /**
   * Unwrap value or throw
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
      return result.value;
    }
    throw result.error;
  },

  /**
   * Unwrap value or return default
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.ok) {
      return result.value;
    }
    return defaultValue;
  },

  /**
   * Try executing a function and wrap result
   */
  try<T>(fn: () => T): Result<T, Error> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  },

  /**
   * Try executing an async function and wrap result
   */
  async tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      return Result.ok(await fn());
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  },

  /**
   * Combine multiple results
   */
  all<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.ok) {
        return result;
      }
      values.push(result.value);
    }
    return Result.ok(values);
  },
};

// ============================================================================
// OPTION TYPE (For nullable values)
// ============================================================================

/**
 * Some value present
 */
export interface Some<T> {
  readonly isSome: true;
  readonly value: T;
}

/**
 * No value present
 */
export interface None {
  readonly isSome: false;
}

/**
 * Option type for nullable values
 */
export type Option<T> = Some<T> | None;

/**
 * Option helper object
 */
export const Option = {
  some<T>(value: T): Some<T> {
    return { isSome: true, value };
  },

  none(): None {
    return { isSome: false };
  },

  fromNullable<T>(value: T | null | undefined): Option<T> {
    return value != null ? Option.some(value) : Option.none();
  },

  isSome<T>(option: Option<T>): option is Some<T> {
    return option.isSome === true;
  },

  isNone<T>(option: Option<T>): option is None {
    return option.isSome === false;
  },

  map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    if (option.isSome) {
      return Option.some(fn(option.value));
    }
    return option;
  },

  unwrapOr<T>(option: Option<T>, defaultValue: T): T {
    if (option.isSome) {
      return option.value;
    }
    return defaultValue;
  },
};
