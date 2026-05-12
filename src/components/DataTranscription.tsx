import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Type, 
  Hash, 
  ListOrdered, 
  Keyboard,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { useTranscriptionStore, Variable, VariableType } from '@/src/store/transcriptionStore';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { toast } from 'sonner';

export function DataTranscription() {
  const { 
    variables, 
    data, 
    addVariable, 
    removeVariable, 
    addDataRow, 
    removeDataRow, 
    setTranscriptionMode 
  } = useTranscriptionStore();
  
  const { setDataset } = useStore();
  
  const [step, setStep] = useState<'variables' | 'entry'>('variables');
  
  // States for new variable
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<VariableType>('numeric');
  const [newVarModalities, setNewVarModalities] = useState<string>('');

  // States for current entry
  const [currentRow, setCurrentRow] = useState<Record<string, any>>({});

  const handleAddVariable = () => {
    if (!newVarName.trim()) {
      toast.error("Le nom de la variable est requis");
      return;
    }
    
    const id = newVarName.toLowerCase().replace(/\s+/g, '_');
    
    if (variables.find(v => v.id === id)) {
      toast.error("Une variable avec ce nom existe déjà");
      return;
    }

    const variable: Variable = {
      id,
      name: newVarName,
      type: newVarType,
      modalities: newVarType === 'categorical' ? newVarModalities.split(',').map(m => m.trim()).filter(m => m) : undefined
    };

    addVariable(variable);
    setNewVarName('');
    setNewVarModalities('');
    toast.success(`Variable "${newVarName}" ajoutée`);
  };

  const handleAddRow = () => {
    // Check if all variables have values (or use null)
    const rowToSave = { ...currentRow };
    addDataRow(rowToSave);
    setCurrentRow({}); // Reset for next entry
    toast.success("Donnée enregistrée");
  };

  const finalizeDataset = async () => {
    if (data.length === 0) {
      toast.error("Aucune donnée saisie");
      return;
    }

    // Convert data to CSV string
    const headers = variables.map(v => v.id).join(',');
    const rows = data.map(row => 
      variables.map(v => {
        const val = row[v.id];
        return val === undefined || val === null ? '' : `"${val}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    
    try {
      const res = await engine.loadData(csvContent);
      if (res.error) {
        toast.error("Erreur moteur : " + res.error);
      } else {
        setDataset("Dataset_Saisi.csv", res.columns, res.rows, csvContent);
        setTranscriptionMode(false);
        toast.success("Dataset prêt pour l'analyse !");
      }
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transcription de Données</h2>
          <p className="text-slate-500 text-sm">Créez votre jeu de données manuellement</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setTranscriptionMode(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
          >
            Annuler
          </button>
          {step === 'variables' && variables.length > 0 && (
            <button 
              onClick={() => setStep('entry')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md shadow-blue-200"
            >
              Passer à la saisie <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 'entry' && (
            <div className="flex gap-2">
              <button 
                onClick={() => setStep('variables')}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Variables
              </button>
              <button 
                onClick={finalizeDataset}
                disabled={data.length === 0}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md shadow-emerald-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Finaliser ({data.length})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Panel: Configuration/Entry */}
        <div className="w-1/2 p-8 border-r border-slate-100 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'variables' ? (
              <motion.div 
                key="step-vars"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-500" /> Ajouter une variable
                  </h3>
                  
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Nom de la variable</label>
                      <input 
                        type="text" 
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        placeholder="ex: Age, CSP, Score..."
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Type de donnée</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setNewVarType('numeric')}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${
                            newVarType === 'numeric' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Hash className="w-4 h-4" /> Quantitatif
                        </button>
                        <button 
                          onClick={() => setNewVarType('categorical')}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${
                            newVarType === 'categorical' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Type className="w-4 h-4" /> Qualitatif
                        </button>
                      </div>
                    </div>

                    {newVarType === 'categorical' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Modalités (séparées par des virgules)</label>
                        <textarea 
                          value={newVarModalities}
                          onChange={(e) => setNewVarModalities(e.target.value)}
                          placeholder="ex: Homme, Femme, Autre"
                          rows={2}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                        />
                      </motion.div>
                    )}

                    <button 
                      onClick={handleAddVariable}
                      className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-emerald-500" /> Structure du dictionnaire
                  </h3>
                  <div className="space-y-2">
                    {variables.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Aucune variable définie pour le moment.</p>
                    ) : (
                      variables.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${v.type === 'numeric' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                              {v.type === 'numeric' ? <Hash className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{v.name}</p>
                              {v.modalities && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                  {v.modalities.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => removeVariable(v.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step-entry"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-blue-500" /> Saisie d'une observation
                  </h3>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Row #{data.length + 1}
                  </span>
                </div>

                <div className="space-y-5">
                  {variables.map((v) => (
                    <div key={v.id} className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                        {v.name}
                        {v.type === 'numeric' ? (
                          <span className="ml-1 text-slate-400 font-normal normal-case italic">(Nombre)</span>
                        ) : (
                          <span className="ml-1 text-slate-400 font-normal normal-case italic">(Choix)</span>
                        )}
                      </label>
                      
                      {v.type === 'categorical' && v.modalities ? (
                        <div className="flex flex-wrap gap-2">
                          {v.modalities.map(mod => (
                            <button
                              key={mod}
                              onClick={() => setCurrentRow({ ...currentRow, [v.id]: mod })}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                                currentRow[v.id] === mod
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {mod}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input 
                          type="number"
                          value={currentRow[v.id] || ''}
                          onChange={(e) => setCurrentRow({ ...currentRow, [v.id]: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none"
                          placeholder="0.00"
                        />
                      )}
                    </div>
                  ))}

                  <button 
                    onClick={handleAddRow}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-100"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Enregistrer l'observation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel: Preview Table */}
        <div className="w-1/2 bg-slate-50/30 p-8 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-indigo-500" /> Aperçu des données ({data.length})
            </h3>
            
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                      {variables.map(v => (
                        <th key={v.id} className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase min-w-[100px]">
                          {v.name}
                        </th>
                      ))}
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={variables.length + 2} className="px-4 py-8 text-center text-slate-400 italic">
                          Aucune observation enregistrée
                        </td>
                      </tr>
                    ) : (
                      data.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          {variables.map(v => (
                            <td key={v.id} className="px-4 py-2 text-slate-700">
                              {row[v.id] || '-'}
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            <button onClick={() => removeDataRow(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {data.length > 0 && (
              <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest bg-slate-100 py-1 rounded">
                Données collectées localement
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
