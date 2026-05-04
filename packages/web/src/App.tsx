import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ScorekeeperSetupPage } from './pages/ScorekeeperSetupPage';
import { ScorekeeperHandPage } from './pages/ScorekeeperHandPage';
import { ScorekeeperHistoryPage } from './pages/ScorekeeperHistoryPage';
import { OnlineHomePage } from './pages/OnlineHomePage';
import { OnlineLobbyPage } from './pages/OnlineLobbyPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/scorekeeper/setup" element={<ScorekeeperSetupPage />} />
      <Route path="/scorekeeper/hand" element={<ScorekeeperHandPage />} />
      <Route path="/scorekeeper/history" element={<ScorekeeperHistoryPage />} />
      <Route path="/online" element={<OnlineHomePage />} />
      <Route path="/online/lobby" element={<OnlineLobbyPage />} />
    </Routes>
  );
}
