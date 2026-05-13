import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { ResultsArea } from '../ResultsArea';
import { LucideIcon } from 'lucide-react';

export interface CategorySpec {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  component: React.ReactNode;
}

interface Props {
  categories: CategorySpec[];
}

export function AnalysisContainer({ categories }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);

  const activeSpec = categories.find(c => c.id === activeCategory) || categories[0];

  if (!activeSpec) return null;

  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 p-3 md:p-5 overflow-y-auto xl:overflow-hidden">
      {/* Left side: Navigation & Config */}
      <div className="w-full xl:w-[420px] shrink-0 flex flex-col md:flex-row xl:flex-col gap-4 h-auto xl:h-full">
        <div className="w-full md:w-44 xl:w-full bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm shrink-0 h-auto md:h-auto xl:h-auto min-h-[200px]">
          <div className="p-2.5 bg-slate-50 border-b font-bold text-[10px] uppercase tracking-wider text-slate-400">Analyses</div>
          <ScrollArea className="flex-1 xl:max-h-none max-h-[300px]">
            <div className="flex flex-col p-1.5 space-y-0.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-md text-[12px] transition-all duration-200 group
                    ${activeCategory === cat.id 
                      ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100'}`}
                >
                  <cat.icon className={`w-3.5 h-3.5 ${activeCategory === cat.id ? 'text-white' : cat.color + ' opacity-80'}`} />
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
           <Card className="border-slate-200 shadow-sm h-full xl:h-full rounded-xl overflow-hidden flex flex-col bg-white min-h-[300px]">
              <div className="p-2.5 bg-slate-50 border-b font-bold text-[10px] uppercase tracking-wider text-slate-400">
                Configuration
              </div>
              <ScrollArea className="flex-1 max-h-[400px] xl:max-h-none w-full">
                <CardContent className="p-4">
                  {activeSpec.component}
                </CardContent>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
           </Card>
        </div>
      </div>

      {/* Right side: Results */}
      <div className="flex-1 min-h-[400px] xl:h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
         <ResultsArea />
      </div>
    </div>
  );
}
