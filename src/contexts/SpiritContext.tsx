import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { ProjectSpirit, SpiritConversation, SpiritInsight, SpiritAction } from '../types';

// Types
export interface SpiritContextState {
  spirits: ProjectSpirit[];
  activeSpirit: ProjectSpirit | null;
  conversations: { [spiritId: string]: SpiritConversation[] };
  insights: { [spiritId: string]: SpiritInsight[] };
  actions: { [spiritId: string]: SpiritAction[] };
  isLoading: boolean;
  error: string | null;
}

export type SpiritAction_Context =
  | { type: 'SET_SPIRITS'; payload: ProjectSpirit[] }
  | { type: 'SET_ACTIVE_SPIRIT'; payload: ProjectSpirit | null }
  | { type: 'ADD_SPIRIT'; payload: ProjectSpirit }
  | { type: 'UPDATE_SPIRIT'; payload: ProjectSpirit }
  | { type: 'REMOVE_SPIRIT'; payload: string }
  | { type: 'SET_CONVERSATIONS'; payload: { spiritId: string; conversations: SpiritConversation[] } }
  | { type: 'ADD_CONVERSATION'; payload: SpiritConversation }
  | { type: 'SET_INSIGHTS'; payload: { spiritId: string; insights: SpiritInsight[] } }
  | { type: 'ADD_INSIGHT'; payload: SpiritInsight }
  | { type: 'MARK_INSIGHT_READ'; payload: { spiritId: string; insightId: string } }
  | { type: 'SET_ACTIONS'; payload: { spiritId: string; actions: SpiritAction[] } }
  | { type: 'ADD_ACTION'; payload: SpiritAction }
  | { type: 'EXECUTE_ACTION'; payload: { spiritId: string; actionId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: SpiritContextState = {
  spirits: [],
  activeSpirit: null,
  conversations: {},
  insights: {},
  actions: {},
  isLoading: false,
  error: null,
};

// Reducer
function spiritReducer(state: SpiritContextState, action: SpiritAction_Context): SpiritContextState {
  switch (action.type) {
    case 'SET_SPIRITS':
      return { ...state, spirits: action.payload };
    
    case 'SET_ACTIVE_SPIRIT':
      return { ...state, activeSpirit: action.payload };
    
    case 'ADD_SPIRIT':
      return { 
        ...state, 
        spirits: [...state.spirits, action.payload] 
      };
    
    case 'UPDATE_SPIRIT':
      return {
        ...state,
        spirits: state.spirits.map(spirit =>
          spirit.id === action.payload.id ? action.payload : spirit
        ),
        activeSpirit: state.activeSpirit?.id === action.payload.id ? action.payload : state.activeSpirit,
      };
    
    case 'REMOVE_SPIRIT':
      return {
        ...state,
        spirits: state.spirits.filter(spirit => spirit.id !== action.payload),
        activeSpirit: state.activeSpirit?.id === action.payload ? null : state.activeSpirit,
      };
    
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.payload.spiritId]: action.payload.conversations,
        },
      };
    
    case 'ADD_CONVERSATION':
      const spiritId = action.payload.spirit_id;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [spiritId]: [...(state.conversations[spiritId] || []), action.payload],
        },
      };
    
    case 'SET_INSIGHTS':
      return {
        ...state,
        insights: {
          ...state.insights,
          [action.payload.spiritId]: action.payload.insights,
        },
      };
    
    case 'ADD_INSIGHT':
      const insightSpiritId = action.payload.spirit_id;
      return {
        ...state,
        insights: {
          ...state.insights,
          [insightSpiritId]: [...(state.insights[insightSpiritId] || []), action.payload],
        },
      };
    
    case 'MARK_INSIGHT_READ':
      const { spiritId: readSpiritId, insightId } = action.payload;
      return {
        ...state,
        insights: {
          ...state.insights,
          [readSpiritId]: (state.insights[readSpiritId] || []).map(insight =>
            insight.id === insightId ? { ...insight, is_read: true } : insight
          ),
        },
      };
    
    case 'SET_ACTIONS':
      return {
        ...state,
        actions: {
          ...state.actions,
          [action.payload.spiritId]: action.payload.actions,
        },
      };
    
    case 'ADD_ACTION':
      const actionSpiritId = action.payload.id.split('_')[0]; // Assuming action ID contains spirit ID
      return {
        ...state,
        actions: {
          ...state.actions,
          [actionSpiritId]: [...(state.actions[actionSpiritId] || []), action.payload],
        },
      };
    
    case 'EXECUTE_ACTION':
      const { spiritId: execSpiritId, actionId } = action.payload;
      return {
        ...state,
        actions: {
          ...state.actions,
          [execSpiritId]: (state.actions[execSpiritId] || []).filter(action => action.id !== actionId),
        },
      };
    
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
const SpiritContext = createContext<{
  state: SpiritContextState;
  dispatch: React.Dispatch<SpiritAction_Context>;
} | null>(null);

