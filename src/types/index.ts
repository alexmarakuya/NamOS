export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  businessUnit: string;
  tags?: string[];
  notes?: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  type: 'business' | 'personal' | 'project' | 'mixed' | 'us_business';
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  monthlyGrowth: number;
}

export interface ChartData {
  name: string;
  income: number;
  expenses: number;
  net: number;
}

// Time tracking types
export interface TimeEntry {
  id: string;
  user_id: string;
  user_name: string;
  project_id?: string;
  task_id?: string;
  description: string;
  hours: number;
  date: Date;
  is_billable: boolean;
  created_at: Date;
  project?: Project;
  task?: Task;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  hourly_rate?: number;
  business_unit_id?: string;
  is_active: boolean;
  status?: 'active' | 'upcoming' | 'completed' | 'on_hold';
  deadline?: string; // ISO date string
  created_at?: string;
  updated_at?: string;
  business_unit?: BusinessUnit;
}

export interface TeamMember {
  id: string;
  slack_user_id: string;
  slack_username: string;
  full_name?: string;
  email?: string;
  role: string;
  hourly_rate?: number;
  is_active: boolean;
}

export interface TimesheetStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalValue: number;
  activeProjects: number;
}

export interface TimeChartData {
  name: string;
  billable: number;
  nonBillable: number;
  total: number;
  projects: { [projectId: string]: number };
}

// Task management types
export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  assigned_to?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  project?: Project;
  assignee?: TeamMember;
}

export interface TaskColumn {
  id: string;
  title: string;
  status: Task['status'];
  tasks: Task[];
  color: string;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

// Project Spirit types
export interface SpiritConversation {
  id: string;
  spirit_id: string;
  user_id: string;
  message: string;
  response: string;
  context: Record<string, any>;
  created_at: Date;
}

export interface SpiritInsight {
  id: string;
  spirit_id: string;
  type: 'task_suggestion' | 'risk_alert' | 'opportunity' | 'pattern' | 'client_update';
  title: string;
  description: string;
  confidence: number;
  data: Record<string, any>;
  is_read: boolean;
  created_at: Date;
}

export interface ProjectPattern {
  id: string;
  pattern_type: 'workflow' | 'communication' | 'timeline' | 'resource';
  description: string;
  frequency: number;
  last_seen: Date;
}

export interface ClientProfile {
  communication_style: 'formal' | 'casual' | 'technical' | 'creative' | 'professional';
  preferred_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'milestone';
  timezone: string;
  response_time_expectation: 'immediate' | 'same_day' | 'next_day' | 'flexible';
  decision_making_style: 'collaborative' | 'autonomous' | 'approval_required';
  risk_tolerance: 'low' | 'medium' | 'high';
  budget_sensitivity: 'strict' | 'flexible' | 'value_focused';
  preferred_communication_channels: string[];
  red_flags: string[];
  success_metrics: string[];
  notes: string;
}

export interface ProjectSpirit {
  id: string;
  project_id: string;
  name: string;
  personality: {
    tone: 'professional' | 'casual' | 'creative' | 'technical' | 'consultative';
    focus_areas: string[];
    communication_style: string;
    expertise_level: 'junior' | 'mid' | 'senior' | 'expert';
  };
  path_stage: 'discovery' | 'planning' | 'design' | 'development' | 'testing' | 'review' | 'delivery' | 'maintenance';
  path_progress: number; // 0-100
  client_profile: ClientProfile;
  memory_summary: string;
  last_interaction: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Computed fields
  conversations?: SpiritConversation[];
  insights?: SpiritInsight[];
  patterns?: ProjectPattern[];
}

export interface PathStage {
  id: string;
  name: string;
  description: string;
  typical_duration_days: number;
  key_deliverables: string[];
  success_criteria: string[];
  common_blockers: string[];
  next_stages: string[];
  automation_triggers: string[];
}

export interface SpiritMemory {
  conversations: SpiritConversation[];
  insights: SpiritInsight[];
  patterns: ProjectPattern[];
  context_summary: string;
  learning_notes: string[];
}

export interface SpiritAction {
  id: string;
  type: 'task_create' | 'status_update' | 'client_notify' | 'team_alert' | 'schedule_meeting';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggested_data: Record<string, any>;
  requires_approval: boolean;
  created_at: Date;
}
