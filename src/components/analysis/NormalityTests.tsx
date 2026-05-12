import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

data = df['${selectedVar}'].dropna()
results = []

${selectedTests.includes('shapiro') ? `
# Shapiro-Wilk
stat, p = stats.shapiro(data)
results.append({'Test': 'Shapiro-Wilk', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('ks') ? `
# Kolmogorov-Smirnov
stat, p = stats.kstest(data, 'norm', args=(data.mean(), data.std()))
results.append({'Test': 'Kolmogorov-Smirnov', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('jarque_bera') ? `
# Jarque-Bera
stat, p = stats.jarque_bera(data)
results.append({'Test': 'Jarque-Bera', 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('dagostino') ? `
# D'Agostino-Pearson
stat, p = stats.normaltest(data)
results.append({'Test': "D'Agostino-Pearson", 'Statistic': stat, 'p-value': p, 'Interpretation': interpret_p(p)})
` : ''}

${selectedTests.includes('anderson') ? `
# Anderson-Darling
res = stats.anderson(data)
# Anderson-Darling returns multiple values, let's take critical value at 5%
stat = res.statistic
crit = res.critical_values[2] # 5% level
interp = "Normal" if stat < crit else "Not Normal"
results.append({'Test': 'Anderson-Darling', 'Statistic': stat, 'p-value': None, 'Interpretation': f"{interp} (Crit: {crit:.4f})"})
` : ''}

res_df = pd.DataFrame(results)

print(f"<h3>Normality Analysis: ${selectedVar}</h3>")
print(res_df.round(4).to_html(classes=['table', 'table-bordered'], index=False, na_rep='-'))

print("<div className='mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-slate-800'>")
print("<h4 className='font-bold text-blue-900 mb-2'>Interprétation des Résultats</h4>")
print("<p className='mb-1'>L'hypothèse nulle (H0) des tests de normalité postule que la distribution suit une loi normale. Une p-value inférieure à 0.05 signifie que la distribution <b>s'écarte significativement de la normalité</b>.</p>")
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
      
      <div className="pt-4 border-t border-slate-100">
         <Button 
           onClick={runAnalysis} 
           disabled={!isEngineReady || isRunning || !selectedVar || selectedTests.length === 0} 
           className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
         >
           {isRunning ? 'Analyse en cours...' : 'Lancer les Tests'}
         </Button>
      </div>
    </div>
  );
}
