/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from './store';
import { AppLayout } from './components/layout/AppLayout';
import { Onboarding } from './components/auth/Onboarding';
import { WelcomeScreen } from './components/home/WelcomeScreen';

export default function App() {
  const { user, currentWorkspaceId } = useStore();

  if (!user) {
    return <Onboarding />;
  }

  if (!currentWorkspaceId) {
    return <WelcomeScreen />;
  }

  return <AppLayout />;
}

