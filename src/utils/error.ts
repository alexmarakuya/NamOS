/**
 * Error handling utilities
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class ErrorHandler {
  /**
   * Handle and format errors for user display
   */
  static handleError(error: unknown): { message: string; code: string } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code
      };
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('PGRST116')) {
        return {
          message: 'Resource not found',
          code: 'NOT_FOUND'
        };
      }

      if (error.message.includes('duplicate key')) {
        return {
          message: 'This item already exists',
          code: 'DUPLICATE_ERROR'
        };
      }

      if (error.message.includes('foreign key')) {
        return {
          message: 'Cannot delete item that is referenced by other items',
          code: 'REFERENCE_ERROR'
        };
      }

      return {
        message: error.message,
        code: 'UNKNOWN_ERROR'
      };
    }

    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }

  /**
   * Log error for debugging
   */
  static logError(error: unknown, context?: string): void {
    const errorInfo = this.handleError(error);
    const logMessage = context 
      ? `[${context}] ${errorInfo.code}: ${errorInfo.message}`
      : `${errorInfo.code}: ${errorInfo.message}`;
    
    console.error(logMessage, error);
  }

  /**
   * Create user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const errorInfo = this.handleError(error);
    
    // Map technical errors to user-friendly messages
    const userMessages: Record<string, string> = {
      'NOT_FOUND': 'The requested item could not be found.',
      'UNAUTHORIZED': 'You do not have permission to perform this action.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'DUPLICATE_ERROR': 'This item already exists.',
      'REFERENCE_ERROR': 'Cannot delete this item because it is being used elsewhere.',
      'DATABASE_ERROR': 'A database error occurred. Please try again later.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
    };

    return userMessages[errorInfo.code] || errorInfo.message;
  }
}
