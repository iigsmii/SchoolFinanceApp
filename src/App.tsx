import React, { useEffect } from 'react';
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

  // Listen to Phone Hardware Back button & Browser popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      goBack();
    };

    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      goBack();
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('backbutton', handleHardwareBack);

    // Capacitor App listener if running in native APK
    let capacitorListenerRemove: (() => void) | null = null;
    const capacitorApp = (window as any).Capacitor?.Plugins?.App;
    if (capacitorApp && typeof capacitorApp.addListener === 'function') {
      capacitorApp
        .addListener('backButton', () => {
          goBack();
        })
        .then((handler: any) => {
          if (handler && typeof handler.remove === 'function') {
            capacitorListenerRemove = () => handler.remove();
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('backbutton', handleHardwareBack);
      if (capacitorListenerRemove) capacitorListenerRemove();
    };
  }, [goBack]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const handleExitApp = () => {
    setShowExitModal(false);
    // If native Capacitor Android app, exit gracefully
    const capacitorApp = (window as any).Capacitor?.Plugins?.App;
    if (capacitorApp && typeof capacitorApp.exitApp === 'function') {
      capacitorApp.exitApp();
    } else {
      logout();
    }
  };

  const renderScreen = () => {
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
