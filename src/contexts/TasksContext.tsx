import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { Task, TaskStats, Project, TeamMember } from '../types';

// State interface
export interface TasksContextState {
  tasks: Task[];
  selectedProject: string;
  selectedAssignee: string;
  viewMode: 'kanban' | 'list';
  selectedTask: Task | null;
  isAddModalOpen: boolean;
  isTaskDetailModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

// Actions
export type TasksAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_SELECTED_PROJECT'; payload: string }
  | { type: 'SET_SELECTED_ASSIGNEE'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'kanban' | 'list' }
  | { type: 'SET_SELECTED_TASK'; payload: Task | null }
  | { type: 'SET_ADD_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_TASK_DETAIL_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: TasksContextState = {
  tasks: [],
  selectedProject: 'all',
  selectedAssignee: 'all',
  viewMode: 'kanban',
  selectedTask: null,
  isAddModalOpen: false,
  isTaskDetailModalOpen: false,
  isLoading: false,
  error: null,
};

// Reducer
function tasksReducer(state: TasksContextState, action: TasksAction): TasksContextState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, ...action.payload.updates, updated_at: new Date() }
            : task
        ),
        selectedTask: state.selectedTask?.id === action.payload.id
          ? { ...state.selectedTask, ...action.payload.updates, updated_at: new Date() }
          : state.selectedTask,
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        selectedTask: state.selectedTask?.id === action.payload ? null : state.selectedTask,
      };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProject: action.payload };
    case 'SET_SELECTED_ASSIGNEE':
      return { ...state, selectedAssignee: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTask: action.payload };
    case 'SET_ADD_MODAL_OPEN':
      return { ...state, isAddModalOpen: action.payload };
    case 'SET_TASK_DETAIL_MODAL_OPEN':
      return { ...state, isTaskDetailModalOpen: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Context
const TasksContext = createContext<{
  state: TasksContextState;
  dispatch: React.Dispatch<TasksAction>;
} | null>(null);

// Provider
export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  return (
    <TasksContext.Provider value={{ state, dispatch }}>
      {children}
    </TasksContext.Provider>
  );
}

// Custom hook
export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}

// Business logic hooks
export function useTasksActions() {
  const { dispatch } = useTasks();

  return {
    setTasks: useCallback((tasks: Task[]) => {
      dispatch({ type: 'SET_TASKS', payload: tasks });
    }, [dispatch]),

    updateTask: useCallback((id: string, updates: Partial<Task>) => {
      dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
    }, [dispatch]),

    addTask: useCallback((task: Task) => {
      dispatch({ type: 'ADD_TASK', payload: task });
    }, [dispatch]),

    deleteTask: useCallback((id: string) => {
      dispatch({ type: 'DELETE_TASK', payload: id });
    }, [dispatch]),

    setSelectedProject: useCallback((projectId: string) => {
      dispatch({ type: 'SET_SELECTED_PROJECT', payload: projectId });
    }, [dispatch]),

    setSelectedAssignee: useCallback((assigneeId: string) => {
      dispatch({ type: 'SET_SELECTED_ASSIGNEE', payload: assigneeId });
    }, [dispatch]),

    setViewMode: useCallback((mode: 'kanban' | 'list') => {
      dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    }, [dispatch]),

    openTaskDetail: useCallback((task: Task) => {
      dispatch({ type: 'SET_SELECTED_TASK', payload: task });
      dispatch({ type: 'SET_TASK_DETAIL_MODAL_OPEN', payload: true });
    }, [dispatch]),

    closeTaskDetail: useCallback(() => {
      dispatch({ type: 'SET_SELECTED_TASK', payload: null });
      dispatch({ type: 'SET_TASK_DETAIL_MODAL_OPEN', payload: false });
    }, [dispatch]),

    openAddModal: useCallback(() => {
      dispatch({ type: 'SET_ADD_MODAL_OPEN', payload: true });
    }, [dispatch]),

    closeAddModal: useCallback(() => {
      dispatch({ type: 'SET_ADD_MODAL_OPEN', payload: false });
    }, [dispatch]),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, [dispatch]),

    setError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, [dispatch]),
  };
}

// Computed values hook
export function useTasksComputed(projects: Project[], teamMembers: TeamMember[]) {
  const { state } = useTasks();

  const filteredTasks = React.useMemo(() => {
    return state.tasks.filter(task => {
      const projectMatch = state.selectedProject === 'all' || task.project_id === state.selectedProject;
      const assigneeMatch = state.selectedAssignee === 'all' || task.assigned_to === state.selectedAssignee;
      return projectMatch && assigneeMatch;
    });
  }, [state.tasks, state.selectedProject, state.selectedAssignee]);

  const taskStats = React.useMemo((): TaskStats => {
    const now = new Date();
    
    return {
      totalTasks: filteredTasks.length,
      completedTasks: filteredTasks.filter(task => task.status === 'done').length,
      inProgressTasks: filteredTasks.filter(task => task.status === 'in_progress').length,
      overdueTasks: filteredTasks.filter(task => 
        task.due_date && task.due_date < now && task.status !== 'done'
      ).length,
      totalEstimatedHours: filteredTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0),
      totalActualHours: filteredTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0)
    };
  }, [filteredTasks]);

  return {
    filteredTasks,
    taskStats,
  };
}


