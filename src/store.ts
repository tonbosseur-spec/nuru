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
  activeTab: string;
  globalFilter: string | null;
  
  setEngineReady: (ready: boolean, status: string) => void;
  setDataset: (name: string, columns: ColumnInfo[], rowCount: number, csvData: string) => void;
  setActiveTab: (tab: string) => void;
  setGlobalFilter: (filter: string | null) => void;
  setRowCount: (count: number) => void;
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
  exportWorkspaceAsFile: () => Promise<void>;
  importWorkspaceFromFile: () => Promise<void>;
}

export const isDesktop = () => {
  return typeof (window as any).pywebview !== 'undefined';
};

const getStoredUser = () => {
  if (isDesktop()) {
    return { firstName: 'Utilisateur', lastName: 'Local' };
  }
  const stored = localStorage.getItem('nuru_analytics_user');
  return stored ? JSON.parse(stored) : { firstName: 'Utilisateur', lastName: 'Local' };
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
  activeTab: 'fichier',
  globalFilter: null,
  
  setEngineReady: (isEngineReady, engineStatus) => set({ isEngineReady, engineStatus }),
  
  setDataset: (datasetName, columns, rowCount, csvData) => {
    set({ datasetName, columns, rowCount, csvData });
    get().saveCurrentWorkspace();
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setGlobalFilter: (globalFilter) => {
    set({ globalFilter });
    get().saveCurrentWorkspace();
  },
  
  setRowCount: (rowCount) => {
    set({ rowCount });
    get().saveCurrentWorkspace();
  },
  
  addResult: (result) => {
    set((state) => ({ 
      results: [result, ...state.results],
      codeHistory: [...state.codeHistory, result.code],
      activeTab: 'resultats'
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
    
    // Save to backend/filesystem
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
    
    if (isDesktop()) {
      await (window as any).pywebview.api.save_workspace(data.id, JSON.stringify(data));
      let res = await (window as any).pywebview.api.load_summaries();
      let summaries: WorkspaceSummary[] = res.success ? JSON.parse(res.content) : [];
      summaries = summaries.filter(s => s.id !== data.id);
      summaries.unshift({ id: data.id, name: data.name, lastModified: Date.now() });
      await (window as any).pywebview.api.save_summaries(JSON.stringify(summaries));
    } else {
      await localforage.setItem(`workspace_${data.id}`, data);
      let summaries: WorkspaceSummary[] = await localforage.getItem('workspace_summaries') || [];
      summaries = summaries.filter(s => s.id !== data.id);
      summaries.unshift({ id: data.id, name: data.name, lastModified: Date.now() });
      await localforage.setItem('workspace_summaries', summaries);
    }
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
  },

  exportWorkspaceAsFile: async () => {
    const state = get();
    if (!state.currentWorkspaceId) return;

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

    const content = JSON.stringify(data, null, 2);
    const filename = `${state.workspaceName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.nra`;

    if (isDesktop()) {
      // Use native dialog
      const res = await (window as any).pywebview.api.save_file_dialog(content, filename);
      if (res.success) {
        console.log("Saved to", res.path);
      }
    } else {
      // Browser download fallback
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  },

  importWorkspaceFromFile: async () => {
    if (isDesktop()) {
      const res = await (window as any).pywebview.api.open_file_dialog();
      if (res.success) {
        try {
          const data = JSON.parse(res.content);
          get().loadWorkspaceData(data);
          // Also load dataset into engine if present
          if (data.csvData) {
            const { engine } = await import('@/lib/pythonEngine');
            await engine.loadData(data.csvData);
          }
        } catch (err) {
          console.error("Invalid file format", err);
        }
      }
    } else {
      // Browser input fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.nra';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          try {
            const data = JSON.parse(text);
            get().loadWorkspaceData(data);
            if (data.csvData) {
              const { engine } = await import('@/lib/pythonEngine');
              await engine.loadData(data.csvData);
            }
          } catch (err) {
            console.error("Invalid file format", err);
          }
        }
      };
      input.click();
    }
  }
}));

// Helper to get summaries outside of react
export const getWorkspaceSummaries = async (): Promise<WorkspaceSummary[]> => {
  if (isDesktop()) {
    const res = await (window as any).pywebview.api.load_summaries();
    return res.success ? JSON.parse(res.content) : [];
  }
  return await localforage.getItem('workspace_summaries') || [];
};

export const deleteWorkspace = async (id: string) => {
  if (isDesktop()) {
    await (window as any).pywebview.api.delete_workspace(id);
    let res = await (window as any).pywebview.api.load_summaries();
    let summaries: WorkspaceSummary[] = res.success ? JSON.parse(res.content) : [];
    summaries = summaries.filter(s => s.id !== id);
    await (window as any).pywebview.api.save_summaries(JSON.stringify(summaries));
  } else {
    await localforage.removeItem(`workspace_${id}`);
    let summaries: WorkspaceSummary[] = await localforage.getItem('workspace_summaries') || [];
    summaries = summaries.filter(s => s.id !== id);
    await localforage.setItem('workspace_summaries', summaries);
  }
};

export const getWorkspace = async (id: string): Promise<WorkspaceData | null> => {
  if (isDesktop()) {
    const res = await (window as any).pywebview.api.load_workspace(id);
    return res.success ? JSON.parse(res.content) : null;
  }
  return await localforage.getItem(`workspace_${id}`);
};

