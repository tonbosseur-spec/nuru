import React, { useEffect, useState } from 'react';
import { useStore } from '@/src/store';
import { useTranscriptionStore } from '@/src/store/transcriptionStore';
import { engine } from '@/src/lib/pythonEngine';
import { DataImport } from '../DataImport';
import { DataTabView } from '../DataTabView';
import { DataTranscription } from '../DataTranscription';
import { AnalysisAssistant } from '../AnalysisAssistant';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Home, Edit2, Save, Zap, Sparkles } from 'lucide-react';

import { DescriptiveArea } from '../areas/DescriptiveArea';
import { TestsArea } from '../areas/TestsArea';
import { RegressionArea } from '../areas/RegressionArea';
import { ChartsArea } from '../areas/ChartsArea';
import { PythonCodeViewer } from '../areas/PythonCodeViewer';
import { ExportArea } from '../areas/ExportArea';

export function AppLayout() {
  const { 
    isEngineReady, 
    engineStatus, 
    datasetName, 
    workspaceName,
    updateWorkspaceName,
    closeWorkspace
  } = useStore();
  const { isTranscriptionMode } = useTranscriptionStore();
  const [activeTab, setActiveTab] = useState('fichier');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    engine.init();
  }, []);

  const handleNameSave = () => {
    if (tempName.trim()) {
      updateWorkspaceName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const renderContent = () => {
    if (isTranscriptionMode) {
      return (
        <div className="p-8 h-full overflow-y-auto">
          <DataTranscription />
        </div>
      );
    }

    switch (activeTab) {
      case 'fichier': return <div className="p-8"><DataImport /></div>;
      case 'donnees': return <DataTabView />;
      case 'assistant': return <div className="py-8"><AnalysisAssistant onNavigation={(tab) => setActiveTab(tab)} /></div>;
      case 'descriptives': return <DescriptiveArea />;
      case 'tests': return <TestsArea />;
      case 'regression': return <RegressionArea />;
      case 'graphiques': return <ChartsArea />;
      case 'code': return <PythonCodeViewer />;
      case 'export': return <ExportArea />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 flex-col overflow-hidden font-sans">
      <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={closeWorkspace} title="Accueil" className="mr-2">
            <Home className="w-5 h-5 text-slate-600" />
          </Button>
          
          <div className="font-bold text-lg text-slate-800 tracking-tight flex items-center">
            <div className="bg-indigo-600 text-white p-1.25 rounded-lg shrink-0 flex items-center justify-center mr-2.5 shadow-sm">
               <Zap className="w-4.5 h-4.5 fill-current" />
            </div>
            Nuru Analytics
          </div>

          {isEditingName ? (
            <div className="flex items-center space-x-2">
              <input 
                autoFocus
                className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                onBlur={handleNameSave}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onMouseDown={e => { e.preventDefault(); handleNameSave(); }}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center group cursor-pointer" onClick={() => { setTempName(workspaceName); setIsEditingName(true); }}>
              <span className="font-medium text-slate-700">{workspaceName}</span>
              <Edit2 className="w-3 h-3 ml-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          {datasetName ? (
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-slate-600 hidden md:block">
                 Dataset: <span className="ml-2 px-2 py-1 bg-slate-100 rounded text-slate-900 border">{datasetName}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">Aucun jeu de données chargé</div>
          )}
        </div>
        <div className="flex items-center space-x-3 text-sm">
           <div className="flex items-center">
             <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isEngineReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
             <span className="text-slate-600 hidden sm:inline">{engineStatus}</span>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left menu */}
        <aside className="w-52 border-r bg-white flex flex-col z-0 shrink-0 shadow-sm">
          <nav className="p-3 space-y-0.5">
            <button onClick={() => setActiveTab('fichier')} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${activeTab === 'fichier' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Fichier</button>
            <button onClick={() => setActiveTab('donnees')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'donnees' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Données</button>
            
            <div className="py-2 px-3">
               <div className="h-px bg-slate-100"></div>
            </div>

            <button 
              onClick={() => setActiveTab('assistant')} 
              disabled={!datasetName} 
              className={`w-full flex items-center px-3 py-2 text-[11px] uppercase tracking-widest rounded-xl transition-all duration-300 ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'assistant' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-100 scale-105' : 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 font-bold border border-indigo-100'}`}
            >
              <Sparkles className={`w-3.5 h-3.5 mr-2 ${activeTab === 'assistant' ? 'animate-pulse' : ''}`} />
              Assistant
            </button>

            <div className="py-2 px-3">
               <div className="h-px bg-slate-100"></div>
            </div>

            <button onClick={() => setActiveTab('descriptives')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'descriptives' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Descriptives</button>
            <button onClick={() => setActiveTab('tests')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'tests' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Tests statistiques</button>
            <button onClick={() => setActiveTab('regression')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'regression' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Régression</button>
            <button onClick={() => setActiveTab('graphiques')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'graphiques' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Graphiques</button>
            <button onClick={() => setActiveTab('code')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'code' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Code Python</button>
            <button onClick={() => setActiveTab('export')} disabled={!datasetName} className={`w-full flex items-center px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-md ${!datasetName ? 'opacity-50 cursor-not-allowed' : activeTab === 'export' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>Export</button>
          </nav>
        </aside>

        {/* Center Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
          {renderContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
