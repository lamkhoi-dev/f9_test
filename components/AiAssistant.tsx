
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';
import { useLanguage } from '../hooks/useLanguage';
import { XMarkIcon } from './icons/XMarkIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CatIcon } from './icons/CatIcon';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    image?: string;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
);

const AiAssistant: React.FC = () => {
    const { t, locale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getGreeting = (): string => {
        const hour = new Date().getHours();
        const greetingsVi = {
            morning: ["Chào buổi sáng! Idol Ăn sáng chưa?", "Dậy đi thiên tài, thế giới đang chờ bạn."],
            afternoon: ["Chào buổi chiều! Cần tôi buff tinh thần không?", "Hello! Đang render con nào vậy?"],
            evening: ["Tối rồi, có gì khó để đó tôi lo cho.", "Chill tí đi, đừng stress quá."],
            night: ["Khuya vậy rồi sếp còn online? Nể thực sự.", "Cần tôi kích hoạt chế độ 'kỳ tích' không?"]
        };
        const greetingsEn = {
            morning: ["Good morning! Have you had breakfast yet?", "Wake up genius, the world is waiting for you."],
            afternoon: ["Good afternoon! Need a spirit boost?", "Hello! Which scene are you rendering now?"],
            evening: ["Good evening, leave the hard tasks to me.", "Time to chill, don't let stress get you."],
            night: ["Still online at this hour? Impressive.", "Need to activate 'miracle mode' now?"]
        };

        const currentGifts = locale === 'vi' ? greetingsVi : greetingsEn;

        if (hour < 12) return currentGifts.morning[Math.floor(Math.random() * currentGifts.morning.length)];
        if (hour < 18) return currentGifts.afternoon[Math.floor(Math.random() * currentGifts.afternoon.length)];
        if (hour < 22) return currentGifts.evening[Math.floor(Math.random() * currentGifts.evening.length)];
        return currentGifts.night[Math.floor(Math.random() * currentGifts.night.length)];
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ sender: 'ai', text: getGreeting() }]);
        }
    }, [isOpen, messages.length, locale]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setInputImage({ url, file });
        }
    };

    const handleRemoveImage = () => {
        if (inputImage) {
            URL.revokeObjectURL(inputImage.url);
        }
        setInputImage(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    const handleSendMessage = async () => {
        const trimmedInput = inputText.trim();
        if (!trimmedInput && !inputImage) return;

        const userMessage: Message = { sender: 'user', text: trimmedInput };
        if (inputImage) {
            userMessage.image = inputImage.url;
        }

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        const imageFile = inputImage?.file;
        const imageUrl = inputImage?.url;
        setInputImage(null);
        setIsLoading(true);

        try {

            const parts: any[] = [];

            if (imageFile) {
                const base64Data = await blobToBase64(imageFile);
                parts.push({ inlineData: { mimeType: imageFile.type, data: base64Data } });
            }
            
            const personaPrompt = locale === 'vi' 
                ? `Bạn là MIN-F9, một trợ lý ảo thông minh, hài hước từ Hà Nội. Hãy sử dụng ngôn ngữ trẻ trung, chuyên nghiệp ngành kiến trúc.`
                : `You are MIN-F9, a witty and intelligent AI assistant. Use professional architectural terminology and a helpful tone.`;
                
            const userPrompt = `${personaPrompt}\n\n${trimmedInput}`;
            parts.push({ text: userPrompt });

            const response = await apiClient.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts }
            });

            const aiResponse: Message = { sender: 'ai', text: response.text || '...' };
            setMessages(prev => [...prev, aiResponse]);

        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage: Message = { sender: 'ai', text: t('aiAssistant.error') };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        }
    };

    return (
        <>
            <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-center gap-2 ${isOpen ? 'hidden' : ''}`}>
                <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-fade-in">
                    {t('aiAssistant.floatingLabel')}
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-orange-600 transition-transform transform hover:scale-110"
                    aria-label="Open AI Assistant"
                >
                    <CatIcon className="w-8 h-8" />
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setIsOpen(false)}>
                    <div
                        className="absolute bottom-24 right-6 bg-[#2a2a2e] w-full max-w-md h-[80vh] max-h-[700px] rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="p-4 border-b border-gray-700 text-center relative flex-shrink-0">
                            <h2 className="text-white font-semibold text-lg">{t('aiAssistant.title')}</h2>
                        </header>
                        <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`p-3 rounded-2xl max-w-xs md:max-w-sm ${msg.sender === 'user' ? 'bg-blue-600 rounded-br-none text-white' : 'bg-[#3e3e42] rounded-bl-none text-gray-200'}`}>
                                            {msg.image && <img src={msg.image} alt="User upload" className="rounded-lg mb-2 max-h-40" />}
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                     <div className="flex gap-3 flex-row">
                                        <div className="p-3 rounded-2xl bg-[#3e3e42] rounded-bl-none">
                                            <LoadingSpinner />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-700 flex-shrink-0">
                            {inputImage && (
                                <div className="relative w-24 h-24 mb-2 p-1 border border-gray-600 rounded-lg">
                                    <img src={inputImage.url} alt="Preview" className="w-full h-full object-cover rounded" />
                                    <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center">&times;</button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 bg-[#3e3e42] rounded-xl p-2">
                                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                <button onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <PlusIcon className="w-6 h-6" />
                                </button>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                                    placeholder={t('aiAssistant.inputPlaceholder')}
                                    className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || (!inputText.trim() && !inputImage)}
                                    className="p-2 bg-gray-600 text-white rounded-lg disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                     <button
                        onClick={() => setIsOpen(false)}
                        className="absolute bottom-6 right-6 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-black shadow-lg hover:bg-yellow-500 transition-transform transform hover:scale-110"
                        aria-label="Close AI Assistant"
                    >
                        <XMarkIcon className="w-8 h-8" strokeWidth={2.5}/>
                    </button>
                </div>
            )}
        </>
    );
};

export default AiAssistant;
