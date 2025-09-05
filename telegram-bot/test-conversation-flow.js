// Test the complete conversation flow to identify where saving fails
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Simulate the conversation states and transaction structure
const CONVERSATION_STATES = {
  IDLE: 'idle',
  WAITING_FOR_AMOUNT: 'waiting_for_amount',
  WAITING_FOR_DESCRIPTION: 'waiting_for_description',
  WAITING_FOR_CATEGORY: 'waiting_for_category',
  WAITING_FOR_TYPE: 'waiting_for_type',
  WAITING_FOR_DATE: 'waiting_for_date',
  WAITING_FOR_BUSINESS_UNIT: 'waiting_for_business_unit',
  CONFIRMING: 'confirming'
};

// Simulate the exact save function from the bot
const saveTransactionWithFile = async (transaction, businessUnitId, filePath) => {
  try {
    console.log('💾 Attempting to save transaction...');
    console.log('Transaction data:', JSON.stringify(transaction, null, 2));
    console.log('Business Unit ID:', businessUnitId);
    console.log('File Path:', filePath);

    // Add transaction first
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        business_unit_id: businessUnitId
      }])
      .select()
      .single();

    if (transactionError) {
      console.log('❌ Transaction insert error:', transactionError);
      throw transactionError;
    }
    
    console.log('✅ Transaction inserted with ID:', transactionData.id);

    // If we have a file, process it
    if (filePath && transactionData) {
      console.log('📁 Processing file attachment...');
      // File processing logic would go here
      // For now, just log that we would process it
      console.log('✅ File processing would happen here');
    }

    return transactionData;
  } catch (error) {
    console.error('❌ Error in saveTransactionWithFile:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};

async function testConversationFlow() {
  console.log('🧪 Testing Complete Conversation Flow\n');
  
  try {
    // Step 1: Get business units (like the bot does)
    console.log('1️⃣ Fetching business units...');
    const { data: businessUnits, error: buError } = await supabase
      .from('business_units')
      .select('*');
    
    if (buError) {
      console.log('❌ Business units error:', buError.message);
      return;
    }
    
    if (businessUnits.length === 0) {
      console.log('❌ No business units found');
      return;
    }
    
    console.log(`✅ Found ${businessUnits.length} business units`);
    
    // Step 2: Simulate a complete transaction (like after conversation)
    const simulatedUserState = {
      state: CONVERSATION_STATES.CONFIRMING,
      transaction: {
        amount: 25.50,
        description: 'Coffee meeting with client',
        category: 'Food & Dining',
        type: 'expense',
        date: '2025-09-01',
        businessUnitId: businessUnits[0].id,
        businessUnitName: businessUnits[0].name,
        filePath: null // No file for this test
      }
    };
    
    console.log('\n2️⃣ Simulated user state:');
    console.log(JSON.stringify(simulatedUserState, null, 2));
    
    // Step 3: Simulate the confirm_save action
    console.log('\n3️⃣ Simulating confirm_save action...');
    const transaction = simulatedUserState.transaction;
    
    // This is exactly what the bot does in the confirm_save case
    const savedTransaction = await saveTransactionWithFile(
      {
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        date: transaction.date
      },
      transaction.businessUnitId,
      transaction.filePath
    );
    
    console.log('\n✅ Transaction saved successfully!');
    console.log('Saved transaction ID:', savedTransaction.id);
    
    // Step 4: Verify the transaction was actually saved
    console.log('\n4️⃣ Verifying transaction was saved...');
    const { data: verifyTransaction, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', savedTransaction.id)
      .single();
    
    if (verifyError) {
      console.log('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ Transaction verified in database:');
      console.log(`   Amount: $${verifyTransaction.amount}`);
      console.log(`   Description: ${verifyTransaction.description}`);
      console.log(`   Category: ${verifyTransaction.category}`);
      console.log(`   Type: ${verifyTransaction.type}`);
      console.log(`   Date: ${verifyTransaction.date}`);
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('transactions').delete().eq('id', savedTransaction.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Complete conversation flow test passed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test specific error scenarios
async function testErrorScenarios() {
  console.log('\n🔍 Testing Error Scenarios\n');
  
  try {
    // Test 1: Invalid business unit ID
    console.log('1️⃣ Testing invalid business unit ID...');
    try {
      await saveTransactionWithFile(
        {
          amount: 10.00,
          description: 'Test',
          category: 'Test',
          type: 'expense',
          date: '2025-09-01'
        },
        'invalid-uuid',
        null
      );
      console.log('❌ Should have failed with invalid business unit ID');
    } catch (error) {
      console.log('✅ Correctly caught error for invalid business unit:', error.message);
    }
    
    // Test 2: Missing required fields
    console.log('\n2️⃣ Testing missing required fields...');
    try {
      await saveTransactionWithFile(
        {
          // Missing amount
          description: 'Test',
          category: 'Test',
          type: 'expense',
          date: '2025-09-01'
        },
        'e72ab0d9-1749-45e0-9fa0-306e0fe81ac5',
        null
      );
      console.log('❌ Should have failed with missing amount');
    } catch (error) {
      console.log('✅ Correctly caught error for missing fields:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error scenario test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testConversationFlow();
  await testErrorScenarios();
}

runAllTests();
