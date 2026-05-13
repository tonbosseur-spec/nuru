import React, { useState } from 'react';
import { useStore } from '@/store';
import { engine } from '@/lib/pythonEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function DataFilterDialog() {
  const { columns, datasetName, setDataset } = useStore();
  const [open, setOpen] = useState(false);
  const [column, setColumn] = useState('');
  const [operator, setOperator] = useState('');
  const [value, setValue] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // We keep a history of filtering code in python `codeHistory` if needed, but here we just mutate `df`.
  // To allow multiple filters, we just run the mutation. For 'Reset', we'd need a backup of df (like original_df).

  const handleApplyFilter = async () => {
    if (!column || !operator || (!value && operator !== 'dropna' && operator !== 'isnull')) {
      toast.error('Please fill all filter fields');
      return;
    }

    setIsFiltering(true);
    const colInfo = columns.find(c => c.name === column);
    const isNum = colInfo?.type === 'numeric';

    let condition = '';
    const valEscaped = isNum ? Number(value) : `"${value.replace(/"/g, '\\"')}"`;

    switch (operator) {
      case 'eq': condition = `df['${column}'] == ${valEscaped}`; break;
      case 'neq': condition = `df['${column}'] != ${valEscaped}`; break;
      case 'gt': condition = `df['${column}'] > ${valEscaped}`; break;
      case 'lt': condition = `df['${column}'] < ${valEscaped}`; break;
      case 'contains': condition = `df['${column}'].astype(str).str.contains(${valEscaped}, case=False, na=False)`; break;
      case 'dropna': condition = `df['${column}'].notna()`; break;
      case 'isnull': condition = `df['${column}'].isna()`; break;
    }

    const code = `
import pandas as pd
import io
old_rows = len(df)
df = df[${condition}].copy()
new_rows = len(df)

# Re-evaluate columns shape
column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({"name": col, "type": col_type, "missing": int(df[col].isnull().sum())})

last_result = {"columns": column_info, "rows": len(df), "removed": old_rows - len(df), "csv": df.to_csv(index=False)}
`;

    try {
      const res = await engine.runCode(code);
      if (res.result) {
        setDataset(datasetName!, res.result.columns, res.result.rows, res.result.csv);
        toast.success(`Filter applied. Removed ${res.result.removed} rows.`);
        setOpen(false);
        // Reset form
        setColumn(''); setOperator(''); setValue('');
      }
    } catch (err: any) {
      toast.error('Error applying filter: ' + err.message);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleReset = async () => {
     setIsFiltering(true);
     // If we saved the original csv_data, we could reload it.
     // Good news: 'csv_data' still exists in python globals!
     const code = `
import pandas as pd
import io
df = pd.read_csv(io.StringIO(csv_data))
column_info = []
for col in df.columns:
    col_type = 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
    column_info.append({"name": col, "type": col_type, "missing": int(df[col].isnull().sum())})
last_result = {"columns": column_info, "rows": len(df), "csv": df.to_csv(index=False)}
`;
     try {
       const res = await engine.runCode(code);
       if (res.result) {
           setDataset(datasetName!, res.result.columns, res.result.rows, res.result.csv);
           toast.success('Dataset restored to original imported state');
           setOpen(false);
       }
     } catch (err: any) {
       toast.error('Failed to reset: ' + err.message);
     } finally {
       setIsFiltering(false);
     }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 shadow-sm">
            <Filter className="w-4 h-4 mr-2" /> Filter Data
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Dataset</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Column</Label>
            <Select value={column} onValueChange={setColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Condition</Label>
             <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger>
                <SelectValue placeholder="Select operator..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Equals (=)</SelectItem>
                <SelectItem value="neq">Not Equal (!=)</SelectItem>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                <SelectItem value="contains">Contains (Text)</SelectItem>
                <SelectItem value="dropna">Is Not Missing</SelectItem>
                <SelectItem value="isnull">Is Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {operator !== 'dropna' && operator !== 'isnull' && (
             <div className="grid gap-2">
               <Label>Value</Label>
               <Input placeholder="Enter value..." value={value} onChange={e => setValue(e.target.value)} />
               <p className="text-[10px] text-slate-500">For text columns, wrap in quotes if exact match is needed manually, otherwise just type text.</p>
             </div>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between w-full">
           <Button variant="ghost" onClick={handleReset} disabled={isFiltering} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 h-9">
              <Trash2 className="w-4 h-4 mr-2" /> Reset to Original
           </Button>
           <Button onClick={handleApplyFilter} disabled={isFiltering || !column || !operator}>
             {isFiltering ? 'Applying...' : 'Apply Filter'}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
