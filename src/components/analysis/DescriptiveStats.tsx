import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from 'sonner';

import { VariableSelector } from './AnalysisUI';
import { Checkbox } from '../ui/checkbox';

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
    print("__PLOTLY_JSON_START__" + pio.to_json(fig_hist) + "__PLOTLY_JSON_END__")
except Exception as e:
    fig = px.histogram(df, x='${selectedVar}', nbins=int(${histBins}), title='Histogramme', template='plotly_white')
    print("__PLOTLY_JSON_START__" + pio.to_json(fig) + "__PLOTLY_JSON_END__")
`;
      }
      if (showBoxplot) {
        code += `
fig_box = px.box(df, y='${selectedVar}', title='Boxplot', template='plotly_white')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_box) + "__PLOTLY_JSON_END__")
`;
      }
      if (showDensity) {
        code += `
# Fallback to general distplot
try:
    fig_dens = ff.create_distplot([df['${selectedVar}'].dropna()], ['${selectedVar}'], show_hist=False, show_rug=False)
    fig_dens.update_layout(title='Graphe de Densité')
    print("__PLOTLY_JSON_START__" + pio.to_json(fig_dens) + "__PLOTLY_JSON_END__")
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
print("__PLOTLY_JSON_START__" + pio.to_json(fig_qq) + "__PLOTLY_JSON_END__")
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
print("__PLOTLY_JSON_START__" + pio.to_json(fig_bar) + "__PLOTLY_JSON_END__")
`;
      }
      if (showPie) {
        code += `
fig_pie = px.pie(counts, names='Modalité', values='Effectifs (N)', title='Diagramme Circulaire')
print("__PLOTLY_JSON_START__" + pio.to_json(fig_pie) + "__PLOTLY_JSON_END__")
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
      <div className="space-y-6">
        <VariableSelector 
          variables={columns}
          selected={selectedVar}
          onSelect={setSelectedVar}
          label="Variable à analyser"
        />

        {selectedVar && (
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-inner">
            <h4 className="text-xs font-bold font-sans uppercase tracking-[0.1em] text-slate-400 px-1">Options d'analyse</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div 
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                onClick={() => setShowStats(!showStats)}
              >
                <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Statistiques descriptives</Label>
                <Checkbox checked={showStats} onCheckedChange={() => setShowStats(!showStats)} />
              </div>
              
              {isNum ? (
                <>
                  <div className="space-y-2">
                    <div 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                      onClick={() => setShowHist(!showHist)}
                    >
                      <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Histogramme</Label>
                      <Checkbox checked={showHist} onCheckedChange={() => setShowHist(!showHist)} />
                    </div>
                  </div>

                  <div 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => setShowBoxplot(!showBoxplot)}
                  >
                    <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Boxplot (Moustaches)</Label>
                    <Checkbox checked={showBoxplot} onCheckedChange={() => setShowBoxplot(!showBoxplot)} />
                  </div>

                  <div 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => setShowDensity(!showDensity)}
                  >
                    <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Graphe de Densité</Label>
                    <Checkbox checked={showDensity} onCheckedChange={() => setShowDensity(!showDensity)} />
                  </div>

                  <div 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => setShowQQ(!showQQ)}
                  >
                    <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">QQ Plot (Normalité)</Label>
                    <Checkbox checked={showQQ} onCheckedChange={() => setShowQQ(!showQQ)} />
                  </div>
                </>
              ) : (
                <>
                  <div 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => setShowBar(!showBar)}
                  >
                    <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Diagramme en barres</Label>
                    <Checkbox checked={showBar} onCheckedChange={() => setShowBar(!showBar)} />
                  </div>

                  <div 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => setShowPie(!showPie)}
                  >
                    <Label className="text-xs font-medium text-slate-600 cursor-pointer flex-1">Diagramme Circulaire</Label>
                    <Checkbox checked={showPie} onCheckedChange={() => setShowPie(!showPie)} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <Button 
          onClick={runAnalysis} 
          disabled={!isEngineReady || isRunning || !selectedVar} 
          className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isRunning ? 'Calcul en cours...' : 'Lancer l\'analyse'}
        </Button>
      </div>
    </div>
  );
}
