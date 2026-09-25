import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@fontsource/caprasimo/400.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/baloo-2/500.css';
import '@fontsource/baloo-2/700.css';
import './styles/organic.css';
import './styles/app.css';
import { LangProvider } from './lib/i18n';
import FarmerApp from './farmer/FarmerApp';
import Staff from './staff/Staff';
import SmsInbox from './channels/SmsInbox';
import IvrSim from './channels/IvrSim';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/staff/*" element={<Staff />} />
          <Route path="/sms" element={<SmsInbox />} />
          <Route path="/ivr" element={<IvrSim />} />
          <Route path="*" element={<FarmerApp />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  </React.StrictMode>
);
