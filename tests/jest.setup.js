// Jest setup file for NamOS tests
require('dotenv').config({ path: '../telegram-bot/.env' });

// Global test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substring(2)}`,
  
  isValidUUID: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  isValidDate: (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
};

// Global test hooks
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
  
  // Verify environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock console methods in test environment to reduce noise
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only log actual errors, not expected test errors
  if (!args[0]?.toString().includes('Error fetching') && 
      !args[0]?.toString().includes('Error saving')) {
    originalConsoleError(...args);
  }
};
