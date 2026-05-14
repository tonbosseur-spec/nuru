import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

import { VariableSelector, TestSelector } from './AnalysisUI';

export function NormalityTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [selectedTests, setSelectedTests] = useState<string[]>(['shapiro']);
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');

  const TESTS = [
    { 
      id: 'shapiro', 
      label: 'Shapiro-Wilk',
      description: 'Le test le plus puissant pour les petits échantillons (n < 50). H0: La variable suit une loi normale.'
    },
    { 
      id: 'ks', 
      label: 'Kolmogorov-Smirnov',
      description: 'Compare la distribution observée à une loi normale théorique. Préférable pour les grands échantillons.'
    },
    { 
      id: 'anderson', 
      label: 'Anderson-Darling',
      description: 'Donne plus de poids aux queues de distribution que le test de Kolmogorov-Smirnov.'
    },
    { 
      id: 'jarque_bera', 
      label: 'Jarque-Bera',
      description: 'Basé sur l\'asymétrie (skewness) et l\'aplatissement (kurtosis). Efficace pour les grands échantillons.'
    },
    { 
      id: 'dagostino', 
      label: "D'Agostino-Pearson",
      description: 'Combine l\'asymétrie et l\'aplatissement pour évaluer l\'écart à la normalité.'
    },
  ];

  const toggleTest = (id: string) => {
    setSelectedTests(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const runAnalysis = async () => {
    if (!selectedVar || selectedTests.length === 0) return;
    
    setIsRunning(true);
    const code = `
import plotly.express as px
import plotly.io as pio
from scipy import stats
import pandas as pd
import numpy as np

def interpret_p(p):
    if pd.isna(p): return "-"
    return "Normal" if p >= 0.05 else "Non Normal"

data = df['${selectedVar}'].dropna()
results = []

${selectedTests.includes('shapiro') ? `
# Shapiro-Wilk
try:
    stat, p = stats.shapiro(data)
except Exception:
    stat, p = np.nan, np.nan
results.append({'Test': 'Shapiro-Wilk', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('ks') ? `
# Kolmogorov-Smirnov
try:
    stat, p = stats.kstest(data, 'norm', args=(data.mean(), data.std()))
except Exception:
    stat, p = np.nan, np.nan
results.append({'Test': 'Kolmogorov-Smirnov', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('jarque_bera') ? `
# Jarque-Bera
try:
    stat, p = stats.jarque_bera(data)
except Exception:
    stat, p = np.nan, np.nan
results.append({'Test': 'Jarque-Bera', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('dagostino') ? `
# D'Agostino-Pearson
try:
    stat, p = stats.normaltest(data)
except Exception:
    stat, p = np.nan, np.nan
results.append({'Test': "D'Agostino-Pearson", 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('anderson') ? `
# Anderson-Darling
try:
    res = stats.anderson(data)
    stat = res.statistic
    crit = res.critical_values[2] # 5% level
    interp = "Normal" if stat < crit else "Not Normal"
    interp_str = f"{interp} (Crit: {crit:.4f})"
except Exception:
    stat = np.nan
    interp_str = "Erreur"
results.append({'Test': 'Anderson-Darling', 'Statistic': stat, 'p-value': np.nan, 'Interpretation': interp_str})
` : ''}

res_df = pd.DataFrame(results)

print(f"<h3>Normality Analysis: ${selectedVar}</h3>")
print(res_df.round(4).to_html(classes=['table', 'table-bordered'], index=False, na_rep='-'))

print("<div class='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 class='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print("<p class='mb-1'>L'hypothèse nulle (H0) des tests de normalité postule que la distribution suit une loi normale. Une p-value inférieure à 0.05 signifie que la distribution <b>s'écarte significativement de la normalité</b>.</p>")
print("</div>")

if px:
    fig = px.histogram(df, x='${selectedVar}', marginal="box", title="Distribution of ${selectedVar}")
    print("__PLOTLY_JSON_START__" + pio.to_json(fig) + "__PLOTLY_JSON_END__")
`;

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title: `Normality Tests: ${selectedVar}`,
        code,
        output: res.output,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <VariableSelector 
          variables={numericCols}
          selected={selectedVar}
          onSelect={setSelectedVar}
          label="Variable Numérique"
        />

        <TestSelector 
          options={TESTS}
          selected={selectedTests}
          onToggle={toggleTest}
          label="Tests de Normalité"
        />
      </div>
      
      <div className="sticky bottom-0 pb-2 bg-slate-50/80 backdrop-blur-sm pt-4 mt-2 border-t border-slate-100 flex justify-end">
         <Button 
           onClick={runAnalysis} 
           disabled={!isEngineReady || isRunning || !selectedVar || selectedTests.length === 0} 
           className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
         >
           {isRunning ? 'Analyse en cours...' : 'Lancer l\'analyse'}
         </Button>
      </div>
    </div>
  );
}
