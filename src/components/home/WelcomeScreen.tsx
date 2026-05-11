import React, { useEffect, useState, useRef } from 'react';
import { useStore, getWorkspaceSummaries, deleteWorkspace, getWorkspace, WorkspaceSummary } from '@/src/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderOpen, Plus, Settings2, Trash2, UploadCloud, Beaker } from 'lucide-react';
import { engine } from '@/src/lib/pythonEngine';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const generateTestExcel = () => {
  const data = [];
  const regions = ["Nord", "Sud", "Est", "Ouest"];
  const cultures = ["Blé", "Maïs", "Soja", "Riz", "Coton"];
  const sols = ["Argileux", "Sableux", "Limoneux"];
  const irrigations = ["Oui", "Non"];
  const credits = ["Oui", "Non"];

  for (let i = 0; i < 200; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const culture = cultures[Math.floor(Math.random() * cultures.length)];
    const sol = sols[Math.floor(Math.random() * sols.length)];
    const irrigation = irrigations[Math.floor(Math.random() * irrigations.length)];
    const credit = credits[Math.floor(Math.random() * credits.length)];

    const superficie = +(Math.random() * 100 + 10).toFixed(2);
    const production = +(superficie * (Math.random() * 5 + 2)).toFixed(2);
    const revenu = +(production * (Math.random() * 200 + 50)).toFixed(2);
    const pluviometrie = +(Math.random() * 800 + 200).toFixed(1);
    const age = Math.floor(Math.random() * 50 + 20);
    const engrais = +(Math.random() * 500 + 50).toFixed(1);

    data.push({
      "Région": region,
      "Culture": culture,
      "Type de sol": sol,
      "Irrigation": irrigation,
      "Accès au crédit": credit,
      "Superficie (ha)": superficie,
      "Production (t)": production,
      "Revenu ($)": revenu,
      "Pluviométrie (mm)": pluviometrie,
      "Âge (ans)": age,
      "Engrais (kg)": engrais
    });
  }

  const descData = [
    { Variable: "Région", "Type": "Catégorielle", "Description": "Région agricole d'implantation" },
    { Variable: "Culture", "Type": "Catégorielle", "Description": "Type de culture principale exploitée" },
    { Variable: "Type de sol", "Type": "Catégorielle", "Description": "Nature du sol de l'exploitation" },
    { Variable: "Irrigation", "Type": "Catégorielle", "Description": "Présence ou non d'un système d'irrigation" },
    { Variable: "Accès au crédit", "Type": "Catégorielle", "Description": "Disponibilité d'un crédit agricole" },
    { Variable: "Superficie (ha)", "Type": "Continue", "Description": "Taille de l'exploitation en hectares" },
    { Variable: "Production (t)", "Type": "Continue", "Description": "Volume de la production en tonnes" },
    { Variable: "Revenu ($)", "Type": "Continue", "Description": "Revenus générés par la production en dollars" },
    { Variable: "Pluviométrie (mm)", "Type": "Continue", "Description": "Quantité de pluie annuelle en mm" },
    { Variable: "Âge (ans)", "Type": "Continue", "Description": "Âge de l'exploitant agricole" },
    { Variable: "Engrais (kg)", "Type": "Continue", "Description": "Quantité d'engrais utilisée en kg par an" }
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(data);
  const ws2 = XLSX.utils.json_to_sheet(descData);

  XLSX.utils.book_append_sheet(wb, ws1, "Données");
  XLSX.utils.book_append_sheet(wb, ws2, "Description des variables");

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};

export function WelcomeScreen() {
  const { user, createNewWorkspace, loadWorkspaceData, logout, isEngineReady, engineStatus, setDataset } = useStore();
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

  const loadTestDataset = async () => {
    if (!isEngineReady) {
      toast.warning(`Le moteur Python est en cours de préparation (${engineStatus.toLowerCase()}). Veuillez patienter un instant.`);
      return;
    }
    
    setIsLoading(true);
    try {
      const buffer = generateTestExcel();
      const filename = "agriculture_fictif.xlsx";
      const res = await engine.loadFile(buffer, filename);
      
      if (res.error) {
        toast.error('Erreur lors du chargement des données : ' + res.error);
        setIsLoading(false);
      } else {
        createNewWorkspace("Jeu de test agricole");
        setDataset(filename, res.columns, res.rows, res.csv);
        toast.success(`Jeu de données chargé avec succès (${res.rows} lignes)`);
      }
    } catch (err: any) {
      toast.error('Erreur inattendue : ' + err.message);
      setIsLoading(false);
    }
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
            <Button variant="outline" className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200" onClick={loadTestDataset}>
              <Beaker className="w-4 h-4 mr-2" /> Tester avec un jeu de données
            </Button>
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
