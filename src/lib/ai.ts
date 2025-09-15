/**
 * AI Utilities for Project Spirit System
 * Extends the existing OpenAI integration pattern from the Slack bot
 */

import { ProjectSpirit, SpiritInsight, Project, Task, TimeEntry, SpiritAction, ClientProfile } from '../types';

// AI Configuration
export interface AIConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const defaultConfig: AIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1000,
};

// OpenAI API wrapper (following the pattern from slack-bot/bot.js)
class AIService {
  private config: AIConfig;
  private isEnabled: boolean;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.isEnabled = !!this.config.apiKey;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string | null> {
    if (!this.isEnabled) {
      console.warn('AI service not enabled - no API key provided');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('AI completion error:', error);
      return null;
    }
  }

  async parseJSON<T>(prompt: string, systemPrompt?: string): Promise<T | null> {
    const response = await this.generateCompletion(prompt, systemPrompt);
    if (!response) return null;

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      console.error('JSON parsing error:', error);
      return null;
    }
  }
}

// Project Spirit AI Functions
export class ProjectSpiritAI {
  private ai: AIService;

  constructor(apiKey?: string) {
    this.ai = new AIService({ apiKey });
  }

  /**
   * Generate a project spirit personality based on project data
   */
  async generateSpiritPersonality(project: Project): Promise<ProjectSpirit['personality'] | null> {
    const prompt = `Based on this project information, suggest an AI assistant personality:

Project: ${project.name}
Client: ${project.client_name || 'Internal'}
Description: ${project.description || 'No description'}
Status: ${project.status || 'active'}

Return ONLY a JSON object with this structure:
{
  "tone": "professional|casual|creative|technical|consultative",
  "focus_areas": ["area1", "area2", "area3"],
  "communication_style": "brief description of communication approach",
  "expertise_level": "junior|mid|senior|expert"
}`;

    const systemPrompt = `You are an expert at creating AI assistant personalities for project management. Consider the client type, project complexity, and industry to suggest an appropriate personality that will be helpful and engaging.`;

    return this.ai.parseJSON<ProjectSpirit['personality']>(prompt, systemPrompt);
  }

