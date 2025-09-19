/**
 * Database-specific types for Supabase integration
 */

// Database row types (as returned from Supabase)
export interface DbTimeEntry {
  id: string;
  user_id: string;
  user_name: string;
  project_id: string;
  description: string;
  hours: number;
  date: string;
  is_billable?: boolean;
  created_at: string;
  updated_at: string;
  projects?: any; // Joined project data
}

export interface DbProject {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  hourly_rate?: number;
  business_unit_id?: string;
  is_active: boolean;
  status?: string;
  project_type?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  business_units?: any; // Joined business unit data
}

export interface DbTask {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  assigned_to?: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbTeamMember {
  id: string;
  slack_user_id: string;
  slack_username: string;
  full_name?: string;
  email?: string;
  role?: string;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbClient {
  id: string;
  name: string;
  status: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DbBusinessUnit {
  id: string;
  name: string;
  type: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DbSpirit {
  id: string;
  project_id: string;
  name: string;
  personality: any; // JSON field
  path_stage: string;
  path_progress: number;
  client_profile?: any; // JSON field
  memory_summary?: string;
  last_interaction?: string;
  last_insight_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  spirit_id: string;
  user_id: string;
  user_name: string;
  message: string;
  response: string;
  context: any; // JSON field
  created_at: string;
}

export interface DbInsight {
  id: string;
  spirit_id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  data?: any; // JSON field
  is_read: boolean;
  created_at: string;
}

// Chart/Tooltip types
export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

// Form data types
export interface TaskFormData {
  title: string;
  description: string;
  project_id: string;
  assigned_to: string;
  status: string;
  priority: string;
  due_date: string;
  estimated_hours: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  client_name: string;
  hourly_rate: string;
  business_unit_id: string;
  status: string;
  project_type: string;
  deadline: string;
}

export interface ClientFormData {
  name: string;
  status: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notes: string;
}
