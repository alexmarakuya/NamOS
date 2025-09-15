import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export type AppState = 'financial' | 'timesheet' | 'tasks';

export interface AppContextState {
  activeApp: AppState;
  isLoading: boolean;
  error: string | null;
}

export type AppAction =
  | { type: 'SET_ACTIVE_APP'; payload: AppState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AppContextState = {
  activeApp: 'financial',
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppContextState, action: AppAction): AppContextState {
  switch (action.type) {
    case 'SET_ACTIVE_APP':
      return { ...state, activeApp: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppContextState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks
export function useAppActions() {
  const { dispatch } = useApp();
  
  return {
    setActiveApp: (app: AppState) => dispatch({ type: 'SET_ACTIVE_APP', payload: app }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}


