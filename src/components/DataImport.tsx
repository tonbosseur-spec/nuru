import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import { engine } from '@/src/lib/pythonEngine';
import { useStore } from '@/src/store';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function DataImport() {
  const { setDataset, isEngineReady, engineStatus } = useStore();
  const [isReading, setIsReading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isEngineReady) {
      toast.warning(`Python engine is still ${engineStatus.toLowerCase()}. Please wait.`);
      return;
    }
    
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsReading(true);
    
    try {
      let res;
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text();
        res = await engine.loadData(text);
      } else {
        const buffer = await file.arrayBuffer();
        res = await engine.loadFile(buffer, file.name);
      }
      
      if (res.error) {
        toast.error('Failed to load data: ' + res.error);
      } else {
        setDataset(file.name, res.columns, res.rows, res.csv);
        toast.success(`Loaded ${file.name} (${res.rows} rows)`);
      }
    } catch (err: any) {
      toast.error('Error reading file: ' + err.message);
    } finally {
      setIsReading(false);
    }
  }, [isEngineReady, setDataset, engineStatus]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onDrop as any,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/x-stata': ['.dta'],
      'application/x-spss-sav': ['.sav'],
      'application/json': ['.json']
    },
    maxFiles: 1
  } as any);

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Import Data</h2>
        <p className="text-slate-500">Upload your CSV, TXT or Excel dataset to begin analysis.</p>
      </div>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600">
            {isReading ? <FileSpreadsheet className="w-8 h-8 animate-pulse" /> : <UploadCloud className="w-8 h-8" />}
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">
              {isReading ? 'Processing data...' : isDragActive ? 'Drop file here' : 'Drag & drop a dataset here'}
            </p>
            <p className="text-sm text-slate-500 mt-1">or click to select file</p>
          </div>
          <div className="text-xs text-slate-400 mt-4 flex flex-wrap justify-center gap-2">
            <span className="px-2 py-1 bg-slate-100 rounded">.csv</span>
            <span className="px-2 py-1 bg-slate-100 rounded">.txt</span>
            <span className="px-2 py-1 bg-slate-100 rounded">.xlsx</span>
            <span className="px-2 py-1 bg-slate-100 rounded">.sav</span>
            <span className="px-2 py-1 bg-slate-100 rounded">.dta</span>
            <span className="px-2 py-1 bg-slate-100 rounded">.json</span>
          </div>
        </div>
      </div>
    </div>
  );
}
