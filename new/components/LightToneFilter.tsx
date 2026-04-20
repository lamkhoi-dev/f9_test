import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Accordion from './Accordion';
import SmartFilterInput from './SmartFilterInput';

interface LightToneFilterProps {
  onDescriptionChange: (desc: string) => void;
}

const LightToneFilter: React.FC<LightToneFilterProps> = ({ onDescriptionChange }) => {
  const { t } = useLanguage();
  const [displayDescription, setDisplayDescription] = useState('');
  const [hasManualInput, setHasManualInput] = useState(false);
  const [selection, setSelection] = useState('');
  const [isMainOpen, setIsMainOpen] = useState(false);

  const allSuggestions = useMemo(() => {
    const groups = ['warmTones', 'coolTones', 'neutralTones', 'specialTones'];
    const suggestions: string[] = [];
    groups.forEach(group => {
      const options = t(`imageGenerationPage.sidebar.lightToneSystem.${group}.options`);
      if (Array.isArray(options)) {
        suggestions.push(...options);
      }
    });
    return suggestions;
  }, [t]);

  useEffect(() => {
    if (hasManualInput) {
      return;
    }
    if (selection) {
      const prompt = t('imageGenerationPage.sidebar.lightToneSystem.promptTemplate', {
        lightTone: selection,
      });
      setDisplayDescription(prompt);
    } else {
      setDisplayDescription('');
    }
  }, [selection, t, hasManualInput]);

  useEffect(() => {
    onDescriptionChange(displayDescription);
  }, [displayDescription, onDescriptionChange]);

  const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDisplayDescription(e.target.value);
    setHasManualInput(true);
  };
  
  const handleSelectionChange = (newSelection: string) => {
    setSelection(newSelection);
    setHasManualInput(false);
  };

  return (
    <div className="space-y-2">
      <Accordion
        title={t('imageGenerationPage.sidebar.lightToneSystem.title')}
        count={selection ? 1 : 0}
        isOpen={isMainOpen}
        onToggle={() => setIsMainOpen(!isMainOpen)}
      >
        <textarea
          value={displayDescription}
          onChange={handleManualChange}
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder={t('imageGenerationPage.sidebar.lightToneSystem.title')}
        />
        <p className="text-xs text-gray-500 mt-2 mb-4">
          * {t('imageGenerationPage.sidebar.lightToneSystem.note')}
        </p>
        <SmartFilterInput
          id="light-tone-filter"
          value={selection}
          onChange={handleSelectionChange}
          placeholder={t('imageGenerationPage.sidebar.lightToneSystem.title')}
          suggestions={allSuggestions}
        />
      </Accordion>
    </div>
  );
};

export default LightToneFilter;