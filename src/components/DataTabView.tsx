import React, { useEffect, useState } from 'react';
import { engine } from '@/src/lib/pythonEngine';
import { useStore } from '@/src/store';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export function DataTabView() {
  const { isEngineReady, rowCount, columns, datasetName } = useStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!isEngineReady) return;
      setLoading(true);
      try {
        // Fetch up to 100 rows for preview to keep rendering fast
        const code = `last_result = df.head(100).to_json(orient="records")`;
        const res = await engine.runCode(code);
        if (res.result) {
          const parsed = JSON.parse(res.result);
          setData(parsed);
        }
      } catch (err) {
        console.error("Failed to load data preview", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEngineReady, rowCount]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500">Loading data view...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Data View</h3>
        <p className="text-sm text-slate-500">Showing first {Math.min(rowCount, 100)} of {rowCount} rows</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="w-full">
          <Table>
            <TableHeader className="bg-slate-100/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r">#</TableHead>
                {columns.map(c => (
                  <TableHead key={c.name} className="whitespace-nowrap border-r font-semibold">
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-center border-r text-slate-400 bg-slate-50/50">{idx + 1}</TableCell>
                  {columns.map(c => (
                    <TableCell key={c.name} className="whitespace-nowrap border-r truncate max-w-[200px]" title={String(row[c.name])}>
                      {row[c.name] !== null ? String(row[c.name]) : <span className="text-slate-300 italic">NaN</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center h-32 text-slate-500">
                    No data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
