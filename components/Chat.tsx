import React, { useRef, useEffect, useState } from 'react';
import { Send, Book, Sparkles } from './Icons';
import { Message, IntelligenceMode } from '../types';
import { MODES_CONFIG } from '../constants';

interface ChatProps {
  activeMode: IntelligenceMode;
  onSetMode: (mode: IntelligenceMode) => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

const Chat: React.FC<ChatProps> = ({ activeMode, onSetMode, messages, onSendMessage, isTyping }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentModeConfig = MODES_CONFIG[activeMode];
  const ModeIcon = currentModeConfig.icon;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const formatMessage = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className={`font-semibold ${currentModeConfig.textColor} brightness-110`}>{part.slice(2, -2)}</span>;
      }
      return part;
    });
  };

  return (
    <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0A0A0A]/95 backdrop-blur-[40px] h-[50vh] lg:h-auto transition-colors duration-500">
      
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${currentModeConfig.bgColor} ${currentModeConfig.borderColor}`}>
              <ModeIcon className={`w-6 h-6 ${currentModeConfig.textColor}`} />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${activeMode === 'researcher' ? 'bg-cyan-500' : activeMode === 'coach' ? 'bg-emerald-500' : activeMode === 'mentor' ? 'bg-amber-500' : 'bg-purple-500'} shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
          </div>
          
          <div className="flex-1">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${currentModeConfig.textColor}`}>{currentModeConfig.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
              <p className="text-xs text-white/40">ONLINE</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
            <ModeIcon className={`w-12 h-12 mb-4 ${currentModeConfig.textColor}`} />
            <p className="text-sm text-white/60 max-w-[200px]">{currentModeConfig.welcome}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className={`max-w-[90%] ${msg.role === 'agent' ? 'w-full' : ''}`}>
              {msg.role === 'agent' ? (
                <div className="flex items-start gap-3 w-full">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${currentModeConfig.borderColor} bg-white/5`}>
                     <ModeIcon className={`w-4 h-4 ${currentModeConfig.textColor}`} />
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full">
                    {msg.image && (
                      <div className={`rounded-xl overflow-hidden border ${currentModeConfig.borderColor} shadow-2xl`}>
                        <img src={msg.image} alt="Generado por IA" className="w-full h-auto object-cover" />
                        <div className="bg-black/40 backdrop-blur-md px-3 py-2 border-t border-white/10 flex items-center gap-2">
                          <Sparkles className={`w-3 h-3 ${currentModeConfig.textColor}`} />
                          <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">
                            Renderizado con Gemini Vision Pro
                          </p>
                        </div>
                      </div>
                    )}
                    {msg.content && (
                       <div className={`relative bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4`}>
                         <p className="text-sm leading-relaxed text-white/90 font-light tracking-wide">{formatMessage(msg.content)}</p>
                         
                         {/* Grounding Sources */}
                         {msg.groundingSources && msg.groundingSources.length > 0 && (
                           <div className="mt-4 pt-3 border-t border-white/10">
                             <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Fuentes Verificadas</p>
                             <div className="flex flex-col gap-1.5">
                               {msg.groundingSources.map((source, sIdx) => (
                                 <a 
                                   key={sIdx} 
                                   href={source.uri} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors truncate"
                                 >
                                   <div className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                                   <span className="truncate">{source.title || source.uri}</span>
                                 </a>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl rounded-br-sm px-5 py-4 bg-gradient-to-br border border-white/10 text-white shadow-lg`}
                     style={{ 
                       background: activeMode === 'mentor' ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))' :
                                   activeMode === 'researcher' ? 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.1))' :
                                   activeMode === 'coach' ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))' :
                                   'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))'
                     }}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${currentModeConfig.borderColor} bg-white/5`}>
                 <ModeIcon className={`w-4 h-4 ${currentModeConfig.textColor}`} />
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce-dot ${currentModeConfig.bgColor.replace('/10', '/60')}`} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce-dot delay-100 ${currentModeConfig.bgColor.replace('/10', '/60')}`} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce-dot delay-200 ${currentModeConfig.bgColor.replace('/10', '/60')}`} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Mode Selector & Input Area */}
      <div className="p-5 border-t border-white/5 flex-shrink-0 bg-black/20">
        
        <div className="flex items-center justify-between mb-4">
           <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Modo Activo: <span className={currentModeConfig.textColor}>{currentModeConfig.name}</span></span>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {(Object.keys(MODES_CONFIG) as IntelligenceMode[]).map((mode) => {
            const config = MODES_CONFIG[mode];
            const Icon = config.icon;
            const isActive = activeMode === mode;
            
            return (
              <button
                key={mode}
                onClick={() => onSetMode(mode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
                  isActive 
                    ? `${config.bgColor} ${config.borderColor} ${config.textColor} shadow-[0_0_15px_-5px_currentColor]` 
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.06] hover:text-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium whitespace-nowrap">{config.name}</span>
              </button>
            );
          })}
        </div>

        <div className="relative group">
          <div className={`absolute -inset-0.5 rounded-xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur ${activeMode === 'researcher' ? 'bg-cyan-500' : activeMode === 'coach' ? 'bg-emerald-500' : activeMode === 'mentor' ? 'bg-amber-500' : 'bg-purple-500'}`}></div>
          <div className="relative flex gap-3">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentModeConfig.placeholder}
              className="w-full h-12 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 text-sm text-white placeholder-white/20 transition-all focus:outline-none"
            />
            
            <button 
              onClick={handleSubmit}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-[#0A0A0A]`}
              style={{ backgroundColor: MODES_CONFIG[activeMode].color }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;