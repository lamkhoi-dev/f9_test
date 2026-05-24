import React from 'react';

interface ModelNotEnabledModalProps {
  modelName: string;
  setupUrl: string;
  instructions: string[];
  links?: { billing?: string; vertexApi?: string; modelGarden?: string };
  onClose: () => void;
}

const ModelNotEnabledModal: React.FC<ModelNotEnabledModalProps> = ({ modelName, setupUrl, instructions, links, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-amber-500/30 shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-4">
          <div className="text-3xl mt-0.5">⚠️</div>
          <div>
            <h2 className="text-lg font-bold text-amber-400">Model chưa được kích hoạt</h2>
            <p className="text-sm text-slate-400 mt-1 font-mono break-all">{modelName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-300 leading-relaxed">
            GCP project chưa được cấp quyền dùng model này. Đây là model <span className="text-amber-400 font-semibold">Preview</span> — cần kích hoạt thủ công theo các bước sau:
          </p>

          {/* Steps */}
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-300 font-mono bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700 flex-1 leading-relaxed break-all">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          {/* Quick Links */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Link nhanh:</p>
            <div className="flex flex-col gap-2">
              {links?.billing && (
                <a href={links.billing} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
                  <span>💳</span>
                  <span className="font-medium">Kiểm tra & bật Billing</span>
                  <span className="ml-auto text-slate-500 text-xs">↗</span>
                </a>
              )}
              {links?.vertexApi && (
                <a href={links.vertexApi} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
                  <span>🔌</span>
                  <span className="font-medium">Bật Vertex AI API</span>
                  <span className="ml-auto text-slate-500 text-xs">↗</span>
                </a>
              )}
              <a href={links?.modelGarden || setupUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm text-black font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95">
                <span>🌿</span>
                <span>Mở Model Garden → Enable model</span>
                <span className="ml-auto text-xs">↗</span>
              </a>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Sau khi hoàn tất, chờ ~2 phút rồi reload trang và thử lại.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-all">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelNotEnabledModal;
