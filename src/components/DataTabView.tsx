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
import { Button } from './ui/button';
import { toast } from 'sonner';
import { TableVirtuoso } from 'react-virtuoso';

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
      const code = `last_result = df.head(50000).to_json(orient="records") if df is not None else None`;
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
        <div className="bg-white border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top duration-300">
          
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center">
              <Type className="w-4 h-4 mr-2" /> Renommer
            </h4>
            <div className="flex flex-col space-y-2">
              <select 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={editingCol || ''}
                onChange={(e) => {
                  setEditingCol(e.target.value);
                  setNewColName(e.target.value);
                }}
              >
                <option value="">Sélectionner une variable...</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              {editingCol && (
                <div className="flex space-x-2">
                  <input 
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Nouveau nom"
                  />
                  <Button size="sm" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-none" onClick={() => handleRename(editingCol)}>Ok</Button>
                </div>
              )}
            </div>
            
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center mt-4">
              <Type className="w-4 h-4 mr-2" /> One-Hot Encoding
            </h4>
            <div className="flex flex-col space-y-2">
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode('cat_cols = df.select_dtypes(exclude=["number"]).columns\ndf = pd.get_dummies(df, columns=cat_cols, drop_first=True, dtype=int)\nlast_result = "ok"');
                    toast.success("Variables catégorielles transformées en One-Hot (n-1 colonnes).");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur de transformation One-Hot"); }
                }}
               >
                 Toutes les cat. (Dummies)
               </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center">
              <Calculator className="w-4 h-4 mr-2" /> Discrétisation
            </h4>
            <div className="flex flex-col space-y-2">
              <select 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={categorizingCol || ''}
                onChange={(e) => setCategorizingCol(e.target.value)}
              >
                <option value="">Variables numériques...</option>
                {columns.filter(c => c.type === 'numeric').map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              {categorizingCol && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500">K:</span>
                  <input 
                    type="number"
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={bins}
                    onChange={(e) => setBins(parseInt(e.target.value))}
                    min="2"
                    max="10"
                  />
                  <Button size="sm" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-none" onClick={() => handleCategorize(categorizingCol)}>Créer</Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center">
              <Trash2 className="w-4 h-4 mr-2" /> Valeurs manquantes (NA)
            </h4>
            <div className="flex flex-wrap gap-2">
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode('df = df.dropna()\nlast_result = "ok"');
                    toast.success("Lignes contenant des valeurs manquantes supprimées.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur de suppression"); }
                }}
               >
                 Supprimer lignes
               </Button>
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode('numeric_cols = df.select_dtypes(include=["number"]).columns\ndf[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())\nlast_result = "ok"');
                    toast.success("Valeurs manquantes numériques remplacées par la moyenne.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur d'imputation"); }
                }}
               >
                 Imputer (Moyenne)
               </Button>
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode('numeric_cols = df.select_dtypes(include=["number"]).columns\ndf[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())\nlast_result = "ok"');
                    toast.success("Valeurs manquantes numériques remplacées par la médiane.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur d'imputation"); }
                }}
               >
                 Imputer (Médiane)
               </Button>
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white border-dashed border-slate-300"
                onClick={async () => {
                  try {
                    await engine.runCode('cat_cols = df.select_dtypes(exclude=["number"]).columns\nfor c in cat_cols:\n    if not df[c].mode().empty:\n        df[c] = df[c].fillna(df[c].mode()[0])\nlast_result = "ok"');
                    toast.success("Valeurs manquantes catégorielles remplacées (Mode).");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur d'imputation catégorielle"); }
                }}
               >
                 Imputer Catégorielles (Mode)
               </Button>
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-indigo-600 bg-indigo-50 border-indigo-200"
                onClick={async () => {
                  try {
                    toast.info("Imputation KNN en cours...");
                    await engine.runCode('from sklearn.impute import KNNImputer\nnumeric_cols = df.select_dtypes(include=["number"]).columns\nif len(numeric_cols) > 0:\n    imputer = KNNImputer(n_neighbors=5)\n    df[numeric_cols] = imputer.fit_transform(df[numeric_cols])\nlast_result = "ok"');
                    toast.success("Valeurs manquantes numériques remplacées par KNN.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur lors de l'imputation KNN"); }
                }}
               >
                 Imputer Numérique (KNN Avancé)
               </Button>
            </div>

            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center mt-6">
              <Filter className="w-4 h-4 mr-2" /> Valeurs atypiques (Outliers)
            </h4>
            <div className="flex flex-wrap gap-2">
               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode(`
import numpy as np
numeric_cols = df.select_dtypes(include=["number"]).columns
for c in numeric_cols:
    Q1 = df[c].quantile(0.25)
    Q3 = df[c].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    df.loc[(df[c] < lower_bound) | (df[c] > upper_bound), c] = np.nan
df = df.dropna(subset=numeric_cols)
last_result = "ok"
                    `);
                    toast.success("Outliers (Méthode IQR) identifiés et supprimés.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur - Suppression IQR"); }
                }}
               >
                 Supprimer (Méthode IQR)
               </Button>

               <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs text-slate-600 bg-white"
                onClick={async () => {
                  try {
                    await engine.runCode(`
import numpy as np
import scipy.stats as stats
numeric_cols = df.select_dtypes(include=["number"]).columns
z_scores = np.abs(stats.zscore(df[numeric_cols].dropna()))
df = df[(z_scores < 3).all(axis=1)]
last_result = "ok"
                    `);
                    toast.success("Outliers (Z-Score > 3) supprimés.");
                    engine.runCode(`last_result = [{"name": c, "type": "numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical", "missing": int(df[c].isna().sum())} for c in df.columns]`).then(res => {
                        if (res.result) setDataset("Modified", JSON.parse(res.result), rowCount, "");
                        loadPreview();
                    });
                  } catch(e) { toast.error("Erreur - Supression Z-Score"); }
                }}
               >
                 Supprimer (Z-score &gt; 3)
               </Button>
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
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            {columns.length === 0 ? "Veuillez charger un fichier pour voir les données" : "Aucune donnée à afficher"}
          </div>
        ) : (
          <div className="h-full w-full">
            <TableVirtuoso
              data={data}
              components={{
                Table: (props) => <table {...props} className="w-full text-left border-collapse min-w-max" />,
                TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref as any} className="sticky top-0 z-20 m-0 p-0" />),
                TableRow: (props) => <tr {...props} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors" />,
                TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} />),
              }}
              fixedHeaderContent={() => (
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
              )}
              itemContent={(idx, row) => (
                <>
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
                </>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
