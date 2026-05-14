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
  
  const [groupValues, setGroupValues] = useState<string[]>([]);
  const [mod1, setMod1] = useState<string>('');
  const [mod2, setMod2] = useState<string>('');

  React.useEffect(() => {
    if (method === 'mannwhitneyu' && var2 && isEngineReady) {
      const code = `
import json
print(json.dumps(df['${var2}'].dropna().astype(str).unique().tolist()))
      `;
      engine.runCode(code).then(res => {
        if (res && res.output && !res.error) {
          try {
            const values = JSON.parse(res.output.trim());
            setGroupValues(values);
            if (values.length >= 2) {
               setMod1(values[0]);
               setMod2(values[1]);
            }
          } catch (err) {}
        }
      });
    } else {
      setGroupValues([]);
      setMod1('');
      setMod2('');
    }
  }, [method, var2, isEngineReady]);

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
target = '${var1}'
group_var = '${var2}'
mod1 = '${mod1}'
mod2 = '${mod2}'

data = df[[target, group_var]].dropna().copy()
data[group_var] = data[group_var].astype(str)

group1 = data[data[group_var] == mod1][target]
group2 = data[data[group_var] == mod2][target]

if len(group1) == 0 or len(group2) == 0:
    print("<p class='text-red-600 mt-4 font-bold'>Erreur: L'une des modalités sélectionnées est vide.</p>")
else:
    stat, p = stats.mannwhitneyu(group1, group2)

    print(f"<h3>Mann-Whitney U Test: {target} by {group_var} ({mod1} vs {mod2})</h3>")
    res_df = pd.DataFrame({'Test': ['Mann-Whitney U'], 'Statistique U': [stat], 'p-value': [p]})
    print(res_df.to_html(classes=['table', 'table-bordered'], index=False))
    interp_pval = "Significatif (p < 0.05)" if p < 0.05 else "Non significatif (p >= 0.05)"
    print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
    print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
    interp_df = pd.DataFrame({
        'Aspect': ['Significativité', 'Observation'],
        'Résultat': [interp_pval, "Les distributions diffèrent significativement entre les deux groupes." if p < 0.05 else "Les distributions ne diffèrent pas significativement."]
    })
    print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
    print("</div>")
`;
    } else if (method === 'wilcoxon') {
      code = `
data = df[['${var1}', '${var2}']].dropna()
stat, p = stats.wilcoxon(data['${var1}'], data['${var2}'])

print(f"<h3>Wilcoxon Signed-Rank Test: ${var1} vs ${var2}</h3>")
res_df = pd.DataFrame({'Test': ['Wilcoxon'], 'Statistique': [stat], 'p-value': [p]})
print(res_df.to_html(classes=['table', 'table-bordered'], index=False))
interp_pval = "Significatif (p < 0.05)" if p < 0.05 else "Non significatif (p >= 0.05)"
print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
interp_df = pd.DataFrame({
    'Aspect': ['Significativité', 'Comparaison'],
    'Résultat': [interp_pval, f"Différence de distribution significative entre {var1} et {var2}." if p < 0.05 else f"Pas de différence significative entre {var1} et {var2}."]
})
print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
print("</div>")
`;
    } else if (method === 'kruskal') {
      code = `
groups = [group['${var1}'].dropna() for name, group in df.groupby('${var2}')]
stat, p = stats.kruskal(*groups)
print(f"<h3>Kruskal-Wallis H Test: ${var1} by ${var2}</h3>")
res_df = pd.DataFrame({'Test': ['Kruskal-Wallis H'], 'Statistique H': [stat], 'p-value': [p]})
print(res_df.to_html(classes=['table', 'table-bordered'], index=False))
interp_pval = "Significatif (p < 0.05)" if p < 0.05 else "Non significatif (p >= 0.05)"
print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
interp_df = pd.DataFrame({
    'Aspect': ['Significativité Globale', 'Conclusion'],
    'Résultat': [interp_pval, "Il existe une différence entre au moins deux groupes." if p < 0.05 else "Pas de différence globale significative."]
})
print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariableSelector 
            variables={columns.filter(c => c.type === 'numeric')}
            selected={var1}
            onSelect={setVar1}
            label="Variable Quantitative"
          />
          <div className="space-y-4">
            <VariableSelector 
              variables={columns}
              selected={var2}
              onSelect={setVar2}
              label={method === 'wilcoxon' ? 'Variable Quantitative 2' : 'Variable Groupe'}
            />

            {method === 'mannwhitneyu' && var2 && groupValues.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 block">Modalités à comparer</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block uppercase tracking-wider font-bold">Groupe 1</Label>
                      <Select value={mod1} onValueChange={setMod1}>
                        <SelectTrigger className="bg-white h-10"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {groupValues.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block uppercase tracking-wider font-bold">Groupe 2</Label>
                      <Select value={mod2} onValueChange={setMod2}>
                        <SelectTrigger className="bg-white h-10"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {groupValues.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !var1 || !var2 || (method === 'mannwhitneyu' && (!mod1 || !mod2 || mod1 === mod2))} 
          className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
        </Button>
      </div>
    </div>
  );
}
