import React, { useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { Terminal, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Console() {
  const { codeHistory } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [codeHistory]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeHistory.join('\\n\\n'));
    toast.success('Python code copied to clipboard');
  };

  if (codeHistory.length === 0) return null;

  return (
    <div className="h-48 border-t bg-[#1e1e1e] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center text-xs font-mono text-slate-300">
          <Terminal className="w-3.5 h-3.5 mr-2" />
          Python Syntax Generated
        </div>
        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 px-2 text-slate-400 hover:text-white hover:bg-white/10">
          <Copy className="w-3 h-3 mr-1" /> Copy Script
        </Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 font-mono text-sm">
          {codeHistory.map((code, idx) => (
            <div key={idx} className="mb-4 text-emerald-400 whitespace-pre-wrap">
              {code}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
