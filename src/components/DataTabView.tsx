import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { engine } from '../lib/pythonEngine';
import { 
  Table as TableIcon, 
  RotateCcw, 
  Filter, 
  Type, 
  Settings2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Grid3X3,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DataTabView() {
  const { columns, rowCount, setDataset, globalFilter, setGlobalFilter } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'view' | 'prepare' | 'filter'>('view');
  
  // Prep states
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [categorizingCol, setCategorizingCol] = useState<string | null>(null);
  const [bins, setBins] = useState(3);

  // Filter state
  const [filterStr, setFilterStr] = useState(globalFilter || '');

  useEffect(() => {
    loadPreview();
  }, [columns]);

  const loadPreview = async () => {
    if (!columns.length) return;
    setLoading(true);
    try {
      // Fetch more rows for a proper view - we use 1000 now
      const code = `last_result = df.head(1000).to_json(orient="records") if df is not None else None`;
      const res = await engine.runCode(code);
      
      if (res.result) {
        const parsed = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
        setData(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error("Failed to load data preview", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newColName || newColName === oldName) {
      setEditingCol(null);
      return;
    }
    
    try {
      const res = await engine.renameColumn(oldName, newColName);
      if (res.success) {
        const newCols = columns.map(c => 
          c.name === oldName ? { ...c, name: newColName } : c
        );
        setDataset("Modified", newCols, rowCount, ""); // Keep rowCount, csvData string can be empty as it's in engine memory
        toast.success(`Variable renommée en ${newColName}`);
        setEditingCol(null);
        setNewColName('');
      } else {
        toast.error(res.error || "Échec du renommage");
      }
    } catch (err) {
      toast.error("Erreur de connexion au moteur");
    }
  };

  const handleCategorize = async (column: string) => {
    try {
      const res = await engine.categorizeColumn(column, bins);
      if (res.success) {
        // Need to refresh columns info
        const code = `last_result = [{"name": c, "type": "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`;
        const colRes = await engine.runCode(code);
        if (colRes.result) {
          const newCols = typeof colRes.result === 'string' ? JSON.parse(colRes.result) : colRes.result;
          setDataset("Modified", newCols, rowCount, "");
          toast.success(`Nouvelle variable créée : ${res.new_column}`);
          setCategorizingCol(null);
          loadPreview();
        }
      }
    } catch (err) {
      toast.error("Erreur lors de la catégorisation");
    }
  };

  const applyFilter = async () => {
    if (!filterStr) {
      setGlobalFilter(null);
      loadPreview();
      return;
    }

    try {
      const res = await engine.checkFilter(filterStr);
      if (res.success) {
        setGlobalFilter(filterStr);
        toast.success(`Filtre appliqué : ${res.rows_remaining} lignes conservées`);
        loadPreview();
      } else {
        toast.error(res.error || "Filtre invalide");
      }
    } catch (err) {
      toast.error("Erreur de syntaxe dans le filtre");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Mini-Barre d'outils */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Button 
            variant={activePanel === 'view' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActivePanel('view')}
            className="text-xs"
          >
            <Grid3X3 className="w-3.5 h-3.5 mr-2" /> Vue
          </Button>
          <Button 
            variant={activePanel === 'prepare' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActivePanel('prepare')}
            disabled={!columns.length}
            className="text-xs"
          >
            <Settings2 className="w-3.5 h-3.5 mr-2" /> Nettoyage
          </Button>
          <Button 
            variant={activePanel === 'filter' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActivePanel('filter')}
            disabled={!columns.length}
            className="text-xs"
          >
            <Filter className="w-3.5 h-3.5 mr-2" /> Filtres
          </Button>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {rowCount} lignes • {columns.length} variables
          {globalFilter && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">Filtré</span>}
        </div>
      </div>

      {/* Zone de préparation */}
      {activePanel === 'prepare' && columns.length > 0 && (
        <div className="bg-white border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
              <Type className="w-4 h-4 mr-2" /> Renommer une variable
            </h4>
            <div className="flex items-center space-x-2">
              <select 
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                value={editingCol || ''}
                onChange={(e) => {
                  setEditingCol(e.target.value);
                  setNewColName(e.target.value);
                }}
              >
                <option value="">Sélectionner...</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              {editingCol && (
                <>
                  <input 
                    className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Nouveau nom"
                  />
                  <Button size="sm" onClick={() => handleRename(editingCol)}>Ok</Button>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
              <Calculator className="w-4 h-4 mr-2" /> Catégoriser (Discrétisation)
            </h4>
            <div className="flex items-center space-x-2">
              <select 
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                value={categorizingCol || ''}
                onChange={(e) => setCategorizingCol(e.target.value)}
              >
                <option value="">Variables numériques...</option>
                {columns.filter(c => c.type === 'numeric').map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              {categorizingCol && (
                <>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-slate-500">Bins:</span>
                    <input 
                      type="number"
                      className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                      value={bins}
                      onChange={(e) => setBins(parseInt(e.target.value))}
                      min="2"
                      max="10"
                    />
                  </div>
                  <Button size="sm" onClick={() => handleCategorize(categorizingCol)}>Créer</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zone de filtres */}
      {activePanel === 'filter' && columns.length > 0 && (
        <div className="bg-white border-b border-slate-200 p-4 animate-in slide-in-from-top duration-300">
          <div className="max-w-3xl space-y-2">
            <label className="text-sm font-semibold text-slate-700">Filtre Global (Syntaxe Python/Pandas)</label>
            <div className="flex items-center space-x-2">
              <input 
                className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-mono bg-slate-50 focus:bg-white transition-colors"
                placeholder="Ex: Revenu > 5000 and Age < 30"
                value={filterStr}
                onChange={(e) => setFilterStr(e.target.value)}
              />
              <Button onClick={applyFilter} className="bg-indigo-600 hover:bg-indigo-700">Appliquer</Button>
              {globalFilter && (
                <Button variant="ghost" onClick={() => { setFilterStr(''); setGlobalFilter(null); loadPreview(); }}>
                  Effacer
                </Button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Les filtres appliqués ici impacteront toutes les analyses ultérieures.
            </p>
          </div>
        </div>
      )}

      {/* Tableau des données */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        {loading ? (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse text-sm">Chargement des données...</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 border-b border-slate-200 shadow-sm">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 bg-slate-100 italic">#</th>
                {columns.map((col) => (
                  <th key={col.name} className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider group min-w-[120px] bg-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${col.type === 'numeric' ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                      <span>{col.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-2 text-xs text-slate-400 font-mono text-center border-r border-slate-100 bg-slate-50/50">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-2 text-sm text-slate-600 font-medium">
                      {row[col.name] === null || row[col.name] === undefined ? (
                        <span className="text-slate-300 italic text-[10px]">null</span>
                      ) : (
                        row[col.name].toString()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-20 text-center text-slate-400">
                    <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    {columns.length === 0 ? "Veuillez charger un fichier pour voir les données" : "Aucune donnée à afficher pour le moment"}
                  </td>
                </tr>
              )}
              {data.length < rowCount && (
                 <tr>
                   <td colSpan={columns.length + 1} className="px-4 py-4 text-center text-slate-400 text-xs italic bg-slate-50 border-t border-slate-200">
                     Aperçu limité aux 1000 premières lignes. Utilisez les filtres pour affiner.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
