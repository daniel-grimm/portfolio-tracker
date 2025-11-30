import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Tickers } from './pages/Tickers';

function App() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <>
      <Header currentTab={currentTab} onTabChange={setCurrentTab} />
      <Layout>
        {currentTab === 0 && <Dashboard />}
        {currentTab === 1 && <Analytics />}
        {currentTab === 2 && <Tickers />}
      </Layout>
    </>
  );
}

export default App;
