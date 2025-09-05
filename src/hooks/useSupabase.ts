import { useState, useEffect, useCallback } from 'react';
import { supabase, DatabaseTransaction, DatabaseBusinessUnit, DatabaseAttachment, uploadFile, getFileUrl } from '../lib/supabase';

// Type alias for backward compatibility
type DatabaseArea = DatabaseBusinessUnit;

// Custom hook for fetching business units
export const useBusinessUnits = () => {
  const [businessUnits, setBusinessUnits] = useState<DatabaseBusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .order('name');

      if (error) throw error;
      setBusinessUnits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessUnits();
  }, []);

  return { businessUnits, loading, error, refetch: fetchBusinessUnits };
};

// Alias for areas (same as business units)
export const useAreas = () => {
  const result = useBusinessUnits();
  return {
    areas: result.businessUnits,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch
  };
};

// Custom hook for fetching transactions
export const useTransactions = (businessUnitId?: string) => {
  const [transactions, setTransactions] = useState<DatabaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (businessUnitId && businessUnitId !== 'all') {
        query = query.eq('business_unit_id', businessUnitId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [businessUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { transactions, loading, error, refetch: fetchTransactions };
};

// Custom hook for transaction CRUD operations
export const useTransactionOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTransaction = async (transaction: Omit<DatabaseTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<DatabaseTransaction, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
    error
  };
};

// Custom hook for fetching category breakdown by month
export const useCategoryBreakdown = (month: string, year: number, type: 'income' | 'expense', businessUnitId?: string) => {
  const [breakdown, setBreakdown] = useState<{category: string, amount: number, count: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdown = useCallback(async () => {
    if (!month || !year) {
      console.log('No month or year provided:', { month, year });
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching breakdown for:', { month, year, type, businessUnitId });
      
      // Create date range for the month - handle month names properly
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(month);
      
      if (monthIndex === -1) {
        throw new Error(`Invalid month name: ${month}`);
      }
      
      const monthNumber = monthIndex + 1;
      const startDate = `${year}-${monthNumber.toString().padStart(2, '0')}-01`;
      // Get last day of month
      const lastDay = new Date(year, monthNumber, 0).getDate();
      const endDate = `${year}-${monthNumber.toString().padStart(2, '0')}-${lastDay}`;
      
      console.log('Date range:', { startDate, endDate });
      
      let query = supabase
        .from('transactions')
        .select('category, amount')
        .eq('type', type)
        .gte('date', startDate)
        .lte('date', endDate);

      if (businessUnitId && businessUnitId !== 'all') {
        query = query.eq('business_unit_id', businessUnitId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched data:', data);

      // Group by category and sum amounts
      const categoryMap = new Map<string, {amount: number, count: number}>();
      
      data?.forEach(transaction => {
        const existing = categoryMap.get(transaction.category) || {amount: 0, count: 0};
        categoryMap.set(transaction.category, {
          amount: existing.amount + parseFloat(transaction.amount.toString()),
          count: existing.count + 1
        });
      });

      // Convert to array and sort by amount
      const breakdownArray = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      console.log('Final breakdown:', breakdownArray);
      setBreakdown(breakdownArray);
    } catch (err) {
      console.error('Error in fetchBreakdown:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [month, year, type, businessUnitId]);

  return { breakdown, loading, error, fetchBreakdown };
};

// Utility function to convert database transaction to app format
export const convertDbTransactionToApp = (dbTransaction: DatabaseTransaction) => {
  return {
    id: dbTransaction.id,
    amount: parseFloat(dbTransaction.amount.toString()),
    description: dbTransaction.description,
    type: dbTransaction.type as 'income' | 'expense',
    category: dbTransaction.category,
    businessUnit: '', // This will be populated when we join with business units
    date: new Date(dbTransaction.date),
  };
};

// Custom hook for managing attachments
export const useAttachments = (transactionId?: string) => {
  const [attachments, setAttachments] = useState<DatabaseAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!transactionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at');

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  const uploadAttachment = async (file: File, transactionId: string, uploadSource: 'telegram' | 'manual' | 'api' = 'manual') => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${transactionId}/${fileName}`;

      // Upload to Supabase Storage
      await uploadFile(file, filePath);

      // Save attachment record to database
      const { data, error } = await supabase
        .from('attachments')
        .insert([{
          transaction_id: transactionId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          upload_source: uploadSource
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh attachments
      await fetchAttachments();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      // Refresh attachments
      await fetchAttachments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  return {
    attachments,
    loading,
    error,
    uploadAttachment,
    deleteAttachment,
    refetch: fetchAttachments
  };
};

// Enhanced transaction operations with file support
export const useTransactionOperationsWithFiles = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTransactionWithFile = async (
    transaction: Omit<DatabaseTransaction, 'id' | 'created_at' | 'updated_at' | 'primary_attachment_id'>, 
    file?: File,
    uploadSource: 'telegram' | 'manual' | 'api' = 'manual'
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Add transaction first
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // If file is provided, upload it
      if (file && transactionData) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${transactionData.id}/${fileName}`;

        // Upload to Supabase Storage
        await uploadFile(file, filePath);

        // Save attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('attachments')
          .insert([{
            transaction_id: transactionData.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
            upload_source: uploadSource
          }])
          .select()
          .single();

        if (attachmentError) throw attachmentError;

        // Update transaction with primary attachment reference
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ primary_attachment_id: attachmentData.id })
          .eq('id', transactionData.id);

        if (updateError) throw updateError;
      }

      return transactionData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    addTransactionWithFile,
    loading,
    error
  };
};

// Utility function to convert database business unit to app format
export const convertDbAreaToApp = (dbArea: DatabaseArea) => {
  return {
    id: dbArea.id,
    name: dbArea.name,
    type: dbArea.type as 'business' | 'personal' | 'project' | 'mixed' | 'us_business',
    color: dbArea.color,
  };
};

// Legacy function for backward compatibility
export const convertDbBusinessUnitToApp = convertDbAreaToApp;
