import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
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
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 w-full max-w-5xl mx-auto overflow-y-auto">
      {/* Left side: Navigation */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 bg-slate-50 border-b font-bold text-xs uppercase tracking-wider text-slate-500">Sous-catégories</div>
          <div className="flex flex-col p-2 space-y-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
                  ${activeCategory === cat.id 
                    ? 'bg-indigo-600 text-white font-medium shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'}`}
              >
                <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-indigo-200' : cat.color}`} />
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Config */}
      <div className="flex-1 min-w-0">
         <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col bg-white">
            <div className="p-3 bg-slate-50 border-b font-bold text-xs uppercase tracking-wider text-slate-500">
              Configuration de {activeSpec.label}
            </div>
            <CardContent className="p-6">
              {activeSpec.component}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
