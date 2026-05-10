import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { engine } from '@/src/lib/pythonEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function Charts() {
  const { columns, addResult, isEngineReady } = useStore();
  const [chartType, setChartType] = useState<string>('histogram');
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'categorical');

  const runAnalysis = async () => {
    if (!var1) return;
    
    setIsRunning(true);
    let code = '';
    let title = '';

    if (chartType === 'histogram') {
       title = `Histogram: ${var1}`;
       code = `# Histogram for ${var1}
fig = px.histogram(df, x='${var1}', title='${title}', template='plotly_white')
print("__PLOTLY_JSON__" + pio.to_json(fig))
`;
    } else if (chartType === 'boxplot') {
       title = `Boxplot: ${var1} ${var2 ? `by ${var2}` : ''}`;
       code = `# Boxplot
fig = px.box(df, y='${var1}'${var2 ? `, x='${var2}'` : ''}, title='${title}', template='plotly_white')
print("__PLOTLY_JSON__" + pio.to_json(fig))
`;
    } else if (chartType === 'scatter') {
       if (!var2) {
           toast.error('Scatterplot requires a second variable (Y)');
           setIsRunning(false);
           return;
       }
       title = `Scatterplot: ${var1} vs ${var2}`;
       code = `# Scatterplot
fig = px.scatter(df, x='${var1}', y='${var2}', title='${title}', template='plotly_white', trendline='ols')
print("__PLOTLY_JSON__" + pio.to_json(fig))
`;
    } else if (chartType === 'barplot') {
       if (!var2) {
           toast.error('Barplot requires a grouping variable');
           setIsRunning(false);
           return;
       }
       title = `Barplot: ${var1} by ${var2}`;
       code = `# Barplot (Means)
agg_df = df.groupby('${var2}')['${var1}'].mean().reset_index()
fig = px.bar(agg_df, x='${var2}', y='${var1}', title='${title} (Mean)', template='plotly_white')
print("__PLOTLY_JSON__" + pio.to_json(fig))
`;
    }

    try {
      const res = await engine.runCode(code);
      addResult({
        id: Date.now().toString(),
        title,
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
          <Label className="mb-1.5 block">Chart Type</Label>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger>
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="histogram">Histogram</SelectItem>
              <SelectItem value="boxplot">Boxplot</SelectItem>
              <SelectItem value="scatter">Scatterplot</SelectItem>
              <SelectItem value="barplot">Barplot (Means)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
           <Label className="mb-1.5 block">{chartType === 'scatter' ? 'X Variable (Numeric)' : 'Main Variable (Numeric)'}</Label>
          <Select value={var1} onValueChange={setVar1}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {numericCols.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(chartType === 'boxplot' || chartType === 'scatter' || chartType === 'barplot') && (
           <div>
             <Label className="mb-1.5 block">
                {chartType === 'scatter' ? 'Y Variable (Numeric)' : 'Grouping Variable (Categorical - Optional for Boxplot)'}
             </Label>
             <Select value={var2} onValueChange={setVar2}>
               <SelectTrigger>
                 <SelectValue placeholder={chartType === 'boxplot' ? 'None' : 'Select...'} />
               </SelectTrigger>
               <SelectContent>
                  {chartType === 'boxplot' && <SelectItem value="">None</SelectItem>}
                  {(chartType === 'scatter' ? numericCols : catCols).filter(c => c.name !== var1).map(c => (
                     <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
               </SelectContent>
             </Select>
           </div>
        )}
      </div>
      
      <div className="pt-4 border-t">
         <Button onClick={runAnalysis} disabled={!isEngineReady || isRunning || !var1 || (chartType === 'scatter' && !var2) || (chartType === 'barplot' && !var2)} className="w-full bg-blue-600 hover:bg-blue-700">
           {isRunning ? 'Rendering...' : 'Generate Chart'}
         </Button>
      </div>
    </div>
  );
}
