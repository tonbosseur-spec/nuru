/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from './store';
import { AppLayout } from './components/layout/AppLayout';
import { Onboarding } from './components/auth/Onboarding';
import { WelcomeScreen } from './components/home/WelcomeScreen';

import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const { user, currentWorkspaceId } = useStore();

  const content = () => {
    if (!user) {
      return <Onboarding />;
    }

    if (!currentWorkspaceId) {
      return <WelcomeScreen />;
    }

    return <AppLayout />;
  };

  return (
    <TooltipProvider delay={300}>
      {content()}
    </TooltipProvider>
  );
}

