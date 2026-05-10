import React from 'react';
import { useStore, getWorkspace } from '@/src/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Database, Package } from 'lucide-react';
import { toast } from 'sonner';
import { engine } from '@/src/lib/pythonEngine';

export function ExportArea() {
  const { datasetName, currentWorkspaceId, workspaceName } = useStore();

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

  const exportResults = () => {
    toast.info("L'export des résultats n'est pas encore implémenté via PDF, utilisez le code Python pour l'instant.");
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
            <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2 text-purple-600" /> Espace de Travail</CardTitle>
            <CardDescription>Sauvegarder l'intégralité du projet (données, historique de code, résultats) pour le partager ou le restaurer plus tard.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={exportWorkspace} className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50" variant="outline">
              <Download className="w-4 h-4 mr-2" /> Télécharger monnetir.statstudio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
