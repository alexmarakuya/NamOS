/**
 * Common types and enums used throughout the application
 */

// API Response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Generic hook return type
export interface UseQueryResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Generic mutation hook return type
export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  loading: boolean;
  error: string | null;
}

// Status enums
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress', 
  IN_REVIEW = 'in_review',
  DONE = 'done'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum ProjectStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming', 
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

export enum ClientStatus {
  LEADS = 'leads',
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  OFF_BOARDED = 'off-boarded'
}

export enum ProjectType {
  ONGOING = 'ongoing',
  FIXED_TIMELINE = 'fixed-timeline'
}

// Filter types
export type StatFilterType = 'all' | 'my' | 'overdue' | 'updates' | 'mentions' | 'time_sensitive';

// Common component props
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BasePageProps {
  activeStatFilter?: StatFilterType | null;
}

// Form validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isDirty: boolean;
}

// Date utilities
export type DateString = string; // ISO date string
export type TimestampString = string; // ISO timestamp string

// ID types for better type safety
export type UUID = string;
export type SlackUserId = string;
export type SlackUsername = string;
