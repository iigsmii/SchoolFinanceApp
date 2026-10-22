import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';
import { installPersianLiveInputNormalizer } from './utils/persianInput';

// Initialize live Persian/Arabic digit and character normalizer immediately
installPersianLiveInputNormalizer();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);

