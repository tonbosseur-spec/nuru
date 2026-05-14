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
  const { columns, rowCount, setDataset, globalFilter, setGlobalFilter, datasetName, setRowCount } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'view' | 'prepare' | 'filter'>('view');
  
  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number, colName: string, actualIndex: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Prep states
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [categorizingCol, setCategorizingCol] = useState<string | null>(null);
  const [bins, setBins] = useState(3);
  const [calcNewColName, setCalcNewColName] = useState('');
  const [calcExpression, setCalcExpression] = useState('');

  // Filter state
  const [filterStr, setFilterStr] = useState(globalFilter || '');
  const [filterBuildCol, setFilterBuildCol] = useState('');
  const [filterBuildOp, setFilterBuildOp] = useState('');
  const [filterBuildVal, setFilterBuildVal] = useState('');

  useEffect(() => {
    loadPreview();
  }, [columns, globalFilter]);

  const loadPreview = async () => {
    if (!columns.length) return;
    setLoading(true);
    try {
      // Fetch data including original index for editing target
      const code = `last_result = df.reset_index().head(50000).to_json(orient="records") if df is not None else None`;
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
        toast.success(`Variable renommée en ${newColName}`);
        setEditingCol(null);
        setNewColName('');
        await syncDatasetToStore();
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
        toast.success(`Nouvelle variable créée : ${res.new_column}`);
        setCategorizingCol(null);
        await syncDatasetToStore();
      }
    } catch (err) {
      toast.error("Erreur lors de la catégorisation");
    }
  };

  const syncDatasetToStore = async () => {
    setLoading(true);
    try {
      const code = `
import pandas as pd
column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({"name": col, "type": col_type, "missing": int(df[col].isnull().sum())})
last_result = {"columns": column_info, "rows": len(df), "csv": df.to_csv(index=False)}
`;
      const res = await engine.runCode(code);
      if (res.result) {
        setDataset(datasetName || "Data", res.result.columns, res.result.rows, res.result.csv);
        loadPreview();
      }
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = async () => {
    if (!filterStr) {
      setGlobalFilter(null);
      return;
    }

    try {
      const res = await engine.checkFilter(filterStr);
      if (res.success) {
        setGlobalFilter(filterStr);
        setRowCount(res.rows_remaining);
        toast.success(`Filtre appliqué : ${res.rows_remaining} lignes conservées`);
      } else {
        toast.error(res.error || "Filtre invalide");
      }
    } catch (err) {
      toast.error("Erreur de syntaxe dans le filtre");
    }
  };

  const commitFilter = async () => {
    if (!globalFilter) return;
    try {
        const res = await engine.commitFilter();
        if (res.success) {
            toast.success("Filtre appliqué de manière permanente");
            setGlobalFilter(null);
            setFilterStr('');
            await syncDatasetToStore();
        }
    } catch (err) {
        toast.error("Erreur lors de l'application permanente");
    }
  };

  const buildFilterFromParts = () => {
    if (!filterBuildCol || !filterBuildOp) return;
    
    let part = '';
    const colName = filterBuildCol.includes(' ') ? `\`${filterBuildCol}\`` : filterBuildCol;
    const isNum = columns.find(c => c.name === filterBuildCol)?.type === 'numeric';
    const val = isNum ? filterBuildVal : `"${filterBuildVal.replace(/"/g, '\\"')}"`;

    switch (filterBuildOp) {
      case '==': part = `${colName} == ${val}`; break;
      case '!=': part = `${colName} != ${val}`; break;
      case '>': part = `${colName} > ${val}`; break;
      case '<': part = `${colName} < ${val}`; break;
      case '>=': part = `${colName} >= ${val}`; break;
      case '<=': part = `${colName} <= ${val}`; break;
      case 'contains': part = `${colName}.str.contains("${filterBuildVal}", na=False)`; break;
      case 'isnull': part = `${colName}.isnull()`; break;
      case 'notnull': part = `${colName}.notnull()`; break;
    }

    if (filterStr) {
        setFilterStr(prev => `${prev} and ${part}`);
    } else {
        setFilterStr(part);
    }
    
    // Clear build states
    setFilterBuildOp('');
    setFilterBuildVal('');
  };

  const handleCellSave = async (actualIndex: number, colName: string) => {
    if (editingCell === null) return;
    
    try {
      const res = await engine.updateCell(actualIndex, colName, editValue);
      if (res.success) {
        // Update local state for immediate feedback
        const newData = [...data];
        const rowIdx = newData.findIndex(r => r.index === actualIndex);
        if (rowIdx !== -1) {
          newData[rowIdx][colName] = res.new_value;
          setData(newData);
        }
        toast.success("Valeur modifiée");
        
        // Persist change to store
        await syncDatasetToStore();
      } else {
        toast.error(res.error || "Erreur de modification");
      }
    } catch (err) {
      toast.error("Échec de la modification");
    } finally {
      setEditingCell(null);
    }
  };

  const handleAddCalculated = async () => {
    if (!calcNewColName || !calcExpression) return;
    try {
        const res = await engine.addCalculatedColumn(calcNewColName, calcExpression);
        if (res.success) {
            toast.success(`Variable ${calcNewColName} ajoutée`);
            setCalcNewColName('');
            setCalcExpression('');
            await syncDatasetToStore();
        } else {
            toast.error(res.error || "Erreur de calcul");
        }
    } catch (err) {
        toast.error("Expression invalide");
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
          <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={syncDatasetToStore}
            disabled={!columns.length || loading}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            title="Sauvegarder les modifications dans le projet"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Synchro & Sauver
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
                    await syncDatasetToStore();
                  } catch(e) { toast.error("Erreur de transformation One-Hot"); }
                }}
               >
                 Toutes les cat. (Dummies)
               </Button>
            </div>

            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center mt-4">
              <Calculator className="w-4 h-4 mr-2" /> Calculateur (Variable Calculée)
            </h4>
            <div className="flex flex-col space-y-2">
              <input 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Nom de la nouvelle variable"
                value={calcNewColName}
                onChange={(e) => setCalcNewColName(e.target.value)}
              />
              <input 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Age * 2 + 10"
                value={calcExpression}
                onChange={(e) => setCalcExpression(e.target.value)}
              />
              <Button 
                size="sm" 
                className="h-7 text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-none self-end"
                disabled={!calcNewColName || !calcExpression}
                onClick={handleAddCalculated}
              >
                Calculer
              </Button>
            </div>
            
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center mt-4">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer Variable
            </h4>
            <div className="flex flex-col space-y-2">
              <select 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                onChange={async (e) => {
                  const col = e.target.value;
                  if (!col) return;
                  if (window.confirm(`Supprimer la variable "${col}" ?`)) {
                    try {
                      await engine.runCode(`df = df.drop(columns=['${col}'])\nlast_result = "ok"`);
                      toast.success("Variable supprimée");
                      await syncDatasetToStore();
                    } catch(err) { toast.error("Erreur de suppression"); }
                  }
                  e.target.value = "";
                }}
              >
                <option value="">Sélectionner une variable...</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
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

            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center mt-4">
              <Calculator className="w-4 h-4 mr-2" /> Variable Calculée
            </h4>
            <div className="flex flex-col space-y-2">
              <input 
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={calcNewColName}
                onChange={(e) => setCalcNewColName(e.target.value)}
                placeholder="Nom de la nouvelle variable"
              />
              <div className="flex space-x-1">
                <input 
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                    value={calcExpression}
                    onChange={(e) => setCalcExpression(e.target.value)}
                    placeholder="Expression (ex: Var1 + Var2)"
                />
                <Button 
                    size="sm" 
                    className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-none"
                    onClick={handleAddCalculated}
                >
                    Ajouter
                </Button>
              </div>
              <p className="text-[10px] text-slate-400">
                Supporte : +, -, *, /, ==, !=, &gt;, &lt;
              </p>
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
                    await syncDatasetToStore();
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
          <div className="max-w-5xl space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assistant de Filtrage</label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-400 ml-1">Variable</span>
                  <select 
                    className="rounded border border-slate-200 px-2 py-1.5 text-xs outline-none bg-slate-50 focus:bg-white"
                    value={filterBuildCol}
                    onChange={(e) => setFilterBuildCol(e.target.value)}
                  >
                    <option value="">Choisir...</option>
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-400 ml-1">Opération</span>
                  <select 
                    className="rounded border border-slate-200 px-2 py-1.5 text-xs outline-none bg-slate-50 focus:bg-white"
                    value={filterBuildOp}
                    onChange={(e) => setFilterBuildOp(e.target.value)}
                  >
                    <option value="">Choisir...</option>
                    <option value="==">Égal à (=)</option>
                    <option value="!=">Différent de (!=)</option>
                    <option value=">">Supérieur à (&gt;)</option>
                    <option value="<">Inférieur à (&lt;)</option>
                    <option value=">=">Supérieur ou égal (&gt;=)</option>
                    <option value="<=">Inférieur ou égal (&lt;=)</option>
                    <option value="contains">Contient (texte)</option>
                    <option value="isnull">Est vide (N/A)</option>
                    <option value="notnull">N'est pas vide</option>
                  </select>
                </div>
                {filterBuildOp !== 'isnull' && filterBuildOp !== 'notnull' && (
                  <div className="flex flex-col space-y-1 shrink-0 w-32">
                    <span className="text-[10px] text-slate-400 ml-1">Valeur</span>
                    <input 
                      className="rounded border border-slate-200 px-2 py-1.5 text-xs outline-none bg-slate-50 focus:bg-white"
                      placeholder="Valeur..."
                      value={filterBuildVal}
                      onChange={(e) => setFilterBuildVal(e.target.value)}
                    />
                  </div>
                )}
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs border-dashed"
                    onClick={buildFilterFromParts}
                    disabled={!filterBuildCol || !filterBuildOp}
                >
                  Ajouter au filtre
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Expression finale (Pandas Query)</label>
              <div className="flex items-center space-x-2">
                <input 
                  className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-mono bg-slate-50 focus:bg-white transition-colors"
                  placeholder="Ex: Revenu > 5000 and Age < 30"
                  value={filterStr}
                  onChange={(e) => setFilterStr(e.target.value)}
                />
                <Button onClick={applyFilter} className="bg-indigo-600 hover:bg-indigo-700 h-9">Appliquer</Button>
                {globalFilter && (
                   <Button 
                    onClick={commitFilter} 
                    variant="outline" 
                    className="h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    title="Supprime les lignes exclues du jeu de données original"
                   >
                     Valider définitivement
                   </Button>
                )}
                {(globalFilter || filterStr) && (
                  <Button variant="ghost" onClick={() => { setFilterStr(''); setGlobalFilter(null); }} className="h-9 font-normal text-slate-400">
                    Réinitialiser
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 italic mt-2">
                Note : Double-cliquez sur une cellule dans le tableau pour la modifier manuellement.
              </p>
            </div>
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
                  {columns.map((col) => {
                    const isEditing = editingCell?.actualIndex === row.index && editingCell?.colName === col.name;
                    return (
                      <td key={col.name} className="px-4 py-2 text-sm text-slate-600 font-medium whitespace-nowrap p-0">
                        {isEditing ? (
                          <input 
                            autoFocus
                            className="w-full h-full px-4 py-2 bg-white border-2 border-indigo-500 outline-none rounded-sm z-50 relative"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(row.index, col.name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave(row.index, col.name);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <div 
                            className="px-4 py-2 h-full w-full cursor-text hover:bg-indigo-50/50 transition-colors truncate max-w-[200px]"
                            onDoubleClick={() => {
                              setEditingCell({ rowIndex: idx, colName: col.name, actualIndex: row.index });
                              setEditValue(row[col.name]?.toString() || '');
                            }}
                            title="Double-cliquez pour modifier"
                          >
                            {row[col.name] === null || row[col.name] === undefined ? (
                              <span className="text-slate-300 italic text-[10px]">null</span>
                            ) : (
                              row[col.name].toString()
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
