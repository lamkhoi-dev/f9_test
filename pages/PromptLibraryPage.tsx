import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../lib/promptLibrary/constants';
import { MainCategory, SubCategory } from '../lib/promptLibrary/types';
import CategoryCard from '../components/promptLibrary/CategoryCard';
import SubCategoryCard from '../components/promptLibrary/SubCategoryCard';
import RenderWorkspace from '../components/promptLibrary/RenderWorkspace';

const PromptLibraryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId?: string }>();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<MainCategory | null>(
    categoryId ? (CATEGORIES.find(c => c.id === categoryId) ?? null) : null
  );
  const [showWorkspace, setShowWorkspace] = useState(false);

  const handleCategoryClick = useCallback((category: MainCategory) => {
    setSelectedCategory(category);
    setShowWorkspace(false);
    navigate(`/prompt-library/${category.id}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const handleSubCategoryClick = useCallback((_sub: SubCategory) => {
    setShowWorkspace(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setSelectedCategory(null);
    setShowWorkspace(false);
    navigate('/prompt-library', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const goBackToSub = useCallback(() => {
    setShowWorkspace(false);
  }, []);

  const view = showWorkspace ? 'workspace' : selectedCategory ? 'subCategory' : 'home';

  return (
    <div className="min-h-screen bg-[#1e232d] text-white selection:bg-[#f97316]/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#1e232d]/90 backdrop-blur-md border-b border-[#374151]/50">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">Thư viện Prompt</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-orange-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Về trang chủ
          </button>
        </div>
      </header>

      <main className={`w-full max-w-screen-2xl mx-auto ${view === 'workspace' ? '' : 'px-6 md:px-12 lg:px-20 py-12'}`}>

        {/* Breadcrumbs */}
        {view !== 'home' && (
          <div className={`flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest ${view === 'workspace' ? 'px-6 md:px-12 lg:px-20 pt-8 mb-6' : 'mb-8'}`}>
            <button onClick={goHome} className="hover:text-[#f97316] transition-colors">Thư viện</button>
            <span>/</span>
            <button
              onClick={goBackToSub}
              className={view === 'workspace' ? 'hover:text-[#f97316] transition-colors' : 'text-white cursor-default'}
            >
              {selectedCategory?.title}
            </button>
            {view === 'workspace' && (
              <>
                <span>/</span>
                <span className="text-white">Workspace</span>
              </>
            )}
          </div>
        )}

        {/* HOME: Category grid */}
        {view === 'home' && (
          <div className="animate-in fade-in duration-700">
            <header className="mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                Thư viện Prompt Kiến trúc
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Cảm hứng sáng tạo không giới hạn với kho mẫu Prompt dành riêng cho kiến trúc sư và nhà thiết kế AI.
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.id} category={cat} onClick={handleCategoryClick} />
              ))}
            </div>
          </div>
        )}

        {/* SUB-CATEGORY view */}
        {view === 'subCategory' && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <header className="mb-12 border-l-4 border-[#f97316] pl-6">
              <h2 className="text-3xl font-extrabold text-white mb-2">
                {selectedCategory.title}
              </h2>
              <p className="text-gray-400">{selectedCategory.description}</p>
            </header>

            {selectedCategory.subCategories.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {selectedCategory.subCategories.map((sub) => (
                  <SubCategoryCard key={sub.id} item={sub} onClick={handleSubCategoryClick} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-[#252a33] rounded-3xl border border-dashed border-[#374151]">
                <p className="text-gray-400">Chưa có nội dung cho danh mục này.</p>
                <button onClick={goHome} className="mt-4 text-[#f97316] font-bold hover:underline">Quay lại</button>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE view */}
        {view === 'workspace' && (
          <div className="px-6 md:px-12 lg:px-20 pb-12">
            <RenderWorkspace onBack={goBackToSub} title={selectedCategory?.title} />
          </div>
        )}
      </main>

      {/* Footer */}
      {view !== 'workspace' && (
        <footer className="mt-20 bg-[#0f141e] py-8 px-6 relative overflow-hidden">
          <div className="w-full flex flex-col items-center justify-center text-center gap-2">
            <div className="text-[#8ba3b8] text-sm font-medium">© 2017 - 2025 - Theme by 3dmili Team</div>
            <div className="text-[#5a6b7c] text-xs">Professional AI Rendering Solutions</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 flex">
            <div className="flex-1 bg-[#1e232d]"></div>
            <div className="w-16 bg-[#b45309]"></div>
            <div className="flex-1 bg-[#1e232d]"></div>
            <div className="w-16 bg-[#b45309]"></div>
            <div className="flex-1 bg-[#1e232d]"></div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PromptLibraryPage;
