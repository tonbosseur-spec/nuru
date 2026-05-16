import React, { useState, useEffect } from 'react';
import { ColumnInfo } from '../../store';
import { Button } from '../ui/button';
import { Play, Info, AlertCircle, Sparkles, Settings as SettingsIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface PropertiesPanelProps {
  tool: any;
  selectedCol: string | null;
  columns: ColumnInfo[];
  onApply: (type: string, category: string, params: any, description: string) => void;
}

export function PropertiesPanel({ tool, selectedCol, columns, onApply }: PropertiesPanelProps) {
  const [params, setParams] = useState<any>({});
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false);

  useEffect(() => {
    // Reset params when tool changes
    if (tool) {
      const initial: any = {};
      
      // Inherit selected column from table click if applicable
      const requiresCol = !['reshaping', 'ai'].includes(tool.category) && !['FILTER_COMPLEX', 'SELECT_COLS', 'SORT_MULTI'].includes(tool.id);
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
      if (tool.id === 'CONDITIONAL') {
        initial.newName = 'Nouvelle_variable';
        initial.operator = '>';
        initial.trueValue = '1';
        initial.falseValue = '0';
      }
      if (tool.id === 'GROUP_BY') {
        initial.columns = selectedCol ? [selectedCol] : [];
        initial.aggFunc = 'mean';
      }
      if (tool.id === 'PIVOT_TABLE') {
        initial.aggFunc = 'mean';
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

  const isAdvancedTool = ['FILTER_COMPLEX', 'CONDITIONAL', 'GROUP_BY', 'PIVOT_TABLE', 'SORT_MULTI', 'SELECT_COLS'].includes(tool.id);
  const requiresColumn = !['reshaping', 'ai'].includes(tool.category) && !['FILTER_COMPLEX', 'SELECT_COLS', 'SORT_MULTI', 'CONCAT_COLS'].includes(tool.id);
  
  const isReady = () => {
     if (isAdvancedTool) return true; // Handled in their own logic or assumes default works initially
     if (['CONCAT_COLS'].includes(tool.id)) return params.columns && params.columns.length > 0;
     if (requiresColumn) return !!params.column;
     return true;
  };

  const handleApply = () => {
    if (!isReady()) {
      toast.error("Veuillez sélectionner une variable cible");
      return;
    }
    
    let description = tool.name;
    if (params.column) description += ` sur ${params.column}`;
    else if (params.columns && params.columns.length > 0) description += ` sur ${params.columns.join(', ')}`;
    else if (params.queryString) description += ` (${params.queryString})`;
    
    if (params.newName) description += ` ➔ ${params.newName}`;
    
    onApply(tool.id, tool.category, params, description);
    setShowAdvancedPopup(false);
  };

  const renderAdvancedParams = () => {
     return (
       <div className="space-y-4">
         {tool.id === 'FILTER_COMPLEX' && (
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Requête (Pandas Query)</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={params.queryString || ''}
                onChange={e => setParams({ ...params, queryString: e.target.value })}
                placeholder="Ex: Age > 30 et Revenu < 50000"
              />
              <p className="text-[10px] text-slate-500">Utilisez la syntaxe Python: `Age &gt; 30 &amp; Rev &lt; 50000`</p>
           </div>
         )}
         
         {tool.id === 'CONDITIONAL' && (
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700">Condition sur la colonne</label>
                 <select 
                   className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                   value={params.column || ''}
                   onChange={e => setParams({ ...params, column: e.target.value })}
                 >
                   <option value="">Sélectionner une variable...</option>
                   {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Opérateur</label>
                    <select 
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                      value={params.operator || '>'}
                      onChange={e => setParams({ ...params, operator: e.target.value })}
                    >
                      <option value=">">&gt; Supérieur</option>
                      <option value="<">&lt; Inférieur</option>
                      <option value="==">== Égal</option>
                      <option value="!=">!= Différent</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valeur seuil</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                      value={params.value || ''}
                      onChange={e => setParams({ ...params, value: e.target.value })}
                    />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valeur si Vrai</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                      value={params.trueValue || ''}
                      onChange={e => setParams({ ...params, trueValue: e.target.value })}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valeur si Faux</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                      value={params.falseValue || ''}
                      onChange={e => setParams({ ...params, falseValue: e.target.value })}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700">Nom de la nouvelle variable</label>
                 <input 
                    type="text" 
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                    value={params.newName || ''}
                    onChange={e => setParams({ ...params, newName: e.target.value })}
                 />
              </div>
           </div>
         )}
         
         {tool.id === 'GROUP_BY' && (
           <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Grouper par</label>
                <div className="flex flex-wrap gap-2">
                  {columns.map(c => (
                    <button
                      key={c.name}
                      onClick={() => {
                        const cols = params.columns || [];
                        if (cols.includes(c.name)) setParams({ ...params, columns: cols.filter((x: string) => x !== c.name) });
                        else setParams({ ...params, columns: [...cols, c.name] });
                      }}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${params.columns?.includes(c.name) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Fonction d'agrégation</label>
                <select 
                  className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                  value={params.aggFunc || 'mean'}
                  onChange={e => setParams({ ...params, aggFunc: e.target.value })}
                >
                  <option value="mean">Moyenne</option>
                  <option value="sum">Somme</option>
                  <option value="count">Nombre</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
             </div>
           </div>
         )}

         {tool.id === 'PIVOT_TABLE' && (
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700">Index (Lignes)</label>
                 <select 
                   className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                   value={params.indexCol || ''}
                   onChange={e => setParams({ ...params, indexCol: e.target.value })}
                 >
                   <option value="">Sélectionner...</option>
                   {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700">Valeurs</label>
                 <select 
                   className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                   value={params.valueCol || ''}
                   onChange={e => setParams({ ...params, valueCol: e.target.value })}
                 >
                   <option value="">Sélectionner...</option>
                   {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Fonction</label>
                <select 
                  className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm"
                  value={params.aggFunc || 'mean'}
                  onChange={e => setParams({ ...params, aggFunc: e.target.value })}
                >
                  <option value="mean">Moyenne</option>
                  <option value="sum">Somme</option>
                  <option value="count">Nombre</option>
                </select>
             </div>
           </div>
         )}

         {(tool.id === 'SELECT_COLS' || tool.id === 'SORT_MULTI' || tool.id === 'CONCAT_COLS') && (
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700">
                  {tool.id === 'CONCAT_COLS' ? 'Colonnes à concaténer' : 
                   tool.id === 'SORT_MULTI' ? 'Trier par' : 
                   'Colonnes à conserver'}
               </label>
               <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                  {columns.map(c => (
                    <button
                      key={c.name}
                      onClick={() => {
                        const cols = params.columns || [];
                        if (cols.includes(c.name)) setParams({ ...params, columns: cols.filter((x: string) => x !== c.name) });
                        else setParams({ ...params, columns: [...cols, c.name] });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${params.columns?.includes(c.name) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      {c.name}
                    </button>
                  ))}
               </div>
               
               {tool.id === 'SORT_MULTI' && (
                 <div className="mt-4 flex items-center space-x-3">
                   <label className="text-xs font-bold text-slate-700">Ordre :</label>
                   <select 
                     className="bg-slate-50 border rounded-lg px-3 py-1.5 text-sm"
                     value={params.ascending === false ? 'false' : 'true'}
                     onChange={e => setParams({ ...params, ascending: e.target.value === 'true' })}
                   >
                     <option value="true">Croissant</option>
                     <option value="false">Décroissant</option>
                   </select>
                 </div>
               )}

               {tool.id === 'CONCAT_COLS' && (
                  <div className="mt-4 space-y-2">
                     <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Résultat (Nom variable)</label>
                     <input 
                         type="text" 
                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-indigo-600 shadow-sm"
                         value={params.newName || ''}
                         onChange={e => setParams({ ...params, newName: e.target.value })}
                     />
                  </div>
               )}
            </div>
         )}
       </div>
     );
  };

  return (
    <>
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
            {/* Automatic Column Selection if tool targets a single column specifically and isn't an advanced tool */}
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

            {isAdvancedTool ? (
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  onClick={() => setShowAdvancedPopup(true)}
                >
                  Configurer les paramètres
                </Button>
              </div>
            ) : (
              // Inline standard tools settings
              <>
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
              </>
            )}

            {/* Categories descriptions/tips */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mt-6 shadow-sm shadow-amber-900/5">
               <div className="flex items-start">
                 <AlertCircle className="h-4 w-4 text-amber-500 mr-3 mt-0.5 shrink-0" />
                 <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Cette transformation modifiera votre jeu de données. Elle sera enregistrée dans votre pipeline.
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6">
           <Button 
              className={`w-full h-14 rounded-2xl font-extrabold shadow-lg transition-all flex items-center justify-center group ${isReady() ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 translate-y-0' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              onClick={handleApply}
              disabled={!isReady()}
           >
              Appliquer la transformation
              <Play className={`h-4 w-4 ml-2 transition-transform ${isReady() ? 'group-hover:translate-x-1' : ''}`} />
           </Button>
        </div>
      </div>

      {showAdvancedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                 <div className="p-2 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg">
                    <SettingsIcon className="h-4 w-4" />
                 </div>
                 <h2 className="text-sm font-bold text-slate-800">Configuration : {tool.name}</h2>
              </div>
              <button 
                onClick={() => setShowAdvancedPopup(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
               >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {renderAdvancedParams()}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
               <Button variant="outline" onClick={() => setShowAdvancedPopup(false)}>
                 Annuler
               </Button>
               <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                 Confirmer & Appliquer
               </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