// Provider
export function SpiritProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spiritReducer, initialState);

  return (
    <SpiritContext.Provider value={{ state, dispatch }}>
      {children}
    </SpiritContext.Provider>
  );
}

// Custom hook
export function useSpirit() {
  const context = useContext(SpiritContext);
  if (!context) {
    throw new Error('useSpirit must be used within a SpiritProvider');
  }
  return context;
}

// Convenience hooks
export function useSpiritDispatch() {
  const { dispatch } = useSpirit();
  
  return {
    setSpirits: useCallback((spirits: ProjectSpirit[]) => 
      dispatch({ type: 'SET_SPIRITS', payload: spirits }), [dispatch]),
    
    setActiveSpirit: useCallback((spirit: ProjectSpirit | null) => 
      dispatch({ type: 'SET_ACTIVE_SPIRIT', payload: spirit }), [dispatch]),
    
    addSpirit: useCallback((spirit: ProjectSpirit) => 
      dispatch({ type: 'ADD_SPIRIT', payload: spirit }), [dispatch]),
    
    updateSpirit: useCallback((spirit: ProjectSpirit) => 
      dispatch({ type: 'UPDATE_SPIRIT', payload: spirit }), [dispatch]),
    
    removeSpirit: useCallback((spiritId: string) => 
      dispatch({ type: 'REMOVE_SPIRIT', payload: spiritId }), [dispatch]),
    
    setConversations: useCallback((spiritId: string, conversations: SpiritConversation[]) => 
      dispatch({ type: 'SET_CONVERSATIONS', payload: { spiritId, conversations } }), [dispatch]),
    
    addConversation: useCallback((conversation: SpiritConversation) => 
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation }), [dispatch]),
    
    setInsights: useCallback((spiritId: string, insights: SpiritInsight[]) => 
      dispatch({ type: 'SET_INSIGHTS', payload: { spiritId, insights } }), [dispatch]),
    
    addInsight: useCallback((insight: SpiritInsight) => 
      dispatch({ type: 'ADD_INSIGHT', payload: insight }), [dispatch]),
    
    markInsightRead: useCallback((spiritId: string, insightId: string) => 
      dispatch({ type: 'MARK_INSIGHT_READ', payload: { spiritId, insightId } }), [dispatch]),
    
    setActions: useCallback((spiritId: string, actions: SpiritAction[]) => 
      dispatch({ type: 'SET_ACTIONS', payload: { spiritId, actions } }), [dispatch]),
    
    addAction: useCallback((action: SpiritAction) => 
      dispatch({ type: 'ADD_ACTION', payload: action }), [dispatch]),
    
    executeAction: useCallback((spiritId: string, actionId: string) => 
      dispatch({ type: 'EXECUTE_ACTION', payload: { spiritId, actionId } }), [dispatch]),
    
    setLoading: useCallback((loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }), [dispatch]),
    
    setError: useCallback((error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }), [dispatch]),
    
    clearError: useCallback(() => 
      dispatch({ type: 'CLEAR_ERROR' }), [dispatch]),
  };
}

// Selector hooks
export function useSpiritByProject(projectId: string): ProjectSpirit | null {
  const { state } = useSpirit();
  return state.spirits.find(spirit => spirit.project_id === projectId) || null;
}

export function useSpiritConversations(spiritId: string): SpiritConversation[] {
  const { state } = useSpirit();
  return state.conversations[spiritId] || [];
}

export function useSpiritInsights(spiritId: string): SpiritInsight[] {
  const { state } = useSpirit();
  return state.insights[spiritId] || [];
}

export function useSpiritActions(spiritId: string): SpiritAction[] {
  const { state } = useSpirit();
  return state.actions[spiritId] || [];
}

export function useUnreadInsightsCount(spiritId: string): number {
  const insights = useSpiritInsights(spiritId);
  return insights.filter(insight => !insight.is_read).length;
}

export function usePendingActionsCount(spiritId: string): number {
  const actions = useSpiritActions(spiritId);
  return actions.length;
}
