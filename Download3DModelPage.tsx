import React from 'react';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { ArrowTopRightOnSquareIcon } from './components/icons/ArrowTopRightOnSquareIcon';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './hooks/useLanguage';
import Footer from './components/Footer';

interface Download3DModelPageProps {
    onNavigate: (page: string) => void;
}

const Download3DModelPage: React.FC<Download3DModelPageProps> = ({ onNavigate }) => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-black text-gray-300 font-sans flex flex-col">
            <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span className="font-semibold">Home</span>
                </button>
                <LanguageSwitcher />
            </header>

            <main className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <h1 className="font-mono font-extrabold text-4xl md:text-5xl text-teal-400 tracking-widest mb-12 animate-pulse">
                    {t('download3d.welcome')}
                </h1>

                <div className="bg-white text-gray-800 rounded-lg p-8 shadow-2xl w-full max-w-sm">
                    <ArrowTopRightOnSquareIcon className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{t('download3d.title')}</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        {t('download3d.description')}
                    </p>
                    <a
                        href="https://3dmili.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors transform hover:scale-105"
                    >
                        {t('download3d.accessBtn')}
                    </a>
                </div>
            </main>
            
            <Footer />
        </div>
    );
};

export default Download3DModelPage;