import type { Meta, StoryObj } from '@storybook/react';
import KanbanBoard from './KanbanBoard';
import { Task, Project, TeamMember } from '../types';

// Mock data for stories
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    slack_user_id: 'U123456',
    slack_username: 'john.doe',
    full_name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer',
    hourly_rate: 75,
    is_active: true,
  },
  {
    id: '2',
    slack_user_id: 'U789012',
    slack_username: 'jane.smith',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Designer',
    hourly_rate: 80,
    is_active: true,
  },
];

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Complete redesign of company website',
    status: 'active',
    client_name: 'Acme Corp',
    hourly_rate: 150,
    business_unit_id: 'bu-1',
    is_active: true,
    project_type: 'fixed-timeline',
    deadline: '2024-12-31',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
  },
  {
    id: '2',
    name: 'Mobile App',
    description: 'New mobile application',
    status: 'active',
    client_name: 'Tech Inc',
    hourly_rate: 175,
    business_unit_id: 'bu-1',
    is_active: true,
    project_type: 'ongoing',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-18T14:20:00Z',
  },
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Design homepage mockup',
    description: 'Create initial design concepts for the homepage',
    status: 'todo',
    priority: 'high',
    project_id: '1',
    assigned_to: '2',
    assignees: ['2'],
    followers: [],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: '1',
  },
  {
    id: '2',
    title: 'Set up development environment',
    description: 'Configure local development setup',
    status: 'in_progress',
    priority: 'medium',
    project_id: '1',
    assigned_to: '1',
    assignees: ['1'],
    followers: [],
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: '1',
  },
  {
    id: '3',
    title: 'Write project documentation',
    description: 'Document project requirements and specifications',
    status: 'backlog',
    priority: 'low',
    project_id: '1',
    assigned_to: '1',
    assignees: ['1'],
    followers: ['2'],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: '1',
  },
  {
    id: '4',
    title: 'Code review',
    description: 'Review frontend implementation',
    status: 'review',
    priority: 'urgent',
    project_id: '2',
    assigned_to: '2',
    assignees: ['2'],
    followers: ['1'],
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: '1',
  },
  {
    id: '5',
    title: 'Deploy to production',
    description: 'Deploy the latest version to production environment',
    status: 'done',
    priority: 'high',
    project_id: '2',
    assigned_to: '1',
    assignees: ['1'],
    followers: [],
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: '1',
  },
];

const meta = {
  title: 'Components/KanbanBoard',
  component: KanbanBoard,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onTaskUpdate: { action: 'task updated' },
    onTaskClick: { action: 'task clicked' },
    onTimeLog: { action: 'time logged' },
    onAddTask: { action: 'add task' },
  },
} satisfies Meta<typeof KanbanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tasks: mockTasks,
    projects: mockProjects,
    teamMembers: mockTeamMembers,
    isProjectDetail: false,
    onTaskUpdate: () => {},
    onTaskClick: () => {},
  },
};

export const ProjectDetail: Story = {
  args: {
    tasks: mockTasks.filter(task => task.project_id === '1'),
    projects: mockProjects,
    teamMembers: mockTeamMembers,
    isProjectDetail: true,
    onTaskUpdate: () => {},
    onTaskClick: () => {},
  },
};

export const EmptyBoard: Story = {
  args: {
    tasks: [],
    projects: mockProjects,
    teamMembers: mockTeamMembers,
    isProjectDetail: false,
    onTaskUpdate: () => {},
    onTaskClick: () => {},
  },
};

export const SingleProject: Story = {
  args: {
    tasks: mockTasks.filter(task => task.project_id === '1'),
    projects: mockProjects,
    teamMembers: mockTeamMembers,
    isProjectDetail: false,
    onTaskUpdate: () => {},
    onTaskClick: () => {},
  },
};
