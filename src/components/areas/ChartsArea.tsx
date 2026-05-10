import React from 'react';
import { AnalysisContainer } from './AnalysisContainer';
import { Charts } from '../analysis/Charts';
import { Layers } from 'lucide-react';

export function ChartsArea() {
  return (
    <AnalysisContainer
      categories={[
        { id: '4.1', label: 'Graphiques libres', icon: Layers, color: 'text-purple-500', component: <Charts /> },
      ]}
    />
  );
}
