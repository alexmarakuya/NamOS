import { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabase, DatabaseTransaction, DatabaseBusinessUnit, DatabaseAttachment, uploadFile, getFileUrl } from '../lib/supabase';
import { Project, ProjectSpirit, SpiritConversation, SpiritInsight, ClientProfile } from '../types';
import { DbTimeEntry, DbProject, DbSpirit, DbConversation, DbInsight } from '../types/database';
import { createDefaultClientProfile } from '../lib/ai';

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
      // No month or year provided - return empty breakdown
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetching breakdown for the specified parameters
      
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
      
      // Date range calculated for the query
      
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

      // Data fetched successfully

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

      // Breakdown calculation completed
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

// Time tracking hooks
export const useTimeEntries = (projectId?: string, userId?: string) => {
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          projects (
            id,
            name,
            client_name,
            hourly_rate,
            business_unit_id,
            business_units (
              id,
              name,
              type,
              color
            )
          )
        `)
        .order('date', { ascending: false });

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }
      
      if (userId && userId !== 'all') {
        // Filter by team member ID - need to match against user_id field in time_entries
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  return { timeEntries, loading, error, refetch: fetchTimeEntries };
};

export const useProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          business_units (
            id,
            name,
            type,
            color
          )
        `)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, refetch: fetchProjects };
};

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return { teamMembers, loading, error, refetch: fetchTeamMembers };
};

