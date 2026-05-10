import React from 'react';
import { useStore } from '@/src/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

export function PythonCodeViewer() {
  const { results } = useStore();

  const allCode = results.map(r => `# --- ${r.title} ---\n${r.code}`).join('\n\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(allCode);
    toast.success('Code copié dans le presse-papier');
  };

  const downloadCode = () => {
    const blob = new Blob([allCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statstudio_analysis.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <Card className="flex-1 flex flex-col min-h-0 bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50 py-3">
          <CardTitle className="text-lg font-medium text-slate-800">Code Python Généré</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!allCode}>
              <Copy className="w-4 h-4 mr-2" /> Copier
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCode} disabled={!allCode}>
              <Download className="w-4 h-4 mr-2" /> Exporter (.py)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 relative">
          <ScrollArea className="h-full w-full absolute inset-0">
            <pre className="p-6 text-sm font-mono text-slate-800 break-all whitespace-pre-wrap">
              {allCode || '# Aucun code généré pour le moment.\n# Exécutez des analyses pour voir le code ici.'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
