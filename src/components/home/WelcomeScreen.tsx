import React, { useEffect, useState, useRef } from 'react';
import { useStore, getWorkspaceSummaries, deleteWorkspace, getWorkspace, WorkspaceSummary } from '@/store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FolderOpen, Plus, Zap, Trash2, UploadCloud, Beaker, Clock, FileText, ChevronRight, LayoutGrid } from 'lucide-react';
import { engine } from '@/lib/pythonEngine';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

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
  const { user, createNewWorkspace, loadWorkspaceData, logout, isEngineReady, engineStatus, setDataset, importWorkspaceFromFile } = useStore();
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
    <div className="flex h-screen w-full bg-[#f8f9fa] font-sans flex-col overflow-hidden">
      {/* Native-style Title Bar simulation */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-indigo-600 rounded text-white flex items-center justify-center shadow-sm">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-[13px] text-slate-800 tracking-wide">Nuru Analytics - Démarrage</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-[12px]">
            <span className="text-slate-600">{user?.firstName} {user?.lastName}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="h-7 px-2 text-slate-500 hover:text-red-600">Déconnexion</Button>
          </div>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Left: Actions */}
        <div className="w-72 bg-white border-r border-[#e5e5e5] p-6 flex flex-col shadow-sm z-10">
          <div className="mb-8">
            <h1 className="text-2xl font-light text-slate-800 mb-1">Démarrer</h1>
            <p className="text-[13px] text-slate-500">Ouvrez ou créez un projet d'analyse</p>
          </div>

          <div className="space-y-2 flex-1">
            <button 
              onClick={() => createNewWorkspace()} 
              className="w-full flex items-center p-3 rounded text-left transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-200 group"
            >
              <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center mr-3 group-hover:bg-indigo-600 transition-colors">
                <Plus className="w-4 h-4 text-indigo-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[13px] font-medium text-slate-800">Nouveau Projet</div>
                 <div className="text-[11px] text-slate-500 truncate">Créer un espace de travail vide</div>
              </div>
            </button>

            <button 
              onClick={importWorkspaceFromFile}
              className="w-full flex items-center p-3 rounded text-left transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-200 group"
            >
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-slate-800 transition-colors">
                <FolderOpen className="w-4 h-4 text-slate-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[13px] font-medium text-slate-800">Ouvrir (.nra)</div>
                 <div className="text-[11px] text-slate-500 truncate">Charger un projet existant</div>
              </div>
            </button>
            <input 
              type="file" 
              accept=".nra,.statstudio,application/json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={importWorkspace} 
            />

            <div className="h-px bg-slate-200 my-4 mx-3" />

            <button 
              onClick={loadTestDataset}
              className="w-full flex items-center p-3 rounded text-left transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-200 group"
            >
              <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-600 transition-colors">
                <Beaker className="w-4 h-4 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[13px] font-medium text-slate-800">Demo Agricole</div>
                 <div className="text-[11px] text-slate-500 truncate">Explorer un jeu de données test</div>
              </div>
            </button>
          </div>

          {!isEngineReady && (
            <div className="mt-auto pt-4 border-t border-slate-200">
               <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                 <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                 <span>Initialisation du moteur Python...</span>
               </div>
            </div>
          )}
        </div>

        {/* Main Content Right: Recent Projects */}
        <div className="flex-1 bg-[#f8f9fa] p-8 overflow-y-auto">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-6 flex items-center">
            <Clock className="w-4 h-4 mr-2" /> Récents
          </h2>

          <div className="max-w-4xl">
          {isLoading ? (
             <div className="space-y-2">
               {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200/50 rounded animate-pulse" />)}
             </div>
          ) : summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-[13px]">
              <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
              Aucun projet récent. Les projets enregistrés apparaîtront ici.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <div className="col-span-6">Nom du projet</div>
                <div className="col-span-4">Dernière modification</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {summaries.map((s) => (
                  <div 
                    key={s.id}
                    onClick={() => handleOpenWorkspace(s.id)}
                    className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="col-span-6 flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-indigo-500/70" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{s.name}</div>
                        {s.datasetName && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{s.datasetName}</div>}
                      </div>
                    </div>
                    <div className="col-span-4 text-[12px] text-slate-500">
                      {new Date(s.lastModified).toLocaleDateString()} à {new Date(s.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="col-span-2 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleDelete(e, s.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
