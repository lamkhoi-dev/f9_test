import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreditIcon from './icons/CreditIcon';
import { useLanguage } from '../hooks/useLanguage';

const STORAGE_KEY = 'f9_credit_badge_pos';
const COLLAPSED_KEY = 'f9_credit_badge_collapsed';

const CreditBadge: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [isPersonalAI, setIsPersonalAI] = useState(false);
  const checkPersonalAI = () => {
    const saved = localStorage.getItem('f9_user_api_config');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setIsPersonalAI(!!settings.usePersonalKey);
      } catch (e) {
        setIsPersonalAI(false);
      }
    } else {
      setIsPersonalAI(false);
    }
  };

  useEffect(() => {
    checkPersonalAI();
    window.addEventListener('f9_settings_updated', checkPersonalAI);
    return () => window.removeEventListener('f9_settings_updated', checkPersonalAI);
  }, []);

  // Restore saved position & collapsed state
  const getSavedPos = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const [position, setPosition] = useState<{ x: number; y: number }>(
    getSavedPos() || { x: window.innerWidth - 280, y: 76 }
  );
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Save position to localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Clamp to viewport
  const clamp = useCallback((x: number, y: number) => {
    const el = dragRef.current;
    const w = el?.offsetWidth || 200;
    const h = el?.offsetHeight || 60;
    return {
      x: Math.max(0, Math.min(window.innerWidth - w, x)),
      y: Math.max(0, Math.min(window.innerHeight - h, y)),
    };
  }, []);

  // --- Mouse drag ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    hasMoved.current = false;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
      setPosition(clamp(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy));
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [position, clamp]);

  // --- Touch drag ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    hasMoved.current = false;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, posX: position.x, posY: position.y };

    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      const dx = t.clientX - dragStartRef.current.x;
      const dy = t.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
      setPosition(clamp(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy));
    };
    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [position, clamp]);

  // Toggle collapse only if not dragged
  const handleClick = useCallback(() => {
    if (!hasMoved.current) {
      setIsCollapsed(prev => !prev);
    }
  }, []);

  if (!isAuthenticated || !user || isPersonalAI) return null;

  return (
    <div
      ref={dragRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      className="fixed z-[100] select-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'box-shadow 0.3s, transform 0.2s',
        touchAction: 'none',
      }}
    >
      <div
        className={`flex items-center gap-3 bg-[#1e293b]/85 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl shadow-black/40 hover:border-orange-500/30 transition-all duration-300 ${
          isCollapsed ? 'px-2.5 py-2' : 'px-4 py-2.5'
        } ${isDragging ? 'scale-105 shadow-2xl shadow-orange-500/10 border-orange-500/40' : 'hover:scale-[1.02]'}`}
      >
        <div className={`p-1.5 rounded-lg ${isCollapsed ? 'bg-orange-500/20' : 'bg-orange-500/10'}`}>
          <CreditIcon size={isCollapsed ? 16 : 18} className="text-orange-400" />
        </div>

        {!isCollapsed && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                {t('user.balance')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-100">
                  {(user.balance || 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{t('user.credits')}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-yellow-500">{user.freeUsageLeft || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium">{t('user.free')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditBadge;
