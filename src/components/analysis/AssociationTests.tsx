import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function AssociationTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [method, setMethod] = useState<string>('chi2');
  const [isRunning, setIsRunning] = useState(false);

  const runAnalysis = async () => {
    if (!var1 || !var2) return;
    setIsRunning(true);
    let code = '';

    if (method === 'chi2') {
      code = `
contingency = pd.crosstab(df['${var1}'], df['${var2}'])
chi2, p, dof, ex = stats.chi2_contingency(contingency)

# Cramer's V
n = contingency.sum().sum()
phi2 = chi2 / n
r, k = contingency.shape
phi2corr = max(0, phi2 - ((k-1)*(r-1))/(n-1))
rcorr = r - ((r-1)**2)/(n-1)
kcorr = k - ((k-1)**2)/(n-1)
cramers_v = np.sqrt(phi2corr / min((kcorr-1), (rcorr-1)))

print(f"<h3>Association: ${var1} vs ${var2}</h3>")
print(contingency.to_html(classes=['table', 'table-bordered']))
print(f"<p className='mt-4'><b>Chi-Square:</b> {chi2:.4f}, <b>p-value:</b> {p:.4e}</p>")
print(f"<p><b>Cramer's V:</b> {cramers_v:.4f}</p>")
interp_pval = "Il existe une association statistiquement significative entre les deux variables (p < 0.05)." if p < 0.05 else "Il n'y a pas d'association statistiquement significative (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
print(f"<p><b>Taille de l'effet (Cramer's V) :</b> {cramers_v:.4f} (Mesure l'intensité de l'association, de 0 à 1).</p>")
print("</div>")

`;
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Association: ${var1} & ${var2}`,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
           <Label>Variable 1 (Categorical)</Label>
           <Select value={var1} onValueChange={setVar1}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>{columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
           </Select>
        </div>
        <div>
           <Label>Variable 2 (Categorical)</Label>
           <Select value={var2} onValueChange={setVar2}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>{columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
           </Select>
        </div>
        <div>
           <Label>Test</Label>
           <Select value={method} onValueChange={setMethod}>
             <SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger>
             <SelectContent>
                <SelectItem value="chi2">Chi-Square Independence Test + Cramer's V</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>
      <Button onClick={runAnalysis} className="w-full" disabled={isRunning}>Run Test</Button>
    </div>
  );
}
