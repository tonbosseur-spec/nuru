import React, { useEffect, useState, useRef } from 'react';
import { useStore, getWorkspaceSummaries, deleteWorkspace, getWorkspace, WorkspaceSummary } from '@/src/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderOpen, Plus, Zap, Trash2, UploadCloud, Beaker, Clock, FileText, ChevronRight, LayoutGrid } from 'lucide-react';
import { engine } from '@/src/lib/pythonEngine';
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
    <div className="flex h-screen w-full flex-col bg-slate-50/80 font-sans overflow-hidden">
      <header className="h-20 border-b bg-white flex items-center px-8 justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="p-2 bg-indigo-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl text-slate-900 tracking-tight leading-none mb-1">Nuru Analytics</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-500">Moteur Local v2.0</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {user?.firstName}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-red-600 hover:bg-red-50">Déconnexion</Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Hero / CTA Section */}
          <section className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900"
              >
                Salut, {user?.firstName} ! 👋
              </motion.h1>
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Prêt à explorer vos données ? Importez un fichier ou commencez un nouveau projet pour libérer la puissance des statistiques.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-end shrink-0">
              <input 
                type="file" 
                accept=".nra,.statstudio,application/json" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={importWorkspace} 
              />
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-6 bg-white hover:bg-amber-50 text-amber-700 border-amber-100 rounded-xl transition-all font-semibold"
                onClick={loadTestDataset}
              >
                <Beaker className="w-5 h-5 mr-3 text-amber-500" /> Demo Agricole
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-6 bg-white hover:bg-indigo-50 border-slate-200 rounded-xl transition-all font-semibold"
                onClick={importWorkspaceFromFile}
              >
                <UploadCloud className="w-5 h-5 mr-3 text-indigo-500" /> Importer .nra
              </Button>
              <Button 
                size="lg"
                onClick={() => createNewWorkspace()} 
                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xl shadow-indigo-100 transition-all font-bold group"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" /> Nouveau Projet
              </Button>
            </div>
          </section>

          {/* Quick Stats / Feedback */}
          {!isEngineReady && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                <span className="text-sm font-medium text-indigo-700">Moteur Python : {engineStatus}...</span>
              </div>
              <div className="text-xs text-indigo-400 font-mono">WASM INITIALIZING</div>
            </motion.div>
          )}

          {/* Projects Grid */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-900">Projets récents</h2>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{summaries.length} Projet(s)</span>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : summaries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group border-2 border-dashed bg-white/50 border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:border-indigo-200"
              >
                <div className="p-6 bg-slate-100 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                  <LayoutGrid className="w-12 h-12 text-slate-300 group-hover:text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Aucun projet pour le moment</h3>
                <p className="text-slate-500 max-w-sm mb-8 italic">
                  "Chaque voyage commence par un seul octet." <br /> Commencez une nouvelle analyse dès maintenant.
                </p>
                <Button onClick={() => createNewWorkspace()} variant="outline" className="rounded-full px-8">
                  Démarrer le premier projet
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {summaries.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card 
                        className="h-full cursor-pointer border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group overflow-hidden bg-white"
                        onClick={() => handleOpenWorkspace(s.id)}
                      >
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-2.5 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-lg transition-colors">
                              <FileText className="w-6 h-6" />
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                              onClick={(e) => handleDelete(e, s.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors">
                            {s.name}
                          </CardTitle>
                          <div className="flex items-center text-xs text-slate-400 font-medium">
                            <Clock className="w-3 h-3 mr-1.5" />
                            {new Date(s.lastModified).toLocaleDateString()} at {new Date(s.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </CardHeader>
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Ouvrir le projet
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="h-10 bg-white border-t flex items-center justify-center text-[10px] uppercase font-bold tracking-[0.3em] text-slate-400 shrink-0">
        Nuru Analytics — Made Possible with Pyodide WASM Engine
      </footer>
    </div>
  );
}
