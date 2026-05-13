import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function LogisticRegression() {
  const { columns, addResult, isEngineReady } = useStore();
  const [dependent, setDependent] = useState<string>('');
  const [independents, setIndependents] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // We can allow categorical as binary for dependent if we want, 
  // but let's just stick to all columns and try to coerce
  const numericCols = columns.filter(c => c.type === 'numeric' || c.type === 'categorical');

  const OPTIONS = [
    { 
      id: 'logit', 
      label: 'Régression Logistique', 
      description: 'Modélise la probabilité d\'un événement binaire en fonction d\'une ou plusieurs variables explicatives.' 
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
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio

indep_vars = [${indepStr}]
data = df[['${dependent}'] + indep_vars].dropna()
y = data['${dependent}']

# If y is categorical, try to map it to 0 and 1
if not pd.api.types.is_numeric_dtype(y) or len(y.unique()) == 2:
    classes = y.unique()
    if len(classes) == 2:
        y = y.map({classes[0]: 0, classes[1]: 1})
        print(f"<div class='mb-4 p-3 bg-slate-100 rounded text-sm text-slate-600'>Variable dépendante cencodée: <b>{classes[0]} -> 0</b>, <b>{classes[1]} -> 1</b></div>")
    else:
        print("<div class='mb-4 p-3 bg-red-100 text-red-700 rounded'>Erreur: La variable dépendante doit avoir exactement 2 modalités utiles pour la régression logistique binaire.</div>")
        raise Exception("Y must be binary")

X = data[indep_vars]
# Ensure X has only numeric types (dummy encoding done via prepare tab)
X = X.apply(pd.to_numeric, errors='coerce').dropna()
y = y.loc[X.index]

X_with_const = sm.add_constant(X)
model = sm.Logit(y, X_with_const).fit(disp=0)

print(f"<h3>Régression Logistique: {y.name} ~ {', '.join(indep_vars)}</h3>")

# Table
print(f"<h4>Coefficients et tests</h4>")
print(model.summary().tables[1].as_html())
print(f"<p className='mt-2'><b>Pseudo R² (McFadden):</b> {model.prsquared:.4f} | <b>Log-Likelihood:</b> {model.llf:.4f} | <b>LL-Null:</b> {model.llnull:.4f}</p>")

# Odds Ratios
print(f"<h4>Rapports de cotes (Odds Ratios)</h4>")
odds_ratios = np.exp(model.params)
conf = np.exp(model.conf_int())
conf['Odds Ratio'] = odds_ratios
conf.columns = ['2.5%', '97.5%', 'Odds Ratio']
print(conf.to_html(classes="table table-bordered w-full text-sm"))

# Interpretation
pval = model.llr_pvalue
interp_pval = "Le modèle global est statistiquement significatif (p < 0.05)." if pval < 0.05 else "Le modèle global n'est pas statistiquement significatif (p >= 0.05)."

significant_vars = [model.pvalues.index[i] for i, p in enumerate(model.pvalues) if p < 0.05 and model.pvalues.index[i] != 'const']

print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print(f"<p className='mb-1'><b>Significativité Globale :</b> {interp_pval}</p>")
if len(significant_vars) > 0:
    print(f"<p><b>Variables significatives (p < 0.05) :</b> {', '.join(significant_vars)}.</p>")
else:
    print("<p>Aucune variable explicative n'est individuellement significative (p < 0.05).</p>")

print("<h5 class='font-bold mt-3 mb-1'>Interprétation des Odds Ratios:</h5><ul class='list-disc pl-5'>")
for var in significant_vars:
    coef = odds_ratios[var]
    if coef > 1:
        print(f"<li><b>{var}</b>: Pour chaque unité supplémentaire, les chances (odds) de l'événement augmentent de {(coef-1)*100:.1f}%.</li>")
    else:
        print(f"<li><b>{var}</b>: Pour chaque unité supplémentaire, les chances (odds) de l'événement diminuent de {(1-coef)*100:.1f}%.</li>")
print("</ul></div>")

# Confusion matrix and ROC curve
from sklearn.metrics import confusion_matrix, roc_curve, auc
y_pred_prob = model.predict(X_with_const)
y_pred_class = (y_pred_prob > 0.5).astype(int)

cm = confusion_matrix(y, y_pred_class)
print(f"<h4>Matrice de confusion (Seuil = 0.5)</h4>")
cm_html = f'''<table class="table table-bordered w-auto mx-auto text-center">
    <tr><th></th><th>Prédit: 0</th><th>Prédit: 1</th></tr>
    <tr><th>Réel: 0</th><td>{cm[0,0]} (Vrais Négatifs)</td><td>{cm[0,1]} (Faux Positifs)</td></tr>
    <tr><th>Réel: 1</th><td>{cm[1,0]} (Faux Négatifs)</td><td>{cm[1,1]} (Vrais Positifs)</td></tr>
</table>'''
print(cm_html)

# Plot ROC
fpr, tpr, _ = roc_curve(y, y_pred_prob)
roc_auc = auc(fpr, tpr)
fig_roc = px.area(x=fpr, y=tpr, title=f'Courbe ROC (AUC = {roc_auc:.3f})',
                  labels=dict(x='Taux de Faux Positifs (FPR)', y='Taux de Vrais Positifs (TPR)'))
fig_roc.add_shape(type='line', line=dict(dash='dash'), x0=0, x1=1, y0=0, y1=1)
print("__PLOTLY_JSON_START__" + pio.to_json(fig_roc) + "__PLOTLY_JSON_END__")
`;

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Régression Logistique: ${dependent}`,
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
          selected={['logit']}
          onToggle={() => {}}
          label="Modèle d'analyse"
          allowMultiple={false}
        />

        <div className="grid grid-cols-1 gap-6">
          <VariableSelector 
            variables={numericCols}
            selected={dependent}
            onSelect={setDependent}
            label="Variable Dépendante Binaire (Y)"
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
          {isRunning ? 'Calcul en cours...' : 'Lancer la Régression Logistique'}
        </Button>
      </div>
    </div>
  );
}
