import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function NormalityTests() {
  const { columns, addResult, isEngineReady } = useStore();
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [selectedTests, setSelectedTests] = useState<string[]>(['shapiro', 'ks']);
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');

  const TESTS = [
    { id: 'shapiro', label: 'Shapiro-Wilk' },
    { id: 'ks', label: 'Kolmogorov-Smirnov' },
    { id: 'anderson', label: 'Anderson-Darling' },
    { id: 'jarque_bera', label: 'Jarque-Bera' },
    { id: 'dagostino', label: "D'Agostino-Pearson" },
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
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Variable</label>
          <Select value={selectedVar} onValueChange={setSelectedVar}>
            <SelectTrigger>
              <SelectValue placeholder="Select a numeric variable" />
            </SelectTrigger>
            <SelectContent>
              {numericCols.map(c => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">Tests to run</label>
          <div className="grid grid-cols-1 gap-2">
            {TESTS.map(test => (
              <div 
                key={test.id}
                onClick={() => toggleTest(test.id)}
                className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors flex justify-between items-center ${
                  selectedTests.includes(test.id) 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{test.label}</span>
                {selectedTests.includes(test.id) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t">
         <Button onClick={runAnalysis} disabled={!isEngineReady || isRunning || !selectedVar || selectedTests.length === 0} className="w-full bg-blue-600 hover:bg-blue-700">
           {isRunning ? 'Computing...' : 'Run Normality Tests'}
         </Button>
      </div>
    </div>
  );
}
