import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function SimpleRegression() {
  const { columns, addResult, isEngineReady } = useStore();
  const [dependent, setDependent] = useState<string>('');
  const [independent, setIndependent] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');

  const OPTIONS = [
    { 
      id: 'ols', 
      label: 'Moindres Carrés Ordinaires (OLS)', 
      description: 'Estime les paramètres d\'une relation linéaire entre une variable dépendante et une variable explicative.' 
    },
  ];

  const runAnalysis = async () => {
    if (!dependent || !independent) return;
    
    setIsRunning(true);
    let code = `
import statsmodels.api as sm
import plotly.express as px
import plotly.io as pio

data = df[['${dependent}', '${independent}']].dropna()
y = data['${dependent}']
x_var = data['${independent}']
X = sm.add_constant(x_var)
model = sm.OLS(y, X).fit()

print(f"<h3>Régression Linéaire Simple: {y.name} ~ {x_var.name}</h3>")

# Equation
coefs = model.params
intercept = coefs['const'] if 'const' in coefs else coefs.iloc[0]
slope = coefs[x_var.name] if x_var.name in coefs else coefs.iloc[1]
eq = f"{y.name} = {slope:.4f} * {x_var.name} + {intercept:.4f}"
print(f"<h4>Équation du modèle</h4>")
print(f"<p class='font-mono bg-slate-100 p-2 rounded'>{eq}</p>")

# Table ANOVA
print(f"<h4>Tableau ANOVA & Coefficients</h4>")
print(model.summary().tables[1].as_html())

print(f"<h4>Statistiques Globales du Modèle</h4>")
stats_global = pd.DataFrame({
    'Métrique': ['R²', 'R² ajusté', 'p-value (F)'],
    'Valeur': [model.rsquared, model.rsquared_adj, model.f_pvalue]
})
print(stats_global.round(4).to_html(classes=['table', 'table-bordered'], index=False))

# Interpretation
pval = model.f_pvalue
r2 = model.rsquared

interp_pval = "La relation est statistiquement significative (p < 0.05)." if pval < 0.05 else "La relation n'est pas statistiquement significative (p >= 0.05)."
interp_r2 = f"Le modèle explique {r2*100:.1f}% de la variance de {y.name}."

print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")

interp_df = pd.DataFrame([
    {'Aspect': 'Significativité', 'Résultat': interp_pval},
    {'Aspect': 'Pouvoir explicatif', 'Résultat': interp_r2},
    {'Aspect': 'Équation', 'Résultat': f"Une unité de {x_var.name} modifie {y.name} de {slope:.4f} en moyenne."}
])
print(interp_df.to_html(classes=['table', 'table-bordered', 'w-full'], index=False))
print("</div>")

# Diagnostics: scatter + droite
fig_scatter = px.scatter(data, x='${independent}', y='${dependent}', trendline='ols', title='Scatter plot + Droite de régression')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_scatter) + "__PLOTLY_JSON_END__")

# Diagnostics: residus vs fitted
res = model.resid
fitted = model.fittedvalues
fig_resid = px.scatter(x=fitted, y=res, labels={'x': 'Valeurs ajustées (Fitted)', 'y': 'Résidus'}, title='Résidus vs Valeurs ajustées')
fig_resid.add_hline(y=0, line_dash='dash', line_color='red')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_resid) + "__PLOTLY_JSON_END__")

# Diagnostics: QQ Plot des résidus (utilisation des quantiles normaux avec plotly ou sm)
import scipy.stats as stats
import numpy as np
import plotly.graph_objects as go
qq = stats.probplot(res, dist="norm")
fig_qq = go.Figure()
fig_qq.add_trace(go.Scatter(x=qq[0][0], y=qq[0][1], mode='markers', name='Data'))
x_line = np.array([min(qq[0][0]), max(qq[0][0])])
y_line = qq[1][1] + qq[1][0] * x_line
fig_qq.add_trace(go.Scatter(x=x_line, y=y_line, mode='lines', name='Normal', line=dict(color='red', dash='dash')))
fig_qq.update_layout(title='QQ Plot des Résidus', xaxis_title='Quantiles Théoriques', yaxis_title='Quantiles Observés')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_qq) + "__PLOTLY_JSON_END__")
`;

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Régression Simple: ${dependent} ~ ${independent}`,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      toast.error('Analyse échouée: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <TestSelector 
          options={OPTIONS}
          selected={['ols']}
          onToggle={() => {}}
          label="Modèle de régression"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariableSelector 
            variables={numericCols}
            selected={dependent}
            onSelect={setDependent}
            label="Variable Dépendante (Y)"
          />
          <VariableSelector 
            variables={numericCols}
            selected={independent}
            onSelect={setIndependent}
            label="Variable Explicative (X)"
          />
        </div>
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !dependent || !independent} 
          className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
        </Button>
      </div>
    </div>
  );
}
