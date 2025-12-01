import React from 'react';
import { Chapter } from '../types';
import AudioPlayer from './AudioPlayer';
import MuscleViz from './MuscleViz';
import { Lightbulb, BarChart, Dna, Rotate3D, ChevronLeft, ChevronRight } from './Icons';

interface ReaderProps {
  chapter: Chapter;
  totalChapters: number;
}

const Reader: React.FC<ReaderProps> = ({ chapter, totalChapters }) => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-6 py-10 lg:py-12">
        
        {/* Chapter Header */}
        <div className="mb-10 animate-fadeInUp">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/60 border border-white/10">
              Capítulo {chapter.id}
            </span>
            <span className="text-xs text-white/40">{chapter.readTime} min lectura</span>
          </div>
          
          <h2 className="font-serif text-4xl lg:text-5xl text-white mb-3 leading-tight">{chapter.title}</h2>
          <p className="text-lg text-white/40 font-light">{chapter.subtitle}</p>
        </div>
        
        {/* Quote */}
        <div className="mb-10 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="relative pl-6 border-l-2 border-white/20 py-4">
            <p className="font-serif text-xl text-white/70 italic mb-3">{chapter.quote.text}</p>
            <p className="text-sm text-white/50">{chapter.quote.author}</p>
            <p className="text-xs text-white/30">{chapter.quote.source}</p>
          </div>
        </div>
        
        {/* Audio Player */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <AudioPlayer readTime={chapter.readTime} />
        </div>
        
        {/* 3D Viz */}
        <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="glass rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-white/15 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dna className="text-white/50" />
                <p className="text-sm font-medium text-white/70">Visualización: Fibra Muscular y Miocinas</p>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Rotate3D className="w-4 h-4" />
                <p className="text-xs">Interactivo</p>
              </div>
            </div>
            <MuscleViz />
          </div>
        </div>
        
        {/* Content */}
        <article className="font-serif text-lg leading-[1.9] tracking-wide text-white/80 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <p className="mb-6">Durante décadas, la medicina y el fitness nos contaron una historia incompleta sobre el músculo. Era simple: el músculo sirve para mover el cuerpo, levantar cosas pesadas, y — si te esfuerzas lo suficiente — verse bien en el espejo.</p>

          <p className="mb-6">Esta narrativa no es incorrecta. Es <strong className="text-white font-semibold">peligrosamente incompleta</strong>.</p>

          <p className="mb-6">En los últimos quince años, una revolución silenciosa ha ocurrido en los laboratorios de fisiología de las mejores universidades del mundo. Investigadores de Stanford, Harvard, el Karolinska Institute y docenas de centros de investigación han descubierto algo que cambia fundamentalmente cómo deberíamos pensar sobre nuestros cuerpos.</p>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 my-8">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="text-white/70" />
              <span className="text-white/90 font-sans text-sm font-medium">El Descubrimiento Central</span>
            </div>
            <p className="text-white/70 font-sans text-sm leading-relaxed m-0">El músculo esquelético no es simplemente un tejido locomotor. Es el <strong className="text-white">órgano endocrino más grande del cuerpo humano</strong> — una glándula masiva que secreta cientos de moléculas de señalización que regulan prácticamente todos los sistemas fisiológicos.</p>
          </div>

          <p className="mb-6">Cuando tu músculo se contrae — ya sea levantando una pesa, subiendo escaleras, o simplemente caminando — no solo está generando fuerza mecánica. Está <strong className="text-white font-semibold">liberando mensajeros químicos</strong> llamados miocinas que viajan por la sangre hasta órganos distantes: el hígado, el cerebro, el tejido adiposo, los huesos, el páncreas.</p>

          <p className="mb-6">Estos mensajeros no son triviales. Regulan cómo procesas el azúcar en sangre. Determinan si acumulas o quemas grasa. Influyen en tu estado de ánimo y tu capacidad cognitiva. Protegen tus huesos de la osteoporosis. Modulan la inflamación sistémica que subyace a casi todas las enfermedades crónicas modernas.</p>

          <p className="mb-6">En otras palabras: <strong className="text-white font-semibold">cada vez que mueves tu cuerpo, estás enviando instrucciones químicas a todos tus órganos</strong>.</p>

          <p className="mb-6">Y aquí está la parte crucial que nadie te dijo: cuando no te mueves, cuando tu músculo permanece inactivo, esos mensajes <strong className="text-white font-semibold">no se envían</strong>. El silencio del músculo sedentario no es neutral. Es una forma de negligencia metabólica que acelera el envejecimiento, la enfermedad y el deterioro funcional.</p>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 my-8">
            <div className="flex items-center gap-2 mb-3">
              <BarChart className="text-white/70" />
              <span className="text-white/90 font-sans text-sm font-medium">Dato Clave</span>
            </div>
            <p className="text-white/70 font-sans text-sm leading-relaxed m-0">El músculo esquelético representa aproximadamente el <strong className="text-white">40% del peso corporal</strong> en adultos saludables y es responsable de hasta el <strong className="text-white">80% de la captación de glucosa</strong> después de una comida. Es, literalmente, tu principal órgano regulador del metabolismo.</p>
          </div>

          <p className="mb-6">La Dra. Gabrielle Lyon, una de las voces más influyentes en lo que ella llama "Medicina Centrada en el Músculo" (Muscle-Centric Medicine), lo expresa con una provocación que resume todo el cambio de paradigma:</p>

          <p className="mb-6 italic">"El problema no es que estemos sobre-grasos. El problema es que estamos sub-musculados."</p>

          <p className="mb-6">Esta distinción no es semántica. Es un reencuadre completo de cómo deberíamos abordar la salud. Durante décadas, la obsesión ha sido con la grasa: cuánta tienes, cómo perderla, por qué es mala. Pero la evidencia científica actual sugiere que <strong className="text-white font-semibold">optimizar el músculo</strong> podría ser una estrategia más poderosa que obsesionarse con eliminar la grasa.</p>

          <p className="mb-6">¿Por qué? Porque el músculo es activo. Es demandante. Es metabólicamente costoso de mantener. Y cuando lo tienes en cantidad y calidad adecuada, muchos de los problemas que atribuimos al "exceso de grasa" simplemente no aparecen — o se resuelven solos.</p>

          <p className="mb-6">Este primer capítulo establece el fundamento conceptual para todo lo que sigue. Antes de hablar de proteínas, rutinas de entrenamiento, o suplementos, necesitas internalizar esta verdad:</p>

          <div className="bg-gradient-to-br from-[#6D00FF]/10 to-[#5B21B6]/5 border border-white/10 rounded-xl p-6 my-8 text-center">
             <p className="text-white font-sans font-semibold m-0 text-lg">El músculo no es un lujo estético.<br/>Es <span className="text-gradient font-bold">tu órgano de supervivencia</span>.</p>
          </div>

          <p className="mb-6">En los próximos capítulos, exploraremos exactamente cómo funciona esta maquinaria molecular: las miocinas específicas que tu músculo secreta, cómo impactan cada sistema de tu cuerpo, qué sucede cuando este sistema falla (sarcopenia), y qué puedes hacer para optimizarlo — independientemente de tu edad, tu punto de partida, o tu historial de ejercicio.</p>

          <p className="mb-6">Pero primero, graba esto en tu mente: <strong className="text-white font-semibold">cada decisión que tomes sobre tu cuerpo debería comenzar con la pregunta "¿cómo afecta esto a mi músculo?"</strong></p>

          <p>Porque tu músculo no es solo lo que te permite levantar cosas. Es lo que te permite <em className="italic">vivir</em>.</p>
        </article>
        
        {/* Key Points */}
        <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/5 animate-fadeInUp">
          <h4 className="font-sans text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span>Puntos Clave del Capítulo</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {chapter.keyPoints.map((point, idx) => (
              <span key={idx} className="px-4 py-2 rounded-xl text-sm bg-white/[0.03] text-white/60 border border-white/5">
                {point}
              </span>
            ))}
          </div>
        </div>
        
        {/* Footer Nav */}
        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
          <button disabled className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/30 cursor-not-allowed">
            <ChevronLeft />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          
          <div className="flex gap-2">
            {Array(totalChapters).fill(0).map((_, idx) => (
              <div key={idx} className={`h-2 rounded-full transition-all duration-500 ${idx === 0 ? 'w-8 bg-gradient-to-r from-[#6D00FF] to-[#5B21B6]' : 'w-2 bg-white/20'}`} />
            ))}
          </div>
          
          <button 
            onClick={() => alert('Próximamente: Capítulo 2')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#6D00FF] to-[#5B21B6] text-white transition-all hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(109,0,255,0.4)]"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight />
          </button>
        </div>
        
        <div className="h-8" />
      </div>
    </div>
  );
};

export default Reader;