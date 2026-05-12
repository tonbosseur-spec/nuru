import React from 'react';
import { AnalysisContainer } from './AnalysisContainer';
import { SimpleRegression } from '../analysis/SimpleRegression';
import { MultipleRegression } from '../analysis/MultipleRegression';
import { LogisticRegression } from '../analysis/LogisticRegression';
import { TrendingUp, Layers, Activity } from 'lucide-react';

export function RegressionArea() {
  return (
    <AnalysisContainer
      categories={[
        { id: 'simple', label: 'Simple', icon: TrendingUp, color: 'text-red-500', component: <SimpleRegression /> },
        { id: 'multiple', label: 'Multiple', icon: Layers, color: 'text-purple-500', component: <MultipleRegression /> },
        { id: 'logistic', label: 'Logistique', icon: Activity, color: 'text-emerald-500', component: <LogisticRegression /> },
      ]}
    />
  );
}
