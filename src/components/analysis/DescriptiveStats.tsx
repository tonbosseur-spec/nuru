import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function DescriptiveStats() {
  const { columns, addResult, isEngineReady } = useStore();
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  
  // Options
  const [showStats, setShowStats] = useState(true);
  const [showHist, setShowHist] = useState(true);
  const [histBins, setHistBins] = useState('30');
  const [showBoxplot, setShowBoxplot] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [showQQ, setShowQQ] = useState(false);
  
  const [showBar, setShowBar] = useState(true);
  const [showPie, setShowPie] = useState(false);

  const selectedCol = columns.find(c => c.name === selectedVar);
  const isNum = selectedCol?.type === 'numeric';

  const runAnalysis = async () => {
    if (!selectedVar || !selectedCol) return;
    
    setIsRunning(true);
    let code = `import plotly.express as px\nimport plotly.io as pio\nimport plotly.graph_objects as go\nimport scipy.stats as stats\nimport numpy as np\n`;
    
    code += `print("<h3>Statistiques Univariées : ${selectedVar}</h3>")\n`;

    if (isNum) {
      if (showStats) {
        code += `
v = df['${selectedVar}'].dropna()
desc = {
  'Moyenne': v.mean(),
  'Médiane': v.median(),
  'Mode': v.mode()[0] if not v.mode().empty else np.nan,
  'Somme': v.sum(),
  'Variance': v.var(),
  'Écart-type': v.std(),
  'Étendue': v.max() - v.min(),
  'Minimum': v.min(),
  'Maximum': v.max(),
  'Q1': v.quantile(0.25),
  'Q3': v.quantile(0.75),
  'IIR (IQR)': v.quantile(0.75) - v.quantile(0.25),
  'CV (%)': (v.std() / v.mean() * 100) if v.mean() != 0 else np.nan,
  'Asymétrie (Skewness)': v.skew(),
  'Kurtosis': v.kurtosis(),
  'Effectif (N)': len(v),
  'Valeurs manquantes': df['${selectedVar}'].isna().sum()
}
import pandas as pd
res_df = pd.DataFrame(list(desc.items()), columns=['Statistique', 'Valeur'])
print(res_df.round(4).to_html(index=False, classes=['table', 'table-bordered']))

# Interprétation auto skewness
skew = desc['Asymétrie (Skewness)']
if pd.isna(skew):
    interp = "Impossible de calculer l'asymétrie."
elif skew > 1:
    interp = "La variable présente une forte asymétrie positive (étalée vers la droite)."
elif skew > 0.5:
    interp = "La variable présente une légère asymétrie positive."
elif skew < -1:
    interp = "La variable présente une forte asymétrie négative (étalée vers la gauche)."
elif skew < -0.5:
    interp = "La variable présente une légère asymétrie négative."
else:
    interp = "La distribution est approximativement symétrique."
print(f"<p className='mt-2 p-3 bg-slate-50 border rounded'><b>Interprétation :</b> {interp}</p>")
`;
      }
      
      if (showHist) {
        code += `
import plotly.figure_factory as ff
hist_data = [df['${selectedVar}'].dropna()]
group_labels = ['${selectedVar}']
# Fallback to simple histogram if ff.create_distplot fails on specific data
try:
    fig_hist = ff.create_distplot(hist_data, group_labels, bin_size=(df['${selectedVar}'].max()-df['${selectedVar}'].min() ) / int(${histBins}), curve_type='normal', show_rug=False)
    fig_hist.update_layout(title='Histogramme avec courbe normale', template='plotly_white')
    print("__PLOTLY_JSON__" + pio.to_json(fig_hist))
except Exception as e:
    fig = px.histogram(df, x='${selectedVar}', nbins=int(${histBins}), title='Histogramme', template='plotly_white')
    print("__PLOTLY_JSON__" + pio.to_json(fig))
`;
      }
      if (showBoxplot) {
        code += `
fig_box = px.box(df, y='${selectedVar}', title='Boxplot', template='plotly_white')
print("__PLOTLY_JSON__" + pio.to_json(fig_box))
`;
      }
      if (showDensity) {
        code += `
# Fallback to general distplot
try:
    fig_dens = ff.create_distplot([df['${selectedVar}'].dropna()], ['${selectedVar}'], show_hist=False, show_rug=False)
    fig_dens.update_layout(title='Graphe de Densité')
    print("__PLOTLY_JSON__" + pio.to_json(fig_dens))
except: pass
`;
      }
      if (showQQ) {
        code += `
qq = stats.probplot(df['${selectedVar}'].dropna(), dist="norm")
fig_qq = go.Figure()
fig_qq.add_trace(go.Scatter(x=qq[0][0], y=qq[0][1], mode='markers', name='Data'))
x_line = np.array([min(qq[0][0]), max(qq[0][0])])
y_line = qq[1][1] + qq[1][0] * x_line
fig_qq.add_trace(go.Scatter(x=x_line, y=y_line, mode='lines', name='Normal', line=dict(color='red', dash='dash')))
fig_qq.update_layout(title='QQ Plot', xaxis_title='Quantiles Théoriques', yaxis_title='Quantiles Observés')
print("__PLOTLY_JSON__" + pio.to_json(fig_qq))
`;
      }
    } else {
      // Qualitatives
      if (showStats) {
         code += `
counts = df['${selectedVar}'].value_counts(dropna=False).reset_index()
counts.columns = ['Modalité', 'Effectifs (N)']
counts['Fréquences'] = counts['Effectifs (N)'] / len(df)
counts['Pourcentages (%)'] = counts['Fréquences'] * 100
counts['Pourcentages Cumulés (%)'] = counts['Pourcentages (%)'].cumsum()
print(counts.round(2).to_html(index=False, classes=['table', 'table-bordered']))
`;
      }
      if (showBar) {
        code += `
fig_bar = px.bar(counts, x='Modalité', y='Effectifs (N)', title='Diagramme en Barres')
print("__PLOTLY_JSON__" + pio.to_json(fig_bar))
`;
      }
      if (showPie) {
        code += `
fig_pie = px.pie(counts, names='Modalité', values='Effectifs (N)', title='Diagramme Circulaire')
print("__PLOTLY_JSON__" + pio.to_json(fig_pie))
`;
      }
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Univariées: ${selectedVar}`,
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
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Variable</Label>
          <Select value={selectedVar} onValueChange={setSelectedVar}>
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {columns.map(c => (
                <SelectItem key={c.name} value={c.name}>{c.name} ({c.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVar && (
          <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
            <h4 className="font-semibold text-sm">Options d'analyse</h4>
            <div className="flex items-center justify-between">
              <Label>Statistiques descriptives</Label>
              <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
            </div>
            
            {isNum ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>Histogramme + Courbe</Label>
                  <input type="checkbox" checked={showHist} onChange={e => setShowHist(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
                {showHist && (
                  <div className="pl-4 flex items-center space-x-2">
                    <Label className="text-xs">Classes:</Label>
                    <Input type="number" className="w-20 h-7 text-xs" value={histBins} onChange={e => setHistBins(e.target.value)} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                   <Label>Boxplot (Moustaches)</Label>
                   <input type="checkbox" checked={showBoxplot} onChange={e => setShowBoxplot(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
                <div className="flex items-center justify-between">
                   <Label>Graphe de Densité</Label>
                   <input type="checkbox" checked={showDensity} onChange={e => setShowDensity(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
                <div className="flex items-center justify-between">
                   <Label>QQ Plot (Normalité)</Label>
                   <input type="checkbox" checked={showQQ} onChange={e => setShowQQ(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label>Diagramme en barres</Label>
                  <input type="checkbox" checked={showBar} onChange={e => setShowBar(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Diagramme Circulaire</Label>
                  <input type="checkbox" checked={showPie} onChange={e => setShowPie(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <Button onClick={runAnalysis} disabled={!isEngineReady || isRunning || !selectedVar} className="w-full">
        {isRunning ? 'Calcul...' : 'Lancer l\'analyse'}
      </Button>
    </div>
  );
}
