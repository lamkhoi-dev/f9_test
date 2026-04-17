
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Accordion from './Accordion';
import SmartFilterInput from './SmartFilterInput';

interface TimeAndClimateFilterProps {
  onDescriptionChange: (desc: string) => void;
}

const filterCategories = [
  'timeOfDay',
  'seasonOfYear',
  'weatherCondition',
  'overallAtmosphere',
  'sunlightDirection'
];

interface SubAccordionProps {
  category: string;
  selections: Record<string, string>;
  openSubAccordion: string | null;
  onToggle: (category: string) => void;
  onSelectionChange: (category: string, value: string) => void;
  getSuggestions: (key: string) => string[];
  t: (key: string, options?: { [key: string]: string | number }) => any;
}

const SubAccordion: React.FC<SubAccordionProps> = ({ 
  category, 
  selections, 
  openSubAccordion, 
  onToggle, 
  onSelectionChange, 
  getSuggestions, 
  t 
}) => {
  const title = String(t(`imageGenerationPage.sidebar.timeAndClimate.${category}.title`) || '');
  const suggestions = getSuggestions(category);
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
              id={`timeclimate-${category}`}
              value={value}
              onChange={(v) => onSelectionChange(category, v)}
              placeholder={title}
              suggestions={suggestions}
            />
          </Accordion>
      </div>
  );
};


const TimeAndClimateFilter: React.FC<TimeAndClimateFilterProps> = ({ onDescriptionChange }) => {
  const { t } = useLanguage();
  const [displayDescription, setDisplayDescription] = useState('');
  const [hasManualInput, setHasManualInput] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({
    timeOfDay: '',
    seasonOfYear: '',
    weatherCondition: '',
    overallAtmosphere: '',
    sunlightDirection: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [openSubAccordion, setOpenSubAccordion] = useState<string | null>(null);
  
  const timeAndClimateTemplates = useMemo(() => {
    const data = t('imageGenerationPage.sidebar.timeAndClimate.timeAndClimateTemplate');
    return Array.isArray(data?.options) ? data.options : [];
  }, [t]);

  const getSuggestions = (key: string): string[] => {
    const options = t(`imageGenerationPage.sidebar.timeAndClimate.${key}.options`);
    return Array.isArray(options) ? options : [];
  };

  useEffect(() => {
    if (hasManualInput) {
      return;
    }

    if (selectedTemplate) {
        setDisplayDescription(selectedTemplate);
        return;
    }
    
    const parts: string[] = [];
    const hasAnySelection = Object.values(selections).some(val => val);

    if (hasAnySelection) {
        if (selections.timeOfDay) {
            const title = t('imageGenerationPage.sidebar.timeAndClimate.timeOfDay.title');
            parts.push(`${title}: ${selections.timeOfDay}.`);
        }
        if (selections.seasonOfYear) {
            const title = t('imageGenerationPage.sidebar.timeAndClimate.seasonOfYear.title');
            parts.push(`${title}: ${selections.seasonOfYear}.`);
        }
        if (selections.weatherCondition) {
            const title = t('imageGenerationPage.sidebar.timeAndClimate.weatherCondition.title');
            parts.push(`${title}: ${selections.weatherCondition}.`);
        }
        if (selections.overallAtmosphere) {
            const title = t('imageGenerationPage.sidebar.timeAndClimate.overallAtmosphere.title');
            parts.push(`${title}: ${selections.overallAtmosphere}.`);
        }
        if (selections.sunlightDirection) {
            const title = t('imageGenerationPage.sidebar.timeAndClimate.sunlightDirection.title');
            parts.push(`${title}: ${selections.sunlightDirection}.`);
        }
        
        const generatedDesc = parts.join('\n');
        setDisplayDescription(generatedDesc);
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
            timeOfDay: '',
            seasonOfYear: '',
            weatherCondition: '',
            overallAtmosphere: '',
            sunlightDirection: ''
        });
    }
  };

  const handleSubAccordionToggle = (category: string) => {
    setOpenSubAccordion(prev => prev === category ? null : category);
  };

  const totalSelections = useMemo(() => {
    const templateCount = selectedTemplate ? 1 : 0;
    const detailCount = Object.values(selections).filter(Boolean).length;
    return templateCount + detailCount;
  }, [selections, selectedTemplate]);

  return (
    <div className="space-y-4 border-b border-slate-700 last:border-b-0 py-4 bg-[#202633]">
        <div className="px-3 flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-base">{String(t('imageGenerationPage.sidebar.timeAndClimate.title') || '')}</span>
                {totalSelections > 0 && (
                    <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {totalSelections}
                    </span>
                )}
            </div>
        </div>

        <div className="px-3 space-y-4">
             <textarea
                value={displayDescription}
                onChange={handleManualChange}
                rows={5}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 custom-scrollbar"
                placeholder={String(t('imageGenerationPage.sidebar.timeAndClimate.exampleLabel') || '')}
            ></textarea>
            <p className="text-xs text-gray-500 mt-2 mb-4">
               * {String(t('imageGenerationPage.sidebar.timeAndClimate.note') || '')}
            </p>

            <div className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400">{String(t('imageGenerationPage.sidebar.timeAndClimate.timeAndClimateTemplate.title') || '')}</label>
                    <SmartFilterInput
                        id="time-climate-template-select"
                        value={selectedTemplate}
                        onChange={handleTemplateChange}
                        placeholder={String(t('imageGenerationPage.sidebar.timeAndClimate.timeAndClimateTemplate.placeholder') || '')}
                        suggestions={timeAndClimateTemplates}
                    />
                </div>

                <div className="space-y-2">
                    {filterCategories.map(cat => <SubAccordion 
                        key={cat} 
                        category={cat}
                        selections={selections}
                        openSubAccordion={openSubAccordion}
                        onToggle={handleSubAccordionToggle}
                        onSelectionChange={handleSelectionChange}
                        getSuggestions={getSuggestions}
                        t={t}
                    />)}
                </div>
            </div>
        </div>
    </div>
  );
};

export default TimeAndClimateFilter;
