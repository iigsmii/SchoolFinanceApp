import React, { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
import { SmsScreen } from './components/screens/SmsScreen';
import { StaffScreen } from './components/screens/StaffScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const {
    currentUser,
    currentScreen,
    goBack,
    showExitModal,
    setShowExitModal,
    logout,
    accentColor,
  } = useApp();

  // Keep a fresh navigation callback without repeatedly tearing down native listeners.
  const goBackRef = useRef(goBack);
  useEffect(() => {
    goBackRef.current = goBack;
  }, [goBack]);

  // Browser Back and Android's native Back are separate events. Capacitor's
  // App plugin is the supported native entry point; popstate is only the web fallback.
  useEffect(() => {
    const installBrowserGuard = () => {
      try {
        window.history.pushState({ screen: 'app-back-guard' }, '', window.location.href);
      } catch {
        // Some embedded WebViews restrict history state changes.
      }
    };

    installBrowserGuard();
    let handlingBack = false;
    const dispatchBack = () => {
      if (handlingBack) return;
      handlingBack = true;
      try {
        goBackRef.current();
      } finally {
        installBrowserGuard();
        queueMicrotask(() => { handlingBack = false; });
      }
    };

    const handlePopState = () => dispatchBack();
    window.addEventListener('popstate', handlePopState);

    let listenerHandle: { remove: () => Promise<void> | void } | undefined;
    let disposed = false;
    // App.addListener is backed by the native Android plugin after cap sync.
    CapacitorApp.addListener('backButton', () => dispatchBack())
      .then((handle) => {
        if (disposed) {
          void handle.remove();
        } else {
          listenerHandle = handle;
        }
      })
      .catch(() => {
        // On ordinary browsers there is no native plugin; popstate remains active.
      });

    return () => {
      disposed = true;
      window.removeEventListener('popstate', handlePopState);
      if (listenerHandle) void listenerHandle.remove();
    };
  }, []);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const handleExitApp = () => {
    setShowExitModal(false);
    // Exit only after the user explicitly confirms the dashboard exit prompt.
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.exitApp();
    } else {
      logout();
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'finance_overview':
        return <DashboardScreen overviewOnly />;
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
      case 'sms_reminders':
        return <SmsScreen />;
      case 'staff':
        return <StaffScreen />;
      case 'settings':
      case 'export':
        return <SettingsScreen />;
      case 'dashboard':
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <>
      {renderScreen()}

      {/* Confirmation Modal when user presses Back on Dashboard to Exit App */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#e5dde8] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#341648]">خروج از سامانه</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                آیا مطمئن هستید که می‌خواهید از سیستم جامع امور مالی و حسابداری مدرسه القرآن الکریم خارج شوید؟
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
              >
                انصراف و ماندن
              </button>

              <button
                type="button"
                onClick={handleExitApp}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>تأیید و خروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PWA Update notification banner */}
      <PWAUpdatePrompt />
    </>
  );
};
