import { create } from 'zustand';
import localforage from 'localforage';

export interface User {
  firstName: string;
  lastName: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  lastModified: number;
}

export interface WorkspaceData {
  id: string;
  name: string;
  datasetName: string | null;
  csvData: string | null;
  columns: ColumnInfo[];
  rowCount: number;
  results: ResultItem[];
  codeHistory: string[];
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical';
  missing: number;
}

export interface ResultItem {
  id: string;
  title: string;
  code: string;
  output: string;
  timestamp: number;
  libraries?: string[];
}

interface AppState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
  
  isEngineReady: boolean;
  engineStatus: string;
  
  // Current workspace
  currentWorkspaceId: string | null;
  workspaceName: string;
  datasetName: string | null;
  csvData: string | null;
  columns: ColumnInfo[];
  rowCount: number;
  results: ResultItem[];
  codeHistory: string[];
  
  sidebarVisible: boolean;
  consoleVisible: boolean;
  
  setEngineReady: (ready: boolean, status: string) => void;
  setDataset: (name: string, columns: ColumnInfo[], rowCount: number, csvData: string) => void;
  addResult: (result: ResultItem) => void;
  clearResults: () => void;
  toggleSidebar: () => void;
  toggleConsole: () => void;
  
  // Workspace management
  createNewWorkspace: (name?: string) => void;
  loadWorkspaceData: (data: WorkspaceData) => void;
  updateWorkspaceName: (name: string) => void;
  saveCurrentWorkspace: () => Promise<void>;
  closeWorkspace: () => void;
}

const getStoredUser = () => {
  const stored = localStorage.getItem('nuru_analytics_user');
  return stored ? JSON.parse(stored) : null;
};

export const useStore = create<AppState>((set, get) => ({
  user: getStoredUser(),
  setUser: (user) => {
    localStorage.setItem('nuru_analytics_user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('nuru_analytics_user');
    set({ user: null, currentWorkspaceId: null });
  },

  isEngineReady: false,
  engineStatus: 'Initializing...',
  
  currentWorkspaceId: null,
  workspaceName: 'Nouveau projet Nuru',
  datasetName: null,
  csvData: null,
  columns: [],
  rowCount: 0,
  results: [],
  codeHistory: [],
  
  sidebarVisible: true,
  consoleVisible: true,
  
  setEngineReady: (isEngineReady, engineStatus) => set({ isEngineReady, engineStatus }),
  
  setDataset: (datasetName, columns, rowCount, csvData) => {
    set({ datasetName, columns, rowCount, csvData });
    get().saveCurrentWorkspace();
  },
  
  addResult: (result) => {
    set((state) => ({ 
      results: [result, ...state.results],
      codeHistory: [...state.codeHistory, result.code]
    }));
    get().saveCurrentWorkspace();
  },
  
  clearResults: () => {
    set({ results: [], codeHistory: [] });
    get().saveCurrentWorkspace();
  },
  
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  toggleConsole: () => set((state) => ({ consoleVisible: !state.consoleVisible })),
  
  createNewWorkspace: (name = 'Nouveau projet Nuru') => {
    const id = crypto.randomUUID();
    set({
      currentWorkspaceId: id,
      workspaceName: name,
      datasetName: null,
      csvData: null,
      columns: [],
      rowCount: 0,
      results: [],
      codeHistory: []
    });
    get().saveCurrentWorkspace();
  },
  
  loadWorkspaceData: (data: WorkspaceData) => {
    set({
      currentWorkspaceId: data.id,
      workspaceName: data.name,
      datasetName: data.datasetName,
      csvData: data.csvData,
      columns: data.columns,
      rowCount: data.rowCount,
      results: data.results,
      codeHistory: data.codeHistory
    });
  },
  
  updateWorkspaceName: (name: string) => {
    set({ workspaceName: name });
    get().saveCurrentWorkspace();
  },
  
  saveCurrentWorkspace: async () => {
    const state = get();
    if (!state.currentWorkspaceId) return;
    
    // Save to localforage
    const data: WorkspaceData = {
      id: state.currentWorkspaceId,
      name: state.workspaceName,
      datasetName: state.datasetName,
      csvData: state.csvData,
      columns: state.columns,
      rowCount: state.rowCount,
      results: state.results,
      codeHistory: state.codeHistory
    };
    
    await localforage.setItem(`workspace_${data.id}`, data);
    
    // Update summaries
    let summaries: WorkspaceSummary[] = await localforage.getItem('workspace_summaries') || [];
    summaries = summaries.filter(s => s.id !== data.id);
    summaries.unshift({ id: data.id, name: data.name, lastModified: Date.now() });
    await localforage.setItem('workspace_summaries', summaries);
  },
  
  closeWorkspace: () => {
    set({
      currentWorkspaceId: null,
      datasetName: null,
      csvData: null,
      columns: [],
      rowCount: 0,
      results: [],
      codeHistory: []
    });
  }
}));

// Helper to get summaries outside of react
export const getWorkspaceSummaries = async (): Promise<WorkspaceSummary[]> => {
  return await localforage.getItem('workspace_summaries') || [];
};

export const deleteWorkspace = async (id: string) => {
  await localforage.removeItem(`workspace_${id}`);
  let summaries: WorkspaceSummary[] = await localforage.getItem('workspace_summaries') || [];
  summaries = summaries.filter(s => s.id !== id);
  await localforage.setItem('workspace_summaries', summaries);
};

export const getWorkspace = async (id: string): Promise<WorkspaceData | null> => {
  return await localforage.getItem(`workspace_${id}`);
};

