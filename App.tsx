
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
import UpgradeModal from './components/UpgradeModal';
import { HistoryRecord } from './lib/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PricingProvider } from './contexts/PricingContext';
import PromptLibraryPage from './PromptLibraryPage';

// Route guard component for PRO-only pages
const ProGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isFreePlan } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(isFreePlan);

  if (isFreePlan) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200">
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => {
            setShowUpgrade(false);
            window.history.back();
          }}
          title="Tính năng dành cho PRO"
          message="Trang này chỉ dành cho tài khoản PRO. Nâng cấp ngay để truy cập đầy đủ các tính năng!"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400 mb-4">Tính năng này yêu cầu gói PRO</p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Shared layout wrapper with Header for all app pages
const AppLayout: React.FC<{ children: React.ReactNode; onNavigate: (page: string, data?: HistoryRecord) => void }> = ({ children, onNavigate }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200 selection:bg-orange-500 selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px]"></div>
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onNavigateHistory={() => navigate('/history')} onNavigate={onNavigate} />
        {children}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (page: string = 'home', data?: HistoryRecord) => {
    const path = page === 'home' ? '/' : `/${page}`;
    navigate(path, { state: data });
  };

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
        {/* Public Auth Routes — no header */}
        <Route path="/login" element={<LoginPage onNavigate={handleNavigate} />} />
        <Route path="/signup" element={<SignupPage onNavigate={handleNavigate} />} />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            isAuthenticated && isAdmin
              ? <AdminPage onNavigate={handleNavigate} />
              : <Navigate to="/login" replace />
          }
        />

        {/* Home — with Banner + CardGrid */}
        <Route
          path="/"
          element={
            <AppLayout onNavigate={handleNavigate}>
              <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <Banner />
                <CardGrid onNavigate={handleNavigate} />
              </main>
              <Footer />
            </AppLayout>
          }
        />

        {/* History — with Header */}
        <Route path="/history" element={
          <AppLayout onNavigate={handleNavigate}>
            <History onNavigate={handleNavigate} />
          </AppLayout>
        } />

        {/* Image Generation — FREE users allowed (internal tab locking) */}
        <Route path="/image-generation" element={
          <AppLayout onNavigate={handleNavigate}>
            <ImageGenerationPage onNavigate={handleNavigate} restoreData={restoreData} />
          </AppLayout>
        } />

        {/* Prompt Library — FREE users allowed (badge + content locking) */}
        <Route path="/prompt-library" element={
          <AppLayout onNavigate={handleNavigate}>
            <PromptLibraryPage onNavigate={handleNavigate} />
          </AppLayout>
        } />
        <Route path="/prompt-library/:categoryId" element={
          <AppLayout onNavigate={handleNavigate}>
            <PromptLibraryPage onNavigate={handleNavigate} />
          </AppLayout>
        } />

        {/* Previously PRO-only — now open to all users */}
        <Route path="/auto-coloring" element={
          <AppLayout onNavigate={handleNavigate}>
            <AutoColoringPage onNavigate={handleNavigate} restoreData={restoreData} />
          </AppLayout>
        } />
        <Route path="/download-3d-model" element={
          <AppLayout onNavigate={handleNavigate}>
            <Download3DModelPage onNavigate={handleNavigate} />
          </AppLayout>
        } />
        <Route path="/3d-sketch" element={
          <AppLayout onNavigate={handleNavigate}>
            <ThreeDSketchPage onNavigate={handleNavigate} restoreData={restoreData} />
          </AppLayout>
        } />
        <Route path="/realistic-model" element={
          <AppLayout onNavigate={handleNavigate}>
            <RealisticModelPage onNavigate={handleNavigate} restoreData={restoreData} />
          </AppLayout>
        } />

        <Route path="/exterior-view-suggestions" element={
          <AppLayout onNavigate={handleNavigate}>
            <ExteriorViewSuggestionsPage onBack={() => navigate('/')} />
          </AppLayout>
        } />

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
