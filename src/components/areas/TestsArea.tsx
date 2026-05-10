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
        { id: '2.1', label: '2.1 Normalité', icon: ShieldCheck, color: 'text-emerald-500', component: <NormalityTests /> },
        { id: '2.2', label: '2.2 Paramétriques', icon: Activity, color: 'text-rose-500', component: <ParametricTests /> },
        { id: '2.3', label: '2.3 Non Paramétriques', icon: GitMerge, color: 'text-amber-500', component: <NonParametricTests /> },
        { id: '2.4', label: '2.4 Association', icon: Binary, color: 'text-cyan-500', component: <AssociationTests /> },
      ]}
    />
  );
}
