import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function MultipleRegression() {
  const { columns, addResult, isEngineReady } = useStore();
  const [dependent, setDependent] = useState<string>('');
  const [independents, setIndependents] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');

  const toggleIndependent = (colName: string) => {
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
print("__PLOTLY_JSON__" + pio.to_json(fig_qq))

# Residuals vs Fitted
fitted = model.fittedvalues
fig_resid = px.scatter(x=fitted, y=res, labels={'x': 'Valeurs ajustées', 'y': 'Résidus'}, title='Homoscédasticité: Résidus vs Ajustées')
fig_resid.add_hline(y=0, line_dash='dash', line_color='red')
print("__PLOTLY_JSON__" + pio.to_json(fig_resid))
`;

    // Add partial regression plots loop inside python if we want, or just feature importance
    code += `
# Importance des variables (Coefficients standardisés absolus)
std_data = (data - data.mean()) / data.std()
std_X = sm.add_constant(std_data[indep_vars])
std_model = sm.OLS(std_data['${dependent}'], std_X).fit()
imp = std_model.params[1:].abs().sort_values(ascending=True)

fig_imp = px.bar(x=imp.values, y=imp.index, orientation='h', title='Importance des variables (Coefficients standardisés |β|)')
fig_imp.update_layout(xaxis_title='|β| standardisé', yaxis_title='Variable')
print("__PLOTLY_JSON__" + pio.to_json(fig_imp))
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
      <div className="space-y-4">
        <div>
          <Label>Variable Dépendante (Y)</Label>
          <Select value={dependent} onValueChange={setDependent}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {numericCols.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block mb-2">Variables Explicatives (X)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
             {independents.map(ind => (
               <span key={ind} className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold select-none bg-slate-100 text-slate-800 cursor-pointer hover:bg-slate-200" onClick={() => toggleIndependent(ind)}>
                 {ind} ✕
               </span>
             ))}
          </div>
          <div className="border rounded-md p-2 h-40 overflow-y-auto space-y-1">
             {numericCols.filter(c => c.name !== dependent).map(c => (
               <div key={c.name} className="flex items-center space-x-2">
                 <input 
                   type="checkbox" 
                   id={`chk-${c.name}`} 
                   checked={independents.includes(c.name)}
                   onChange={() => toggleIndependent(c.name)}
                 />
                 <label htmlFor={`chk-${c.name}`} className="text-sm cursor-pointer select-none flex-1 opacity-70 hover:opacity-100">{c.name}</label>
               </div>
             ))}
          </div>
        </div>
      </div>
      <Button onClick={runAnalysis} className="w-full" disabled={isRunning || !dependent || independents.length === 0}>
        {isRunning ? 'Calcul en cours...' : 'Lancer la Régression Multiple'}
      </Button>
    </div>
  );
}
