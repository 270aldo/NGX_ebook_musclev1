import { Chapter } from './types';
import { AcademicCap, Microscope, Trophy, Palette } from './components/Icons';

export const EBOOK_METADATA = {
  title: "El Músculo: Tu Órgano de Longevidad",
  subtitle: "La ciencia que cambiará cómo ves tu cuerpo",
  totalChapters: 8
};

export const CHAPTER_1: Chapter = {
  id: 1,
  title: 'El Cambio de Paradigma',
  subtitle: 'Por qué todo lo que sabías sobre el músculo está incompleto',
  readTime: 5,
  keyPoints: ['Órgano endocrino', 'Secreta miocinas', 'Comunica con todo el cuerpo'],
  quote: {
    text: 'No estamos sobre-grasos; estamos sub-musculados.',
    author: 'Dra. Gabrielle Lyon',
    source: 'Pionera de la Medicina Centrada en el Músculo'
  }
};

export const CHAPTER_TEXT_PLAIN = `
El Cambio de Paradigma. Por qué todo lo que sabías sobre el músculo está incompleto.

Durante décadas, la medicina y el fitness nos contaron una historia incompleta sobre el músculo. Era simple: el músculo sirve para mover el cuerpo, levantar cosas pesadas, y — si te esfuerzas lo suficiente — verse bien en el espejo.

Esta narrativa no es incorrecta. Es peligrosamente incompleta.

En los últimos quince años, una revolución silenciosa ha ocurrido en los laboratorios de fisiología de las mejores universidades del mundo. Investigadores de Stanford, Harvard, el Karolinska Institute y docenas de centros de investigación han descubierto algo que cambia fundamentalmente cómo deberíamos pensar sobre nuestros cuerpos.

El Descubrimiento Central: El músculo esquelético no es simplemente un tejido locomotor. Es el órgano endocrino más grande del cuerpo humano — una glándula masiva que secreta cientos de moléculas de señalización que regulan prácticamente todos los sistemas fisiológicos.

Cuando tu músculo se contrae — ya sea levantando una pesa, subiendo escaleras, o simplemente caminando — no solo está generando fuerza mecánica. Está liberando mensajeros químicos llamados miocinas que viajan por la sangre hasta órganos distantes: el hígado, el cerebro, el tejido adiposo, los huesos, el páncreas.

Estos mensajeros no son triviales. Regulan cómo procesas el azúcar en sangre. Determinan si acumulas o quemas grasa. Influyen en tu estado de ánimo y tu capacidad cognitiva. Protegen tus huesos de la osteoporosis. Modulan la inflamación sistémica que subyace a casi todas las enfermedades crónicas modernas.

En otras palabras: cada vez que mueves tu cuerpo, estás enviando instrucciones químicas a todos tus órganos.

Y aquí está la parte crucial que nadie te dijo: cuando no te mueves, cuando tu músculo permanece inactivo, esos mensajes no se envían. El silencio del músculo sedentario no es neutral. Es una forma de negligencia metabólica que acelera el envejecimiento, la enfermedad y el deterioro funcional.

Dato Clave: El músculo esquelético representa aproximadamente el 40% del peso corporal en adultos saludables y es responsable de hasta el 80% de la captación de glucosa después de una comida. Es, literalmente, tu principal órgano regulador del metabolismo.

La Dra. Gabrielle Lyon, una de las voces más influyentes en lo que ella llama "Medicina Centrada en el Músculo" (Muscle-Centric Medicine), lo expresa con una provocación que resume todo el cambio de paradigma:

"El problema no es que estemos sobre-grasos. El problema es que estamos sub-musculados."

Esta distinción no es semántica. Es un reencuadre completo de cómo deberíamos abordar la salud. Durante décadas, la obsesión ha sido con la grasa: cuánta tienes, cómo perderla, por qué es mala. Pero la evidencia científica actual sugiere que optimizar el músculo podría ser una estrategia más poderosa que obsesionarse con eliminar la grasa.

¿Por qué? Porque el músculo es activo. Es demandante. Es metabólicamente costoso de mantener. Y cuando lo tienes en cantidad y calidad adecuada, muchos de los problemas que atribuimos al "exceso de grasa" simplemente no aparecen — o se resuelven solos.

Este primer capítulo establece el fundamento conceptual para todo lo que sigue. Antes de hablar de proteínas, rutinas de entrenamiento, o suplementos, necesitas internalizar esta verdad:

El músculo no es un lujo estético. Es tu órgano de supervivencia.

En los próximos capítulos, exploraremos exactamente cómo funciona esta maquinaria molecular: las miocinas específicas que tu músculo secreta, cómo impactan cada sistema de tu cuerpo, qué sucede cuando este sistema falla (sarcopenia), y qué puedes hacer para optimizarlo — independientemente de tu edad, tu punto de partida, o tu historial de ejercicio.

Pero primero, graba esto en tu mente: cada decisión que tomes sobre tu cuerpo debería comenzar con la pregunta "¿cómo afecta esto a mi músculo?"

Porque tu músculo no es solo lo que te permite levantar cosas. Es lo que te permite vivir.
`;

export const MODES_CONFIG = {
  mentor: {
    name: 'Modo Mentor',
    role: 'Mentor Educativo',
    icon: AcademicCap,
    color: '#F59E0B', // Amber 500
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    placeholder: '¿Qué concepto quieres simplificar?',
    instruction: 'Actúa como un profesor amable y paciente. Explica los conceptos como si hablaras con un niño de 12 años o un principiante absoluto. Usa analogías simples, lenguaje cálido y evita la jerga técnica sin explicarla. Tu objetivo es que el usuario ENTIENDA profundamente.',
    welcome: 'Hola. Soy tu Mentor. Estoy aquí para explicarte cualquier concepto de forma sencilla y clara.'
  },
  researcher: {
    name: 'Lab Research',
    role: 'Investigador Científico',
    icon: Microscope,
    color: '#06B6D4', // Cyan 500
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/10',
    placeholder: '¿Qué evidencia científica buscas?',
    instruction: 'Actúa como un investigador científico de alto nivel (PhD). Sé riguroso, objetivo y clínico. Usa terminología técnica precisa. Cuando sea posible, menciona estudios, mecanismos moleculares o vías de señalización. No simplifiques en exceso; el usuario busca precisión y profundidad.',
    welcome: 'Módulo de Investigación activado. Estoy listo para analizar la evidencia y los mecanismos moleculares contigo.'
  },
  coach: {
    name: 'Performance Coach',
    role: 'Entrenador de Alto Rendimiento',
    icon: Trophy,
    color: '#10B981', // Emerald 500
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    placeholder: '¿Cuál es tu objetivo físico?',
    instruction: 'Actúa como un coach de alto rendimiento. Sé directo, motivador y orientado a la acción. No te pierdas en la teoría; enfócate en la aplicación práctica. Usa verbos imperativos (Haz esto, Evita aquello). Tu objetivo es que el usuario ACTÚE y mejore su físico.',
    welcome: '¡Vamos a trabajar! Soy tu Coach. Dime cuál es tu meta y trazaremos el plan.'
  },
  visionary: {
    name: 'Visual Engine',
    role: 'Motor de Visualización',
    icon: Palette,
    color: '#A855F7', // Purple 500
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    placeholder: 'Describe lo que quieres ver...',
    instruction: 'Actúa como un motor de visualización creativa. Si el usuario pide ver algo, usa la herramienta de generación de imágenes inmediatamente. Si describe un concepto, usa lenguaje muy visual, metafórico y futurista.',
    welcome: 'Motor de Visualización en línea. Describe un concepto y lo haré realidad.'
  }
};
