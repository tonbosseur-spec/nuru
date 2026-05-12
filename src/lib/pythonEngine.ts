import { useStore } from '../store';

const API_URL = 'http://127.0.0.1:8000';

class PythonEngine {
  isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    useStore.getState().setEngineReady(false, 'Connexion au moteur local...');
    
    // Tentative de connexion au backend
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        this.isInitialized = true;
        useStore.getState().setEngineReady(true, 'Prêt (Local)');
      } else {
        throw new Error('Backend non prêt');
      }
    } catch (err) {
      // Si le backend n'est pas encore prêt, on réessaye dans 1s
      setTimeout(() => this.init(), 1000);
    }
  }

  async loadData(csvStr: string): Promise<any> {
    await this.init();
    const formData = new FormData();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    formData.append('file', blob, 'data.csv');

    try {
      const response = await fetch(`${API_URL}/load`, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (error) {
      return { error: String(error) };
    }
  }

  async loadFile(buffer: ArrayBuffer, filename: string): Promise<any> {
    await this.init();
    
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('file', blob, filename);

    try {
      const response = await fetch(`${API_URL}/load`, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (error) {
      console.error('API Load Error:', error);
      return { error: String(error) };
    }
  }

  async analyzeDescriptive(column: string): Promise<any> {
    await this.init();
    try {
      const response = await fetch(`${API_URL}/analyze/descriptive?column=${encodeURIComponent(column)}`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      return { error: String(error) };
    }
  }

  // Méthode générique pour exécuter du code
  async runCode(code: string): Promise<{output: string, result: any, error?: string}> {
    await this.init();
    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      return { 
        output: data.output || "", 
        result: data.results || null, 
        error: data.error 
      };
    } catch (error) {
      return { output: "", result: null, error: String(error) };
    }
  }

  async renameColumn(oldName: string, newName: string) {
    await this.init();
    const response = await fetch(`${API_URL}/prepare/rename?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName)}`, {
      method: 'POST'
    });
    return response.json();
  }

  async categorizeColumn(column: string, bins: number, newName?: string) {
    await this.init();
    let url = `${API_URL}/prepare/categorize?column=${encodeURIComponent(column)}&bins=${bins}`;
    if (newName) url += `&new_name=${encodeURIComponent(newName)}`;
    const response = await fetch(url, { method: 'POST' });
    return response.json();
  }

  async checkFilter(condition: string) {
    await this.init();
    const response = await fetch(`${API_URL}/prepare/filter?condition=${encodeURIComponent(condition)}`, {
      method: 'POST'
    });
    return response.json();
  }
}

export const engine = new PythonEngine();
