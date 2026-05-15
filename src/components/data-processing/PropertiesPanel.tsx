import React, { useState, useEffect } from 'react';
import { ColumnInfo } from '../../store';
import { Button } from '../ui/button';
import { Play, Info, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface PropertiesPanelProps {
  tool: any;
  selectedCol: string | null;
  columns: ColumnInfo[];
  onApply: (type: string, category: string, params: any, description: string) => void;
}

export function PropertiesPanel({ tool, selectedCol, columns, onApply }: PropertiesPanelProps) {
  const [params, setParams] = useState<any>({});

  useEffect(() => {
    // Reset params when tool changes
    if (tool) {
      const initial: any = {};
      
      // Inherit selected column from table click if applicable
      const requiresCol = !['cleaning', 'reshaping', 'ai'].includes(tool.category) || ['STRIP_SPACES', 'TEXT_CASE'].includes(tool.id);
      if (requiresCol && selectedCol) {
        initial.column = selectedCol;
      }
      
      // Default params by tool type
      if (tool.id.includes('REPLACE_NA')) {
        initial.value = '0';
      }
      if (tool.id === 'TEXT_CASE') {
        initial.caseType = 'upper';
      }
      if (tool.id === 'CALC_COLUMN') {
        initial.newName = 'Nouvelle_variable';
        initial.formula = '';
      }
      if (tool.id === 'CONCAT_COLS') {
        initial.newName = 'Concat_result';
        initial.columns = selectedCol ? [selectedCol] : [];
      }
      if (tool.id === 'EXTRACT_DATE_PART') {
        initial.datePart = 'year';
        initial.newName = selectedCol ? `${selectedCol}_year` : 'date_part';
      }
      
      setParams(initial);
    }
  }, [tool, selectedCol]);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
        <Sparkles className="h-10 w-10 mb-4 opacity-20" />
        <p className="text-xs font-medium">Sélectionnez un outil dans la barre latérale pour configurer ses propriétés.</p>
      </div>
    );
  }

  const requiresColumn = !['cleaning', 'reshaping', 'ai'].includes(tool.category) || ['STRIP_SPACES', 'TEXT_CASE'].includes(tool.id);
  const isReady = !requiresColumn || (params.column || (Array.isArray(params.columns) && params.columns.length > 0));

  const handleApply = () => {
    if (!isReady) {
      toast.error("Veuillez sélectionner une variable cible");
      return;
    }
    
    let description = tool.name;
    if (params.column) description += ` sur ${params.column}`;
    else if (params.columns && params.columns.length > 0) description += ` sur ${params.columns.join(', ')}`;
    
    if (params.newName) description += ` ➔ ${params.newName}`;
    
    onApply(tool.id, tool.category, params, description);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner border border-indigo-100/50">
                 <SettingsIcon className="h-4.5 w-4.5" />
            </div>
            <div>
                 <h3 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none mb-1">{tool.name}</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">{tool.category.replace('_', ' ')}</p>
            </div>
        </div>

        <div className="space-y-5">
          {/* Automatic Column Selection if tool targets a column */}
          {requiresColumn && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center justify-between">
                Variable cible
                {!params.column && <span className="text-[9px] text-red-500 normal-case font-medium flex items-center">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" /> Requis
                </span>}
              </label>
              <select 
                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none transition-all ${!params.column ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                value={params.column || ''}
                onChange={e => setParams({ ...params, column: e.target.value })}
              >
                <option value="">Sélectionner une variable...</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Dynamic properties based on tool type */}
          {tool.id === 'TEXT_CASE' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Casse souhaitée</label>
              <div className="grid grid-cols-3 gap-2">
                {['upper', 'lower', 'title'].map(type => (
                  <button
                    key={type}
                    onClick={() => setParams({ ...params, caseType: type })}
                    className={`text-[11px] font-bold py-2 rounded-lg border transition-all ${params.caseType === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}
                  >
                    {type === 'upper' ? 'MAJ' : type === 'lower' ? 'min' : 'Abc'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool.id === 'EXTRACT_DATE_PART' && (
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Partie à extraire</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                  value={params.datePart || 'year'}
                  onChange={e => setParams({ ...params, datePart: e.target.value, newName: params.column ? `${params.column}_${e.target.value}` : params.newName })}
                >
                  <option value="year">Année</option>
                  <option value="month">Mois</option>
                  <option value="day">Jour</option>
                  <option value="hour">Heure</option>
                  <option value="dayofweek">Jour de la semaine</option>
                </select>
             </div>
          )}

          {tool.id === 'REPLACE_NA_CUSTOM' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Valeur de remplacement</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                value={params.value || ''}
                onChange={e => setParams({ ...params, value: e.target.value })}
                placeholder="Ex: 0, Inconnu, N/A..."
              />
            </div>
          )}

          {tool.id === 'CALC_COLUMN' && (
            <>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nom de la variable</label>
                    <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700"
                        value={params.newName || ''}
                        onChange={e => setParams({ ...params, newName: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Formule (Python/Pandas)</label>
                    <textarea 
                        className="w-full h-32 bg-slate-900 text-indigo-300 font-mono text-[11px] p-4 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-500/40"
                        placeholder="Ex: Age * 2 + 10"
                        value={params.formula || ''}
                        onChange={e => setParams({ ...params, formula: e.target.value })}
                    />
                    <div className="flex items-center text-[10px] text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <Info className="h-3 w-3 mr-2 text-indigo-400 shrink-0" />
                        Accédez aux variables par leur nom direct. Les noms composés nécessitent des guillemets : df['Mon Variable'].
                    </div>
                </div>
            </>
          )}

          {/* New names for renaming or creating variables */}
          {(tool.id === 'RENAME_COL' || ['EXTRACT_DATE_PART', 'LOG_TRANSFORM'].includes(tool.id)) && (
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Résultat (Nom variable)</label>
                <input 
                    type="text" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-indigo-600 shadow-sm"
                    value={params.newName || ''}
                    onChange={e => setParams({ ...params, newName: e.target.value })}
                />
             </div>
          )}

          {/* Categories descriptions/tips */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mt-6 shadow-sm shadow-amber-900/5">
             <div className="flex items-start">
               <AlertCircle className="h-4 w-4 text-amber-500 mr-3 mt-0.5 shrink-0" />
               <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Cette transformation modifiera votre jeu de données. Elle sera enregistrée dans votre historique de traitement (pipeline).
               </p>
             </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
         <Button 
            className={`w-full h-14 rounded-2xl font-extrabold shadow-lg transition-all flex items-center justify-center group ${isReady ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 translate-y-0' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            onClick={handleApply}
            disabled={!isReady}
         >
            Appliquer la transformation
            <Play className={`h-4 w-4 ml-2 transition-transform ${isReady ? 'group-hover:translate-x-1' : ''}`} />
         </Button>
      </div>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
