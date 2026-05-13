import React from 'react';
import { useStore } from '@/store';
import { ScrollArea } from './ui/scroll-area';
import { Hash, Type, HelpCircle } from 'lucide-react';

export function VariablePanel() {
  const { datasetName, columns, rowCount } = useStore();

  if (!datasetName) {
     return (
       <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
         <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
         <p className="text-sm">Load a dataset to view variables</p>
       </div>
     );
  }

  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'categorical');

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-slate-800">Variables</h3>
        <p className="text-xs text-slate-500 mt-1">{columns.length} variables, {rowCount} cases</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          
          {numericCols.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                Numeric ({numericCols.length})
              </h4>
              <ul className="space-y-1">
                {numericCols.map(col => (
                  <li key={col.name} className="flex items-center text-sm px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-slate-200 cursor-grab active:cursor-grabbing group transition-colors">
                    <Hash className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
                    <span className="truncate flex-1 font-medium text-slate-700">{col.name}</span>
                    {col.missing > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded ml-2" title={`Missing values: ${col.missing}`}>
                        {col.missing}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {catCols.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                Categorical ({catCols.length})
              </h4>
              <ul className="space-y-1">
                {catCols.map(col => (
                  <li key={col.name} className="flex items-center text-sm px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-slate-200 cursor-grab active:cursor-grabbing group transition-colors">
                    <Type className="w-4 h-4 mr-2 text-orange-500 shrink-0" />
                    <span className="truncate flex-1 font-medium text-slate-700">{col.name}</span>
                    {col.missing > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded ml-2" title={`Missing values: ${col.missing}`}>
                        {col.missing}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
