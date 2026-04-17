
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Accordion from './Accordion';
import SmartFilterInput from './SmartFilterInput';
import { apiClient } from '../lib/api';
import { SparklesIcon } from './icons/SparklesIcon';

interface LightingFilterProps {
  onDescriptionChange: (desc: string) => void;
  activeInputFile: File | null;
}

const filterCategories = [
  'lightingCondition',
  'mainLightSource',
  'lightTone',
  'lightEffect',
  'contrastLevel',
  'lightMood'
];

interface SubAccordionProps {
    category: string;
    selections: Record<string, string>;
    openSubAccordion: string | null;
    onToggle: (category: string) => void;
    onSelectionChange: (category: string, value: string) => void;
    getSuggestions: (optionsArray: any) => string[];
    t: (key: string, options?: { [key: string]: string | number }) => any;
}

const SubAccordion: React.FC<SubAccordionProps> = ({ category, selections, openSubAccordion, onToggle, onSelectionChange, getSuggestions, t }) => {
    const title = String(t(`imageGenerationPage.sidebar.lightingSystem.${category}.title`) || '');
    const suggestions = getSuggestions(t(`imageGenerationPage.sidebar.lightingSystem.${category}.options`));
    const value = selections[category] || '';
    const count = value ? 1 : 0;

    return (
        <div className="bg-[#364053] rounded-lg">
            <Accordion
              title={title}
              count={count}
              isOpen={openSubAccordion === category}
              onToggle={() => onToggle(category)}
              variant="secondary"
            >
              <SmartFilterInput
                id={`lighting-${category}`}
                value={value}
                onChange={(v) => onSelectionChange(category, v)}
                placeholder={title}
                suggestions={suggestions}
              />
            </Accordion>
        </div>
    );
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const LightingFilter: React.FC<LightingFilterProps> = ({ onDescriptionChange, activeInputFile }) => {
  const { t } = useLanguage();
  const [displayDescription, setDisplayDescription] = useState('');
  const [hasManualInput, setHasManualInput] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({
    lightingCondition: '',
    mainLightSource: '',
    lightTone: '',
    lightEffect: '',
    contrastLevel: '',
    lightMood: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [openSubAccordion, setOpenSubAccordion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const lightingTemplates = useMemo(() => {
    const data = t('imageGenerationPage.sidebar.lightingSystem.lightingTemplate');
    return Array.isArray(data?.options) ? data.options : [];
  }, [t]);

  const getSuggestions = (optionsArray: any): string[] => {
    if (!Array.isArray(optionsArray)) return [];
    return optionsArray.filter((opt: any) => typeof opt === 'string');
  };

  const handleAiSuggest = async () => {
    if (!activeInputFile) return;

    setIsSuggesting(true);
    try {

        const inputBase64 = await blobToBase64(activeInputFile);
        
        const prompt = `Phân tích hệ thống chiếu sáng trong hình ảnh nội thất được cung cấp. Đối với mỗi danh mục (điều kiện ánh sáng, nguồn sáng chính, tone ánh sáng, hiệu ứng ánh sáng, mức tương phản, mood ánh sáng), hãy xác định mô tả phù hợp nhất. Trả về kết quả dưới dạng đối tượng JSON. Các mô tả phải ngắn gọn và bằng tiếng Việt.`;

        const schema = {
            type: 'OBJECT',
            properties: {
                lightingCondition: { type: 'STRING', description: "Mô tả điều kiện ánh sáng tổng thể (ví dụ: Ánh sáng tự nhiên dịu)" },
                mainLightSource: { type: 'STRING', description: "Nguồn sáng chính trong không gian (ví dụ: Cửa sổ lớn)" },
                lightTone: { type: 'STRING', description: "Tông màu của ánh sáng (ví dụ: 4500K – Ánh sáng trung tính)" },
                lightEffect: { type: 'STRING', description: "Hiệu ứng ánh sáng đặc biệt (ví dụ: Ánh sáng phản xạ nước)" },
                contrastLevel: { type: 'STRING', description: "Mức độ tương phản giữa vùng sáng và tối (ví dụ: Trung bình)" },
                lightMood: { type: 'STRING', description: "Cảm giác, không khí mà ánh sáng tạo ra (ví dụ: Dịu nhẹ)" },
            },
        };

        const response = await apiClient.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { 
                parts: [
                    { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
                    { text: prompt }
                ] 
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const result = JSON.parse(response.text);
        
        const newSelections: Record<string, string> = {};
        
        for (const category of filterCategories) {
            if (result[category]) {
                const suggestions = getSuggestions(t(`imageGenerationPage.sidebar.lightingSystem.${category}.options`));
                const aiValue = result[category] as string;
                const matchedSuggestion = suggestions.find(s => 
                    s.toLowerCase().startsWith(aiValue.toLowerCase())
                );
                newSelections[category] = matchedSuggestion || aiValue;
            }
        }
        
        setSelections(prev => ({...prev, ...newSelections}));
        setHasManualInput(false);
        setSelectedTemplate('');

    } catch (e) {
        console.error("Error getting AI lighting suggestions:", e);
    } finally {
        setIsSuggesting(false);
    }
};

  useEffect(() => {
    if (hasManualInput) {
      return; 
    }

    if (selectedTemplate) {
        setDisplayDescription(selectedTemplate);
        return;
    }

    const hasSelection = Object.values(selections).some(val => val);
    
    if (hasSelection) {
        const prompt = t('imageGenerationPage.sidebar.lightingSystem.promptTemplate', {
            lightingCondition: selections.lightingCondition.split(',')[0] || '...',
            mainLightSource: selections.mainLightSource.split(',')[0] || '...',
            lightTone: selections.lightTone.split(',')[0] || '...',
            lightEffect: selections.lightEffect.split(',')[0] || '...',
            contrastLevel: selections.contrastLevel.split(',')[0] || '...',
            lightMood: selections.lightMood.split(',')[0] || '...',
        });
        setDisplayDescription(prompt);
    } else {
        setDisplayDescription('');
    }
  }, [selections, t, hasManualInput, selectedTemplate]);

  useEffect(() => {
    onDescriptionChange(displayDescription);
  }, [displayDescription, onDescriptionChange]);
  
  const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDisplayDescription(e.target.value);
    setHasManualInput(true);
    setSelectedTemplate('');
  };
  
  const handleSelectionChange = (category: string, value: string) => {
    setSelections(prev => ({
      ...prev,
      [category]: value,
    }));
    setHasManualInput(false);
    setSelectedTemplate('');
  };

  const handleTemplateChange = (val: string) => {
      setSelectedTemplate(val);
      setHasManualInput(false);
      if (val) {
          setSelections({
            lightingCondition: '',
            mainLightSource: '',
            lightTone: '',
            lightEffect: '',
            contrastLevel: '',
            lightMood: ''
          });
      }
  };
  
  const handleSubAccordionToggle = (category: string) => {
    setOpenSubAccordion(prev => (prev === category ? null : category));
  };

  const totalSelections = useMemo(() => {
    const templateCount = selectedTemplate ? 1 : 0;
    const detailCount = Object.values(selections).filter(Boolean).length;
    return templateCount + detailCount;
  }, [selections, selectedTemplate]);

  const aiSuggestionButton = (
    <button
        type="button"
        onClick={handleAiSuggest}
        disabled={isSuggesting || !activeInputFile}
        className="flex-shrink-0 bg-slate-600 hover:bg-slate-500 text-white font-bold px-3 py-1 rounded-md text-xs flex items-center gap-2 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
    >
        <SparklesIcon className="w-4 h-4" />
        <span>{isSuggesting ? t('imageGenerationPage.sidebar.aiSuggesting') : t('imageGenerationPage.sidebar.aiSuggestionBtn')}</span>
    </button>
  );

  return (
    <div className="space-y-4 border-b border-slate-700 last:border-b-0 py-4 bg-[#202633]">
        <div className="px-3 flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-base">{String(t('imageGenerationPage.sidebar.lightingSystem.title') || '')}</span>
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
                value={displayDescription}
                onChange={handleManualChange}
                rows={5}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 custom-scrollbar"
                placeholder={String(t('Ví dụ: Ánh sáng tự nhiên dịu, nguồn sáng chính từ cửa sổ lớn hướng ra hồ bơi, tone trung tính 5000K, hiệu ứng phản xạ nước, tương phản trung bình, mood thư giãn.') || '')}
            ></textarea>
            <p className="text-xs text-gray-500 mt-2 mb-4">
               * {String(t('imageGenerationPage.sidebar.lightingSystem.note') || '')}
            </p>

            <div className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400">{String(t('imageGenerationPage.sidebar.lightingSystem.lightingTemplate.title') || '')}</label>
                    <SmartFilterInput
                        id="lighting-template-select"
                        value={selectedTemplate}
                        onChange={handleTemplateChange}
                        placeholder={String(t('imageGenerationPage.sidebar.lightingSystem.lightingTemplate.placeholder') || '')}
                        suggestions={lightingTemplates}
                    />
                </div>

                <div className="space-y-2">
                    {filterCategories.map(cat => (
                        <SubAccordion 
                            key={cat} 
                            category={cat}
                            selections={selections}
                            openSubAccordion={openSubAccordion}
                            onToggle={handleSubAccordionToggle}
                            onSelectionChange={handleSelectionChange}
                            getSuggestions={getSuggestions}
                            t={t}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

// FIX: Added missing default export to resolve the import error in ImageGenerationPage.tsx
export default LightingFilter;
