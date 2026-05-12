import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function ParametricTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [testType, setTestType] = useState<string>('ttest_1samp');
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [mu, setMu] = useState<string>('0');
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'categorical');

  const OPTIONS = [
    { 
      id: 'ttest_1samp', 
      label: 'T-test un échantillon', 
      description: 'Compare la moyenne d\'un groupe à une valeur théorique connue.' 
    },
    { 
      id: 'ttest_ind', 
      label: 'T-test indépendant', 
      description: 'Compare les moyennes de deux groupes distincts (ex: Hommes vs Femmes).' 
    },
    { 
      id: 'ttest_rel', 
      label: 'T-test apparié', 
      description: 'Compare les moyennes de deux mesures sur les mêmes sujets (ex: Avant vs Après).' 
    },
    { 
      id: 'anova', 
      label: 'ANOVA à un facteur', 
      description: 'Compare les moyennes de trois groupes ou plus.' 
    },
  ];

  const runAnalysis = async () => {
    if (!var1) return;
    if (testType !== 'ttest_1samp' && !var2) return;
    
    setIsRunning(true);
    let code = `import plotly.express as px\nimport plotly.io as pio\nimport scipy.stats as stats\nimport pandas as pd\nimport numpy as np\n`;
    let title = '';

    if (testType === 'ttest_1samp') {
       title = `T-test un échantillon: ${var1}`;
       code += `
target = '${var1}'
pop_mean = float(${mu})
v = df[target].dropna()
stat, p = stats.ttest_1samp(v, pop_mean)

ci = stats.t.interval(0.95, len(v)-1, loc=v.mean(), scale=stats.sem(v))

print(f"<h3>{target} vs. moyenne théorique ({pop_mean})</h3>")
res = pd.DataFrame({
    'Moyenne Obs.': [v.mean()], 'Diff. Moyenne': [v.mean() - pop_mean],
    't': [stat], 'ddl': [len(v)-1], 'p-value': [p],
    'IC 95% (Inf)': [ci[0]], 'IC 95% (Sup)': [ci[1]]
})
print(res.round(4).to_html(classes=['table', 'table-bordered'], index=False))

interp_pval = "La différence avec la moyenne théorique est statistiquement significative (p < 0.05)." if p < 0.05 else "La différence avec la moyenne théorique n'est pas statistiquement significative (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
print(f"<p>La moyenne observée est de {v.mean():.4f} contre une théorique de {pop_mean}.</p>")
print("</div>")

fig_box = px.box(df, y=target, title='Boxplot (Distribution)')
fig_box.add_hline(y=pop_mean, line_dash='dash', line_color='red', annotation_text='Moyenne théorique')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")
`;
    } else if (testType === 'ttest_ind') {
       title = `T-test indépendant: ${var1} by ${var2}`;
       code += `
target = '${var1}'
group_var = '${var2}'

data = df[[target, group_var]].dropna()
groups = data[group_var].unique()
if len(groups) != 2:
    print("<p>Erreur: La variable de groupe doit avoir exactement 2 modalités.</p>")
else:
    g1 = data[data[group_var] == groups[0]][target]
    g2 = data[data[group_var] == groups[1]][target]
    
    # Test de Levene (Homogénéité)
    stat_l, p_l = stats.levene(g1, g2)
    print("<h4>Assomptions: Test de Levene (Homogénéité des variances)</h4>")
    print(f"<p>Statistique F = {stat_l:.4f}, p-value = {p_l:.4e}</p>")
    equal_var = p_l > 0.05
    if equal_var: print("<p>Les variances sont supposées égales.</p>")
    else: print("<p>Les variances sont supposées inégales (Correction de Welch appliquée).</p>")

    stat, p = stats.ttest_ind(g1, g2, equal_var=equal_var)
    diff_mean = g1.mean() - g2.mean()
    
    print("<h4>Résultats du T-test Indépendant</h4>")
    res = pd.DataFrame({
        'Groupe 1': [groups[0]], 'Moyenne 1': [g1.mean()],
        'Groupe 2': [groups[1]], 'Moyenne 2': [g2.mean()],
        'Différence': [diff_mean], 't': [stat], 'p-value': [p]
    })
    print(res.round(4).to_html(classes=['table', 'table-bordered'], index=False))
    
    interp_pval = "La différence de moyenne entre les deux groupes est statistiquement significative (p < 0.05)." if p < 0.05 else "La différence entre les deux groupes n'est pas statistiquement significative (p >= 0.05)."
    print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
    print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
    print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
    print(f"<p>Le groupe {groups[0]} a une moyenne de {g1.mean():.4f} et le groupe {groups[1]} a une moyenne de {g2.mean():.4f}.</p>")
    print("</div>")

    fig_box = px.box(data, x=group_var, y=target, color=group_var, title='Boxplots par groupe')
    print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")
`;
    } else if (testType === 'ttest_rel') {
       title = `T-test apparié: ${var1} vs ${var2}`;
       code += `
v1 = '${var1}'
v2 = '${var2}'

data = df[[v1, v2]].dropna()
stat, p = stats.ttest_rel(data[v1], data[v2])
diff = data[v1] - data[v2]
ci = stats.t.interval(0.95, len(diff)-1, loc=diff.mean(), scale=stats.sem(diff))

print("<h4>Résultats du T-test Apparié</h4>")
res = pd.DataFrame({
    'Var 1': [v1], 'Moyenne 1': [data[v1].mean()],
    'Var 2': [v2], 'Moyenne 2': [data[v2].mean()],
    'Diff moyenne': [diff.mean()], 't': [stat], 'ddl': [len(diff)-1], 'p-value': [p],
    'IC 95% Inf': [ci[0]], 'IC 95% Sup': [ci[1]]
})
print(res.round(4).to_html(classes=['table', 'table-bordered'], index=False))

interp_pval = "La différence de moyenne entre les deux variables appariées est statistiquement significative (p < 0.05)." if p < 0.05 else "La différence entre les deux variables n'est pas statistiquement significative (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité :</b> {interp_pval}</p>")
print(f"<p>La différence moyenne est de {diff.mean():.4f}.</p>")
print("</div>")

df_melt = data.melt()
fig_box = px.box(df_melt, x='variable', y='value', color='variable', title='Boxplots des paires')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")
`;
    } else if (testType === 'anova') {
       title = `ANOVA à un facteur: ${var1} by ${var2}`;
       code += `
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.multicomp import pairwise_tukeyhsd

target = '${var1}'
group_var = '${var2}'
data = df[[target, group_var]].dropna()

# Levene
groups = [group[target].values for name, group in data.groupby(group_var)]
stat_l, p_l = stats.levene(*groups)
print("<h4>Test de Levene (Homogénéité)</h4>")
print(f"<p>p-value: {p_l:.4e}</p>")

# ANOVA
model = ols(f"{target} ~ C({group_var})", data=data).fit()
anova_table = sm.stats.anova_lm(model, typ=2)
p_val = anova_table.iloc[0]['PR(>F)']

print("<h4>Tableau ANOVA</h4>")
print(anova_table.round(4).to_html(classes=['table', 'table-bordered']))

interp_pval = "Il existe une différence statistiquement significative (p < 0.05) entre au moins deux groupes." if p_val < 0.05 else "Il n'y a pas de différence statistiquement significative entre les moyennes des groupes (p >= 0.05)."
print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité Globale :</b> {interp_pval}</p>")
print("</div>")

if p_val < 0.05:
    print("<p className='text-sm text-green-600 mt-4'><b>Analyse Post-Hoc requise (voir ci-dessous)</b></p>")
    print("<h4>Post-Hoc (Tukey HSD)</h4>")
    tukey = pairwise_tukeyhsd(endog=data[target], groups=data[group_var], alpha=0.05)
    print(pd.DataFrame(data=tukey._results_table.data[1:], columns=tukey._results_table.data[0]).to_html(classes=['table', 'table-bordered'], index=False))


fig_box = px.box(data, x=group_var, y=target, color=group_var, title='Boxplots par groupe')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")

# Interaction/Mean plot via px.line
agg = data.groupby(group_var)[target].mean().reset_index()
fig_mean = px.line(agg, x=group_var, y=target, markers=True, title='Mean plots')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_mean) + "__PLOTLY_JSON_END__")
`;
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <TestSelector 
          options={OPTIONS}
          selected={[testType]}
          onToggle={(id) => setTestType(id)}
          label="Type de test"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 gap-6">
          <VariableSelector 
            variables={numericCols}
            selected={var1}
            onSelect={setVar1}
            label={`Variable Quantitative ${testType === 'ttest_rel' ? '1' : ''}`}
          />

          {testType === 'ttest_1samp' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Moyenne théorique</label>
              <Input 
                type="number" 
                value={mu} 
                onChange={e => setMu(e.target.value)}
                className="rounded-xl border-slate-200 h-11"
              />
            </div>
          )}

          {testType !== 'ttest_1samp' && (
            <VariableSelector 
              variables={testType === 'ttest_rel' ? numericCols : columns}
              selected={var2}
              onSelect={setVar2}
              label={testType === 'ttest_rel' ? 'Variable Quantitative 2' : 'Variable Groupe (Facteur)'}
            />
          )}
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-100">
         <Button 
           onClick={runAnalysis} 
           disabled={!isEngineReady || isRunning || !var1 || (testType !== 'ttest_1samp' && !var2)} 
           className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
         >
           {isRunning ? 'Calcul en cours...' : 'Lancer le Test'}
         </Button>
      </div>
    </div>
  );
}
