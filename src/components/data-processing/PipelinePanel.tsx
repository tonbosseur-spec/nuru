import React from 'react';
import { TransformationStep } from '../../store';
import { 
  X, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Settings2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';

interface PipelinePanelProps {
  pipeline: TransformationStep[];
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onReorder: (newPipeline: TransformationStep[]) => void;
}

export function PipelinePanel({ pipeline, onRemove, onToggle, onReorder }: PipelinePanelProps) {
  if (pipeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
            <Clock className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-700 mb-1">Pipeline vide</h4>
        <p className="text-xs text-slate-400">Appliquez des outils de traitement pour construire votre chaîne de transformation.</p>
      </div>
    );
  }

  return (
    <Reorder.Group axis="y" values={pipeline} onReorder={onReorder} className="space-y-4 relative">
        {/* Connection line */}
        <div className="absolute left-[31px] top-6 bottom-6 w-[2px] bg-indigo-100 z-0" />

      {pipeline.map((step, index) => (
        <Reorder.Item 
          key={step.id} 
          value={step}
          className={`relative z-10 p-3 rounded-xl border transition-all ${step.enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-transparent opacity-60'}`}
        >
          <div className="flex items-start">
            <div className={`mt-0.5 mr-3 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2 font-bold text-xs ${step.enabled ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {index + 1}
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[13px] font-bold truncate uppercase tracking-wide ${step.enabled ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.category.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => onToggle(step.id)}
                    className={`p-1 rounded transition-colors ${step.enabled ? 'text-indigo-500 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-200'}`}
                    title={step.enabled ? "Désactiver" : "Activer"}
                  >
                    {step.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button 
                    onClick={() => onRemove(step.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center text-[12px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 mb-2 w-fit">
                {step.description}
              </div>

              <div className="flex items-center flex-wrap gap-1">
                 {Object.entries(step.params).map(([key, val]) => (
                   <span key={key} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/50 flex items-center">
                     <Settings2 className="h-2.5 w-2.5 mr-1" />
                     {key}: <b className="ml-1 text-slate-700">{String(val)}</b>
                   </span>
                 ))}
              </div>
            </div>
            
            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-400">
              <GripVertical className="h-4 w-4" />
            </div>
          </div>
          
          {index < pipeline.length - 1 && (
            <div className="absolute -bottom-4 left-[31px] -translate-x-1/2 z-20">
                 <div className="bg-white p-0.5 border border-indigo-100 rounded-full">
                    <ArrowRight className="h-3 w-3 text-indigo-400 rotate-90" />
                 </div>
            </div>
          )}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
