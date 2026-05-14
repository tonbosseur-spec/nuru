import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
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

# Table des tests
res_tests = pd.DataFrame({
    'Test': ['Chi-Square', "V de Cramer"],
    'Valeur': [chi2, cramers_v],
    'p-value': [p, None]
})
print(f"<div class='mt-4'><h4>Tests d'association</h4></div>")
print(res_tests.round(4).to_html(classes=['table', 'table-bordered'], index=False, na_rep='-'))
interp_pval = "Association statistiquement significative (p < 0.05)." if p < 0.05 else "Pas d'association statistiquement significative (p >= 0.05)."
print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
interp_df = pd.DataFrame({
    'Aspect': ['Significativité', "Intensité (V de Cramer)"],
    'Résultat': [interp_pval, f"{cramers_v:.4f} (Echelle 0 à 1)"]
})
print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !var1 || !var2 || var1 === var2} 
          className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
        </Button>
      </div>
    </div>
  );
}
