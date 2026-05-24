import React from 'react';

interface ModelNotEnabledModalProps {
  modelName: string;
  setupUrl: string;
  instructions: string[];
  onClose: () => void;
}

const ModelNotEnabledModal: React.FC<ModelNotEnabledModalProps> = ({ modelName, setupUrl, instructions, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-amber-500/30 shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-4">
          <div className="text-3xl mt-0.5">⚠️</div>
          <div>
            <h2 className="text-lg font-bold text-amber-400">Model chưa được kích hoạt</h2>
            <p className="text-sm text-slate-400 mt-1 font-mono">{modelName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            GCP project của bạn chưa được cấp quyền truy cập model này. Đây là model <span className="text-amber-400 font-semibold">Preview</span> — bạn cần kích hoạt thủ công trong <strong>Vertex AI Model Garden</strong>.
          </p>

          {/* Steps */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Các bước thực hiện:</p>
            <ol className="space-y-2">
              {instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Direct link */}
          <a
            href={setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            🔗 Mở Model Garden để kích hoạt
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Sau khi kích hoạt, reload trang và thử lại. Một số model cần vài phút để có hiệu lực.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelNotEnabledModal;
