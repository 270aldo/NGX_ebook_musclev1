import React, { useState, useRef } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";
import Reader from './components/Reader';
import Chat from './components/Chat';
import { EBOOK_METADATA, CHAPTER_1, CHAPTER_TEXT_PLAIN, MODES_CONFIG } from './constants';
import { Message, IntelligenceMode } from './types';
import { Star } from './components/Icons';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateImageTool: FunctionDeclaration = {
  name: 'generate_scientific_illustration',
  description: 'Generates a scientific or biomedical illustration based on the user prompt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed description of the scientific concept to visualize (e.g. "Muscles releasing myokines into the bloodstream in a neon style").',
      },
    },
    required: ['prompt'],
  },
};

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('mentor');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: 'Bienvenido. Soy Logos. Selecciona un modo abajo para interactuar: Mentor, Investigador, Coach o Visualizador.',
      timestamp: new Date()
    }
  ]);
  
  // Use ref to track chat session so we can reset it when mode changes
  const chatSessionRef = useRef<any>(null);

  const getChatSession = (mode: IntelligenceMode, history: Message[]) => {
    // Determine Model & Config based on Mode
    let modelName = 'gemini-2.5-flash';
    let tools: any[] = [];
    let config: any = {};
    const modeInstruction = MODES_CONFIG[mode].instruction;
    const systemInstruction = `You are LOGOS, an advanced AI tutor for the eBook "El Músculo: Tu Órgano de Longevidad". 
    CONTEXT: ${CHAPTER_TEXT_PLAIN}
    CURRENT MODE: ${mode.toUpperCase()}
    MODE INSTRUCTION: ${modeInstruction}
    `;

    switch (mode) {
      case 'researcher':
        // Use Pro for deep reasoning + Google Search for citations
        modelName = 'gemini-3-pro-preview';
        tools = [{ googleSearch: {} }];
        break;
      case 'coach':
        // Use Pro + Thinking for planning
        modelName = 'gemini-3-pro-preview';
        config = { 
          thinkingConfig: { thinkingBudget: 2048 } // Allow some thinking for planning
        };
        break;
      case 'visionary':
        // Flash for chat, Image tool active
        modelName = 'gemini-2.5-flash';
        tools = [{ functionDeclarations: [generateImageTool] }];
        break;
      case 'mentor':
      default:
        // Flash for speed and friendliness
        modelName = 'gemini-2.5-flash';
        break;
    }

    // Convert App History to Gemini History
    const geminiHistory: Content[] = history
      .filter(m => !m.image) // Filter out local image messages from history to avoid confusion
      .map(m => ({
        role: m.role === 'agent' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const chat = ai.chats.create({
      model: modelName,
      history: geminiHistory,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        ...config
      },
    });

    return chat;
  };

  const handleSetMode = (mode: IntelligenceMode) => {
    setActiveMode(mode);
    // Reset session to force recreation with new model/tools on next send
    chatSessionRef.current = null; 
    setMessages(prev => [...prev, {
      role: 'agent',
      content: MODES_CONFIG[mode].welcome,
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async (text: string) => {
    const newUserMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      // Re-create session if null (e.g. after mode switch)
      if (!chatSessionRef.current) {
        chatSessionRef.current = getChatSession(activeMode, messages);
      }

      const result = await chatSessionRef.current.sendMessage({ message: text });
      
      // 1. Handle Function Calls (Image Gen)
      const calls = result.functionCalls;
      if (calls && calls.length > 0) {
        for (const call of calls) {
          if (call.name === 'generate_scientific_illustration') {
            const prompt = (call.args as any).prompt;
            
            setMessages(prev => [...prev, {
              role: 'agent',
              content: `Generando visualización para: "${prompt}"...`,
              timestamp: new Date()
            }]);

            try {
              // Upgrade to Pro Image Preview for Visionary mode
              const imageResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                  parts: [{ text: prompt + " , cinematic lighting, neon medical style, high detail, 8k, scientific illustration, dark background" }]
                },
                config: {
                  imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "1K" // Pro feature
                  }
                }
              });

              let imageBase64 = '';
              for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }

              if (imageBase64) {
                 setMessages(prev => [...prev, {
                    role: 'agent',
                    content: 'Visualización completada.',
                    image: imageBase64,
                    timestamp: new Date()
                 }]);
                 
                 await chatSessionRef.current.sendMessage({
                    message: {
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { result: "Image generated successfully." }
                        }]
                    }
                 });
              }
            } catch (imgError) {
              console.error("Image generation failed", imgError);
              setMessages(prev => [...prev, {
                role: 'agent',
                content: 'Lo siento, hubo un error generando la imagen.',
                timestamp: new Date()
              }]);
            }
          }
        }
      } else {
        // 2. Handle Text Response + Grounding
        const responseText = result.text;
        
        // Extract Grounding (Search Results)
        const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: { title: string, uri: string }[] = [];
        
        if (groundingChunks) {
          groundingChunks.forEach((chunk: any) => {
             if (chunk.web) {
               sources.push({ title: chunk.web.title, uri: chunk.web.uri });
             }
          });
        }

        setMessages(prev => [...prev, {
          role: 'agent',
          content: responseText || "Disculpa, no pude procesar eso.",
          groundingSources: sources.length > 0 ? sources : undefined,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, {
        role: 'agent',
        content: "Error de conexión con LOGOS AI.",
        timestamp: new Date()
      }]);
      // Reset session on error to recover
      chatSessionRef.current = null;
    } finally {
      setIsTyping(false);
    }
  };

  // Calculate progress
  const progress = Math.round((CHAPTER_1.id / EBOOK_METADATA.totalChapters) * 100);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] text-white font-sans selection:bg-[#6D00FF]/30 selection:text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#6D00FF]/15 rounded-full blur-[150px] animate-breathe" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#5B21B6]/10 rounded-full blur-[120px] animate-breathe delay-2000" />
        <div className="absolute inset-0 opacity-[0.015]" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
               backgroundSize: '60px 60px'
             }} 
        />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="glass-strong border-b border-white/5 flex-shrink-0 z-20">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(109,0,255,0.3)]">
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
                  <circle cx="20" cy="20" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none"/>
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
                      <stop offset="0%" stopColor="#6D00FF"/>
                      <stop offset="100%" stopColor="#5B21B6"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/60">{progress}%</span>
              </div>
              
              <div className="hidden md:block text-sm text-white/40">
                Capítulo {CHAPTER_1.id} de {EBOOK_METADATA.totalChapters}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] px-4 py-2 rounded-xl text-xs font-medium transition-transform hover:-translate-y-0.5 hover:shadow-lg">
                <Star className="w-3 h-3" />
                <span>Premium</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <Reader chapter={CHAPTER_1} totalChapters={EBOOK_METADATA.totalChapters} />
          <Chat 
            activeMode={activeMode}
            onSetMode={handleSetMode}
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
          />
        </div>
      </div>
    </div>
  );
};

export default App;