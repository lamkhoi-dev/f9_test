
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Banner from './components/Banner';
import CardGrid from './components/CardGrid';
import Footer from './components/Footer';
import AutoColoringPage from './AutoColoringPage';
import Download3DModelPage from './Download3DModelPage';
import ThreeDSketchPage from './ThreeDSketchPage';
import RealisticModelPage from './RealisticModelPage';
import ImageGenerationPage from './ImageGenerationPage';
import AiAssistant from './components/AiAssistant';
import CreditBadge from './components/CreditBadge';
import WelcomeScreen from './components/WelcomeScreen';
import History from './components/History';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import AdminPage from './AdminPage';
import ExteriorViewSuggestionsPage from './components/ExteriorViewSuggestions';
import { HistoryRecord } from './lib/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PricingProvider } from './contexts/PricingContext';
import PromptLibraryPage from './PromptLibraryPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper for components still using onNavigate prop
  const handleNavigate = (page: string = 'home', data?: HistoryRecord) => {
    const path = page === 'home' ? '/' : `/${page}`;
    navigate(path, { state: data });
  };

  // Get restoreData from router state (for history → page restore)
  const restoreData = (location.state as HistoryRecord) || null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!hasStarted && location.pathname === '/') {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  return (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage onNavigate={handleNavigate} />} />
        <Route path="/signup" element={<SignupPage onNavigate={handleNavigate} />} />

        {/* Admin Route — only for authenticated admins */}
        <Route
          path="/admin"
          element={
            isAuthenticated && isAdmin
              ? <AdminPage onNavigate={handleNavigate} />
              : <Navigate to="/login" replace />
          }
        />

        {/* Main App Routes — accessible to everyone (guest mode) */}
        <Route
          path="/"
          element={
            <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200 selection:bg-orange-500 selection:text-white">
              <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px]"></div>
              </div>
              <div className="relative z-10 flex flex-col min-h-screen">
                <Header onNavigateHistory={() => navigate('/history')} onNavigate={handleNavigate} />
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                  <Banner />
                  <CardGrid onNavigate={handleNavigate} />
                </main>
                <Footer />
              </div>
            </div>
          }
        />
        <Route path="/history" element={<History onNavigate={handleNavigate} />} />
        <Route path="/auto-coloring" element={<AutoColoringPage onNavigate={handleNavigate} restoreData={restoreData} />} />
        <Route path="/download-3d-model" element={<Download3DModelPage onNavigate={handleNavigate} />} />
        <Route path="/3d-sketch" element={<ThreeDSketchPage onNavigate={handleNavigate} restoreData={restoreData} />} />
        <Route path="/realistic-model" element={<RealisticModelPage onNavigate={handleNavigate} restoreData={restoreData} />} />
        <Route path="/image-generation" element={<ImageGenerationPage onNavigate={handleNavigate} restoreData={restoreData} />} />
        <Route path="/exterior-view-suggestions" element={<ExteriorViewSuggestionsPage onBack={() => navigate('/')} />} />

        {/* Prompt Library */}
        <Route path="/prompt-library" element={<PromptLibraryPage onNavigate={handleNavigate} />} />
        <Route path="/prompt-library/:categoryId" element={<PromptLibraryPage onNavigate={handleNavigate} />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AiAssistant />
      {isAuthenticated && <CreditBadge />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PricingProvider>
          <AppContent />
        </PricingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
