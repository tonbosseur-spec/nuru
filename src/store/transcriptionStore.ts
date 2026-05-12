import { create } from 'zustand';

export type VariableType = 'numeric' | 'categorical';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  modalities?: string[]; // Pour les variables catégorielles
}

interface TranscriptionState {
  variables: Variable[];
  data: Record<string, any>[];
  isTranscriptionMode: boolean;
  
  // Actions
  setTranscriptionMode: (mode: boolean) => void;
  addVariable: (variable: Variable) => void;
  removeVariable: (id: string) => void;
  addDataRow: (row: Record<string, any>) => void;
  removeDataRow: (index: number) => void;
  resetTranscription: () => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  variables: [],
  data: [],
  isTranscriptionMode: false,

  setTranscriptionMode: (mode) => set({ isTranscriptionMode: mode }),
  
  addVariable: (v) => set((state) => ({ 
    variables: [...state.variables, v] 
  })),

  removeVariable: (id) => set((state) => ({ 
    variables: state.variables.filter(v => v.id !== id),
    data: state.data.map(row => {
      const { [id]: _, ...rest } = row;
      return rest;
    })
  })),

  addDataRow: (row) => set((state) => ({ 
    data: [...state.data, row] 
  })),

  removeDataRow: (index) => set((state) => ({ 
    data: state.data.filter((_, i) => i !== index) 
  })),

  resetTranscription: () => set({ variables: [], data: [] })
}));
