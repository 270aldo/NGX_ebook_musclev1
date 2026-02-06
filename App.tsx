import React, { useEffect, useRef, useState } from 'react';
import Reader from './components/Reader';
import Chat from './components/Chat';
import { EBOOK_METADATA, CHAPTER_1, MODES_CONFIG } from './constants';
import { Message, IntelligenceMode } from './types';
import { Star } from './components/Icons';
import {
  CreditsBalanceResult,
  fetchCreditsBalance,
  generateImage,
  sendChatMessage,
} from './services/bonusApi';

const initialAgentMessage = {
  role: 'agent' as const,
  content: 'Bienvenido. Soy Logos. Selecciona un modo abajo para interactuar: Mentor, Investigador, Coach o Visualizador.',
  timestamp: new Date(),
};

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('mentor');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialAgentMessage]);
  const [credits, setCredits] = useState<CreditsBalanceResult | null>(null);

  const conversationIdRef = useRef<string>(crypto.randomUUID());

  const refreshBalance = async () => {
    try {
      const balance = await fetchCreditsBalance();
      setCredits(balance);
    } catch {
      // Keep UX resilient even if balance fails.
    }
  };

  useEffect(() => {
    refreshBalance();
  }, []);

  const historyForApi = (chat: Message[]) => {
    return chat
      .filter((message) => !message.image && message.content.trim().length > 0)
      .slice(-8)
      .map((message) => ({
        role: message.role === 'agent' ? 'assistant' : 'user',
        content: message.content,
      }));
  };

  const handleSetMode = (mode: IntelligenceMode) => {
    setActiveMode(mode);
    setMessages((previous) => [
      ...previous,
      {
        role: 'agent',
        content: MODES_CONFIG[mode].welcome,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsTyping(true);

    try {
      const result = await sendChatMessage({
        mode: activeMode,
        message: text,
        conversationId: conversationIdRef.current,
        history: historyForApi(nextMessages),
      });

      setMessages((previous) => [
        ...previous,
        {
          role: 'agent',
          content: result.assistantMessage || 'Disculpa, no pude procesar eso.',
          groundingSources: result.sources,
          usage: {
            creditsCharged: result.creditsCharged,
            modelUsed: result.modelUsed,
          },
          timestamp: new Date(),
        },
      ]);

      if (result.downgradedBySoftCap) {
        setMessages((previous) => [
          ...previous,
          {
            role: 'agent',
            content:
              'Aviso: para proteger costos del bonus, temporalmente activé una ruta de respuesta más eficiente.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setMessages((previous) => [
        ...previous,
        {
          role: 'agent',
          content: `Error de conexión con LOGOS AI: ${message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      await refreshBalance();
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setIsGeneratingImage(true);

    try {
      const result = await generateImage(prompt, conversationIdRef.current);

      setMessages((previous) => [
        ...previous,
        {
          role: 'agent',
          content: 'Visualización completada.',
          image: result.imageUrlOrBase64,
          usage: {
            creditsCharged: result.creditsCharged,
            modelUsed: result.modelUsed,
          },
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setMessages((previous) => [
        ...previous,
        {
          role: 'agent',
          content: `No pude generar la imagen: ${message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGeneratingImage(false);
      await refreshBalance();
    }
  };

  const progress = Math.round((CHAPTER_1.id / EBOOK_METADATA.totalChapters) * 100);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] text-white font-sans selection:bg-[#6D00FF]/30 selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#6D00FF]/15 rounded-full blur-[150px] animate-breathe" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#5B21B6]/10 rounded-full blur-[120px] animate-breathe delay-2000" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <header className="glass-strong border-b border-white/5 flex-shrink-0 z-20">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(109,0,255,0.3)]"
              >
                N
              </a>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-white/90 text-sm tracking-wide">NGX LIBRARY</h1>
                <p className="text-xs text-white/40">{EBOOK_METADATA.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6D00FF" />
                      <stop offset="100%" stopColor="#5B21B6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/60">{progress}%</span>
              </div>

              <div className="hidden md:block text-sm text-white/40">
                Capítulo {CHAPTER_1.id} de {EBOOK_METADATA.totalChapters}
              </div>

              <div className="hidden lg:flex flex-col text-xs text-white/60 leading-tight">
                <span>
                  Créditos: <strong className="text-white/90">{credits?.creditsRemaining ?? '--'}</strong>
                </span>
                <span>
                  Imágenes: <strong className="text-white/90">{credits?.imageQuotaRemaining ?? '--'}</strong>
                  {credits?.isDemo ? ' (demo)' : ' (semana)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] px-4 py-2 rounded-xl text-xs font-medium transition-transform hover:-translate-y-0.5 hover:shadow-lg">
                <Star className="w-3 h-3" />
                <span>{credits?.isDemo ? 'Demo' : 'Premium'}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <Reader chapter={CHAPTER_1} totalChapters={EBOOK_METADATA.totalChapters} />
          <Chat
            activeMode={activeMode}
            onSetMode={handleSetMode}
            messages={messages}
            onSendMessage={handleSendMessage}
            onGenerateImage={handleGenerateImage}
            isTyping={isTyping}
            isGeneratingImage={isGeneratingImage}
            creditsRemaining={credits?.creditsRemaining ?? null}
            imageQuotaRemaining={credits?.imageQuotaRemaining ?? null}
            isDemo={credits?.isDemo ?? true}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
