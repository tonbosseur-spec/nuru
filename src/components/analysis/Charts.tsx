import React, { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import { ResultsArea } from '../ResultsArea';
import { HelpCircle } from 'lucide-react';

import { VariableSelector } from './AnalysisUI';

export function Charts() {
  const { columns, addResult, isEngineReady } = useStore();
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Options state
  const [theme, setTheme] = useState('plotly_white');
  const [bins, setBins] = useState([30]);
  const [showOutliers, setShowOutliers] = useState(true);
  const [orientation, setOrientation] = useState('v');
  const [opacity, setOpacity] = useState([0.7]);
  const [trendline, setTrendline] = useState('none');

  const toggleVar = (name: string) => {
    setSelectedVars(prev => {
      const isSelected = prev.includes(name);
      const newSelection = isSelected ? prev.filter(v => v !== name) : [...prev, name];
      return newSelection;
    });
    setSelectedChart(null);
  };

  const selectedColInfos = selectedVars.map(v => columns.find(c => c.name === v)!).filter(Boolean);
  const numVars = selectedColInfos.filter(c => c.type === 'numeric').map(c => c.name);
  const catVars = selectedColInfos.filter(c => c.type === 'categorical').map(c => c.name);
  const num = numVars.length;
  const cat = catVars.length;

  const proposals = useMemo(() => {
    if (num === 1 && cat === 0) {
      return [
        { id: 'histogram', label: 'Histogramme', group: 'Distribution', rec: true },
        { id: 'density', label: 'Density plot', group: 'Distribution' },
        { id: 'boxplot', label: 'Boxplot', group: 'Dispersion', rec: true },
        { id: 'violin', label: 'Violin plot', group: 'Dispersion' },
        { id: 'strip', label: 'Strip plot', group: 'Dispersion' },
      ];
    } else if (num === 0 && cat === 1) {
      return [
        { id: 'barplot', label: 'Diagramme en barres', group: 'Fréquence', rec: true },
        { id: 'pie', label: 'Pie chart', group: 'Proportion' },
        { id: 'treemap', label: 'Treemap', group: 'Proportion' },
      ];
    } else if (num === 2 && cat === 0) {
      return [
        { id: 'scatter', label: 'Scatter plot', group: 'Relation', rec: true },
        { id: 'scatter_trend', label: 'Scatter + Régression', group: 'Relation', rec: true },
        { id: 'density2d', label: '2D Density plot', group: 'Relation' },
      ];
    } else if (num === 1 && cat === 1) {
      return [
        { id: 'boxplot_group', label: 'Boxplots groupés', group: 'Comparaison', rec: true },
        { id: 'violin_group', label: 'Violin plots groupés', group: 'Comparaison' },
        { id: 'strip_group', label: 'Strip plots groupés', group: 'Comparaison' },
        { id: 'hist_facet', label: 'Histogrammes facettés', group: 'Distribution' },
      ];
    } else if (num === 0 && cat === 2) {
      return [
        { id: 'bar_group', label: 'Barplots groupés', group: 'Association', rec: true },
        { id: 'bar_stack', label: 'Barplots empilés', group: 'Association' },
        { id: 'heatmap_freq', label: 'Heatmap de fréquences', group: 'Association' },
      ];
    } else if (num >= 2 && cat === 0) {
      return [
        { id: 'scatter_matrix', label: 'Scatter matrix (Pair plot)', group: 'Multivarié', rec: true },
        { id: 'heatmap_corr', label: 'Heatmap de corrélation', group: 'Multivarié', rec: true },
      ];
    }
    return [];
  }, [num, cat]);

  const generatePyCode = () => {
    let code = `import plotly.express as px\nimport plotly.io as pio\n`;
    const themeStr = `template='${theme}'`;

    const codeBins = bins?.[0] ?? 30;
    const codeOpacity = opacity?.[0] ?? 0.7;

    if (num === 1 && cat === 0) {
      const v = numVars[0];
      if (selectedChart === 'histogram') {
        const o = orientation === 'h' ? `y='${v}'` : `x='${v}'`;
        code += `fig = px.histogram(df, ${o}, nbins=${codeBins}, opacity=${codeOpacity}, title='Histogramme: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'density') {
        code += `import plotly.figure_factory as ff\nfig = ff.create_distplot([df['${v}'].dropna()], ['${v}'], bin_size=max((df['${v}'].max()-df['${v}'].min())/${codeBins}, 1e-9))\nfig.update_layout(title='Density Plot: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'boxplot') {
        const o = orientation === 'h' ? `x='${v}'` : `y='${v}'`;
        const pts = showOutliers ? "'outliers'" : 'False';
        code += `fig = px.box(df, ${o}, points=${pts}, title='Boxplot: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'violin') {
        const o = orientation === 'h' ? `x='${v}'` : `y='${v}'`;
        code += `fig = px.violin(df, ${o}, box=True, points='all', title='Violin Plot: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'strip') {
        const o = orientation === 'h' ? `x='${v}'` : `y='${v}'`;
        code += `fig = px.strip(df, ${o}, title='Strip Plot: ${v}', ${themeStr})\n`;
      }
    } else if (num === 0 && cat === 1) {
      const v = catVars[0];
      if (selectedChart === 'barplot') {
        code += `counts = df['${v}'].value_counts().reset_index()\ncounts.columns = ['${v}', 'Count']\n`;
        const o = orientation === 'h' ? `y='${v}', x='Count', orientation='h'` : `x='${v}', y='Count'`;
        code += `fig = px.bar(counts, ${o}, title='Barplot: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'pie') {
        code += `counts = df['${v}'].value_counts().reset_index()\ncounts.columns = ['${v}', 'Count']\n`;
        code += `fig = px.pie(counts, names='${v}', values='Count', title='Pie Chart: ${v}', ${themeStr})\n`;
      } else if (selectedChart === 'treemap') {
        code += `counts = df['${v}'].value_counts().reset_index()\ncounts.columns = ['${v}', 'Count']\n`;
        code += `fig = px.treemap(counts, path=['${v}'], values='Count', title='Treemap: ${v}', ${themeStr})\n`;
      }
    } else if (num === 2 && cat === 0) {
      const [v1, v2] = numVars;
      if (selectedChart === 'scatter') {
        code += `fig = px.scatter(df, x='${v1}', y='${v2}', opacity=${codeOpacity}, title='Scatter: ${v1} vs ${v2}', ${themeStr})\n`;
      } else if (selectedChart === 'scatter_trend') {
        const t = (trendline === 'none' || !trendline) ? "'ols'" : `'${trendline}'`;
        code += `fig = px.scatter(df, x='${v1}', y='${v2}', trendline=${t}, opacity=${codeOpacity}, title='Scatter + Trend: ${v1} vs ${v2}', ${themeStr})\n`;
      } else if (selectedChart === 'density2d') {
        code += `fig = px.density_contour(df, x='${v1}', y='${v2}', title='2D Density: ${v1} vs ${v2}', ${themeStr})\n`;
      }
    } else if (num === 1 && cat === 1) {
      const n = numVars[0];
      const c = catVars[0];
      if (selectedChart === 'boxplot_group') {
        const pts = showOutliers ? "'outliers'" : 'False';
        const o = orientation === 'h' ? `x='${n}', y='${c}', orientation='h'` : `x='${c}', y='${n}'`;
        code += `fig = px.box(df, ${o}, color='${c}', points=${pts}, title='Boxplots: ${n} par ${c}', ${themeStr})\n`;
      } else if (selectedChart === 'violin_group') {
        const o = orientation === 'h' ? `x='${n}', y='${c}', orientation='h'` : `x='${c}', y='${n}'`;
        code += `fig = px.violin(df, ${o}, color='${c}', box=True, points='all', title='Violin: ${n} par ${c}', ${themeStr})\n`;
      } else if (selectedChart === 'strip_group') {
        const o = orientation === 'h' ? `x='${n}', y='${c}', orientation='h'` : `x='${c}', y='${n}'`;
        code += `fig = px.strip(df, ${o}, color='${c}', title='Strip: ${n} par ${c}', ${themeStr})\n`;
      } else if (selectedChart === 'hist_facet') {
        code += `fig = px.histogram(df, x='${n}', color='${c}', facet_col='${c}', opacity=${codeOpacity}, nbins=${codeBins}, title='Histograms: ${n} par ${c}', ${themeStr})\n`;
      }
    } else if (num === 0 && cat === 2) {
      const [c1, c2] = catVars;
      if (selectedChart === 'bar_group' || selectedChart === 'bar_stack') {
        const brmode = selectedChart === 'bar_group' ? 'group' : 'stack';
        code += `counts = df.groupby(['${c1}', '${c2}']).size().reset_index(name='Count')\n`;
        code += `fig = px.bar(counts, x='${c1}', y='Count', color='${c2}', barmode='${brmode}', title='Barplot: ${c1} / ${c2}', ${themeStr})\n`;
      } else if (selectedChart === 'heatmap_freq') {
        code += `cross_tab = pd.crosstab(df['${c1}'], df['${c2}'])\n`;
        code += `fig = px.imshow(cross_tab, text_auto=True, title='Heatmap: ${c1} / ${c2}', ${themeStr})\n`;
      }
    } else if (num >= 2 && cat === 0) {
      if (selectedChart === 'scatter_matrix') {
        code += `fig = px.scatter_matrix(df, dimensions=${JSON.stringify(numVars)}, title='Scatter Matrix', ${themeStr})\n`;
      } else if (selectedChart === 'heatmap_corr') {
        code += `corr = df[${JSON.stringify(numVars)}].corr()\n`;
        code += `fig = px.imshow(corr, text_auto=True, title='Heatmap Corrélation', ${themeStr})\n`;
      }
    }

    code += `print("__PLOTLY_JSON_START__" + pio.to_json(fig) + "__PLOTLY_JSON_END__")\n`;
    return code;
  };

  const runAnalysis = async () => {
    if (!selectedChart) return;
    setIsRunning(true);
    
    const code = generatePyCode();
    
    let title = "Graphique";
    const prop = proposals.find(p => p.id === selectedChart);
    if (prop) title = prop.label;

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
      toast.success('Le graphique a été généré avec succès.');
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const groupedProposals = proposals.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<string, typeof proposals>);

  return (
    <div className="flex bg-slate-50 gap-4 h-full min-h-0 p-3 md:p-5 overflow-hidden">
      {/* 1. SELECTION VARIABLES & PROPOSALS */}
      <div className="w-[300px] shrink-0 flex flex-col gap-4 min-h-0">
        
        {/* Variables Selection */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[50%]">
          <VariableSelector 
            variables={columns}
            selected={selectedVars}
            onSelect={toggleVar}
            label="Variables d'intérêt"
            multi
          />
        </div>

        {/* Proposals */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[50%]">
          <div className="p-2.5 bg-slate-50 border-b font-bold text-[10px] uppercase tracking-wider text-slate-400">
            Graphiques proposés
          </div>
          <ScrollArea className="flex-1 p-3">
            {proposals.length === 0 ? (
              <div className="text-slate-400 text-xs italic text-center p-4">
                Sélectionnez des variables pour voir les graphiques compatibles.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedProposals).map(([group, list]) => (
                  <div key={group} className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{group}</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {(list as any[]).map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedChart(p.id)}
                          className={`flex items-center justify-between p-2 border rounded-md text-left transition-all ${selectedChart === p.id ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                          <span className="text-[13px]">{p.label}</span>
                          {p.rec && <span className="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1 rounded">Recommandé</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

      </div>

      {/* 2. ZONE GRAPHIQUE (RESULTS) */}
      <div className="flex-1 min-w-[400px] flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-0">
         <ResultsArea />
      </div>

      {/* 3. OPTIONS */}
      <div className="w-[300px] shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-0">
        <div className="p-2.5 bg-slate-50 border-b font-bold text-[10px] uppercase tracking-wider text-slate-400">
          Options du graphique
        </div>
        
        {selectedChart ? (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <Label>Thème</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plotly_white">Clair (Plotly White)</SelectItem>
                    <SelectItem value="plotly_dark">Sombre (Plotly Dark)</SelectItem>
                    <SelectItem value="ggplot2">ggplot2</SelectItem>
                    <SelectItem value="seaborn">seaborn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(selectedChart === 'histogram' || selectedChart === 'hist_facet') && (
                <div className="space-y-3">
                  <Label className="flex justify-between">
                    <span>Nombre de classes (bins)</span>
                    <span className="text-slate-500">{bins[0]}</span>
                  </Label>
                  <Slider value={bins} onValueChange={setBins} min={5} max={100} step={1} />
                </div>
              )}

              {(['scatter', 'scatter_trend', 'histogram', 'hist_facet'].includes(selectedChart)) && (
                <div className="space-y-3">
                    <Label className="flex justify-between">
                    <span>Transparence (Opacité)</span>
                    <span className="text-slate-500">{opacity[0]}</span>
                  </Label>
                  <Slider value={opacity} onValueChange={setOpacity} min={0.1} max={1} step={0.1} />
                </div>
              )}

              {(['boxplot', 'boxplot_group'].includes(selectedChart)) && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="outliers" checked={showOutliers} onCheckedChange={(c) => setShowOutliers(!!c)} />
                  <Label htmlFor="outliers" className="font-normal cursor-pointer">Afficher les outliers</Label>
                </div>
              )}

              {(['barplot', 'histogram', 'boxplot', 'violin', 'strip', 'boxplot_group', 'violin_group', 'strip_group'].includes(selectedChart)) && (
                  <div>
                  <Label>Orientation</Label>
                  <Select value={orientation} onValueChange={setOrientation}>
                    <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v">Vertical (Defaut)</SelectItem>
                      <SelectItem value="h">Horizontal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedChart === 'scatter_trend' && (
                <div>
                  <Label>Type de régression</Label>
                  <Select value={trendline} onValueChange={setTrendline}>
                    <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ols">Linéaire (OLS)</SelectItem>
                      <SelectItem value="lowess">Lissage (LOWESS)</SelectItem>
                      <SelectItem value="expanding">Moyenne (Expanding)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <HelpCircle className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Sélectionnez un graphique pour configurer ses options.</p>
          </div>
        )}

        <div className="p-3 border-t bg-slate-50 mt-auto">
          <Button 
            onClick={runAnalysis} 
            disabled={!isEngineReady || isRunning || !selectedChart} 
            className="w-full bg-blue-600 hover:bg-blue-700 h-10"
          >
            {isRunning ? 'Génération...' : 'Créer le graphique'}
          </Button>
        </div>
      </div>
      
    </div>
  );
}

