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

  const v1 = columns.find(c => c.name === var1);
  const v2 = columns.find(c => c.name === var2);

  const runAnalysis = async () => {
    if (!v1 || !v2) return;

    setIsRunning(true);
    let code = `import plotly.express as px\nimport plotly.io as pio\nimport plotly.graph_objects as go\nimport scipy.stats as stats\nimport pandas as pd\nimport numpy as np\n`;
    
    code += `print("<h3>Statistiques Bivariées : ${var1} vs ${var2}</h3>")\n`;

    if (v1.type === 'numeric' && v2.type === 'numeric') {
      // 1.2 Cas 1: Quant vs Quant
      code += `
d_clean = df[['${var1}', '${var2}']].dropna()
x = d_clean['${var1}']
y = d_clean['${var2}']

covar = np.cov(x, y)[0, 1]
corr_p, p_p = stats.pearsonr(x, y)
corr_s, p_s = stats.spearmanr(x, y)

print("<h4>Calculs d'association</h4>")
print(f"<p><b>Covariance :</b> {covar:.4f}</p>")
print(f"<p><b>Corrélation Pearson :</b> {corr_p:.4f} (p-value: {p_p:.4e})</p>")
print(f"<p><b>Corrélation Spearman :</b> {corr_s:.4f} (p-value: {p_s:.4e})</p>")

# Scatter plot
fig_scatter = px.scatter(d_clean, x='${var1}', y='${var2}', trendline='ols', title='Nuage de points (Scatter plot)')
print("__PLOTLY_JSON__" + pio.to_json(fig_scatter))

# Heatmap corrélation
corr_matrix = df.select_dtypes(include=[np.number]).corr()
fig_hm = px.imshow(corr_matrix, text_auto=True, title='Heatmap de corrélation globale', color_continuous_scale='RdBu_r')
print("__PLOTLY_JSON__" + pio.to_json(fig_hm))
`;
    } else if (v1.type === 'categorical' && v2.type === 'categorical') {
      // Cas 2: Qual vs Qual
      code += `
# Tableau croisé et fréquences
ct = pd.crosstab(df['${var1}'], df['${var2}'])
ct_pct_col = pd.crosstab(df['${var1}'], df['${var2}'], normalize='columns') * 100
ct_pct_row = pd.crosstab(df['${var1}'], df['${var2}'], normalize='index') * 100

print("<h4>Tableau Croisé (Effectifs)</h4>")
print(ct.to_html(classes=['table', 'table-bordered']))

print("<h4>Pourcentages en Ligne (%)</h4>")
print(ct_pct_row.round(2).to_html(classes=['table', 'table-bordered']))

print("<h4>Pourcentages en Colonne (%)</h4>")
print(ct_pct_col.round(2).to_html(classes=['table', 'table-bordered']))

# Heatmap / Mosaic
fig_hm2 = px.imshow(ct, text_auto=True, title='Heatmap des effectifs conjoints')
print("__PLOTLY_JSON__" + pio.to_json(fig_hm2))

# Barplot groupé
ct_melt = ct.reset_index().melt(id_vars='${var1}')
fig_bar = px.bar(ct_melt, x='${var1}', y='value', color='${var2}', barmode='group', title='Diagramme en barres groupé')
print("__PLOTLY_JSON__" + pio.to_json(fig_bar))

# Mosaic plot (Approximation via treemap or parcat in plotly)
fig_parcat = go.Figure(go.Parcats(
    dimensions=[
        {'label': '${var1}', 'values': df['${var1}'].dropna()},
        {'label': '${var2}', 'values': df['${var2}'].dropna()}
    ],
))
fig_parcat.update_layout(title='Diagramme des parallèles (Alternatives au Mosaic plot)')
print("__PLOTLY_JSON__" + pio.to_json(fig_parcat))
`;
    } else {
      // Cas 3: Quant vs Qual
      const numV = v1.type === 'numeric' ? var1 : var2;
      const catV = v1.type === 'numeric' ? var2 : var1;
      
      code += `
print("<h4>Moyennes et Écart-types par groupe</h4>")
agg_df = df.groupby('${catV}')['${numV}'].agg(['mean', 'std', 'count']).reset_index()
agg_df.rename(columns={'mean': 'Moyenne', 'std': 'Écart-type'}, inplace=True)
print(agg_df.round(4).to_html(classes=['table', 'table-bordered', 'w-full']))

# Boxplots groupés
fig_box = px.box(df, x='${catV}', y='${numV}', color='${catV}', title='Boxplots conditionnels')
print("__PLOTLY_JSON__" + pio.to_json(fig_box))

# Violin plots
fig_violin = px.violin(df, x='${catV}', y='${numV}', color='${catV}', box=True, title='Violin plots')
print("__PLOTLY_JSON__" + pio.to_json(fig_violin))

# Mean plots (avec error bars standard error)
agg_df['se'] = agg_df['Écart-type'] / np.sqrt(agg_df['count'])
fig_mean = px.scatter(agg_df, x='${catV}', y='Moyenne', error_y='se', title='Mean plots (avec erreur type)')
fig_mean.update_traces(mode='lines+markers', line=dict(dash='solid'))
print("__PLOTLY_JSON__" + pio.to_json(fig_mean))
`;
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Variable 1</Label>
          <Select value={var1} onValueChange={setVar1}>
            <SelectTrigger><SelectValue placeholder="Sélectionner variable 1" /></SelectTrigger>
            <SelectContent>
              {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Variable 2</Label>
          <Select value={var2} onValueChange={setVar2}>
            <SelectTrigger><SelectValue placeholder="Sélectionner variable 2" /></SelectTrigger>
            <SelectContent>
              {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={runAnalysis} disabled={!isEngineReady || isRunning || !var1 || !var2 || var1 === var2} className="w-full">
        {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
      </Button>
    </div>
  );
}
