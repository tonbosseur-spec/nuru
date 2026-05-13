import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function MultipleRegression() {
  const { columns, addResult, isEngineReady } = useStore();
  const [dependent, setDependent] = useState<string>('');
  const [independents, setIndependents] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');

  const OPTIONS = [
    { 
      id: 'ols_multiple', 
      label: 'Régression Multiple (OLS)', 
      description: 'Estime l\'influence conjointe de plusieurs variables explicatives sur une variable dépendante unique.' 
    },
  ];

  const handleSelectIndependent = (colName: string) => {
    setIndependents(prev => 
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };

  const runAnalysis = async () => {
    if (!dependent || independents.length === 0) return;
    
    setIsRunning(true);
    const indepStr = independents.map(v => `'${v}'`).join(', ');

    let code = `
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio

indep_vars = [${indepStr}]
data = df[['${dependent}'] + indep_vars].dropna()
y = data['${dependent}']
X = data[indep_vars]
X_with_const = sm.add_constant(X)

model = sm.OLS(y, X_with_const).fit()

print(f"<h3>Régression Linéaire Multiple: {y.name} ~ {', '.join(indep_vars)}</h3>")

# Table
print(f"<h4>Coefficients et tests</h4>")
print(model.summary().tables[1].as_html())
print(f"<p className='mt-2'><b>R²:</b> {model.rsquared:.4f} | <b>R² ajusté:</b> {model.rsquared_adj:.4f} | <b>F-statistic:</b> {model.fvalue:.4f} (p={model.f_pvalue:.4e})</p>")

# VIF
print(f"<h4>Multicolinéarité (VIF)</h4>")
vifs = [variance_inflation_factor(X_with_const.values, i) for i in range(1, X_with_const.shape[1])]
vif_html = "<table className='table table-bordered w-full'><tr><th>Variable</th><th>VIF</th></tr>"
for var, vif in zip(indep_vars, vifs):
    color = "red" if vif > 5 else "green"
    vif_html += f"<tr><td>{var}</td><td style='color:{color}'>{vif:.2f}</td></tr>"
vif_html += "</table>"
print(vif_html)

# Diagnostics: QQ Plot des résidus
import scipy.stats as stats
import numpy as np
res = model.resid
qq = stats.probplot(res, dist="norm")
fig_qq = go.Figure()
fig_qq.add_trace(go.Scatter(x=qq[0][0], y=qq[0][1], mode='markers', name='Data'))
x_line = np.array([min(qq[0][0]), max(qq[0][0])])
y_line = qq[1][1] + qq[1][0] * x_line
fig_qq.add_trace(go.Scatter(x=x_line, y=y_line, mode='lines', name='Normal', line=dict(color='red', dash='dash')))
fig_qq.update_layout(title='QQ Plot des Résidus', xaxis_title='Quantiles Théoriques', yaxis_title='Quantiles Observés')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_qq) + "__PLOTLY_JSON_END__")

# Residuals vs Fitted
fitted = model.fittedvalues
fig_resid = px.scatter(x=fitted, y=res, labels={'x': 'Valeurs ajustées', 'y': 'Résidus'}, title='Homoscédasticité: Résidus vs Ajustées')
fig_resid.add_hline(y=0, line_dash='dash', line_color='red')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_resid) + "__PLOTLY_JSON_END__")
`;

    // Add partial regression plots loop inside python if we want, or just feature importance
    code += `
# Interpretation
pval = model.f_pvalue
r2 = model.rsquared

interp_pval = "Le modèle global est statistiquement significatif (p < 0.05)." if pval < 0.05 else "Le modèle global n'est pas statistiquement significatif (p >= 0.05)."
interp_r2 = f"Le modèle explique {r2*100:.1f}% de la variance de {y.name}."

significant_vars = [model.pvalues.index[i] for i, p in enumerate(model.pvalues) if p < 0.05 and model.pvalues.index[i] != 'const']

print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité Globale :</b> {interp_pval}</p>")
print(f"<p className='mb-1'><b>Pouvoir explicatif :</b> {interp_r2}</p>")
if len(significant_vars) > 0:
    print(f"<p><b>Variables significatives (p < 0.05) :</b> {', '.join(significant_vars)}.</p>")
else:
    print("<p>Aucune variable explicative n'est individuellement significative (p < 0.05).</p>")
print("</div>")

# Importance des variables (Coefficients standardisés absolus)
std_data = (data - data.mean()) / data.std()
std_X = sm.add_constant(std_data[indep_vars])
std_model = sm.OLS(std_data['${dependent}'], std_X).fit()
imp = std_model.params[1:].abs().sort_values(ascending=True)

fig_imp = px.bar(x=imp.values, y=imp.index, orientation='h', title='Importance des variables (Coefficients standardisés |β|)')
fig_imp.update_layout(xaxis_title='|β| standardisé', yaxis_title='Variable')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_imp) + "__PLOTLY_JSON_END__")
`;

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Régression Multiple: ${dependent}`,
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
          selected={['ols_multiple']}
          onToggle={() => {}}
          label="Modèle d'analyse"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 gap-6">
          <VariableSelector 
            variables={numericCols}
            selected={dependent}
            onSelect={setDependent}
            label="Variable Dépendante (Y)"
          />
          
          <VariableSelector 
            variables={numericCols.filter(c => c.name !== dependent)}
            selected={independents}
            onSelect={handleSelectIndependent}
            label="Variables Explicatives (X)"
            multi
          />
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-100">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !dependent || independents.length === 0} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer la Régression Multiple'}
        </Button>
      </div>
    </div>
  );
}
