import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { StatusBar } from './components/StatusBar';
import { ToastView } from './components/ToastView';
import { useSettings } from './db/settings';
import { EntryFormScreen } from './screens/EntryFormScreen';
import { LogbookScreen } from './screens/LogbookScreen';
import { LogTilesScreen } from './screens/LogTilesScreen';
import { MapScreen } from './screens/MapScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TripDetailScreen } from './screens/TripDetailScreen';
import { TripsScreen } from './screens/TripsScreen';

export function App() {
  const { theme } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <HashRouter>
      <div className="app">
        <StatusBar />
        <main className="content">
          <Routes>
            <Route path="/" element={<MapScreen />} />
            <Route path="/eintraege" element={<LogTilesScreen />} />
            <Route path="/eintrag/:type" element={<EntryFormScreen />} />
            <Route path="/eintrag/bearbeiten/:id" element={<EntryFormScreen />} />
            <Route path="/logbuch" element={<LogbookScreen />} />
            <Route path="/fahrten" element={<TripsScreen />} />
            <Route path="/fahrten/:id" element={<TripDetailScreen />} />
            <Route path="/einstellungen" element={<SettingsScreen />} />
          </Routes>
        </main>
        <BottomNav />
        <ToastView />
      </div>
    </HashRouter>
  );
}
