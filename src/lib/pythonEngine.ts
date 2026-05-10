import { useStore } from '../store';

class PythonEngine {
  worker: Worker | null = null;
  callbacks: Map<string, Function> = new Map();

  init() {
    if (this.worker) return;
    
    this.worker = new Worker(new URL('../workers/python.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (e) => {
      const { id, type, payload, status, error } = e.data;
      
      if (type === 'STATUS') {
        useStore.getState().setEngineReady(false, status);
      } else if (type === 'INIT_DONE') {
        useStore.getState().setEngineReady(true, 'Ready');
        if (id && this.callbacks.has(id)) {
          this.callbacks.get(id)!(payload);
          this.callbacks.delete(id);
        }
      } else if (type === 'DATA_LOADED') {
        if (id && this.callbacks.has(id)) {
          this.callbacks.get(id)!(payload);
          this.callbacks.delete(id);
        }
      } else if (type === 'RUN_RESULT') {
         if (id && this.callbacks.has(id)) {
          this.callbacks.get(id)!(payload);
          this.callbacks.delete(id);
        }
      } else if (type === 'ERROR') {
        console.error('Python Engine Error:', error);
        useStore.getState().setEngineReady(false, `Error: ${error}`);
        if (id && this.callbacks.has(id)) {
          this.callbacks.get(id)!({ error });
          this.callbacks.delete(id);
        }
      }
    };

    const id = Date.now().toString();
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.worker!.postMessage({ id, type: 'INIT' });
    });
  }

  async loadData(csvStr: string): Promise<any> {
    const id = Date.now().toString() + Math.random().toString();
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.worker!.postMessage({ id, type: 'LOAD_DATA', payload: { csvStr } });
    });
  }

  async loadFile(buffer: ArrayBuffer, filename: string): Promise<any> {
    const id = Date.now().toString() + Math.random().toString();
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.worker!.postMessage({ id, type: 'LOAD_FILE', payload: { buffer, filename } });
    });
  }

  async runCode(code: string): Promise<{output: string, result: any, error?: string}> {
    const id = Date.now().toString() + Math.random().toString();
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.worker!.postMessage({ id, type: 'RUN_CODE', payload: { code } });
    });
  }
}

export const engine = new PythonEngine();
