import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function NonParametricTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [method, setMethod] = useState<string>('mannwhitneyu');
  const [isRunning, setIsRunning] = useState(false);

  const OPTIONS = [
    { 
      id: 'mannwhitneyu', 
      label: 'Mann-Whitney U', 
      description: 'L\'alternative non paramétrique au T-test indépendant. Compare les médianes de deux groupes.' 
    },
    { 
      id: 'wilcoxon', 
      label: 'Wilcoxon Signed-Rank', 
      description: 'L\'alternative non paramétrique au T-test apparié.' 
    },
    { 
      id: 'kruskal', 
      label: 'Kruskal-Wallis', 
      description: 'L\'alternative non paramétrique à l\'ANOVA. Compare les médianes de 3 groupes ou plus.' 
    },
  ];

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
interp_pval = "La différence de distribution entre les deux groupes est statistiquement significative (p < 0.05)." if p < 0.05 else "La différence entre les deux groupes n'est pas statistiquement significative (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
print("</div>")
`;
    } else if (method === 'wilcoxon') {
      code = `
data = df[['${var1}', '${var2}']].dropna()
stat, p = stats.wilcoxon(data['${var1}'], data['${var2}'])

print(f"<h3>Wilcoxon Signed-Rank Test: ${var1} vs ${var2}</h3>")
print(f"<p><b>Statistic:</b> {stat:.4f}, <b>p-value:</b> {p:.4e}</p>")
interp_pval = f"La différence de distribution entre {var1} et {var2} est statistiquement significative (p < 0.05)." if p < 0.05 else f"La différence entre {var1} et {var2} n'est pas statistiquement significative (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
print("</div>")
`;
    } else if (method === 'kruskal') {
      code = `
groups = [group['${var1}'].dropna() for name, group in df.groupby('${var2}')]
stat, p = stats.kruskal(*groups)
print(f"<h3>Kruskal-Wallis H Test: ${var1} by ${var2}</h3>")
print(f"<p><b>H-Statistic:</b> {stat:.4f}, <b>p-value:</b> {p:.4e}</p>")
interp_pval = "Il existe une différence statistiquement significative dans les distributions entre au moins deux groupes (p < 0.05)." if p < 0.05 else "Les distributions ne diffèrent pas significativement entre les groupes (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité Globale :</b> {interp_pval}</p>")
print("</div>")

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
      <div className="space-y-6">
        <TestSelector 
          options={OPTIONS}
          selected={[method]}
          onToggle={(id) => setMethod(id)}
          label="Méthode de test"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 gap-6">
          <VariableSelector 
            variables={columns.filter(c => c.type === 'numeric')}
            selected={var1}
            onSelect={setVar1}
            label="Variable Quantitative"
          />
          <VariableSelector 
            variables={columns}
            selected={var2}
            onSelect={setVar2}
            label={method === 'wilcoxon' ? 'Variable Quantitative 2' : 'Variable Groupe'}
          />
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-100">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !var1 || !var2} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer le Test'}
        </Button>
      </div>
    </div>
  );
}
