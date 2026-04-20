
import React, { useState } from 'react';
import Header from './components/Header';
import Banner from './components/Banner';
import CardGrid from './components/CardGrid';
import Footer from './components/Footer';
import AutoColoringPage from './AutoColoringPage';
import Download3DModelPage from './Download3DModelPage';
import ThreeDSketchPage from './ThreeDSketchPage';
import RealisticModelPage from './RealisticModelPage';
import ImageGenerationPage from './ImageGenerationPage';
import PromptLibraryPage from './PromptLibraryPage';
import AiAssistant from './components/AiAssistant';
import WelcomeScreen from './components/WelcomeScreen';
import History from './components/History';
import { HistoryRecord } from './lib/db';

type Page = 'home' | 'history' | 'auto-coloring' | 'download-3d-model' | '3d-sketch' | 'realistic-model' | 'image-generation' | 'exterior-view-suggestions' | string;

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [restoreData, setRestoreData] = useState<HistoryRecord | null>(null);

  const handleNavigate = (page: string = 'home', data?: HistoryRecord) => {
    setCurrentPage(page as Page);
    if (data) {
      setRestoreData(data);
    } else {
      setRestoreData(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'history':
        return <History onNavigate={handleNavigate} />;
      case 'auto-coloring':
        return <AutoColoringPage onNavigate={handleNavigate} restoreData={restoreData} />;
      case 'download-3d-model':
        return <Download3DModelPage onNavigate={handleNavigate} />;
      case '3d-sketch':
        return <ThreeDSketchPage onNavigate={handleNavigate} restoreData={restoreData} />;
      case 'realistic-model':
        return <RealisticModelPage onNavigate={handleNavigate} restoreData={restoreData} />;
      case 'image-generation':
        return <ImageGenerationPage onNavigate={handleNavigate} restoreData={restoreData} />;
      case 'prompt-library':
        return <PromptLibraryPage onNavigate={handleNavigate} />;
      case 'exterior-view-suggestions':
        return <ExteriorViewSuggestionsPage onNavigate={handleNavigate} />;
      case 'home':
      default:
        return (
          <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200 selection:bg-orange-500 selection:text-white">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px]"></div>
            </div>
            <div className="relative z-10 flex flex-col min-h-screen">
              <Header onNavigateHistory={() => handleNavigate('history')} />
              <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <Banner />
                <CardGrid onNavigate={handleNavigate} />
              </main>
              <Footer />
            </div>
          </div>
        );
    }
  };

  if (!hasStarted) {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  return (
    <>
      {renderPage()}
      <AiAssistant />
    </>
  );
};

export default App;
