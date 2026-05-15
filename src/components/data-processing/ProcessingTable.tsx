import React, { useMemo } from 'react';
import { useStore, ColumnInfo } from '../../store';
import { TableVirtuoso } from 'react-virtuoso';
import { 
  Type, 
  Hash, 
  Calendar, 
  Filter, 
  ChevronDown, 
  MoreHorizontal,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProcessingTableProps {
  data: any[];
  loading: boolean;
  searchQuery: string;
  onColumnSelect: (col: string) => void;
  selectedCol: string | null;
}

export function ProcessingTable({ data, loading, searchQuery, onColumnSelect, selectedCol }: ProcessingTableProps) {
  const { columns } = useStore();

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      )
    );
  }, [data, searchQuery]);

  // Mock histogram data generation for demo
  const getHistogram = (colName: string) => {
    // Just random bars for visual effect
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10) + 2);
  };

  const getColIcon = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'numeric': return <Hash className="h-3 w-3 text-blue-500" />;
      case 'datetime': return <Calendar className="h-3 w-3 text-red-500" />;
      default: return <Type className="h-3 w-3 text-amber-500" />;
    }
  };

  if (data.length === 0 && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 bg-slate-50/30">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center max-w-sm text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                <TableIcon className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-bold mb-2">Aucune donnée à traiter</h3>
            <p className="text-sm leading-relaxed">Importez un dataset pour commencer le nettoyage et les transformations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {loading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">Traitement...</span>
          </div>
        </div>
      )}

      <TableVirtuoso
        data={filteredData}
        className="custom-scrollbar"
        components={{
          Table: (props) => <table {...props} className="w-full text-left border-collapse min-w-max" />,
          TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref as any} className="sticky top-0 z-30 bg-white" />),
          TableRow: (props) => <tr {...props} className="border-b border-slate-100 transition-colors group" />,
          TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} />),
        }}
        fixedHeaderContent={() => (
          <>
            <tr className="bg-[#f8fafc] border-b-2 border-slate-200">
              <th className="w-14 px-4 py-3 bg-slate-50 sticky left-0 z-40 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)]"></th>
              {columns.map((col) => (
                <th 
                  key={col.name} 
                  className={`px-4 pt-4 pb-2 min-w-[200px] border-r border-slate-100 cursor-pointer transition-colors relative group ${selectedCol === col.name ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                  onClick={() => onColumnSelect(col.name)}
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 rounded bg-white border border-slate-200 shadow-sm">
                            {getColIcon(col.type)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate max-w-[120px]">{col.name}</span>
                      </div>
                      <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>

                    {/* Mini stats */}
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 space-x-2">
                        <span className="flex items-center uppercase">
                             {col.type}
                        </span>
                        {col.missing > 0 && (
                            <span className="text-red-500 flex items-center">
                                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                {((col.missing / filteredData.length) * 100).toFixed(1)}% N/A
                            </span>
                        )}
                        <span className="text-slate-300">|</span>
                        <span>{col.distinctCount || '?'} uniques</span>
                    </div>

                    {/* Sparkline header */}
                    <div className="h-8 flex items-end space-x-0.5 pb-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {getHistogram(col.name).map((h, i) => (
                            <div 
                                key={i} 
                                className={`flex-1 bg-indigo-500 rounded-t-[1px]`} 
                                style={{ height: `${h * 8}%` }}
                            />
                        ))}
                    </div>
                  </div>
                  {selectedCol === col.name && (
                    <motion.div layoutId="col-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full" />
                  )}
                </th>
              ))}
            </tr>
          </>
        )}
        itemContent={(idx, row) => (
          <>
            <td className="px-4 py-3 text-[10px] font-mono text-slate-400 bg-slate-50 sticky left-0 z-20 border-r border-slate-200 text-center shadow-[2px_0_4px_rgba(0,0,0,0.01)] group-hover:bg-indigo-50/50 transition-colors">
                {idx + 1}
            </td>
            {columns.map((col) => {
              const val = row[col.name];
              const isMissing = val === null || val === undefined || val === '';
              return (
                <td 
                  key={col.name} 
                  className={`px-4 py-3 text-[13px] border-r border-slate-50 transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${selectedCol === col.name ? 'bg-indigo-50/30' : 'group-hover:bg-slate-50/30'}`}
                >
                  {isMissing ? (
                    <div className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-red-400 text-[10px] font-bold rounded border border-red-100/50 animate-pulse uppercase tracking-tight">
                        Absence
                    </div>
                  ) : (
                    <span className={`${col.type === 'numeric' ? 'font-mono text-blue-600' : 'text-slate-600'}`}>
                      {String(val)}
                    </span>
                  )}
                </td>
              );
            })}
          </>
        )}
      />
    </div>
  );
}

function TableIcon({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>;
}
