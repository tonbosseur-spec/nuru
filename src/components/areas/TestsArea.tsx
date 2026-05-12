import React from 'react';
import { AnalysisContainer } from './AnalysisContainer';
import { NormalityTests } from '../analysis/NormalityTests';
import { ParametricTests } from '../analysis/ParametricTests';
import { NonParametricTests } from '../analysis/NonParametricTests';
import { AssociationTests } from '../analysis/AssociationTests';
import { ShieldCheck, Activity, GitMerge, Binary } from 'lucide-react';

export function TestsArea() {
  return (
    <AnalysisContainer
      categories={[
        { id: 'normality', label: 'Normalité', icon: ShieldCheck, color: 'text-emerald-500', component: <NormalityTests /> },
        { id: 'parametric', label: 'Paramétriques', icon: Activity, color: 'text-rose-500', component: <ParametricTests /> },
        { id: 'nonparametric', label: 'Non Paramétriques', icon: GitMerge, color: 'text-amber-500', component: <NonParametricTests /> },
        { id: 'association', label: 'Association', icon: Binary, color: 'text-cyan-500', component: <AssociationTests /> },
      ]}
    />
  );
}
