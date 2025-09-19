/**
 * Validation utilities for forms and data
 */

import { ValidationError } from '../types/common';

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static validateRequired(value: unknown, fieldName: string): ValidationError | null {
    if (value === null || value === undefined || value === '') {
      return {
        field: fieldName,
        message: `${fieldName} is required`
      };
    }
    return null;
  }

  static validateMinLength(value: string, minLength: number, fieldName: string): ValidationError | null {
    if (value.length < minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters`
      };
    }
    return null;
  }

  static validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationError | null {
    if (value.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be no more than ${maxLength} characters`
      };
    }
    return null;
  }

  static validateEmail(email: string, fieldName: string): ValidationError | null {
    if (!this.isValidEmail(email)) {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid email address`
      };
    }
    return null;
  }

  static validateDate(date: string, fieldName: string): ValidationError | null {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid date`
      };
    }
    return null;
  }

  static validateFutureDate(date: string, fieldName: string): ValidationError | null {
    const parsedDate = new Date(date);
    if (parsedDate <= new Date()) {
      return {
        field: fieldName,
        message: `${fieldName} must be in the future`
      };
    }
    return null;
  }

  static combineValidators(...validators: (() => ValidationError | null)[]): ValidationError[] {
    return validators
      .map(validator => validator())
      .filter((error): error is ValidationError => error !== null);
  }
}
