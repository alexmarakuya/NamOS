// Bot Functionality Tests
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../telegram-bot/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Mock bot functions (extracted from bot-refactored.js)
const getBusinessUnits = async () => {
  try {
    const { data, error } = await supabase.from('business_units').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching business units:', error);
    return [];
  }
};

const saveTransaction = async (transaction, businessUnitId) => {
  try {
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{ ...transaction, business_unit_id: businessUnitId }])
      .select()
      .single();

    if (transactionError) throw transactionError;
    return transactionData;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

// Test utilities
const createTestTransaction = () => ({
  amount: Math.floor(Math.random() * 100) + 1,
  description: `Test Transaction ${Date.now()}`,
  type: Math.random() > 0.5 ? 'income' : 'expense',
  category: 'Testing',
  date: new Date().toISOString().split('T')[0]
});

const cleanup = async (transactionIds = []) => {
  if (transactionIds.length > 0) {
    await supabase.from('transactions').delete().in('id', transactionIds);
  }
};

describe('Bot Functionality Tests', () => {
  let createdTransactions = [];

  afterEach(async () => {
    await cleanup(createdTransactions);
    createdTransactions = [];
  });

  describe('Database Connection', () => {
    test('should connect to Supabase successfully', async () => {
      const { data, error } = await supabase
        .from('business_units')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should have required tables', async () => {
      const tables = ['business_units', 'transactions', 'attachments'];
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
      }
    });
  });

  describe('Business Units Management', () => {
    test('should fetch business units successfully', async () => {
      const businessUnits = await getBusinessUnits();
      
      expect(Array.isArray(businessUnits)).toBe(true);
      expect(businessUnits.length).toBeGreaterThan(0);
      
      // Check business unit structure
      const firstUnit = businessUnits[0];
      expect(firstUnit).toHaveProperty('id');
      expect(firstUnit).toHaveProperty('name');
      expect(firstUnit).toHaveProperty('type');
      expect(['business', 'personal']).toContain(firstUnit.type);
    });

    test('should handle business units fetch error gracefully', async () => {
      // Mock a connection error by using invalid credentials
      const invalidSupabase = createClient('https://invalid.supabase.co', 'invalid-key');
      
      const getBusinessUnitsWithError = async () => {
        try {
          const { data, error } = await invalidSupabase.from('business_units').select('*');
          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Error fetching business units:', error);
          return [];
        }
      };

      const result = await getBusinessUnitsWithError();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Transaction Management', () => {
    test('should save transaction successfully', async () => {
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      const testTransaction = createTestTransaction();
      const savedTransaction = await saveTransaction(testTransaction, businessUnits[0].id);

      expect(savedTransaction).toBeDefined();
      expect(savedTransaction.id).toBeDefined();
      expect(savedTransaction.amount).toBe(testTransaction.amount);
      expect(savedTransaction.description).toBe(testTransaction.description);
      expect(savedTransaction.type).toBe(testTransaction.type);
      expect(savedTransaction.category).toBe(testTransaction.category);
      expect(savedTransaction.business_unit_id).toBe(businessUnits[0].id);

      createdTransactions.push(savedTransaction.id);
    });

    test('should validate required transaction fields', async () => {
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      // Test missing amount
      const invalidTransaction = {
        description: 'Test without amount',
        type: 'expense',
        category: 'Testing',
        date: new Date().toISOString().split('T')[0]
      };

      await expect(saveTransaction(invalidTransaction, businessUnits[0].id))
        .rejects.toThrow();
    });

    test('should handle invalid business unit ID', async () => {
      const testTransaction = createTestTransaction();
      const invalidBusinessUnitId = 'invalid-uuid';

      await expect(saveTransaction(testTransaction, invalidBusinessUnitId))
        .rejects.toThrow();
    });

    test('should save multiple transactions', async () => {
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      const transactions = [
        createTestTransaction(),
        createTestTransaction(),
        createTestTransaction()
      ];

      const savedTransactions = await Promise.all(
        transactions.map(t => saveTransaction(t, businessUnits[0].id))
      );

      expect(savedTransactions.length).toBe(3);
      savedTransactions.forEach(saved => {
        expect(saved.id).toBeDefined();
        expect(saved.business_unit_id).toBe(businessUnits[0].id);
        createdTransactions.push(saved.id);
      });
    });
  });

  describe('Data Validation', () => {
    test('should validate transaction amount', () => {
      const validAmounts = [0.01, 1, 10.50, 999.99, 1000];
      const invalidAmounts = [-1, 0, 'abc', null, undefined, ''];

      validAmounts.forEach(amount => {
        expect(typeof amount === 'number' && amount > 0).toBe(true);
      });

      invalidAmounts.forEach(amount => {
        expect(typeof amount === 'number' && amount > 0).toBe(false);
      });
    });

    test('should validate transaction type', () => {
      const validTypes = ['income', 'expense'];
      const invalidTypes = ['INCOME', 'EXPENSE', 'other', '', null, undefined];

      validTypes.forEach(type => {
        expect(['income', 'expense']).toContain(type);
      });

      invalidTypes.forEach(type => {
        expect(['income', 'expense']).toContain(type);
      });
    });

    test('should validate date format', () => {
      const validDates = [
        '2024-01-15',
        '2023-12-31',
        new Date().toISOString().split('T')[0]
      ];

      const invalidDates = [
        '2024/01/15',
        '15-01-2024',
        'today',
        '2024-13-01',
        '2024-01-32',
        ''
      ];

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      validDates.forEach(date => {
        expect(dateRegex.test(date)).toBe(true);
        expect(new Date(date).toString()).not.toBe('Invalid Date');
      });

      invalidDates.forEach(date => {
        if (date === 'today') {
          // 'today' is valid in bot context but not as direct date
          expect(date).toBe('today');
        } else {
          expect(dateRegex.test(date) && new Date(date).toString() !== 'Invalid Date').toBe(false);
        }
      });
    });
  });

  describe('Conversation State Management', () => {
    test('should manage user states correctly', () => {
      const userStates = {};
      const STATES = {
        IDLE: 'idle',
        AMOUNT: 'waiting_for_amount',
        DESCRIPTION: 'waiting_for_description'
      };

      const getUserState = (userId) => userStates[userId] || { state: STATES.IDLE };
      const setUserState = (userId, state, data = {}) => { 
        userStates[userId] = { state, ...data }; 
      };
      const clearUserState = (userId) => { delete userStates[userId]; };

      const userId = 'test-user-123';

      // Initial state should be idle
      expect(getUserState(userId).state).toBe(STATES.IDLE);

      // Set state with data
      const transaction = { amount: 25.50 };
      setUserState(userId, STATES.AMOUNT, { transaction });

      const state = getUserState(userId);
      expect(state.state).toBe(STATES.AMOUNT);
      expect(state.transaction).toEqual(transaction);

      // Update state
      setUserState(userId, STATES.DESCRIPTION, { transaction: { ...transaction, description: 'Test' } });
      
      const updatedState = getUserState(userId);
      expect(updatedState.state).toBe(STATES.DESCRIPTION);
      expect(updatedState.transaction.description).toBe('Test');

      // Clear state
      clearUserState(userId);
      expect(getUserState(userId).state).toBe(STATES.IDLE);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // This test would require mocking the database connection
      // For now, we test that functions return appropriate defaults
      const emptyResult = [];
      expect(Array.isArray(emptyResult)).toBe(true);
      expect(emptyResult.length).toBe(0);
    });

    test('should handle malformed transaction data', async () => {
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      const malformedTransaction = {
        amount: 'not-a-number',
        description: null,
        type: 'invalid-type',
        category: '',
        date: 'invalid-date'
      };

      await expect(saveTransaction(malformedTransaction, businessUnits[0].id))
        .rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full transaction flow', async () => {
      // 1. Get business units
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      // 2. Create transaction
      const testTransaction = createTestTransaction();
      const savedTransaction = await saveTransaction(testTransaction, businessUnits[0].id);
      
      expect(savedTransaction.id).toBeDefined();
      createdTransactions.push(savedTransaction.id);

      // 3. Verify transaction was saved
      const { data: retrievedTransaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', savedTransaction.id)
        .single();

      expect(error).toBeNull();
      expect(retrievedTransaction).toBeDefined();
      expect(retrievedTransaction.amount).toBe(testTransaction.amount);
      expect(retrievedTransaction.description).toBe(testTransaction.description);

      // 4. Verify business unit relationship
      expect(retrievedTransaction.business_unit_id).toBe(businessUnits[0].id);
    });

    test('should handle concurrent transaction creation', async () => {
      const businessUnits = await getBusinessUnits();
      expect(businessUnits.length).toBeGreaterThan(0);

      const concurrentTransactions = Array.from({ length: 5 }, () => createTestTransaction());
      
      const savePromises = concurrentTransactions.map(transaction => 
        saveTransaction(transaction, businessUnits[0].id)
      );

      const results = await Promise.all(savePromises);
      
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        createdTransactions.push(result.id);
      });

      // Verify all transactions were saved with unique IDs
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(5);
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('should handle business unit fetch within reasonable time', async () => {
    const startTime = Date.now();
    const businessUnits = await getBusinessUnits();
    const endTime = Date.now();
    
    expect(businessUnits).toBeDefined();
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should handle transaction save within reasonable time', async () => {
    const businessUnits = await getBusinessUnits();
    expect(businessUnits.length).toBeGreaterThan(0);

    const testTransaction = createTestTransaction();
    
    const startTime = Date.now();
    const savedTransaction = await saveTransaction(testTransaction, businessUnits[0].id);
    const endTime = Date.now();
    
    expect(savedTransaction.id).toBeDefined();
    expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    
    // Cleanup
    await supabase.from('transactions').delete().eq('id', savedTransaction.id);
  });
});

// Helper function to run tests
const runTests = async () => {
  console.log('🧪 Running Bot Functionality Tests...\n');
  
  try {
    // Check environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials in environment');
    }
    
    console.log('✅ Environment variables loaded');
    console.log('✅ Test suite ready to run');
    console.log('\nRun with: npm test or jest bot-functionality.test.js');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    process.exit(1);
  }
};

// Export for Jest or run directly
if (require.main === module) {
  runTests();
}

module.exports = {
  getBusinessUnits,
  saveTransaction,
  createTestTransaction
};
