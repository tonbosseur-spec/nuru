import React, { useState, useEffect, useCallback } from 'react';
import { useStore, TransformationStep } from '../../store';
import { engine } from '../../lib/pythonEngine';
import { 
  Undo2, 
  Redo2, 
  Play, 
  Eye, 
  Save, 
  RotateCcw, 
  Download, 
  Search,
  ChevronRight,
  ChevronLeft,
  Layout,
  History,
  Settings,
  MoreVertical,
  Table as TableIcon,
  Trash2,
  Database,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ProcessingSidebar } from './ProcessingSidebar';
import { ProcessingTable } from './ProcessingTable';
import { PipelinePanel } from './PipelinePanel';
import { PropertiesPanel } from './PropertiesPanel';
import { motion, AnimatePresence } from 'motion/react';

export function DataProcessingModule() {
  const { 
    columns, 
    rowCount, 
    setDataset, 
    datasetName, 
    setRowCount,
    pipeline,
    setPipeline,
    addPipelineStep,
    removePipelineStep,
    togglePipelineStep
  } = useStore();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<any>(null);
  const [showPipeline, setShowPipeline] = useState(true);
  const [undidSteps, setUndidSteps] = useState<TransformationStep[]>([]);

  const loadDataPreview = useCallback(async () => {
    if (!columns.length) return;
    setLoading(true);
    try {
      const code = `last_result = df.reset_index().head(1000).to_json(orient="records") if df is not None else None`;
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
  }, [columns]);

  useEffect(() => {
    loadDataPreview();
  }, [loadDataPreview]);

  const handleApplyTool = async (type: string, category: string, params: any, description: string) => {
    const step: TransformationStep = {
      id: crypto.randomUUID(),
      type,
      category,
      params,
      description,
      enabled: true,
      timestamp: Date.now()
    };

    addPipelineStep(step);
    setUndidSteps([]); // Clear redo stack on new action
    
    // Execute the transformation
    // Note: In a real implementation, we'd run the whole pipeline or just the new step.
    // For now, we apply the step to the engine's current state.
    try {
      setLoading(true);
      await executeStep(step);
      toast.success(description);
      await syncDataset();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'application");
      removePipelineStep(step.id);
    } finally {
      setLoading(false);
    }
  };

  const executeStep = async (step: TransformationStep) => {
    // This function will map steps to python code
    let code = '';
    const { column, method, value, newName, formula, targetType, caseType, datePart } = step.params;
    const colRef = column ? `df['${column}']` : '';

    switch (step.type) {
      // Cleaning
      case 'DROP_NA_ROWS':
        code = 'df = df.dropna()';
        break;
      case 'DROP_NA_COLS':
        code = 'df = df.dropna(axis=1)';
        break;
      case 'DROP_DUPLICATES':
        code = 'df = df.drop_duplicates()';
        break;
      case 'STRIP_SPACES':
        code = `${colRef} = ${colRef}.astype(str).str.strip()`;
        break;
      case 'TEXT_CASE':
        if (caseType === 'upper') code = `${colRef} = ${colRef}.astype(str).str.upper()`;
        else if (caseType === 'lower') code = `${colRef} = ${colRef}.astype(str).str.lower()`;
        else if (caseType === 'title') code = `${colRef} = ${colRef}.astype(str).str.title()`;
        break;

      // Missing Values
      case 'REPLACE_NA_MEAN':
        code = `${colRef} = ${colRef}.fillna(${colRef}.mean())`;
        break;
      case 'REPLACE_NA_MEDIAN':
        code = `${colRef} = ${colRef}.fillna(${colRef}.median())`;
        break;
      case 'REPLACE_NA_MODE':
        code = `
mode_val = ${colRef}.mode()
if not mode_val.empty:
    ${colRef} = ${colRef}.fillna(mode_val[0])
`;
        break;
      case 'REPLACE_NA_CUSTOM':
        code = `${colRef} = ${colRef}.fillna(${typeof value === 'string' ? `'${value}'` : value})`;
        break;

      // Transformations
      case 'CONVERT_NUMERIC':
        code = `${colRef} = pd.to_numeric(${colRef}, errors='coerce')`;
        break;
      case 'RENAME_COL':
        code = `df = df.rename(columns={'${column}': '${newName}'})`;
        break;
      case 'ONE_HOT_ENCODE':
        code = `df = pd.get_dummies(df, columns=['${column}'], prefix='${column}')`;
        break;
      case 'NORMALIZE':
        code = `
c = '${column}'
if pd.api.types.is_numeric_dtype(df[c]):
    df[c] = (df[c] - df[c].min()) / (df[c].max() - df[c].min())
`;
        break;
      case 'STANDARDIZE':
        code = `
c = '${column}'
if pd.api.types.is_numeric_dtype(df[c]):
    df[c] = (df[c] - df[c].mean()) / df[c].std()
`;
        break;
      case 'LOG_TRANSFORM':
        code = `import numpy as np\nif pd.api.types.is_numeric_dtype(${colRef}):\n    ${colRef} = np.log1p(${colRef})`;
        break;

      // Creation
      case 'CALC_COLUMN':
        code = `df['${newName}'] = ${formula}`;
        break;
      case 'CONDITIONAL':
        // Simplified conditional: if col > value then x else y
        // We'd need more complex params for a real one, but let's assume simple one for now
        code = `df['${newName}'] = df['${column}'].apply(lambda x: ${value} if x else None)`;
        break;
      case 'CONCAT_COLS':
        const cols = Array.isArray(step.params.columns) ? step.params.columns : [];
        const concatExpr = cols.map((c: string) => `df['${c}'].astype(str)`).join(' + " " + ');
        code = `df['${newName}'] = ${concatExpr}`;
        break;

      // Time
      case 'PARSE_DATE':
        code = `${colRef} = pd.to_datetime(${colRef}, errors='coerce')`;
        break;
      case 'EXTRACT_DATE_PART':
        code = `df['${newName}'] = pd.to_datetime(${colRef}).dt.${datePart}`;
        break;
      case 'CALC_AGE':
        code = `
ref_date = pd.to_datetime('today')
df['${newName}'] = (ref_date - pd.to_datetime(${colRef})).dt.days // 365
`;
        break;

      // Outliers
      case 'OUTLIER_IQR':
        code = `
if pd.api.types.is_numeric_dtype(${colRef}):
    Q1 = ${colRef}.quantile(0.25)
    Q3 = ${colRef}.quantile(0.75)
    IQR = Q3 - Q1
    df = df[(${colRef} >= Q1 - 1.5 * IQR) & (${colRef} <= Q3 + 1.5 * IQR)]
`;
        break;
      case 'OUTLIER_ZSCORE':
        code = `
if pd.api.types.is_numeric_dtype(${colRef}):
    z_scores = (${colRef} - ${colRef}.mean()) / ${colRef}.std()
    df = df[z_scores.abs() <= 3]
`;
        break;

      // Filtering (Simplified)
      case 'SELECT_COLS':
        const selected = Array.isArray(step.params.columns) ? step.params.columns : [];
        if (selected.length > 0) code = `df = df[${JSON.stringify(selected)}]`;
        break;

      default:
        throw new Error(`Type de transformation inconnu: ${step.type}`);
    }
    
    code += '\nlast_result = "ok"';
    const res = await engine.runCode(code);
    if (res.error) throw new Error(res.error);
  };

  const syncDataset = async () => {
    try {
      const code = `
import pandas as pd
column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({
        "name": col, 
        "type": col_type, 
        "missing": int(df[col].isnull().sum()),
        "distinctCount": int(df[col].nunique())
    })
last_result = {"columns": column_info, "rows": len(df), "csv": df.to_csv(index=False)}
`;
      const res = await engine.runCode(code);
      if (res.result) {
        setDataset(datasetName || "Data", res.result.columns, res.result.rows, res.result.csv);
      }
    } catch (err) {
      console.error("Sync error", err);
    }
  };

  const undo = () => {
    if (pipeline.length === 0) return;
    const last = pipeline[pipeline.length - 1];
    setPipeline(pipeline.slice(0, -1));
    setUndidSteps([last, ...undidSteps]);
    // Rewind engine: in a perfect world, we'd reload base data and re-apply enabled steps.
    toast.info("Action annulée (moteur en cours de recalcul)");
    reapplyFullPipeline(pipeline.slice(0, -1));
  };

  const redo = () => {
    if (undidSteps.length === 0) return;
    const next = undidSteps[0];
    setUndidSteps(undidSteps.slice(1));
    addPipelineStep(next);
    toast.info("Action rétablie");
    reapplyFullPipeline([...pipeline, next]);
  };

  const reapplyFullPipeline = async (activePipeline: TransformationStep[]) => {
    setLoading(true);
    try {
      // 1. Reload original data (simplification for this demo)
      // In a real app, we need the initial CSV stored
      const { csvData } = useStore.getState();
      if (csvData) {
        await engine.loadData(csvData);
        // 2. Re-apply all enabled steps
        for (const step of activePipeline) {
          if (step.enabled) {
            await executeStep(step);
          }
        }
        await syncDataset();
      }
    } catch (err) {
      toast.error("Erreur lors de la reconstruction du pipeline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden text-slate-800">
      {/* Top Bar */}
      <header className="h-14 border-b bg-white px-4 flex items-center justify-between shadow-sm shrink-0 z-20">
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={undo} disabled={pipeline.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={redo} disabled={undidSteps.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <Button variant="outline" size="sm" className="hidden lg:flex items-center border-slate-200 text-slate-600 hover:bg-slate-50">
            <Eye className="h-4 w-4 mr-2" /> Aperçu
          </Button>
          <Button variant="outline" size="sm" className="hidden lg:flex items-center border-slate-200 text-slate-600 hover:bg-slate-50">
            <Save className="h-4 w-4 mr-2" /> Sauvegarder pipeline
          </Button>
          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 font-medium" onClick={() => {
            if(window.confirm("Tout réinitialiser ?")) {
                setPipeline([]);
                setUndidSteps([]);
                reapplyFullPipeline([]);
            }
          }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher dans les données..." 
              className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent border focus:bg-white focus:border-indigo-500 rounded-lg text-sm w-64 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center">
            <Download className="h-4 w-4 mr-2" /> Exporter
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ProcessingSidebar 
          onSelectTool={(tool) => setActiveTool(tool)} 
          activeTool={activeTool}
        />

        {/* Central Grid */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-white">
          <div className="flex-1 overflow-hidden">
            <ProcessingTable 
              data={data} 
              loading={loading} 
              searchQuery={searchQuery} 
              onColumnSelect={(col) => setSelectedCol(col)}
              selectedCol={selectedCol}
            />
          </div>

          {/* Bottom Info Bar */}
          <footer className="h-10 border-t bg-slate-50 px-4 flex items-center justify-between text-[11px] font-medium text-slate-500 tracking-tight">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Database className="h-3 w-3 mr-1.5 text-indigo-500" />
                {rowCount} lignes
              </span>
              <span className="flex items-center">
                <Layout className="h-3 w-3 mr-1.5 text-indigo-500" />
                {columns.length} colonnes
              </span>
            </div>
            <div className="flex items-center space-x-2">
                {selectedCol && (
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        Variable sélectionnée : <b className="ml-1 uppercase tracking-wider">{selectedCol}</b>
                    </span>
                )}
            </div>
          </footer>
        </div>

        {/* Right Panel (Properties & Pipeline) */}
        <aside className="w-[340px] flex flex-col border-l bg-slate-50 relative shrink-0">
          {/* Tabs for Right Panel */}
          <div className="flex border-b bg-white">
            <button 
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center border-b-2 transition-colors ${!showPipeline ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              onClick={() => setShowPipeline(false)}
            >
              <Settings className="h-3.5 w-3.5 mr-2" /> Propriétés
            </button>
            <button 
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center border-b-2 transition-colors ${showPipeline ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              onClick={() => setShowPipeline(true)}
            >
              <History className="h-3.5 w-3.5 mr-2" /> Pipeline ({pipeline.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {showPipeline ? (
                <motion.div 
                  key="pipeline"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  <PipelinePanel 
                    pipeline={pipeline} 
                    onRemove={removePipelineStep}
                    onToggle={togglePipelineStep}
                    onReorder={setPipeline}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="properties"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  <PropertiesPanel 
                    tool={activeTool} 
                    selectedCol={selectedCol}
                    onApply={handleApplyTool}
                    columns={columns}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
}
