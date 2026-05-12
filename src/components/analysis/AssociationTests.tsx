import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function AssociationTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [method, setMethod] = useState<string>('chi2');
  const [isRunning, setIsRunning] = useState(false);

  const OPTIONS = [
    { 
      id: 'chi2', 
      label: 'Test du Chi-2', 
      description: 'Évalue l\'indépendance entre deux variables qualitatives. Accompagné du V de Cramer pour mesurer la force de l\'association.' 
    },
  ];

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
      <div className="space-y-6">
        <TestSelector 
          options={OPTIONS}
          selected={[method]}
          onToggle={(id) => setMethod(id)}
          label="Test d'association"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 gap-6">
          <VariableSelector 
            variables={columns}
            selected={var1}
            onSelect={setVar1}
            label="Variable Qualitative 1"
          />
          <VariableSelector 
            variables={columns}
            selected={var2}
            onSelect={setVar2}
            label="Variable Qualitative 2"
          />
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-100">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !var1 || !var2 || var1 === var2} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer le Test'}
        </Button>
      </div>
    </div>
  );
}
