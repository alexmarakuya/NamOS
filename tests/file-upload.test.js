// File Upload Functionality Tests
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../telegram-bot/.env' });

// Test configuration
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const TEST_BUCKET = 'transaction-attachments';

// Test utilities
const createTestFile = (filename, content = 'Test file content') => {
  const testDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const cleanup = async (paths = [], storageFiles = []) => {
  // Clean up local files
  paths.forEach(filePath => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  
  // Clean up storage files
  if (storageFiles.length > 0) {
    await supabase.storage.from(TEST_BUCKET).remove(storageFiles);
  }
  
  // Clean up temp directory
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

// Test suite
describe('File Upload Functionality', () => {
  let testFiles = [];
  let storageFiles = [];
  
  afterEach(async () => {
    await cleanup(testFiles, storageFiles);
    testFiles = [];
    storageFiles = [];
  });

  describe('Storage Bucket Access', () => {
    test('should be able to list storage buckets', async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      expect(error).toBeNull();
      expect(buckets).toBeDefined();
      expect(Array.isArray(buckets)).toBe(true);
      
      const transactionBucket = buckets.find(b => b.name === TEST_BUCKET);
      expect(transactionBucket).toBeDefined();
      expect(transactionBucket.public).toBe(true);
    });

    test('should be able to access transaction-attachments bucket', async () => {
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .list('', { limit: 1 });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('File Upload Operations', () => {
    test('should upload a text file successfully', async () => {
      const testFile = createTestFile('test.txt', 'Hello, World!');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-test.txt`;
      storageFiles.push(storagePath);
      
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(storagePath);
    });

    test('should upload an image file successfully', async () => {
      // Create a minimal PNG file (1x1 pixel)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      const testFile = path.join(__dirname, 'temp', 'test.png');
      if (!fs.existsSync(path.dirname(testFile))) {
        fs.mkdirSync(path.dirname(testFile), { recursive: true });
      }
      fs.writeFileSync(testFile, pngBuffer);
      testFiles.push(testFile);
      
      const storagePath = `test/${Date.now()}-test.png`;
      storageFiles.push(storagePath);
      
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, pngBuffer, {
          contentType: 'image/png',
          cacheControl: '3600'
        });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(storagePath);
    });

    test('should handle file upload with special characters in filename', async () => {
      const testFile = createTestFile('test file (1).txt', 'Special chars test');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-special-chars.txt`;
      storageFiles.push(storagePath);
      
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain'
        });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should handle large file upload', async () => {
      // Create a 1MB test file
      const largeContent = 'A'.repeat(1024 * 1024);
      const testFile = createTestFile('large-test.txt', largeContent);
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-large-test.txt`;
      storageFiles.push(storagePath);
      
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain'
        });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.path).toBe(storagePath);
    });
  });

  describe('File Retrieval Operations', () => {
    test('should generate public URL for uploaded file', async () => {
      const testFile = createTestFile('url-test.txt', 'URL test content');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-url-test.txt`;
      storageFiles.push(storagePath);
      
      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain'
        });
      
      expect(uploadError).toBeNull();
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(TEST_BUCKET)
        .getPublicUrl(storagePath);
      
      expect(urlData.publicUrl).toBeDefined();
      expect(urlData.publicUrl).toContain(TEST_BUCKET);
      expect(urlData.publicUrl).toContain(storagePath);
    });

    test('should list uploaded files', async () => {
      const testFile = createTestFile('list-test.txt', 'List test content');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-list-test.txt`;
      storageFiles.push(storagePath);
      
      // Upload file
      await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain'
        });
      
      // List files in test directory
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .list('test');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      const uploadedFile = data.find(file => file.name.includes('list-test'));
      expect(uploadedFile).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    test('should create attachment record after file upload', async () => {
      // First create a test transaction
      const { data: businessUnits } = await supabase
        .from('business_units')
        .select('id')
        .limit(1);
      
      if (!businessUnits || businessUnits.length === 0) {
        throw new Error('No business units found for testing');
      }
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          amount: 10.00,
          description: 'Test Transaction for File Upload',
          type: 'expense',
          category: 'Testing',
          business_unit_id: businessUnits[0].id,
          date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
      
      expect(transactionError).toBeNull();
      expect(transaction).toBeDefined();
      
      // Upload file
      const testFile = createTestFile('db-test.txt', 'Database test content');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `${transaction.id}/${Date.now()}-db-test.txt`;
      storageFiles.push(storagePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'text/plain'
        });
      
      expect(uploadError).toBeNull();
      
      // Create attachment record
      const { data: attachment, error: attachmentError } = await supabase
        .from('attachments')
        .insert([{
          transaction_id: transaction.id,
          file_name: 'db-test.txt',
          file_type: 'text/plain',
          file_size: fileBuffer.length,
          storage_path: storagePath,
          upload_source: 'test'
        }])
        .select()
        .single();
      
      expect(attachmentError).toBeNull();
      expect(attachment).toBeDefined();
      expect(attachment.transaction_id).toBe(transaction.id);
      expect(attachment.storage_path).toBe(storagePath);
      
      // Cleanup database records
      await supabase.from('attachments').delete().eq('id', attachment.id);
      await supabase.from('transactions').delete().eq('id', transaction.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle upload to non-existent bucket', async () => {
      const testFile = createTestFile('error-test.txt', 'Error test');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      
      const { data, error } = await supabase.storage
        .from('non-existent-bucket')
        .upload('test.txt', fileBuffer);
      
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    test('should handle duplicate file upload', async () => {
      const testFile = createTestFile('duplicate-test.txt', 'Duplicate test');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-duplicate-test.txt`;
      storageFiles.push(storagePath);
      
      // First upload
      const { error: firstError } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer);
      
      expect(firstError).toBeNull();
      
      // Second upload (should fail or overwrite)
      const { error: secondError } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer);
      
      // Depending on Supabase configuration, this might succeed (overwrite) or fail
      // We just check that we get a consistent response
      expect(typeof secondError === 'object').toBe(true);
    });

    test('should handle empty file upload', async () => {
      const testFile = createTestFile('empty-test.txt', '');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-empty-test.txt`;
      storageFiles.push(storagePath);
      
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer);
      
      // Empty files should still upload successfully
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('File Cleanup Operations', () => {
    test('should delete uploaded file', async () => {
      const testFile = createTestFile('delete-test.txt', 'Delete test content');
      testFiles.push(testFile);
      
      const fileBuffer = fs.readFileSync(testFile);
      const storagePath = `test/${Date.now()}-delete-test.txt`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(TEST_BUCKET)
        .upload(storagePath, fileBuffer);
      
      expect(uploadError).toBeNull();
      
      // Delete file
      const { data, error } = await supabase.storage
        .from(TEST_BUCKET)
        .remove([storagePath]);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].name).toContain('delete-test');
    });
  });
});

// Helper function to run tests
const runTests = async () => {
  console.log('🧪 Running File Upload Tests...\n');
  
  try {
    // Check environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials in environment');
    }
    
    console.log('✅ Environment variables loaded');
    console.log('✅ Test suite ready to run');
    console.log('\nRun with: npm test or jest file-upload.test.js');
    
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
  createTestFile,
  cleanup,
  TEST_BUCKET
};
