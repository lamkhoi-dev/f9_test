
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { KeyIcon } from './icons/KeyIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';

interface AISettings {
  usePersonalKey: boolean;
  credentials: string;
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AISettings>({
    usePersonalKey: false,
    credentials: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('f9_user_api_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration support: move apiKey to credentials if it exists
        setSettings({
          usePersonalKey: parsed.usePersonalKey || false,
          credentials: parsed.credentials || parsed.apiKey || '',
        });
      } catch (e) {
        console.error("Failed to parse AI settings", e);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('f9_user_api_config', JSON.stringify(settings));
    onClose();
    window.dispatchEvent(new Event('f9_settings_updated'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Basic JSON validation
        JSON.parse(content);
        setSettings({ ...settings, credentials: content });
      } catch (err) {
        alert("File không hợp lệ. Vui lòng chọn file JSON của Google Cloud Service Account.");
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="bg-[#1e293b] w-full max-w-xl rounded-3xl border border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CpuChipIcon className="w-6 h-6 text-orange-500" />
            Cấu hình AI Cá nhân
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div>
              <p className="text-sm font-bold text-white">Sử dụng Tài khoản Google cá nhân</p>
              <p className="text-xs text-slate-400 mt-1">Sử dụng tài nguyên của bạn, không tính phí hệ thống.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.usePersonalKey}
                onChange={(e) => setSettings({ ...settings, usePersonalKey: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className={`space-y-4 transition-all duration-300 ${settings.usePersonalKey ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <KeyIcon className="w-3.5 h-3.5" />
                  Service Account JSON
                </label>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20 transition-all hover:bg-orange-500/20"
                >
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                  Tải file JSON
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
              
              <textarea 
                value={settings.credentials}
                onChange={(e) => setSettings({ ...settings, credentials: e.target.value })}
                placeholder='Dán nội dung file JSON của Service Account vào đây... (Bắt đầu bằng {"type": "service_account"...})'
                className="w-full h-48 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-[13px] font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
              />
            </div>
            
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-[11px] text-orange-400 leading-relaxed italic">
                * Lưu ý: Khi bật chế độ này, mọi yêu cầu Render sẽ được gửi trực tiếp qua tài khoản Google Cloud của bạn. Hệ thống F9 sẽ không trừ số dư hoặc lượt render miễn phí.
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-800/80 border-t border-slate-700 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-base font-medium text-slate-400 hover:text-white transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            className="px-10 py-3 bg-orange-500 hover:bg-orange-600 text-white text-base font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 active:scale-95"
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
