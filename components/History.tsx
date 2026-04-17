
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { getHistory, deleteHistoryItem, clearAllHistory, HistoryRecord } from '../lib/db';
import Pagination from './Pagination';
import Footer from './Footer';

interface HistoryProps {
  onNavigate: (page: string, restoreData?: HistoryRecord) => void;
}

const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getHistory();
      setHistoryItems(data);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const totalPages = Math.ceil(historyItems.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return historyItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [historyItems, currentPage]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa mục này khỏi lịch sử?')) {
      await deleteHistoryItem(id);
      loadHistory();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử render?')) {
      await clearAllHistory();
      loadHistory();
    }
  };

  const formatPageName = (page: string) => {
    switch (page) {
      case 'auto-coloring': return 'Tô màu bản vẽ';
      case 'image-generation': return 'Render Kiến trúc';
      case '3d-sketch': return '3D thành Ảnh vẽ tay';
      case 'realistic-model': return 'Mô hình thực tế';
      default: return page;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200">
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={() => onNavigate('home')} 
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="font-bold">Quay lại Home</span>
            </button>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-emerald-500" />
              Lịch sử Render của bạn (Your Render History)
            </h1>
            <button 
              onClick={handleClearAll}
              disabled={historyItems.length === 0}
              className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center text-slate-500">
             <div className="p-8 bg-slate-800/30 rounded-full mb-6">
                <ClockIcon className="w-16 h-16 opacity-20" />
             </div>
             <h2 className="text-2xl font-bold text-slate-300 mb-2">Chưa có lịch sử</h2>
             <p className="max-w-md mx-auto">Mọi kết quả render của bạn sẽ được tự động lưu lại tại đây để khôi phục khi cần thiết.</p>
             <button 
               onClick={() => onNavigate('home')}
               className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
             >
               Bắt đầu tạo ngay
             </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all group flex flex-col shadow-xl"
                >
                  {/* Preview Area */}
                  <div 
                    className="relative aspect-video bg-black overflow-hidden cursor-pointer" 
                    onClick={() => onNavigate(item.page, item)}
                  >
                    <div className="flex w-full h-full">
                      <img src={item.inputImage} alt="Input" className="w-1/2 h-full object-cover opacity-50 grayscale border-r border-slate-700/50" />
                      <img src={item.outputImages[0]} alt="Output" className="w-1/2 h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded uppercase tracking-widest">
                            Nhấn để khôi phục
                          </span>
                       </div>
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="text-sm font-bold text-white truncate flex-1">{formatPageName(item.page)}</h3>
                       <button onClick={(e) => handleDelete(item.id, e)} className="text-slate-500 hover:text-red-500 transition-colors p-1">
                          <TrashIcon className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2 italic">
                      "{item.prompt || 'Không có mô tả'}"
                    </p>
                    <div className="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center">
                       <span className="text-[10px] text-slate-500 font-medium">
                         {new Date(item.timestamp).toLocaleString()}
                       </span>
                       <button 
                         onClick={() => onNavigate(item.page, item)}
                         className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1"
                       >
                         <ArrowPathIcon className="w-3 h-3" />
                         Chi tiết
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default History;
