import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function NonParametricTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [method, setMethod] = useState<string>('mannwhitneyu');
  const [isRunning, setIsRunning] = useState(false);

  const runAnalysis = async () => {
    if (!var1 || !var2) return;
    setIsRunning(true);
    let code = '';

    if (method === 'mannwhitneyu') {
      code = `
group1 = df[df['${var2}'] == df['${var2}'].unique()[0]]['${var1}'].dropna()
group2 = df[df['${var2}'] == df['${var2}'].unique()[1]]['${var1}'].dropna()
stat, p = stats.mannwhitneyu(group1, group2)

print(f"<h3>Mann-Whitney U Test: ${var1} by ${var2}</h3>")
print(f"<p><b>U-Statistic:</b> {stat:.4f}, <b>p-value:</b> {p:.4e}</p>")
print(f"<div className='mt-4 p-3 bg-slate-50 rounded border'>{interpret_p(p)}</div>")
`;
    } else if (method === 'kruskal') {
      code = `
groups = [group['${var1}'].dropna() for name, group in df.groupby('${var2}')]
stat, p = stats.kruskal(*groups)
print(f"<h3>Kruskal-Wallis H Test: ${var1} by ${var2}</h3>")
print(f"<p><b>H-Statistic:</b> {stat:.4f}, <b>p-value:</b> {p:.4e}</p>")
print(f"<div className='mt-4 p-3 bg-slate-50 rounded border'>{interpret_p(p)}</div>")
`;
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Non-Parametric: ${method}`,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      toast.error('Test failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
           <Label>Variable (Numeric)</Label>
           <Select value={var1} onValueChange={setVar1}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>{columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
           </Select>
        </div>
        <div>
           <Label>Group Variable (Categorical)</Label>
           <Select value={var2} onValueChange={setVar2}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>{columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
           </Select>
        </div>
        <div>
           <Label>Method</Label>
           <Select value={method} onValueChange={setMethod}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>
                <SelectItem value="mannwhitneyu">Mann-Whitney U (2 groups)</SelectItem>
                <SelectItem value="wilcoxon">Wilcoxon Signed-Rank (Paired)</SelectItem>
                <SelectItem value="kruskal">Kruskal-Wallis (k groups)</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>
      <Button onClick={runAnalysis} className="w-full" disabled={isRunning}>Run Test</Button>
    </div>
  );
}
