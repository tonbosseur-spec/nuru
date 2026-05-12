import React from 'react';
import { AnalysisContainer } from './AnalysisContainer';
import { DescriptiveStats } from '../analysis/DescriptiveStats';
import { BivariateAnalysis } from '../analysis/BivariateAnalysis';
import { BarChart3, Binary } from 'lucide-react';

export function DescriptiveArea() {
  return (
    <AnalysisContainer
      categories={[
        { id: 'univar', label: 'Univariées', icon: BarChart3, color: 'text-blue-500', component: <DescriptiveStats /> },
        { id: 'bivar', label: 'Bivariées', icon: Binary, color: 'text-green-500', component: <BivariateAnalysis /> },
      ]}
    />
  );
}
