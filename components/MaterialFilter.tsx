
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Accordion from './Accordion';
import { apiClient } from '../lib/api';
import { SparklesIcon } from './icons/SparklesIcon';
import SmartFilterInput from './SmartFilterInput';

interface MaterialFilterProps {
  onDescriptionChange: (desc: string) => void;
  activeInputFile: File | null;
}

interface MaterialSelection {
  type: string;
  surface: string;
  reflection: string;
}

const categories = ['floor', 'wall', 'ceiling', 'furniture', 'decor'];

interface SubAccordionProps {
  category: string;
  selection: Partial<MaterialSelection>;
  isOpen: boolean;
  onToggle: () => void;
  onSelectionChange: (field: keyof MaterialSelection, value: string) => void;
}

const SubAccordion: React.FC<SubAccordionProps> = ({ category, selection, isOpen, onToggle, onSelectionChange }) => {
    const { t } = useLanguage();
    const options = t(`imageGenerationPage.materialFilter.${category}`);
    const count = Object.values(selection).filter(Boolean).length;

    return (
        <div className="bg-[#364053] rounded-lg">
            <Accordion
              title={options.title}
              count={count}
              isOpen={isOpen}
              onToggle={onToggle}
              variant="secondary"
            >
              <div className="space-y-4">
                {options.materialTypes && (
                  <div className="space-y-2">
                    <label className="text-sm font-normal text-gray-400">{t('imageGenerationPage.materialFilter.common.materialTypeLabel')}</label>
                    <SmartFilterInput
                      id={`${category}-type`}
                      value={selection.type || ''}
                      onChange={(v) => onSelectionChange('type', v)}
                      placeholder={t('imageGenerationPage.materialFilter.common.selectPlaceholder')}
                      suggestions={options.materialTypes}
                    />
                  </div>
                )}
                 {options.surfaces && (
                  <div className="space-y-2">
                    <label className="text-sm font-normal text-gray-400">{t('imageGenerationPage.materialFilter.common.surfaceLabel')}</label>
                    <SmartFilterInput
                      id={`${category}-surface`}
                      value={selection.surface || ''}
                      onChange={(v) => onSelectionChange('surface', v)}
                      placeholder={t('imageGenerationPage.materialFilter.common.selectPlaceholder')}
                      suggestions={options.surfaces}
                    />
                  </div>
                 )}
                 {options.reflections && (
                  <div className="space-y-2">
                    <label className="text-sm font-normal text-gray-400">{t('imageGenerationPage.materialFilter.common.reflectionLabel')}</label>
                     <SmartFilterInput
                      id={`${category}-reflection`}
                      value={selection.reflection || ''}
                      onChange={(v) => onSelectionChange('reflection', v)}
                      placeholder={t('imageGenerationPage.materialFilter.common.selectPlaceholder')}
                      suggestions={options.reflections}
                    />
                  </div>
                 )}
              </div>
            </Accordion>
        </div>
    );
};


