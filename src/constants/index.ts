/**
 * Application constants
 */

// UI Constants
export const UI_CONSTANTS = {
  KANBAN_COLUMN_WIDTH: 280,
  KANBAN_COLUMN_MIN_HEIGHT: 800,
  MODAL_Z_INDEX: 1000,
  DROPDOWN_Z_INDEX: 100,
  TOOLTIP_Z_INDEX: 200,
  
  // Animation durations (ms)
  ANIMATION_DURATION_FAST: 150,
  ANIMATION_DURATION_NORMAL: 300,
  ANIMATION_DURATION_SLOW: 500,
  
  // Breakpoints (px)
  BREAKPOINT_SM: 640,
  BREAKPOINT_MD: 768,
  BREAKPOINT_LG: 1024,
  BREAKPOINT_XL: 1280,
} as const;

// API Constants
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Validation Constants
export const VALIDATION_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 5000,
  
  // Task constants
  MAX_TASK_TITLE_LENGTH: 200,
  MAX_TASK_DESCRIPTION_LENGTH: 2000,
  
  // Project constants
  MAX_PROJECT_NAME_LENGTH: 100,
  MAX_PROJECT_DESCRIPTION_LENGTH: 1000,
  
  // Client constants
  MAX_CLIENT_NAME_LENGTH: 100,
  MAX_CLIENT_ADDRESS_LENGTH: 500,
} as const;

// Date Constants
export const DATE_CONSTANTS = {
  DAYS_IN_WEEK: 7,
  HOURS_IN_DAY: 24,
  MINUTES_IN_HOUR: 60,
  SECONDS_IN_MINUTE: 60,
  MS_IN_SECOND: 1000,
  
  // Common time periods in milliseconds
  MS_IN_MINUTE: 60 * 1000,
  MS_IN_HOUR: 60 * 60 * 1000,
  MS_IN_DAY: 24 * 60 * 60 * 1000,
  MS_IN_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Status Colors
export const STATUS_COLORS = {
  // Task statuses
  TASK_TODO: '#6B7280',
  TASK_IN_PROGRESS: '#F59E0B',
  TASK_IN_REVIEW: '#8B5CF6',
  TASK_DONE: '#10B981',
  
  // Project statuses
  PROJECT_ACTIVE: '#10B981',
  PROJECT_UPCOMING: '#3B82F6',
  PROJECT_COMPLETED: '#6B7280',
  PROJECT_ON_HOLD: '#F59E0B',
  
  // Client statuses
  CLIENT_LEADS: '#3B82F6',
  CLIENT_ONBOARDING: '#F59E0B',
  CLIENT_ACTIVE: '#10B981',
  CLIENT_ON_HOLD: '#8B5CF6',
  CLIENT_OFF_BOARDED: '#6B7280',
  
  // Priority colors
  PRIORITY_LOW: '#6B7280',
  PRIORITY_MEDIUM: '#F59E0B',
  PRIORITY_HIGH: '#EF4444',
} as const;

// Default Values
export const DEFAULT_VALUES = {
  TASK_PRIORITY: 'medium',
  TASK_STATUS: 'todo',
  PROJECT_STATUS: 'active',
  CLIENT_STATUS: 'leads',
  PROJECT_TYPE: 'ongoing',
  
  // Pagination
  PAGE_SIZE: 20,
  PAGE_NUMBER: 1,
  
  // Time tracking
  DEFAULT_HOURLY_RATE: 100,
  MIN_TIME_ENTRY: 0.25, // 15 minutes
  MAX_TIME_ENTRY: 24, // 24 hours
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AI_FEATURES: true,
  ENABLE_TIME_TRACKING: true,
  ENABLE_FILE_ATTACHMENTS: true,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_ANALYTICS: false,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'namoS_user_preferences',
  THEME: 'namoS_theme',
  SIDEBAR_COLLAPSED: 'namoS_sidebar_collapsed',
  RECENT_PROJECTS: 'namoS_recent_projects',
  DRAFT_TASKS: 'namoS_draft_tasks',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  DUPLICATE: 'This item already exists.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_DATE: 'Please enter a valid date.',
  FUTURE_DATE_REQUIRED: 'Date must be in the future.',
} as const;
