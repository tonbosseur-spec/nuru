import React, { useState } from 'react';
import { 
  Check, 
  Info, 
  Search, 
  Type, 
  Hash, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

interface Variable {
  name: string;
  type: string;
}

interface VariableSelectorProps {
  variables: Variable[];
  selected: string | string[];
  onSelect: (name: string) => void;
  label?: string;
  multi?: boolean;
}

export function VariableSelector({ variables, selected, onSelect, label = "Choisir une variable", multi = false }: VariableSelectorProps) {
  const [search, setSearch] = useState('');
  
  const filtered = variables.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  
  const isSelected = (name: string) => {
    if (Array.isArray(selected)) return selected.includes(name);
    return selected === name;
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{label}</label>
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-[280px]">
        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {filtered.map(v => (
              <button
                key={v.name}
                onClick={() => onSelect(v.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group
                  ${isSelected(v.name) 
                    ? 'bg-indigo-600 text-white font-medium shadow-md' 
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  {v.type === 'numeric' ? (
                    <Hash className={`w-3.5 h-3.5 shrink-0 ${isSelected(v.name) ? 'text-indigo-200' : 'text-blue-400'}`} />
                  ) : (
                    <Type className={`w-3.5 h-3.5 shrink-0 ${isSelected(v.name) ? 'text-indigo-200' : 'text-amber-400'}`} />
                  )}
                  <span className="truncate">{v.name}</span>
                </div>
                {isSelected(v.name) && <Check className="w-4 h-4 text-white shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs italic">Aucune variable trouvée</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface TestOption {
  id: string;
  label: string;
  description: string;
  icon?: any;
}

interface TestSelectorProps {
  options: TestOption[];
  selected: string[];
  onToggle: (id: string) => void;
  label?: string;
  allowMultiple?: boolean;
}

export function TestSelector({ options, selected, onToggle, label = "Tests à effectuer", allowMultiple = true }: TestSelectorProps) {
  const isSelected = (id: string) => selected.includes(id);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{label}</label>
      <div className="space-y-1.5">
        {options.map(option => {
          const isActive = isSelected(option.id);
          return (
            <div 
              key={option.id}
              className={`relative rounded-xl border transition-all overflow-hidden group cursor-pointer
                ${isActive 
                  ? 'border-indigo-200 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-100' 
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
              onClick={() => onToggle(option.id)}
            >
              <div className="p-3 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0
                  ${isActive ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                  {isActive && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {option.label}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger 
                          className="cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded-full hover:bg-indigo-100/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px] text-xs p-3">
                          {option.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {(isActive || (!allowMultiple && isSelected(option.id))) && (
                    <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
