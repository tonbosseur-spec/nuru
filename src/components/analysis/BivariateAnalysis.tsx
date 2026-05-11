import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function BivariateAnalysis() {
  const { columns, addResult, isEngineReady } = useStore();
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Options
  const [showScatter, setShowScatter] = useState(true);
  const [showCorrMatrix, setShowCorrMatrix] = useState(true);
  
  const [showChi2, setShowChi2] = useState(true);
  const [showEffectifs, setShowEffectifs] = useState(true);
  const [showMosaic, setShowMosaic] = useState(false);
  const [showBarGrouped, setShowBarGrouped] = useState(true);

  const [showMeansInfo, setShowMeansInfo] = useState(true);
  const [showBoxplots, setShowBoxplots] = useState(true);
  const [showViolins, setShowViolins] = useState(false);

  const v1 = columns.find(c => c.name === var1);
  const v2 = columns.find(c => c.name === var2);

  const runAnalysis = async () => {
    if (!v1 || !v2) return;

    setIsRunning(true);
    let code = `import plotly.express as px\nimport plotly.io as pio\nimport plotly.graph_objects as go\nimport scipy.stats as stats\nimport pandas as pd\nimport numpy as np\n`;
    
    code += `print("<h3>Statistiques Bivariées : ${var1} vs ${var2}</h3>")\n`;

    if (v1.type === 'numeric' && v2.type === 'numeric') {
      // Quant vs Quant
      code += `
d_clean = df[['${var1}', '${var2}']].dropna()
x = d_clean['${var1}']
y = d_clean['${var2}']

covar = np.cov(x, y)[0, 1]
corr_p, p_p = stats.pearsonr(x, y)
corr_s, p_s = stats.spearmanr(x, y)

print("<h4>Calculs de Corrélation et Association</h4>")
print(f"<p><b>Covariance :</b> {covar:.4f}</p>")
print(f"<p><b>Corrélation Pearson (linéaire) :</b> {corr_p:.4f} (p-value: {p_p:.4e})</p>")
print(f"<p><b>Corrélation Spearman (rangs) :</b> {corr_s:.4f} (p-value: {p_s:.4e})</p>")
`;
      if (showScatter) {
        code += `
fig_scatter = px.scatter(d_clean, x='${var1}', y='${var2}', trendline='ols', title='Nuage de points')
print("__PLOTLY_JSON__" + pio.to_json(fig_scatter))
`;
      }
      if (showCorrMatrix) {
        code += `
corr_matrix = df.select_dtypes(include=[np.number]).corr()
fig_hm = px.imshow(corr_matrix, text_auto=True, title='Heatmap globale (Pearson)', color_continuous_scale='RdBu_r')
print("__PLOTLY_JSON__" + pio.to_json(fig_hm))
`;
      }
    } else if (v1.type === 'categorical' && v2.type === 'categorical') {
      // Qual vs Qual
      code += `
ct = pd.crosstab(df['${var1}'], df['${var2}'])
ct_pct_col = pd.crosstab(df['${var1}'], df['${var2}'], normalize='columns') * 100
ct_pct_row = pd.crosstab(df['${var1}'], df['${var2}'], normalize='index') * 100
`;
      if (showChi2) {
        code += `
chi2, p, dof, ex = stats.chi2_contingency(ct)
n = ct.sum().sum()
# Cramer's V
min_dim = min(ct.shape) - 1
if min_dim == 0:
    cramer_v = 0
else:
    cramer_v = np.sqrt(chi2 / (n * min_dim))

print("<h4>Test d'indépendance (Chi-2) et Force de liaison</h4>")
print(f"<p><b>Statistique Chi-2 :</b> {chi2:.4f}</p>")
print(f"<p><b>Degrés de liberté :</b> {dof}</p>")
print(f"<p><b>P-value :</b> {p:.4e}</p>")
print(f"<p><b>V de Cramer :</b> {cramer_v:.4f}</p>")
`;
      }

      if (showEffectifs) {
        code += `
print("<h4>Tableau Croisé (Effectifs)</h4>")
print(ct.to_html(classes=['table', 'table-bordered']))
print("<h4>Pourcentages en Ligne (%)</h4>")
print(ct_pct_row.round(2).to_html(classes=['table', 'table-bordered']))
`;
      }

      if (showMosaic) {
        code += `
fig_parcat = go.Figure(go.Parcats(
    dimensions=[
        {'label': '${var1}', 'values': df['${var1}'].dropna()},
        {'label': '${var2}', 'values': df['${var2}'].dropna()}
    ],
))
fig_parcat.update_layout(title='Diagramme des parallèles (Mosaic effect)')
print("__PLOTLY_JSON__" + pio.to_json(fig_parcat))
`;
      }

      if (showBarGrouped) {
        code += `
ct_melt = ct.reset_index().melt(id_vars='${var1}')
fig_bar = px.bar(ct_melt, x='${var1}', y='value', color='${var2}', barmode='group', title='Barres groupées')
print("__PLOTLY_JSON__" + pio.to_json(fig_bar))
`;
      }

    } else {
      // Quant vs Qual
      const numV = v1.type === 'numeric' ? var1 : var2;
      const catV = v1.type === 'numeric' ? var2 : var1;
      
      if (showMeansInfo) {
        code += `
print("<h4>Moyennes, Ecart-types et Médianes par groupe</h4>")
agg_df = df.groupby('${catV}')['${numV}'].agg(['mean', 'median', 'std', 'count']).reset_index()
agg_df.rename(columns={'mean': 'Moyenne', 'median': 'Médiane', 'std': 'Écart-type'}, inplace=True)
print(agg_df.round(4).to_html(classes=['table', 'table-bordered', 'w-full']))

# Mean plots (avec error bars)
agg_df['se'] = agg_df['Écart-type'] / np.sqrt(agg_df['count'])
fig_mean = px.scatter(agg_df, x='${catV}', y='Moyenne', error_y='se', title='Mean plots (avec erreur type)')
fig_mean.update_traces(mode='lines+markers', line=dict(dash='solid'))
print("__PLOTLY_JSON__" + pio.to_json(fig_mean))
`;
      }

      if (showBoxplots) {
        code += `
fig_box = px.box(df, x='${catV}', y='${numV}', color='${catV}', title='Boxplots conditionnels')
print("__PLOTLY_JSON__" + pio.to_json(fig_box))
`;
      }

      if (showViolins) {
        code += `
fig_violin = px.violin(df, x='${catV}', y='${numV}', color='${catV}', box=True, title='Violin plots')
print("__PLOTLY_JSON__" + pio.to_json(fig_violin))
`;
      }
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Bivariées: ${var1} & ${var2}`,
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

  const isNum1 = v1?.type === 'numeric';
  const isNum2 = v2?.type === 'numeric';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Variable 1</Label>
          <Select value={var1} onValueChange={setVar1}>
            <SelectTrigger><SelectValue placeholder="Sélectionner variable 1" /></SelectTrigger>
            <SelectContent>
              {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Variable 2</Label>
          <Select value={var2} onValueChange={setVar2}>
            <SelectTrigger><SelectValue placeholder="Sélectionner variable 2" /></SelectTrigger>
            <SelectContent>
              {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {v1 && v2 && v1 !== v2 && (
          <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
            <h4 className="font-semibold text-sm">Options de statistiques</h4>
            
            {isNum1 && isNum2 ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>Nuage de points (Scatter)</Label>
                  <input type="checkbox" checked={showScatter} onChange={e => setShowScatter(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Heatmap Corrélations</Label>
                  <input type="checkbox" checked={showCorrMatrix} onChange={e => setShowCorrMatrix(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
              </>
            ) : (!isNum1 && !isNum2) ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>Tests / Associations (Chi-2, Cramer)</Label>
                  <input type="checkbox" checked={showChi2} onChange={e => setShowChi2(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Tableaux croisés</Label>
                  <input type="checkbox" checked={showEffectifs} onChange={e => setShowEffectifs(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Barres groupées</Label>
                  <input type="checkbox" checked={showBarGrouped} onChange={e => setShowBarGrouped(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Diag. parallèles</Label>
                  <input type="checkbox" checked={showMosaic} onChange={e => setShowMosaic(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
              </>
            ) : (
               <>
                <div className="flex items-center justify-between">
                  <Label>Moyennes & Infos par Modalité</Label>
                  <input type="checkbox" checked={showMeansInfo} onChange={e => setShowMeansInfo(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Boxplots</Label>
                  <input type="checkbox" checked={showBoxplots} onChange={e => setShowBoxplots(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Violin Plots</Label>
                  <input type="checkbox" checked={showViolins} onChange={e => setShowViolins(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                </div>
              </>
            )}
          </div>
        )}

      </div>
      <Button onClick={runAnalysis} disabled={!isEngineReady || isRunning || !var1 || !var2 || var1 === var2} className="w-full">
        {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
      </Button>
    </div>
  );
}
