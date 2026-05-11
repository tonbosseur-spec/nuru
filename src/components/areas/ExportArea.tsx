import React from 'react';
import { useStore, getWorkspace } from '@/src/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Database, Package } from 'lucide-react';
import { toast } from 'sonner';
import { engine } from '@/src/lib/pythonEngine';

export function ExportArea() {
  const { datasetName, currentWorkspaceId, workspaceName, results, user } = useStore();

  const exportData = async (format: 'csv' | 'json') => {
    try {
      let code = '';
      if (format === 'csv') {
        code = `
import base64
csv_data = df.to_csv(index=False)
base64.b64encode(csv_data.encode('utf-8')).decode('utf-8')
`;
      } else {
        code = `
import base64
json_data = df.to_json(orient='records')
base64.b64encode(json_data.encode('utf-8')).decode('utf-8')
`;
      }
      
      const res = await engine.runCode(code);
      // Pyodide might return the string surrounded by quotes, so we parse it if needed
      let base64Data = res.output.trim().replace(/^'|'$/g, '');
      if (res.result) base64Data = res.result;

      const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${datasetName}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Données exportées en ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error("Erreur lors de l'export: " + err.message);
    }
  };

  const exportWorkspace = async () => {
    if (!currentWorkspaceId) return;
    try {
      const data = await getWorkspace(currentWorkspaceId);
      if (!data) throw new Error("Données introuvables");
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workspaceName || 'statstudio_project'}.statstudio`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Espace de travail exporté !");
    } catch (err: any) {
      toast.error("Erreur d'export: " + err.message);
    }
  };

  const exportResultsHTML = () => {
    if (results.length === 0) {
      toast.error("Aucun résultat à exporter");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport StatStudio - ${workspaceName}</title>
    <link href="/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f8f9fa; }
        .container { max-width: 900px; background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin-bottom: 5px; }
        .meta { color: #64748b; font-size: 0.9em; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .result-item { margin-bottom: 60px; page-break-inside: avoid; }
        .result-title { font-size: 1.5em; font-weight: bold; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #2563eb; padding-left: 15px; }
        .result-content { background: white; }
        pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; font-size: 0.85em; margin-bottom: 20px; }
        table { width: 100% !important; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #dee2e6 !important; padding: 12px !important; }
        th { background-color: #f8f9fa !important; }
        .plotly-placeholder { font-style: italic; color: #94a3b8; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 8px; }
    </style>
    <script src="/js/plotly.min.js"></script>
</head>
<body>
    <div class="container shadow-sm">
        <h1>Rapport d'Analyse Statistique</h1>
        <div class="meta">
            Projet : <b>${workspaceName}</b><br/>
            Analyste : <b>${user?.firstName} ${user?.lastName}</b><br/>
            Date : ${new Date().toLocaleString('fr-FR')}
        </div>

        ${results.map((res, idx) => {
            let content = res.output;
            let scripts = '';
            
            if (content.includes('__PLOTLY_JSON_START__')) {
                const parts = content.split('__PLOTLY_JSON_START__');
                content = parts[0];
                
                parts.slice(1).forEach((part, chartIdx) => {
                    const [jsonString, ...htmlParts] = part.split('__PLOTLY_JSON_END__');
                    const afterHtml = htmlParts.join('__PLOTLY_JSON_END__');
                    const chartId = `plotly-chart-${idx}-${chartIdx}`;
                    
                    content += `<div id="${chartId}" style="width:100%; max-width:800px; height: 500px; margin: 20px auto;"></div>`;
                    if (afterHtml && afterHtml.trim()) {
                        content += afterHtml;
                    }
                    
                    scripts += `
                    <script>
                        (function() {
                            var data = ${jsonString};
                            var layout = data.layout || {};
                            layout.autosize = true;
                            Plotly.newPlot('${chartId}', data.data, layout, {responsive: true});
                        })();
                    </script>
                    `;
                });
            }

            return `
            <div class="result-item">
                <div class="result-title">${res.title}</div>
                <div class="result-content">${content}</div>
                ${scripts}
            </div>
            `;
        }).join('')}
        
        <footer class="mt-5 pt-4 border-top text-center text-muted text-small">
            Généré avec StatStudio — Plateforme d'analyse statistique locale et sécurisée.
        </footer>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapport_${workspaceName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Rapport HTML exporté !");
  };

  const exportResults = () => {
    toast.info("L'export direct PDF nécessite l'impression système (Ctrl+P) du rapport HTML.");
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Export</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Database className="w-5 h-5 mr-2 text-blue-600" /> Exporter les données</CardTitle>
            <CardDescription>Téléchargez le jeu de données actif</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => exportData('csv')} className="w-full justify-start" variant="outline">
              <Download className="w-4 h-4 mr-2" /> Exporter en CSV
            </Button>
            <Button onClick={() => exportData('json')} className="w-full justify-start" variant="outline">
              <Download className="w-4 h-4 mr-2" /> Exporter en JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FileText className="w-5 h-5 mr-2 text-green-600" /> Exporter le rapport</CardTitle>
            <CardDescription>Exportez tous les résultats d'analyse au format HTML ou PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button onClick={exportResultsHTML} className="w-full justify-start" variant="outline">
              <FileText className="w-4 h-4 mr-2" /> Exporter le rapport (HTML)
            </Button>
            <Button onClick={() => window.print()} className="w-full justify-start" variant="outline">
              <Download className="w-4 h-4 mr-2" /> Imprimer / Sauvegarder en PDF
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2 text-purple-600" /> Projet (.statstudio)</CardTitle>
            <CardDescription>Sauvegarder l'intégralité du projet pour le restaurer plus tard.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={exportWorkspace} className="w-full justify-start border-purple-100 text-purple-700 hover:bg-purple-50" variant="outline">
              <Download className="w-4 h-4 mr-2" /> Télécharger monnetir.statstudio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
