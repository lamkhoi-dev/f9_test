import { useMode } from '../contexts/ModeContext';
import aiService, { AiConfig, AiResponse } from '../services/aiService';

export const useAI = () => {
  const { getPriceKey, getModelName } = useMode();

  const generateContent = async (
    prompt: string,
    imageBase64?: string,
    mimeType?: string,
    model?: string,
    config?: AiConfig,
    service?: string
  ): Promise<AiResponse> => {
    const priceKey = getPriceKey();
    
    const finalConfig: AiConfig = {
      ...config,
      priceKey: config?.priceKey || priceKey,
      service: config?.service || service
    };

    const finalModel = model || getModelName('image');

    return aiService.generateContent(
      prompt,
      imageBase64,
      mimeType,
      finalModel,
      finalConfig
    );
  };

  return {
    generateContent,
    // Add other aiService methods here if needed, wrapped to include priceKey
    models: {
      generateContent: async (params: {
        model: string;
        contents: any;
        config?: AiConfig;
        service?: string;
        page?: string;
      }) => {
        const priceKey = getPriceKey();
        return aiService.models.generateContent({
          ...params,
          config: {
            ...params.config,
            priceKey: params.config?.priceKey || priceKey,
            service: params.config?.service || params.service,
            page: params.config?.page || params.page
          }
        });
      }
    }
  };
};

export default useAI;