const MaterialFilter: React.FC<MaterialFilterProps> = ({ onDescriptionChange, activeInputFile }) => {
  const { t } = useLanguage();
  const [manualDescription, setManualDescription] = useState('');
  const [hasManualInput, setHasManualInput] = useState(false);
  const [selections, setSelections] = useState<Record<string, Partial<MaterialSelection>>>({
    floor: {}, wall: {}, ceiling: {}, furniture: {}, decor: {}
  });
  const [openSubAccordion, setOpenSubAccordion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const handleAiSuggest = async () => {
    if (!activeInputFile) return;

    setIsSuggesting(true);
    try {

      const inputBase64 = await blobToBase64(activeInputFile);

      const prompt = `Đóng vai chuyên gia nội thất, phân tích chi tiết các vật liệu được sử dụng trong hình ảnh.
      
      Nội dung phân tích bao gồm:
      1. Loại vật liệu
      2. Màu sắc, vân
      3. Đặc điểm bề mặt
      4. Mức độ phản sáng
      5. Vị trí bố trí vật liệu và chi tiết sử dụng.

      Yêu cầu định dạng đầu ra:
      - Trình bày dưới dạng danh sách gạch đầu dòng (-) ngắn gọn.
      - Thêm câu mặc định trước kết quả là: Không gian công trình sử dụng vật liệu như sau: "
      - Bỏ qua hoàn toàn lời dẫn và kết luận. Chỉ liệt kê kết quả.`;

      const response = await apiClient.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
            { text: prompt }
          ]
        },
      });

      const aiDescription = response.text;
      if (aiDescription) {
        setManualDescription(aiDescription);
        setHasManualInput(true);
        setSelections({
            floor: {}, wall: {}, ceiling: {}, furniture: {}, decor: {}
        });
      }

    } catch (e) {
      console.error("Error getting AI material suggestions for interior:", e);
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    if (hasManualInput) return;

    const parts: string[] = [];
    for (const category of categories) {
      const sel = selections[category];
      if (Object.values(sel).some(Boolean)) {
        const categoryLabel = t(`imageGenerationPage.materialFilter.${category}.label`);
        const detailsString = [
            sel.type,
            sel.surface ? `${t('imageGenerationPage.materialFilter.common.surfaceLabel')} ${sel.surface}` : '',
            sel.reflection ? `${t('imageGenerationPage.materialFilter.common.reflectionLabel')} ${sel.reflection}` : ''
        ].filter(Boolean).join(', ');
        parts.push(`${categoryLabel}: ${detailsString}.`);
      }
    }

    let generatedDesc = '';
    if (parts.length > 0) {
      const prefix = t('imageGenerationPage.materialFilter.promptPrefix');
      generatedDesc = `${prefix}\n${parts.join('\n')}`;
    }
    setManualDescription(generatedDesc);
  }, [selections, t, hasManualInput]);

  useEffect(() => {
    onDescriptionChange(manualDescription);
  }, [manualDescription, onDescriptionChange]);
  
  const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualDescription(e.target.value);
    setHasManualInput(true);
  };

  const handleSelectionChange = (category: string, field: keyof MaterialSelection, value: string) => {
    setSelections(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      }
    }));
    setHasManualInput(false);
  };

  const totalSelections = useMemo(() => {
    return Object.values(selections).reduce((acc: number, sel) => {
      return acc + Object.values(sel).filter(Boolean).length;
    }, 0);
  }, [selections]);


  const aiSuggestionButton = (
    <button
        type="button"
        onClick={handleAiSuggest}
        disabled={isSuggesting || !activeInputFile}
        className="flex-shrink-0 bg-[#3b312a] hover:bg-[#4c3f36] text-[#e0c59a] font-bold px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
    >
        <SparklesIcon className="w-4 h-4" />
        <span>{isSuggesting ? t('imageGenerationPage.sidebar.aiSuggesting') : t('imageGenerationPage.sidebar.aiSuggestionBtn')}</span>
    </button>
  );

  return (
    <div className="space-y-4 border-b border-slate-700 last:border-b-0 py-4 bg-[#202633]">
        <div className="px-3 flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-base">{String(t('imageGenerationPage.materialFilter.title') || '')}</span>
                {totalSelections > 0 && (
                    <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {totalSelections}
                    </span>
                )}
            </div>
            {aiSuggestionButton}
        </div>

        <div className="px-3 space-y-4">
             <textarea
                value={manualDescription}
                onChange={handleManualChange}
                rows={8}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 custom-scrollbar"
                placeholder={String(t('imageGenerationPage.materialFilter.placeholder') || '')}
            ></textarea>
            <p className="text-xs text-gray-500 mt-2 mb-4">
               * {String(t('imageGenerationPage.materialFilter.note') || '')}
            </p>
            <div className="space-y-2">
                {categories.map(cat => 
                  <SubAccordion 
                    key={cat} 
                    category={cat}
                    selection={selections[cat]}
                    isOpen={openSubAccordion === cat}
                    onToggle={() => setOpenSubAccordion(prev => prev === cat ? null : cat)}
                    onSelectionChange={(field, value) => handleSelectionChange(cat, field, value)}
                  />
                )}
            </div>
        </div>
    </div>
  );
};

export default MaterialFilter;
