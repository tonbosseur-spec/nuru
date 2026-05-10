import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-0 p-4 md:p-6">
      {/* Left side: Navigation & Config */}
      <div className="w-full xl:w-[450px] shrink-0 flex gap-4 h-[600px] xl:h-full min-h-0">
        <div className="w-48 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm shrink-0">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs uppercase tracking-wider text-slate-500">Analyses</div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col p-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
                    ${activeCategory === cat.id 
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-100 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <cat.icon className={`w-4 h-4 ${cat.color} ${activeCategory === cat.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
           <Card className="border-slate-200 shadow-sm h-full rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b font-semibold text-xs uppercase tracking-wider text-slate-500">
                {activeSpec.label}
              </div>
              <ScrollArea className="flex-1">
                <CardContent className="p-5">
                  {activeSpec.component}
                </CardContent>
              </ScrollArea>
           </Card>
        </div>
      </div>

      {/* Right side: Results */}
      <div className="flex-1 overflow-hidden min-h-[400px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
         <ResultsArea />
      </div>
    </div>
  );
}
