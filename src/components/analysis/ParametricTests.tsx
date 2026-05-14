import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
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
from itertools import combinations

target = '${var1}'
group_var = '${var2}'
data = df[[target, group_var]].dropna()

# Levene
groups_names = sorted(data[group_var].unique())
groups_data = [data[data[group_var] == g][target].values for g in groups_names]
stat_l, p_l = stats.levene(*groups_data)
print("<div class='mb-6'>")
print("<h4>1. Vérification des assomptions</h4>")
print(f"<p className='text-sm'><b>Test de Levene (Homogénéité) :</b> p-value = {p_l:.4e}</p>")
if p_l < 0.05:
    print("<p className='text-xs text-amber-600 bg-amber-50 p-2 rounded'>Attention: Les variances ne sont pas homogènes. L'ANOVA peut être biaisée.</p>")
else:
    print("<p className='text-xs text-green-600 bg-green-50 p-2 rounded'>L'homogénéité des variances est respectée.</p>")
print("</div>")

# ANOVA
model = ols(f"\`{target}\` ~ C(\`{group_var}\`)", data=data).fit()
anova_table = sm.stats.anova_lm(model, typ=2)
p_val = anova_table.iloc[0]['PR(>F)']

print("<div class='mb-6'>")
print("<h4>2. Résultats de l'ANOVA</h4>")
print(anova_table.round(4).to_html(classes=['table', 'table-bordered', 'w-full']))
print("</div>")

# Interprétation ANOVA
is_significant = p_val < 0.05
interp_title = "Différence significative" if is_significant else "Pas de différence significative"
interp_color = "text-indigo-900 bg-indigo-50 border-indigo-500" if is_significant else "text-slate-900 bg-slate-50 border-slate-500"

print(f"<div className='mt-4 p-4 border-l-4 rounded-r-md {interp_color}'>")
print(f"<h4 className='font-bold mb-2'>{interp_title} (p = {p_val:.4f})</h4>")
if is_significant:
    print(f"<p className='text-sm'>L'analyse de variance indique qu'il existe au moins une différence significative entre les moyennes des groupes de <b>{group_var}</b> pour la variable <b>{target}</b>.</p>")
else:
    print(f"<p className='text-sm'>Les différences observées entre les moyennes des groupes ne sont pas statistiquement significatives au seuil de 5%.</p>")
print("</div>")

if is_significant:
    print("<div class='mt-8'>")
    print("<h4>3. Analyse Post-Hoc (Tukey HSD) avec Lettres</h4>")
    tukey = pairwise_tukeyhsd(endog=data[target], groups=data[group_var], alpha=0.05)
    
    # CLD Logic
    def get_cld(gnames, gmeans, tres):
        n = len(gnames)
        adj = np.ones((n, n), dtype=bool)
        g_to_idx = {g: i for i, g in enumerate(gnames)}
        
        for i in range(len(tres.reject)):
            # statsmodels might return groups in different order in reject
            g1, g2 = tres.groupsunique[tres.group1[i]], tres.groupsunique[tres.group2[i]]
            if tres.reject[i]:
                idx1, idx2 = g_to_idx[g1], g_to_idx[g2]
                adj[idx1, idx2] = adj[idx2, idx1] = False
        
        def find_cliques(curr, cand, excl):
            if not cand and not excl: return [curr]
            cliques = []
            for v in list(cand):
                new_cand = [u for u in cand if adj[v, u]]
                new_excl = [u for u in excl if adj[v, u]]
                cliques.extend(find_cliques(curr + [v], new_cand, new_excl))
                cand.remove(v)
                excl.append(v)
            return cliques
            
        cliques = find_cliques([], list(range(n)), [])
        # Sort cliques by average mean of members (descending for 'a' to be highest)
        clique_means = [np.mean([gmeans[i] for i in c]) for c in cliques]
        sorted_cliques = [cliques[i] for i in np.argsort(clique_means)[::-1]]
        
        res_letters = [[] for _ in range(n)]
        for i, c in enumerate(sorted_cliques):
            l = chr(97 + i)
            for gi in c: res_letters[gi].append(l)
        return ["".join(sorted(l)) for l in res_letters]

    means_dict = data.groupby(group_var)[target].mean().to_dict()
    means_list = [means_dict[g] for g in groups_names]
    letters = get_cld(groups_names, means_list, tukey)
    
    summary = pd.DataFrame({
        'Groupe': groups_names,
        'Moyenne': means_list,
        'N': data.groupby(group_var)[target].count().values,
        'Std Dev': data.groupby(group_var)[target].std().values,
        'Lettres Tukey': letters
    })
    
    print("<p className='text-xs text-slate-500 mb-2 italic'>Les groupes partageant une même lettre ne sont pas significativement différents.</p>")
    print(summary.round(4).to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
    
    # Interpretation post-hoc
    print("<div class='mt-4 p-4 bg-green-50 text-green-900 border-l-4 border-green-500 rounded-sm text-sm'>")
    print("<b>Interprétation des lettres :</b>")
    print("<ul class='list-disc ml-4 mt-2'>")
    for i, g in enumerate(groups_names):
        print(f"<li>Groupe <b>{g}</b> : Moyenne = {means_list[i]:.2f}, Groupe de comparaison = <b>{letters[i]}</b></li>")
    print("</ul>")
    print("</div>")
    print("</div>")

    # Plotly with letters
    fig_box = px.box(data, x=group_var, y=target, color=group_var, 
                     title=f'Comparaison des moyennes de {target} par {group_var}',
                     points="all", category_orders={group_var: groups_names})
    
    # Add letters above boxplots
    max_y = data[target].max()
    padding = (max_y - data[target].min()) * 0.05
    for i, g in enumerate(groups_names):
        fig_box.add_annotation(
            x=g, y=max_y + padding,
            text=f"<b>{letters[i]}</b>",
            showarrow=False,
            font=dict(size=14, color="black")
        )
    print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")

else:
    # Small plot if not significant
    fig_box = px.box(data, x=group_var, y=target, color=group_var, title=f'{target} par {group_var} (NS)')
    print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")

# Mean plot
agg = data.groupby(group_var)[target].mean().reset_index()
fig_mean = px.line(agg, x=group_var, y=target, markers=True, title='Profil des moyennes')
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariableSelector 
            variables={numericCols}
            selected={var1}
            onSelect={setVar1}
            label={`Variable Quantitative ${testType === 'ttest_rel' ? '1' : ''}`}
          />

          {testType === 'ttest_1samp' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">Moyenne théorique (μ₀)</label>
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-center h-[280px]">
                <p className="text-xs text-slate-500 mb-4 italic">
                  Entrez la valeur de référence à laquelle vous souhaitez comparer la moyenne de {var1 || 'votre variable'}.
                </p>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={mu} 
                    onChange={e => setMu(e.target.value)}
                    className="rounded-xl border-slate-200 h-12 text-lg font-medium pl-10"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-serif italic text-lg">μ₀</div>
                </div>
              </div>
            </div>
          ) : (
            <VariableSelector 
              variables={testType === 'ttest_rel' ? numericCols : columns}
              selected={var2}
              onSelect={setVar2}
              label={testType === 'ttest_rel' ? 'Variable Quantitative 2' : 'Variable Groupe (Facteur)'}
            />
          )}
        </div>
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
         <Button 
           onClick={runAnalysis} 
           disabled={!isEngineReady || isRunning || !var1 || (testType !== 'ttest_1samp' && !var2)} 
           className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
         >
           {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
         </Button>
      </div>
    </div>
  );
}
