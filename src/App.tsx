import React from 'react';
import { useApp } from './context/AppContext';
import { LoginScreen } from './components/screens/LoginScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { StudentsScreen } from './components/screens/StudentsScreen';
import { TuitionScreen } from './components/screens/TuitionScreen';
import { ChequesScreen } from './components/screens/ChequesScreen';
import { ExpensesScreen } from './components/screens/ExpensesScreen';
import { TransactionsScreen } from './components/screens/TransactionsScreen';
import { StatementScreen } from './components/screens/StatementScreen';
import { MyClaimScreen } from './components/screens/MyClaimScreen';
import { ReportScreen } from './components/screens/ReportScreen';
import { BankScreen } from './components/screens/BankScreen';
import { ManagersScreen } from './components/screens/ManagersScreen';
import { SchoolsScreen } from './components/screens/SchoolsScreen';
import { MessagesScreen } from './components/screens/MessagesScreen';
import { ActivityScreen } from './components/screens/ActivityScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

export const App: React.FC = () => {
  const { currentUser, currentScreen } = useApp();

  if (!currentUser) {
    return <LoginScreen />;
  }

  switch (currentScreen) {
    case 'students':
      return <StudentsScreen />;
    case 'tuition':
      return <TuitionScreen />;
    case 'cheques':
      return <ChequesScreen initialMode="review" />;
    case 'cheque_list':
      return <ChequesScreen initialMode="list" />;
    case 'expenses':
      return <ExpensesScreen />;
    case 'transactions':
      return <TransactionsScreen />;
    case 'statement':
      return <StatementScreen />;
    case 'claim':
      return <MyClaimScreen />;
    case 'report':
      return <ReportScreen />;
    case 'bank':
      return <BankScreen />;
    case 'managers':
      return <ManagersScreen />;
    case 'schools':
      return <SchoolsScreen />;
    case 'messages':
      return <MessagesScreen />;
    case 'activity':
      return <ActivityScreen />;
    case 'settings':
    case 'export':
      return <SettingsScreen />;
    case 'dashboard':
    default:
      return <DashboardScreen />;
  }
};
