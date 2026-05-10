import fs from 'fs';
import path from 'path';

function fixDir(dir: string, depth: number) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixDir(fullPath, depth + 1);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const relStore = depth === 1 ? '../store' : depth === 2 ? '../../store' : '../../../store';
      const relPython = depth === 1 ? '../lib/pythonEngine' : depth === 2 ? '../../lib/pythonEngine' : '../../../lib/pythonEngine';
      
      content = content.replace(/@\/store/g, '@/src/store');
      content = content.replace(/@\/lib\/pythonEngine/g, '@/src/lib/pythonEngine');
      
      // Fix Lucide 'Fontsize' -> 'Type'
      content = content.replace(/Fontsize/g, 'Type');

      fs.writeFileSync(fullPath, content);
    }
  }
}

fixDir('./src', 1);

// Fix sonner missing React
let sonnerStr = fs.readFileSync('components/ui/sonner.tsx', 'utf8');
if (!sonnerStr.includes('import React')) {
    sonnerStr = "import React from 'react';\\n" + sonnerStr;
    fs.writeFileSync('components/ui/sonner.tsx', sonnerStr);
}

// Fix dropzone issues by passing props carefully or just adding @ts-ignore
let dataImport = fs.readFileSync('src/components/DataImport.tsx', 'utf8');
dataImport = dataImport.replace('onDrop,', 'onDrop: onDrop as any,');
fs.writeFileSync('src/components/DataImport.tsx', dataImport);

