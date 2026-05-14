import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { engine } from '@/lib/pythonEngine';
import { DataImport } from '../DataImport';
import { DataTabView } from '../DataTabView';
import { DataTranscription } from '../DataTranscription';
import { AnalysisAssistant } from '../AnalysisAssistant';
import { Toaster } from '../ui/sonner';
import { Button } from '../ui/button';
import { Home, Edit2, Save, Zap, Sparkles, FileLineChart, Table2, FolderOpen, TerminalSquare, PieChart, Activity, Download, FileText, Component, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

import { DescriptiveArea } from '../areas/DescriptiveArea';
import { TestsArea } from '../areas/TestsArea';
import { RegressionArea } from '../areas/RegressionArea';
import { ChartsArea } from '../areas/ChartsArea';
import { PythonCodeViewer } from '../areas/PythonCodeViewer';
import { ExportArea } from '../areas/ExportArea';
import { ResultsArea } from '../ResultsArea';

export function AppLayout() {
  const { 
    isEngineReady, 
    engineStatus, 
    datasetName, 
    workspaceName,
    updateWorkspaceName,
    closeWorkspace,
    activeTab,
    setActiveTab,
    exportWorkspaceAsFile
  } = useStore();
  const { isTranscriptionMode } = useTranscriptionStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    engine.init();
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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
      case 'assistant': return <div className="p-8 h-full overflow-y-auto"><AnalysisAssistant onNavigation={(tab) => setActiveTab(tab)} /></div>;
      case 'descriptives': return <DescriptiveArea />;
      case 'tests': return <TestsArea />;
      case 'regression': return <RegressionArea />;
      case 'graphiques': return <ChartsArea />;
      case 'resultats': return <div className="p-6 h-full overflow-hidden flex flex-col"><div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"><ResultsArea /></div></div>;
      case 'code': return <PythonCodeViewer />;
      case 'export': return <ExportArea />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 flex-col overflow-hidden font-sans">
      <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"} className="mr-2">
            <Menu className="w-5 h-5 text-slate-600" />
          </Button>

          <Button variant="ghost" size="icon" onClick={closeWorkspace} title="Accueil" className="mr-2 hidden md:flex">
            <Home className="w-5 h-5 text-slate-600" />
          </Button>
          
          <div className="font-bold text-lg text-slate-800 tracking-tight flex items-center">
            <div className="bg-indigo-600 text-white p-1.25 rounded-lg shrink-0 flex items-center justify-center mr-2.5 shadow-sm">
               <Zap className="w-4.5 h-4.5 fill-current" />
            </div>
            <span className="hidden sm:inline">Nuru Analytics</span>
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
           <Button 
             variant="outline" 
             size="sm" 
             onClick={exportWorkspaceAsFile}
             className="hidden md:flex items-center text-slate-600 border-slate-200 hover:bg-slate-50 mr-2"
           >
             <Save className="w-4 h-4 mr-2" />
             Enregistrer .nra
           </Button>

           <div className="flex items-center">
             <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isEngineReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
             <span className="text-slate-600 hidden sm:inline">{engineStatus}</span>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left menu */}
        <aside className={`bg-[#f3f3f3] border-r border-[#e5e5e5] flex flex-col z-0 shrink-0 transition-all duration-300 absolute md:relative h-full ${isSidebarOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full md:w-16 md:translate-x-0'} z-20`}>
          <div className={`flex-1 overflow-y-auto ${isSidebarOpen ? 'px-3' : 'px-2'} py-4 space-y-6 transition-all duration-300`}>
            
            {/* Group: Espace de travail */}
            <div>
              <div className={`px-3 mb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>Espace de travail</div>
              <div className="space-y-0.5">
                <button onClick={() => setActiveTab('fichier')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'fichier' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Importer" : ""}>
                  <FolderOpen className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Importer</span>}
                </button>
                <button onClick={() => setActiveTab('donnees')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'donnees' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Données" : ""}>
                  <Table2 className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Données</span>}
                </button>
                <button onClick={() => setActiveTab('code')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'code' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Code source" : ""}>
                  <TerminalSquare className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Code source</span>}
                </button>
              </div>
            </div>

            {/* Group: Analyses Statistiques */}
            <div>
              <div className={`px-3 mb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>Analyses</div>
              <div className="space-y-0.5">
                <button onClick={() => setActiveTab('descriptives')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'descriptives' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Descriptives" : ""}>
                  <FileText className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Descriptives</span>}
                </button>
                <button onClick={() => setActiveTab('tests')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'tests' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Tests d'hypothèses" : ""}>
                  <Activity className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Tests d'hypothèses</span>}
                </button>
                <button onClick={() => setActiveTab('regression')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'regression' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Régressions" : ""}>
                  <FileLineChart className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Régressions</span>}
                </button>
                <button onClick={() => setActiveTab('graphiques')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'graphiques' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Graphiques" : ""}>
                  <PieChart className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Graphiques</span>}
                </button>
              </div>
            </div>

            {/* Group: Sorties */}
            <div>
              <div className={`px-3 mb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>Sorties</div>
              <div className="space-y-0.5">
                <button onClick={() => setActiveTab('resultats')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'resultats' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Résultats" : ""}>
                  <TerminalSquare className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Résultats</span>}
                </button>
                <button onClick={() => setActiveTab('export')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'export' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Exporter" : ""}>
                  <Download className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Exporter</span>}
                </button>
              </div>
            </div>

            {/* Group: IA */}
            <div>
              <div className={`px-3 mb-1 text-[11px] font-semibold text-indigo-500 uppercase tracking-wide flex items-center truncate transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
                <Sparkles className="w-3 h-3 mr-1" /> {isSidebarOpen && "Outils AI"}
              </div>
              <div className="space-y-0.5">
                <button onClick={() => setActiveTab('assistant')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 justify-start' : 'justify-center'} py-1.5 text-[13px] rounded-md transition-all ${activeTab === 'assistant' ? 'bg-[#e0e0e0] font-medium text-slate-900' : 'text-slate-700 hover:bg-[#ebebeb]'}`} title={!isSidebarOpen ? "Assistant d'analyse" : ""}>
                  <Component className={`w-4 h-4 opacity-70 shrink-0 ${isSidebarOpen ? 'mr-2.5' : ''}`} /> 
                  {isSidebarOpen && <span className="truncate">Assistant d'analyse</span>}
                </button>
              </div>
            </div>

          </div>
        </aside>

        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-10 md:hidden" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}

        {/* Center Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
          {renderContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