// Task Management Hooks - MVP Implementation
export const useTasks = (projectId?: string, assigneeId?: string) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects (
            id,
            name,
            client_name,
            business_unit_id,
            business_units (
              id,
              name,
              type,
              color
            )
          ),
          team_members!assigned_to (
            id,
            slack_username,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by project if specified
      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      // Filter by assignee if specified  
      if (assigneeId && assigneeId !== 'all') {
        query = query.eq('assigned_to', assigneeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, assigneeId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
};

export const useTaskOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (taskData: {
    title: string;
    description?: string;
    project_id?: string;
    assigned_to?: string;
    status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    estimated_hours?: number;
    tags?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const insertData = {
        ...taskData,
        created_by: 'user', // In MVP, we'll use a simple identifier
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium'
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Create task error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, updates: {
    title?: string;
    description?: string;
    project_id?: string;
    assigned_to?: string;
    status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    estimated_hours?: number;
    actual_hours?: number;
    tags?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createTask,
    updateTask,
    deleteTask,
    loading,
    error
  };
};

export const useTaskStats = () => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select('status, due_date, estimated_hours, actual_hours');

      if (error) throw error;

      const now = new Date();
      const calculatedStats = {
        totalTasks: data.length,
        completedTasks: data.filter(task => task.status === 'done').length,
        inProgressTasks: data.filter(task => task.status === 'in_progress').length,
        overdueTasks: data.filter(task => 
          task.due_date && 
          new Date(task.due_date) < now && 
          task.status !== 'done'
        ).length,
        totalEstimatedHours: data.reduce((sum, task) => sum + (task.estimated_hours || 0), 0),
        totalActualHours: data.reduce((sum, task) => sum + (task.actual_hours || 0), 0)
      };

      setStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching task stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

export const useProjectStats = () => {
  const [stats, setStats] = useState({
    activeProjects: 0,
    upcomingProjects: 0,
    completedProjects: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select('status, is_active');

      if (error) throw error;

      const calculatedStats = {
        activeProjects: data.filter(project => 
          project.is_active && (project.status === 'active' || !project.status)
        ).length,
        upcomingProjects: data.filter(project => 
          project.is_active && project.status === 'upcoming'
        ).length,
        completedProjects: data.filter(project => 
          project.status === 'completed' || project.is_active === false
        ).length
      };

      setStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching project stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch project statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjectStats();
  }, [fetchProjectStats]);

  return { stats, loading, error, refetch: fetchProjectStats };
};

export const useUrgentTasks = () => {
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUrgentTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            id,
            name,
            client_name
          )
        `)
        .neq('status', 'done')
        .or(`due_date.lt.${threeDaysFromNow.toISOString()},priority.eq.high`)
        .order('due_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Sort by urgency: overdue first, then by priority, then by due date
      const sortedTasks = (data || []).sort((a, b) => {
        const aOverdue = a.due_date && new Date(a.due_date) < now;
        const bOverdue = b.due_date && new Date(b.due_date) < now;
        
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        
        return 0;
      });

      setUrgentTasks(sortedTasks);
    } catch (err) {
      console.error('Error fetching urgent tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch urgent tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUrgentTasks();
  }, [fetchUrgentTasks]);

  return { urgentTasks, loading, error, refetch: fetchUrgentTasks };
};

export const useTimeSensitiveProjects = () => {
  const [timeSensitiveProjects, setTimeSensitiveProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeSensitiveProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .not('deadline', 'is', null)
          .eq('is_active', true)
          .order('deadline', { ascending: true });

        if (error) throw error;

        // Filter projects with deadlines within 7 days
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const timeSensitive = (data || []).filter(project => {
          if (!project.deadline) return false;
          const deadline = new Date(project.deadline);
          return deadline <= sevenDaysFromNow;
        });

        setTimeSensitiveProjects(timeSensitive);
      } catch (error) {
        console.error('Error fetching time-sensitive projects:', error);
        setTimeSensitiveProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSensitiveProjects();
  }, []);

  return { timeSensitiveProjects, loading };
};

export const useProjectTaskStats = (projectId: string) => {
  const [taskStats, setTaskStats] = useState({
    total: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', projectId);

      if (error) throw error;

      const stats = {
        total: data.length,
        todo: data.filter(task => task.status === 'todo').length,
        in_progress: data.filter(task => task.status === 'in_progress').length,
        review: data.filter(task => task.status === 'review').length,
        done: data.filter(task => task.status === 'done').length
      };

      setTaskStats(stats);
    } catch (err) {
      console.error('Error fetching project task stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task statistics');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchTaskStats();
    }
  }, [fetchTaskStats, projectId]);

  return { taskStats, loading, error, refetch: fetchTaskStats };
};

// Utility functions for time tracking
export const convertDbTimeEntryToApp = (dbTimeEntry: DbTimeEntry) => {
  return {
    id: dbTimeEntry.id,
    user_id: dbTimeEntry.user_id,
    user_name: dbTimeEntry.user_name,
    project_id: dbTimeEntry.project_id,
    description: dbTimeEntry.description,
    hours: parseFloat(dbTimeEntry.hours.toString()),
    date: new Date(dbTimeEntry.date),
    is_billable: dbTimeEntry.is_billable ?? true,
    created_at: new Date(dbTimeEntry.created_at),
    project: dbTimeEntry.projects ? {
      id: dbTimeEntry.projects.id,
      name: dbTimeEntry.projects.name,
      description: dbTimeEntry.projects.description,
      client_name: dbTimeEntry.projects.client_name,
      hourly_rate: dbTimeEntry.projects.hourly_rate ? parseFloat(dbTimeEntry.projects.hourly_rate.toString()) : undefined,
      business_unit_id: dbTimeEntry.projects.business_unit_id,
      is_active: true, // Assume active since we're only fetching active projects
      business_unit: dbTimeEntry.projects.business_units
    } : undefined
  };
};

export const convertDbProjectToApp = (dbProject: DbProject) => {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    client_name: dbProject.client_name,
    hourly_rate: dbProject.hourly_rate ? parseFloat(dbProject.hourly_rate.toString()) : undefined,
    business_unit_id: dbProject.business_unit_id,
    is_active: dbProject.is_active,
    business_unit: dbProject.business_units
  };
};

export const useProjectOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (projectData: {
    name: string;
    description?: string;
    client_name?: string;
    business_unit_id?: string;
    status?: 'active' | 'upcoming' | 'completed' | 'on_hold';
    project_type?: 'ongoing' | 'fixed-timeline';
    deadline?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          is_active: true,
          status: projectData.status || 'active'
        }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (projectId: string, updates: {
    name?: string;
    description?: string;
    client_name?: string;
    business_unit_id?: string;
    status?: 'active' | 'upcoming' | 'completed' | 'on_hold';
    project_type?: 'ongoing' | 'fixed-timeline';
    deadline?: string;
    is_active?: boolean;
  }) => {
        try {
          setLoading(true);
          setError(null);

          const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select('*')
            .single();

          if (error) throw error;

          return data;
    } catch (err) {
      console.error('Update project error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check for related records and provide detailed feedback
      const checks = await Promise.all([
        supabase.from('tasks').select('id').eq('project_id', projectId).limit(1),
        supabase.from('time_entries').select('id').eq('project_id', projectId).limit(1),
        supabase.from('project_spirits').select('id').eq('project_id', projectId).limit(1)
      ]);

      const [tasksResult, timeEntriesResult, spiritsResult] = checks;

      // Check for errors in queries
      if (tasksResult.error && tasksResult.error.code !== 'PGRST116') throw tasksResult.error;
      if (timeEntriesResult.error && timeEntriesResult.error.code !== 'PGRST116') throw timeEntriesResult.error;
      if (spiritsResult.error && spiritsResult.error.code !== 'PGRST116') throw spiritsResult.error;

      const hasRelatedRecords = [];
      if (tasksResult.data && tasksResult.data.length > 0) {
        hasRelatedRecords.push('tasks');
      }
      if (timeEntriesResult.data && timeEntriesResult.data.length > 0) {
        hasRelatedRecords.push('time entries');
      }
      if (spiritsResult.data && spiritsResult.data.length > 0) {
        hasRelatedRecords.push('project spirits');
      }

      // If there are related records, ask for confirmation
      if (hasRelatedRecords.length > 0) {
        const recordTypes = hasRelatedRecords.join(', ');
        const confirmMessage = `This project has related ${recordTypes}. Deleting the project will also delete all related records. Are you sure you want to continue?`;
        
        if (!window.confirm(confirmMessage)) {
          throw new Error('Project deletion cancelled by user');
        }
      }

      // Proceed with deletion - foreign key constraints should handle cascading
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Database deletion error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (err) {
      console.error('Delete project error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const archiveProject = async (projectId: string) => {
    return updateProject(projectId, { is_active: false, status: 'completed' });
  };

  const duplicateProject = async (projectId: string, newName?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get the original project
      const { data: originalProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy with new name
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: newName || `${originalProject.name} (Copy)`,
          description: originalProject.description,
          client_name: originalProject.client_name,
          business_unit_id: originalProject.business_unit_id,
          project_type: originalProject.project_type,
          status: 'upcoming', // New projects start as upcoming
          is_active: true
        }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    duplicateProject,
    loading,
    error
  };
};

export const useClients = () => {
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get unique client names from projects
      const { data, error } = await supabase
        .from('projects')
        .select('client_name')
        .not('client_name', 'is', null);

      if (error) throw error;

      // Extract unique client names
      const uniqueClients = Array.from(new Set(data.map(p => p.client_name))).filter(Boolean) as string[];
      setClients(uniqueClients.sort());
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback((clientName: string) => {
    if (!clients.includes(clientName)) {
      setClients(prev => [...prev, clientName].sort());
    }
  }, [clients]);

  return { clients, loading, error, refetch: fetchClients, addClient };
};

// Enhanced clients hook with status support
export const useClientsWithStatus = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get clients from the clients table
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError && clientsError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        throw clientsError;
      }

      if (clientsData && clientsData.length > 0) {
        // We have clients in the clients table
        const clientsWithProjects = await Promise.all(
          clientsData.map(async (client) => {
            const { data: projects } = await supabase
              .from('projects')
              .select('id, status, is_active')
              .eq('client_name', client.name);

            const activeProjects = projects?.filter(p => {
              const status = p.status || (p.is_active ? 'active' : 'completed');
              return status !== 'completed';
            }).length || 0;

            const completedProjects = projects?.filter(p => {
              const status = p.status || (p.is_active ? 'active' : 'completed');
              return status === 'completed';
            }).length || 0;

            return {
              ...client,
              projectCount: projects?.length || 0,
              activeProjects,
              completedProjects
            };
          })
        );

        setClients(clientsWithProjects);
      } else {
        // Fallback to getting clients from projects table
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('client_name, status, is_active')
          .not('client_name', 'is', null);

        if (projectsError) throw projectsError;

        const clientMap = new Map();
        
        projectsData?.forEach(project => {
          if (project.client_name) {
            const clientName = project.client_name;
            if (!clientMap.has(clientName)) {
              clientMap.set(clientName, {
                name: clientName,
                status: 'active', // Default status
                projectCount: 0,
                activeProjects: 0,
                completedProjects: 0
              });
            }
            
            const client = clientMap.get(clientName);
            client.projectCount++;
            
            const status = project.status || (project.is_active ? 'active' : 'completed');
            if (status === 'completed') {
              client.completedProjects++;
            } else {
              client.activeProjects++;
            }
          }
        });
        
        const finalClients = Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setClients(finalClients);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
};

// Client operations hook
export const useClientOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateClientStatus = useCallback(async (clientName: string, newStatus: string) => {
    try {
      setLoading(true);
      setError(null);

      // First check if client exists in clients table
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('name', clientName)
        .single();

      if (existingClient) {
        // Update existing client
        const { error: updateError } = await supabase
          .from('clients')
          .update({ status: newStatus })
          .eq('name', clientName);

        if (updateError) throw updateError;
      } else {
        // Create new client with status
        const { error: insertError } = await supabase
          .from('clients')
          .insert({ name: clientName, status: newStatus });

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error updating client status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update client status');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData: {
    name: string;
    status?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          status: clientData.status || 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err instanceof Error ? err.message : 'Failed to create client');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (clientId: string, updates: {
    name?: string;
    status?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('Error updating client:', err);
      setError(err instanceof Error ? err.message : 'Failed to update client');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if client has any projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);

      if (projectsError) throw projectsError;

      if (projects && projects.length > 0) {
        throw new Error('Cannot delete client with existing projects. Please reassign or delete projects first.');
      }

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting client:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateClientStatus,
    createClient,
    updateClient,
    deleteClient,
    loading,
    error
  };
};

// User Management Operations Hook
export const useUserOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = useCallback(async (userData: {
    full_name: string;
    email: string;
    slack_username?: string;
    role: string;
    hourly_rate?: number;
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      // Generate a unique slack_user_id if not provided
      const slack_user_id = userData.slack_username || `user_${Date.now()}`;

      const { data, error: insertError } = await supabase
        .from('team_members')
        .insert({
          slack_user_id,
          slack_username: userData.slack_username || userData.email.split('@')[0],
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          hourly_rate: userData.hourly_rate || 0,
          is_active: userData.is_active ?? true
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, updates: {
    full_name?: string;
    email?: string;
    slack_username?: string;
    role?: string;
    hourly_rate?: number;
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has any assigned tasks
      const { data: assignedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_to', userId)
        .limit(1);

      if (tasksError) throw tasksError;

      if (assignedTasks && assignedTasks.length > 0) {
        throw new Error('Cannot delete user with assigned tasks. Please reassign tasks first.');
      }

      // Check if user has any time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (timeError) throw timeError;

      if (timeEntries && timeEntries.length > 0) {
        throw new Error('Cannot delete user with time entries. Please archive user instead.');
      }

      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveUser = useCallback(async (userId: string) => {
    return updateUser(userId, { is_active: false });
  }, [updateUser]);

  const activateUser = useCallback(async (userId: string) => {
    return updateUser(userId, { is_active: true });
  }, [updateUser]);

  const inviteUser = useCallback(async (userData: {
    full_name: string;
    email: string;
    role: string;
    hourly_rate?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      // Create the user record
      const user = await createUser({
        ...userData,
        is_active: false // User starts inactive until they accept invitation
      });

      if (!user) {
        throw new Error('Failed to create user record');
      }

      // TODO: Send invitation email
      // This would typically integrate with your email service
      console.log('Invitation would be sent to:', userData.email);

      return user;
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite user');
      return null;
    } finally {
      setLoading(false);
    }
  }, [createUser]);

  return {
    createUser,
    updateUser,
    deleteUser,
    archiveUser,
    activateUser,
    inviteUser,
    loading,
    error
  };
};

// Project Spirits Hooks
export const useProjectSpirits = () => {
  const [spirits, setSpirits] = useState<ProjectSpirit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpirits();
  }, []);

  const fetchSpirits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('project_spirits_with_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convertedSpirits = data?.map(convertDbSpiritToApp) || [];
      setSpirits(convertedSpirits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project spirits';
      setError(errorMessage);
      console.error('Error fetching project spirits:', err);
    } finally {
      setLoading(false);
    }
  };

  return { spirits, loading, error, refetch: fetchSpirits };
};

export const useProjectSpirit = (projectId: string) => {
  const [spirit, setSpirit] = useState<ProjectSpirit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpirit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('project_spirits_with_data')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      setSpirit(data ? convertDbSpiritToApp(data) : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project spirit';
      setError(errorMessage);
      console.error('Error fetching project spirit:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchSpirit();
    }
  }, [projectId, fetchSpirit]);

  return { spirit, loading, error, refetch: fetchSpirit };
};

export const useSpiritConversations = (spiritId: string) => {
  const [conversations, setConversations] = useState<SpiritConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spirit_conversations')
        .select('*')
        .eq('spirit_id', spiritId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const convertedConversations = data?.map(convertDbConversationToApp) || [];
      setConversations(convertedConversations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [spiritId]);

  useEffect(() => {
    if (spiritId) {
      fetchConversations();
    }
  }, [spiritId, fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations };
};

export const useSpiritInsights = (spiritId: string) => {
  const [insights, setInsights] = useState<SpiritInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spirit_insights')
        .select('*')
        .eq('spirit_id', spiritId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convertedInsights = data?.map(convertDbInsightToApp) || [];
      setInsights(convertedInsights);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insights';
      setError(errorMessage);
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  }, [spiritId]);

  useEffect(() => {
    if (spiritId) {
      fetchInsights();
    }
  }, [spiritId, fetchInsights]);

  return { insights, loading, error, refetch: fetchInsights };
};

// Project Spirit Operations
export const useSpiritOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSpirit = async (spiritData: {
    project_id: string;
    name: string;
    personality?: ProjectSpirit['personality'];
    client_profile?: ClientProfile;
    path_stage?: ProjectSpirit['path_stage'];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('project_spirits')
        .insert([{
          project_id: spiritData.project_id,
          name: spiritData.name,
          personality_tone: spiritData.personality?.tone || 'professional',
          personality_focus_areas: spiritData.personality?.focus_areas || ['task_management'],
          personality_communication_style: spiritData.personality?.communication_style || 'Clear and helpful',
          personality_expertise_level: spiritData.personality?.expertise_level || 'mid',
          path_stage: spiritData.path_stage || 'planning',
          path_progress: 10,
          client_profile: spiritData.client_profile || createDefaultClientProfile(),
          is_active: true
        }])
        .select('*')
        .single();

      if (error) throw error;
      return convertDbSpiritToApp(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project spirit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateSpirit = async (spiritId: string, updates: Partial<ProjectSpirit>) => {
    try {
      setLoading(true);
      setError(null);

      const dbUpdates: any = {};
      
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.personality?.tone) dbUpdates.personality_tone = updates.personality.tone;
      if (updates.personality?.focus_areas) dbUpdates.personality_focus_areas = updates.personality.focus_areas;
      if (updates.personality?.communication_style) dbUpdates.personality_communication_style = updates.personality.communication_style;
      if (updates.personality?.expertise_level) dbUpdates.personality_expertise_level = updates.personality.expertise_level;
      if (updates.path_stage) dbUpdates.path_stage = updates.path_stage;
      if (updates.path_progress !== undefined) dbUpdates.path_progress = updates.path_progress;
      if (updates.client_profile) dbUpdates.client_profile = updates.client_profile;
      if (updates.memory_summary) dbUpdates.memory_summary = updates.memory_summary;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('project_spirits')
        .update(dbUpdates)
        .eq('id', spiritId)
        .select('*')
        .single();

      if (error) throw error;
      return convertDbSpiritToApp(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project spirit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addConversation = async (conversationData: {
    spirit_id: string;
    user_id: string;
    user_name: string;
    message: string;
    response: string;
    context?: Record<string, any>;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spirit_conversations')
        .insert([{
          spirit_id: conversationData.spirit_id,
          user_id: conversationData.user_id,
          user_name: conversationData.user_name,
          message: conversationData.message,
          response: conversationData.response,
          context: conversationData.context || {}
        }])
        .select('*')
        .single();

      if (error) throw error;

      // Update spirit's last_interaction
      await supabase
        .from('project_spirits')
        .update({ last_interaction: new Date().toISOString() })
        .eq('id', conversationData.spirit_id);

      return convertDbConversationToApp(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addInsight = async (insightData: {
    spirit_id: string;
    type: SpiritInsight['type'];
    title: string;
    description: string;
    confidence: number;
    data?: Record<string, any>;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spirit_insights')
        .insert([{
          spirit_id: insightData.spirit_id,
          type: insightData.type,
          title: insightData.title,
          description: insightData.description,
          confidence: insightData.confidence,
          data: insightData.data || {},
          is_read: false
        }])
        .select('*')
        .single();

      if (error) throw error;
      return convertDbInsightToApp(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add insight';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const markInsightRead = async (insightId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('spirit_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark insight as read';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createSpirit,
    updateSpirit,
    addConversation,
    addInsight,
    markInsightRead,
  };
};

// Conversion functions
const convertDbSpiritToApp = (dbSpirit: DbSpirit): ProjectSpirit => {
  return {
    id: dbSpirit.id,
    project_id: dbSpirit.project_id,
    name: dbSpirit.name,
    personality: dbSpirit.personality || {
      tone: 'professional',
      focus_areas: [],
      communication_style: 'direct',
      expertise_level: 'intermediate',
    },
    path_stage: dbSpirit.path_stage as 'review' | 'discovery' | 'planning' | 'design' | 'development' | 'testing' | 'delivery' | 'maintenance',
    path_progress: dbSpirit.path_progress,
    client_profile: dbSpirit.client_profile,
    memory_summary: dbSpirit.memory_summary || '',
    last_interaction: dbSpirit.last_interaction ? new Date(dbSpirit.last_interaction) : new Date(),
    is_active: dbSpirit.is_active,
    created_at: new Date(dbSpirit.created_at),
    updated_at: new Date(dbSpirit.updated_at),
  };
};

const convertDbConversationToApp = (dbConversation: DbConversation): SpiritConversation => {
  return {
    id: dbConversation.id,
    spirit_id: dbConversation.spirit_id,
    user_id: dbConversation.user_id,
    message: dbConversation.message,
    response: dbConversation.response,
    context: dbConversation.context || {},
    created_at: new Date(dbConversation.created_at),
  };
};

const convertDbInsightToApp = (dbInsight: DbInsight): SpiritInsight => {
  return {
    id: dbInsight.id,
    spirit_id: dbInsight.spirit_id,
    type: dbInsight.type as 'task_suggestion' | 'risk_alert' | 'opportunity' | 'pattern' | 'client_update',
    title: dbInsight.title,
    description: dbInsight.description,
    confidence: dbInsight.confidence,
    data: dbInsight.data || {},
    is_read: dbInsight.is_read,
    created_at: new Date(dbInsight.created_at),
  };
};
