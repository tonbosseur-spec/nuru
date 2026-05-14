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
      label: 'Test du Chi-2 d\'indépendance', 
      description: 'Évalue l\'indépendance entre deux variables qualitatives. Accompagné du V de Cramer pour mesurer la force.' 
    },
    { 
      id: 'chi2_ajustement', 
      label: 'Chi-2 qualité d\'ajustement', 
      description: 'Vérifie si les fréquences observées d\'une variable sont conformes à une distribution théorique (équirépartition par défaut).' 
    },
    { 
      id: 'mcnemar', 
      label: 'Test de McNemar', 
      description: 'Compare deux variables qualitatives (dichotomiques) sur des données appariées.' 
    },
    { 
      id: 'correlation', 
      label: 'Corrélations (Pearson/Spearman)', 
      description: 'Mesure la force et la direction du lien entre deux variables quantitatives.' 
    },
  ];

  const runAnalysis = async () => {
    if (!var1 || (method !== 'chi2_ajustement' && !var2)) return;
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
    } else if (method === 'chi2_ajustement') {
      code = `
obs = df['${var1}'].value_counts()
chi2, p = stats.chisquare(f_obs=obs)

print(f"<h3>Chi-2 Qualité d'Ajustement: ${var1}</h3>")
print("<h4>Fréquences Observées</h4>")
freq_df = obs.reset_index()
freq_df.columns = ['Catégorie', 'Fréquence']
print(freq_df.to_html(classes=['table', 'table-bordered'], index=False))

res_tests = pd.DataFrame({
    'Test': ['Chi-Square (Ajustement)'],
    'Statistique': [chi2],
    'p-value': [p]
})
print(f"<div class='mt-4'><h4>Résultat du Test</h4></div>")
print(res_tests.round(4).to_html(classes=['table', 'table-bordered'], index=False))

interp_pval = "Les fréquences observées diffèrent significativement des fréquences théoriques équiprobables (p < 0.05)." if p < 0.05 else "Pas de différence significative avec une distribution équiprobable (p >= 0.05)."
print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
interp_df = pd.DataFrame({
    'Aspect': ['Ajustement à la distribution théorique'],
    'Résultat': [interp_pval]
})
print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
print("</div>")
`;
    } else if (method === 'mcnemar') {
      code = `
from statsmodels.stats.contingency_tables import mcnemar

contingency = pd.crosstab(df['${var1}'], df['${var2}'])
print(f"<h3>Test de McNemar: ${var1} vs ${var2}</h3>")
print("<h4>Table de contingence</h4>")
print(contingency.to_html(classes=['table', 'table-bordered']))

try:
    result = mcnemar(contingency, exact=False, correction=True)
    res_tests = pd.DataFrame({
        'Test': ['McNemar'],
        'Statistique': [result.statistic],
        'p-value': [result.pvalue]
    })
    print(f"<div class='mt-4'><h4>Résultat du Test</h4></div>")
    print(res_tests.round(4).to_html(classes=['table', 'table-bordered'], index=False))

    interp_pval = "Différence statistiquement significative entre les proportions appariées (p < 0.05)." if result.pvalue < 0.05 else "Pas de différence significative entre les proportions appariées (p >= 0.05)."
    print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
    print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
    interp_df = pd.DataFrame({
        'Aspect': ['Comparaison des proportions'],
        'Résultat': [interp_pval]
    })
    print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
    print("</div>")
except Exception as e:
    print(f"<p style='color:red;'>Erreur lors du calcul du test de McNemar : {e}. Assurez-vous que la table est 2x2.</p>")
`;
    } else if (method === 'correlation') {
      code = `
data = df[['${var1}', '${var2}']].dropna()
pearson_r, pearson_p = stats.pearsonr(data['${var1}'], data['${var2}'])
spearman_r, spearman_p = stats.spearmanr(data['${var1}'], data['${var2}'])

print(f"<h3>Corrélations: ${var1} vs ${var2}</h3>")

res_tests = pd.DataFrame({
    'Test': ['Pearson (linéaire)', 'Spearman (monotone)'],
    'Coefficient (r)': [pearson_r, spearman_r],
    'p-value': [pearson_p, spearman_p]
})
print(res_tests.round(4).to_html(classes=['table', 'table-bordered'], index=False))

interp_p = "Corrélation linéaire significative" if pearson_p < 0.05 else "Pas de corrélation linéaire significative"
interp_s = "Corrélation monotone significative" if spearman_p < 0.05 else "Pas de corrélation monotone significative"

print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
interp_df = pd.DataFrame({
    'Aspect': ['Pearson', 'Spearman'],
    'Résultat': [interp_p, interp_s]
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
            label={method === 'chi2_ajustement' ? "Variable Qualitative" : "Variable 1"}
          />
          {method !== 'chi2_ajustement' && (
            <VariableSelector 
              variables={columns}
              selected={var2}
              onSelect={setVar2}
              label={method === 'correlation' ? "Variable 2 (Quant)" : "Variable 2"}
            />
          )}
        </div>
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !var1 || (method !== 'chi2_ajustement' && (!var2 || var1 === var2))} 
          className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
        </Button>
      </div>
    </div>
  );
}
