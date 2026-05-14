import React, { useState } from 'react';
import { useStore, ResultItem, isDesktop } from '@/store';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Trash2, Code, Copy, ChevronDown, ChevronRight, Library, TerminalSquare, Download } from 'lucide-react';
import { Button } from './ui/button';
import Plot from 'react-plotly.js';
import { toast } from 'sonner';

export function ResultsArea() {
  const { results, clearResults } = useStore();
  const [expandedCode, setExpandedCode] = useState<Record<string, boolean>>({});

  const toggleCode = (id: string) => {
    setExpandedCode(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, msg = 'Code copié') => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const copyTable = async (e: React.MouseEvent) => {
    const table = e.currentTarget.closest('.border-slate-200')?.querySelector('table');
    if (table) {
      try {
        const blobHtml = new Blob([table.outerHTML], { type: 'text/html' });
        const blobText = new Blob([table.innerText], { type: 'text/plain' });
        const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
        await navigator.clipboard.write(data);
        toast.success('Tableau copié avec formatage (prêt pour Excel/Word)');
      } catch (err) {
        // Fallback for browsers that don't support ClipboardItem or have issues
        navigator.clipboard.writeText(table.innerText);
        toast.success('Tableau copié (format texte)');
      }
    }
  };

  const exportSingleResultHTML = async (res: ResultItem) => {
    try {
      let content = res.output;
      let scripts = '';
      
      if (content.includes('__PLOTLY_JSON_START__')) {
          const parts = content.split('__PLOTLY_JSON_START__');
          content = parts[0];
          
          parts.slice(1).forEach((part, chartIdx) => {
              const [jsonString, ...htmlParts] = part.split('__PLOTLY_JSON_END__');
              const afterHtml = htmlParts.join('__PLOTLY_JSON_END__');
              const chartId = `plotly-chart-${res.id}-${chartIdx}`;
              
              content += `<div id="${chartId}" style="width:100%; max-width:800px; height: 500px; margin: 20px auto;"></div>`;
              if (afterHtml && afterHtml.trim()) {
                  content += afterHtml;
              }
              
              scripts += `
              <script>
                  window.onload = function() {
                      var data = ${jsonString};
                      var layout = data.layout || {};
                      layout.autosize = true;
                      Plotly.newPlot('${chartId}', data.data, layout, {responsive: true});
                  };
              </script>
              `;
          });
      }

      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${res.title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: white; color: #1e293b; max-width: 900px; margin: 0 auto; }
        h1 { color: #2563eb; font-size: 1.5em; margin-bottom: 2em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5em; }
        pre { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; padding: 15px; font-family: 'Courier New', Courier, monospace; font-size: 0.9em; border-radius: 6px; overflow-x: auto; }
        table { border-collapse: collapse; margin-bottom: 20px; width: 100%; border: 1px solid #e2e8f0; font-size: 0.95em; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
    </style>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <h1>${res.title}</h1>
    <div>${content}</div>
    ${scripts}
</body>
</html>`;

      const filename = `${res.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.html`;

      if (isDesktop()) {
        const result = await (window as any).pywebview.api.save_file_dialog(htmlContent, filename);
        if (result.success) {
          toast.success(`Enregistré : ${result.path}`, {
            action: {
              label: 'Ouvrir',
              onClick: () => (window as any).pywebview.api.open_file(result.path)
            },
            cancel: {
              label: 'Dossier',
              onClick: () => (window as any).pywebview.api.open_folder(result.path)
            }
          });
        } else if (result.error && result.error !== 'Cancelled') {
          toast.error("Erreur d'export: " + result.error);
        }
        return;
      }

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Résultat exporté (HTML)");
    } catch (err: any) {
      toast.error("Erreur d'export: " + err.message);
    }
  };

  const extractLibraries = (code: string) => {
    const lines = code.split('\n');
    const libs: string[] = [];
    lines.forEach(line => {
      const match = line.match(/^\s*(?:import|from)\s+([a-zA-Z0-9_.]+)/);
      if (match) {
        const lib = match[1].split('.')[0];
        if (!libs.includes(lib)) libs.push(lib);
      }
    });
    return libs;
  };

  const renderContent = (res: ResultItem) => {
    if (!res.output) return <span className="italic text-slate-400">No output</span>;
    
    if (res.output.includes('__PLOTLY_JSON_START__')) {
       // Support multiple plots
       const parts = res.output.split('__PLOTLY_JSON_START__');
       const beforeHtml = parts[0];
       
       return (
            <div className="w-full overflow-hidden space-y-4">
              {beforeHtml && <div dangerouslySetInnerHTML={{ __html: beforeHtml }} className="mb-4" />}
              
              {parts.slice(1).map((part, idx) => {
                 const [jsonString, ...htmlParts] = part.split('__PLOTLY_JSON_END__');
                 const afterHtml = htmlParts.join('__PLOTLY_JSON_END__'); 
                 
                 try {
                    const plotData = JSON.parse(jsonString);
                    return (
                      <React.Fragment key={idx}>
                        <div className="w-full overflow-x-auto">
                          <Plot 
                            data={plotData.data} 
                            layout={{...plotData.layout, autosize: true, margin: { t: 40, r: 20, l: 40, b: 40 }}} 
                            useResizeHandler={true}
                            style={{ width: '100%', minHeight: '400px' }}
                            config={{ 
                              responsive: true, 
                              displayModeBar: true,
                              modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                              toImageButtonOptions: {
                                format: 'png',
                                filename: 'nuru_analytics_plot',
                                height: 500,
                                width: 700,
                                scale: 2
                              }
                            }}
                          />
                        </div>
                        {afterHtml && afterHtml.trim() && (
                           <div dangerouslySetInnerHTML={{ __html: afterHtml }} className="mt-4 results-content overflow-x-auto" />
                        )}
                      </React.Fragment>
                    );
                 } catch(e) {
                    return <div key={idx} className="text-red-500">Error parsing plot data</div>;
                 }
              })}
            </div>
       );
    }

    return (
      <div className="w-full">
         <div dangerouslySetInnerHTML={{ __html: res.output }} className="results-content overflow-x-auto" />
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic bg-white p-8">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
           <TerminalSquare className="w-6 h-6 text-slate-300" />
        </div>
        <p>Lancez une analyse ou exécutez du code pour voir les résultats ici.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white">
      <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50 shrink-0">
        <h3 className="font-semibold text-slate-700">Résultats des analyses</h3>
        <Button variant="ghost" size="sm" onClick={clearResults} className="h-8 text-slate-500 hover:text-red-600">
          <Trash2 className="w-4 h-4 mr-2" /> Tout effacer
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0 w-full overflow-hidden">
         <div className="p-6 space-y-8 pb-10 max-w-full">
           {results.map((res) => {
             const libraries = res.libraries || extractLibraries(res.code);
             return (
               <div key={res.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md block w-full">
                 <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-700 border-b flex justify-between items-center sticky left-0 w-full">
                    <span>{res.title}</span>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => exportSingleResultHTML(res)} className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600">
                        <Download className="w-3.5 h-3.5 mr-1" /> Exporter
                      </Button>
                      <Button variant="ghost" size="sm" onClick={copyTable} className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600" title="Copier les tableaux">
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copier Table
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(res.code)} className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600">
                        <Code className="w-3.5 h-3.5 mr-1" /> Code
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleCode(res.id)} className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600">
                        {expandedCode[res.id] ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                        {expandedCode[res.id] ? 'Masquer' : 'Afficher'}
                      </Button>
                    </div>
                 </div>

                 {expandedCode[res.id] && (
                   <div className="bg-slate-900 p-4 font-mono text-xs overflow-x-auto text-blue-200 border-b">
                     <div className="flex items-center mb-2 text-slate-500 font-sans tracking-wide uppercase text-[10px] font-bold sticky left-0">
                       <Library className="w-3 h-3 mr-1" />
                       Libs: {libraries.length > 0 ? libraries.join(', ') : 'standard'}
                     </div>
                     <pre className="whitespace-pre-wrap">{res.code}</pre>
                   </div>
                 )}

                 <div className="p-5 overflow-auto max-w-full text-sm text-slate-800">
                   {renderContent(res)}
                 </div>
               </div>
             );
           })}
         </div>
         <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

