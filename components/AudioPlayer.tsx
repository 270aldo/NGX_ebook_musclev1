import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Play, Pause } from './Icons';
import { CHAPTER_TEXT_PLAIN } from '../constants';

interface AudioPlayerProps {
  readTime: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ readTime }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [pausedAt, setPausedAt] = useState<number>(0);
  
  // Random heights for visualization bars
  const [barHeights] = useState(() => 
    Array(16).fill(0).map(() => 4 + Math.floor(Math.random() * 16))
  );

  useEffect(() => {
    return () => {
      if (sourceNode) {
        sourceNode.stop();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const initAudioContext = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    setAudioContext(ctx);
    return ctx;
  };

  const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Manual PCM decoding
      const dataInt16 = new Int16Array(bytes.buffer);
      const numChannels = 1;
      const sampleRate = 24000;
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      return buffer;
  };

  const fetchAudio = async () => {
    try {
      setIsLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: CHAPTER_TEXT_PLAIN }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data returned");

      const ctx = audioContext || initAudioContext();
      const buffer = await decodeAudioData(base64Audio, ctx);
      setAudioBuffer(buffer);
      return { buffer, ctx };
    } catch (error) {
      console.error("Error generating audio:", error);
      setIsLoading(false);
      return null;
    }
  };

  const playAudio = async () => {
    let ctx = audioContext;
    let buffer = audioBuffer;

    if (!buffer) {
      const result = await fetchAudio();
      if (!result) return;
      buffer = result.buffer;
      ctx = result.ctx;
    }

    if (!ctx || !buffer) return;

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Start playing from where we paused
    const offset = pausedAt % buffer.duration;
    source.start(0, offset);
    
    setSourceNode(source);
    setStartTime(ctx.currentTime - offset);
    setIsPlaying(true);
    setIsLoading(false);

    source.onended = () => {
      // Handle natural end (not pause)
      // Note: This fires on stop() too, so we need careful state management if we want to loop or reset UI
      // For this demo, we'll just let it be.
    };
  };

  const pauseAudio = () => {
    if (sourceNode && audioContext) {
      sourceNode.stop();
      setPausedAt(audioContext.currentTime - startTime);
      setSourceNode(null);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  return (
    <div className="glass rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay} 
          disabled={isLoading}
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(109,0,255,0.4)] flex items-center justify-center flex-shrink-0 group ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
          {/* Shimmer effect */}
          <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="text-white relative z-10">
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isPlaying ? (
               <Pause className="w-6 h-6" />
            ) : (
               <Play className="w-6 h-6 ml-1" />
            )}
          </div>
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-white/90">Narración Neural (Gemini TTS)</p>
              <p className="text-xs text-white/40">Voz generada en tiempo real</p>
            </div>
            
            <div className="flex items-end gap-[3px] h-8">
              {barHeights.map((h, i) => (
                <div 
                  key={i}
                  className={`w-[3px] bg-gradient-to-t from-white/40 to-white/80 rounded-[2px] origin-bottom ${isPlaying ? 'animate-wave-bar' : 'transition-all duration-500'}`}
                  style={{ 
                    height: isPlaying ? h + 6 : h,
                    animationDelay: `${i * 0.08}s`
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 font-mono w-10">
               {pausedAt ? new Date(pausedAt * 1000).toISOString().substr(14, 5) : "0:00"}
            </span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white/60 to-white/40 rounded-full transition-all duration-300" 
                style={{ width: isPlaying ? '100%' : '0%', animation: isPlaying ? `progress ${audioBuffer?.duration || 300}s linear` : 'none' }}
              />
            </div>
            <span className="text-xs text-white/40 font-mono w-10">{readTime}:00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;