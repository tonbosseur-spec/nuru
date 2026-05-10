import React from 'react';
import { AnalysisContainer } from './AnalysisContainer';
import { SimpleRegression } from '../analysis/SimpleRegression';
import { MultipleRegression } from '../analysis/MultipleRegression';
import { TrendingUp, Layers } from 'lucide-react';

export function RegressionArea() {
  return (
    <AnalysisContainer
      categories={[
        { id: '3.1', label: '3.1 Simple', icon: TrendingUp, color: 'text-red-500', component: <SimpleRegression /> },
        { id: '3.2', label: '3.2 Multiple', icon: Layers, color: 'text-purple-500', component: <MultipleRegression /> },
      ]}
    />
  );
}
