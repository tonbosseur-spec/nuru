import React, { useEffect, useState, useRef } from 'react';
import { useStore, getWorkspaceSummaries, deleteWorkspace, getWorkspace, WorkspaceSummary } from '@/src/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderOpen, Plus, Settings2, Trash2, UploadCloud } from 'lucide-react';
import { engine } from '@/src/lib/pythonEngine';
import { toast } from 'sonner';

export function WelcomeScreen() {
  const { user, createNewWorkspace, loadWorkspaceData, logout } = useStore();
  const [summaries, setSummaries] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSummaries = async () => {
    const s = await getWorkspaceSummaries();
    setSummaries(s);
    setIsLoading(false);
  };

  useEffect(() => {
    engine.init(); // Warm up engine
    fetchSummaries();
  }, []);

  const handleOpenWorkspace = async (id: string) => {
    try {
      const data = await getWorkspace(id);
      if (data) {
        // If it has csvData, we need to inject it back into pyodide to recreate df
        if (data.csvData) {
          await engine.loadData(data.csvData);
        }
        loadWorkspaceData(data);
      } else {
        toast.error("Données du projet introuvables");
      }
    } catch (err: any) {
      toast.error('Erreur lors du chargement : ' + err.message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer ce projet ?')) {
      await deleteWorkspace(id);
      fetchSummaries();
      toast.success('Projet supprimé');
    }
  };

  const importWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.id && json.name && json.columns) {
          // Re-generate ID to avoid conflict
          json.id = crypto.randomUUID();
          if (json.csvData) {
            await engine.loadData(json.csvData);
          }
          loadWorkspaceData(json);
          toast.success("Espace de travail importé avec succès");
        } else {
          toast.error("Format de fichier invalide");
        }
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 font-sans">
      <header className="h-16 border-b bg-white flex items-center px-6 justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-blue-600 rounded text-white flex items-center justify-center">
            <Settings2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">StatStudio</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-600">
            Bonjour, {user?.firstName}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>Déconnexion</Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Espace de travail</h1>
            <p className="text-slate-500 mt-2">Démarrer une nouvelle analyse ou reprendre un projet récent.</p>
          </div>
          <div className="flex space-x-3">
            <input 
              type="file" 
              accept=".statstudio,application/json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={importWorkspace} 
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="w-4 h-4 mr-2" /> Importer
            </Button>
            <Button onClick={() => createNewWorkspace()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Projet
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-slate-800">Projets récents</h2>
        
        {isLoading ? (
          <p className="text-slate-500">Chargement des projets...</p>
        ) : summaries.length === 0 ? (
          <Card className="border-dashed bg-transparent shadow-none border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <FolderOpen className="w-12 h-12 mb-4 text-slate-400" />
              <p className="text-lg font-medium">Aucun projet récent</p>
              <p className="text-sm mt-1">Créez un nouveau projet pour commencer.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaries.map(s => (
              <Card 
                key={s.id} 
                className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                onClick={() => handleOpenWorkspace(s.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold line-clamp-1">{s.name}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                      onClick={(e) => handleDelete(e, s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    Modifié le {new Date(s.lastModified).toLocaleDateString()} {new Date(s.lastModified).toLocaleTimeString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
