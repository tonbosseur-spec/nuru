import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Settings2, 
  Binary, 
  FileJson, 
  ShieldCheck, 
  Box, 
  Layers, 
  GitMerge, 
  TrendingUp, 
  History, 
  BrainCircuit, 
  FileText,
  Activity
} from 'lucide-react';
import { DescriptiveStats } from './analysis/DescriptiveStats';
import { NormalityTests } from './analysis/NormalityTests';
import { ParametricTests } from './analysis/ParametricTests';
import { RegressionAnalysis } from './analysis/RegressionAnalysis';
import { Charts } from './analysis/Charts';
import { DataPrep } from './analysis/DataPrep';
import { BivariateAnalysis } from './analysis/BivariateAnalysis';
import { MultivariateAnalysis } from './analysis/MultivariateAnalysis';
import { AssociationTests } from './analysis/AssociationTests';
import { NonParametricTests } from './analysis/NonParametricTests';
import { MLAnalysis } from './analysis/MLAnalysis';
import { TimeSeriesAnalysis } from './analysis/TimeSeriesAnalysis';
import { Reports } from './analysis/Reports';
import { ResultsArea } from './ResultsArea';

const CATEGORIES = [
  { id: 'data_prep', label: 'Data Prep', icon: Settings2, color: 'text-orange-500' },
  { id: 'univariate', label: 'Univariate', icon: BarChart3, color: 'text-blue-500' },
  { id: 'charts', label: 'Visualization', icon: Layers, color: 'text-purple-500' },
  { id: 'bivariate', label: 'Bivariate', icon: Binary, color: 'text-green-500' },
  { id: 'multivariate', label: 'Multivariate', icon: Box, color: 'text-indigo-500' },
  { id: 'normality', label: 'Normality', icon: ShieldCheck, color: 'text-emerald-500' },
  { id: 'parametric', label: 'Parametric', icon: Activity, color: 'text-rose-500' },
  { id: 'non_parametric', label: 'Non-Parametric', icon: GitMerge, color: 'text-amber-500' },
  { id: 'association', label: 'Association', icon: Binary, color: 'text-cyan-500' },
  { id: 'regression', label: 'Regression', icon: TrendingUp, color: 'text-red-500' },
  { id: 'time_series', label: 'Time Series', icon: History, color: 'text-sky-500' },
  { id: 'ml', label: 'Machine Learning', icon: BrainCircuit, color: 'text-violet-500' },
  { id: 'reports', label: 'Reports', icon: FileText, color: 'text-slate-500' },
];

export function AnalysisArea() {
  const [activeCategory, setActiveCategory] = useState('univariate');

  const renderAnalysisForm = () => {
    switch (activeCategory) {
      case 'data_prep': return <DataPrep />;
      case 'univariate': return <DescriptiveStats />;
      case 'charts': return <Charts />;
      case 'bivariate': return <BivariateAnalysis />;
      case 'multivariate': return <MultivariateAnalysis />;
      case 'normality': return <NormalityTests />;
      case 'parametric': return <ParametricTests />;
      case 'non_parametric': return <NonParametricTests />;
      case 'association': return <AssociationTests />;
      case 'regression': return <RegressionAnalysis />;
      case 'ml': return <MLAnalysis />;
      case 'time_series': return <TimeSeriesAnalysis />;
      case 'reports': return <Reports />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-0">
      {/* Left side: Analysis Navigation & Config */}
      <div className="w-full xl:w-[450px] shrink-0 flex gap-4 h-[600px] xl:h-full min-h-0">
        {/* Category Sidebar */}
        <div className="w-48 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm shrink-0">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs uppercase tracking-wider text-slate-500">Categories</div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col p-1">
              {CATEGORIES.map(cat => (
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

        {/* Configuration Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
           <Card className="border-slate-200 shadow-sm h-full rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b font-semibold text-xs uppercase tracking-wider text-slate-500">
                {CATEGORIES.find(c => c.id === activeCategory)?.label} Configuration
              </div>
              <ScrollArea className="flex-1">
                <CardContent className="p-5">
                  {renderAnalysisForm()}
                </CardContent>
              </ScrollArea>
           </Card>
        </div>
      </div>

      {/* Right side: Results Output Area */}
      <div className="flex-1 overflow-hidden min-h-[400px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
         <ResultsArea />
      </div>
    </div>
  );
}