  /**
   * Analyze project data to generate insights
   */
  async generateProjectInsights(
    spirit: ProjectSpirit,
    project: Project,
    tasks: Task[],
    timeEntries: TimeEntry[]
  ): Promise<SpiritInsight[]> {
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length;
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const recentActivity = timeEntries.filter(entry => 
      new Date(entry.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    const prompt = `Analyze this project data and generate 2-3 actionable insights:

Project: ${project.name} (${project.status})
Client: ${project.client_name || 'Internal'}
Current Stage: ${spirit.path_stage}
Progress: ${spirit.path_progress}%

Metrics:
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks}
- Overdue: ${overdueTasks}
- Total Hours Logged: ${totalHours}
- Recent Activity (7 days): ${recentActivity} entries

Spirit Personality: ${spirit.personality.tone}, focuses on ${spirit.personality.focus_areas.join(', ')}

Return ONLY a JSON array of insights:
[
  {
    "type": "task_suggestion|risk_alert|opportunity|pattern|client_update",
    "title": "Brief insight title",
    "description": "Detailed actionable description",
    "confidence": 0.8
  }
]`;

    const systemPrompt = `You are a project management AI assistant. Generate practical, actionable insights that help teams stay on track. Focus on identifying risks, opportunities, and next steps. Be specific and helpful.`;

    const insights = await this.ai.parseJSON<Array<{
      type: SpiritInsight['type'];
      title: string;
      description: string;
      confidence: number;
    }>>(prompt, systemPrompt);

    if (!insights) return [];

    return insights.map((insight, index) => ({
      id: `insight_${Date.now()}_${index}`,
      spirit_id: spirit.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      data: {},
      is_read: false,
      created_at: new Date(),
    }));
  }

  /**
   * Generate spirit response to user message
   */
  async generateSpiritResponse(
    spirit: ProjectSpirit,
    project: Project,
    userMessage: string,
    context: {
      tasks: Task[];
      timeEntries: TimeEntry[];
      recentInsights: SpiritInsight[];
    }
  ): Promise<string | null> {
    const systemPrompt = `You are ${spirit.name}, the AI project assistant for "${project.name}".

Your personality:
- Tone: ${spirit.personality.tone}
- Communication style: ${spirit.personality.communication_style}
- Focus areas: ${spirit.personality.focus_areas.join(', ')}
- Expertise: ${spirit.personality.expertise_level}

Project context:
- Client: ${project.client_name || 'Internal'}
- Status: ${project.status}
- Current stage: ${spirit.path_stage}
- Progress: ${spirit.path_progress}%

Recent project data:
- Active tasks: ${context.tasks.filter(t => t.status !== 'done').length}
- Hours this week: ${context.timeEntries.filter(e => 
  new Date(e.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
).reduce((sum, e) => sum + e.hours, 0)}

Guidelines:
- Be helpful and proactive
- Reference specific project data when relevant
- Suggest actionable next steps
- Match your personality tone
- Keep responses concise but informative
- If asked about tasks, time, or project status, use the provided data`;

    return this.ai.generateCompletion(userMessage, systemPrompt);
  }

  /**
   * Suggest spirit actions based on project state
   */
  async suggestSpiritActions(
    spirit: ProjectSpirit,
    project: Project,
    tasks: Task[],
    timeEntries: TimeEntry[]
  ): Promise<SpiritAction[]> {
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
    const stuckTasks = tasks.filter(t => t.status === 'in_progress' && 
      new Date(t.updated_at).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000
    );

    const prompt = `Based on this project state, suggest 1-2 automated actions:

Project: ${project.name}
Stage: ${spirit.path_stage}
Overdue tasks: ${overdueTasks.length}
Stuck tasks (no updates >3 days): ${stuckTasks.length}
Client communication style: ${spirit.client_profile.communication_style}

Return ONLY a JSON array:
[
  {
    "type": "task_create|status_update|client_notify|team_alert|schedule_meeting",
    "title": "Action title",
    "description": "What this action will do",
    "priority": "low|medium|high|urgent",
    "requires_approval": true/false,
    "suggested_data": {}
  }
]`;

    const actions = await this.ai.parseJSON<Array<{
      type: SpiritAction['type'];
      title: string;
      description: string;
      priority: SpiritAction['priority'];
      requires_approval: boolean;
      suggested_data: Record<string, any>;
    }>>(prompt);

    if (!actions) return [];

    return actions.map((action, index) => ({
      id: `action_${Date.now()}_${index}`,
      type: action.type,
      title: action.title,
      description: action.description,
      priority: action.priority,
      suggested_data: action.suggested_data,
      requires_approval: action.requires_approval,
      created_at: new Date(),
    }));
  }

  /**
   * Detect project path stage based on tasks and activity
   */
  async detectPathStage(
    project: Project,
    tasks: Task[],
    timeEntries: TimeEntry[]
  ): Promise<{ stage: ProjectSpirit['path_stage']; progress: number; confidence: number } | null> {
    const tasksByStatus = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    };

    const recentTimeEntries = timeEntries.filter(entry => 
      new Date(entry.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    const prompt = `Analyze this project data to determine the current stage:

Project: ${project.name}
Status: ${project.status}
Total tasks: ${tasks.length}
Task breakdown: ${JSON.stringify(tasksByStatus)}
Recent activity (14 days): ${recentTimeEntries.length} time entries

Common task descriptions: ${tasks.slice(0, 5).map(t => t.title).join(', ')}

Return ONLY a JSON object:
{
  "stage": "discovery|planning|design|development|testing|review|delivery|maintenance",
  "progress": 75,
  "confidence": 0.8
}`;

    return this.ai.parseJSON<{
      stage: ProjectSpirit['path_stage'];
      progress: number;
      confidence: number;
    }>(prompt);
  }
}

// Export singleton instance
export const spiritAI = new ProjectSpiritAI(process.env.REACT_APP_OPENAI_API_KEY);

// Utility functions
export function createDefaultClientProfile(): ClientProfile {
  return {
    communication_style: 'professional',
    preferred_frequency: 'weekly',
    timezone: 'UTC',
    response_time_expectation: 'same_day',
    decision_making_style: 'collaborative',
    risk_tolerance: 'medium',
    budget_sensitivity: 'flexible',
    preferred_communication_channels: ['email'],
    red_flags: [],
    success_metrics: [],
    notes: '',
  };
}

export function createDefaultSpiritPersonality(): ProjectSpirit['personality'] {
  return {
    tone: 'professional',
    focus_areas: ['task_management', 'timeline_tracking'],
    communication_style: 'Clear, helpful, and proactive',
    expertise_level: 'mid',
  };
}
