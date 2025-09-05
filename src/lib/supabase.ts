import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DatabaseTransaction {
  id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category: string;
  business_unit_id: string;
  date: string;
  primary_attachment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseBusinessUnit {
  id: string;
  name: string;
  type: 'business' | 'personal' | 'project' | 'mixed' | 'us_business';
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAttachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  upload_source: 'telegram' | 'manual' | 'api';
  created_at: string;
  updated_at: string;
}

// Database schema types
export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: DatabaseTransaction;
        Insert: Omit<DatabaseTransaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseTransaction, 'id' | 'created_at' | 'updated_at'>>;
      };
      business_units: {
        Row: DatabaseBusinessUnit;
        Insert: Omit<DatabaseBusinessUnit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseBusinessUnit, 'id' | 'created_at' | 'updated_at'>>;
      };
      attachments: {
        Row: DatabaseAttachment;
        Insert: Omit<DatabaseAttachment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseAttachment, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// File upload utilities
export const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('transaction-attachments')
    .upload(path, file);
  
  if (error) throw error;
  return data;
};

export const getFileUrl = (path: string) => {
  const { data } = supabase.storage
    .from('transaction-attachments')
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const deleteFile = async (path: string) => {
  const { error } = await supabase.storage
    .from('transaction-attachments')
    .remove([path]);
  
  if (error) throw error;
};
