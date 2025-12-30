# CLAUDE.md - AI Assistant Guide for NGX Library: El Músculo

## Project Overview

**NGX Library - El Músculo** is an interactive educational eBook platform focused on muscle physiology and longevity. The application features:

- An AI-powered tutor named "LOGOS" with multiple intelligence modes
- Interactive 3D muscle fiber visualization using Three.js
- Text-to-Speech narration powered by Gemini TTS
- AI image generation for scientific illustrations
- Spanish language content about muscle as an endocrine organ

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool & dev server |
| Three.js | 0.181.2 | 3D visualization |
| @google/genai | 1.30.0 | Gemini AI integration |
| TailwindCSS | CDN | Styling (via script tag) |

## Project Structure

```
NGX_ebook_musclev1/
├── index.html          # Entry HTML with Tailwind config and custom styles
├── index.tsx           # React app entry point
├── App.tsx             # Main application component with AI chat logic
├── types.ts            # TypeScript interfaces
├── constants.ts        # eBook content, chapter data, and mode configurations
├── components/
│   ├── Reader.tsx      # eBook reader view with chapter content
│   ├── Chat.tsx        # AI chat interface with mode switching
│   ├── AudioPlayer.tsx # TTS audio player using Gemini
│   ├── MuscleViz.tsx   # 3D muscle fiber visualization (Three.js)
│   └── Icons.tsx       # SVG icon components
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration with API key handling
└── metadata.json       # App metadata for AI Studio
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Create a `.env.local` file in the project root with:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

The API key is loaded via Vite's `loadEnv` and exposed as `process.env.API_KEY`.

## Architecture & Key Concepts

### LOGOS AI Tutor System

The app features four distinct AI modes, each with different Gemini models and capabilities:

| Mode | Model | Special Features |
|------|-------|------------------|
| **Mentor** | gemini-2.5-flash | Simple explanations, beginner-friendly |
| **Researcher** | gemini-3-pro-preview | Google Search grounding for citations |
| **Coach** | gemini-3-pro-preview | Thinking budget (2048) for planning |
| **Visionary** | gemini-2.5-flash | Image generation via function calling |

Mode configuration is defined in `constants.ts` under `MODES_CONFIG`.

### Chat Session Management

- Chat sessions are managed via `useRef` in `App.tsx`
- Sessions are recreated when switching modes (different models/tools)
- Function calls (image generation) are handled with proper response callbacks
- Grounding sources from Researcher mode are displayed as verified links

### 3D Visualization (MuscleViz)

The Three.js visualization in `MuscleViz.tsx` includes:
- Procedurally generated muscle tissue texture with sarcomere striations
- PBR material with clearcoat for wet tissue appearance
- Animated myokine particles (BDNF, Irisin, IL-6 colors)
- Interactive rotation via mouse drag
- Breathing animation simulating muscle contraction

### Audio Player (TTS)

- Uses `gemini-2.5-flash-preview-tts` model
- Voice: "Kore" at 24kHz sample rate
- Manual PCM audio decoding (Int16 to Float32)
- Implements play/pause with position tracking

## Component Interactions

```
App.tsx
├── manages: activeMode, messages[], isTyping, chatSession
├── renders: Header, Reader, Chat
│
├── Reader.tsx
│   ├── displays: chapter content, quote, key points
│   ├── contains: AudioPlayer, MuscleViz
│   └── navigation: chapter prev/next buttons
│
└── Chat.tsx
    ├── receives: activeMode, messages, onSendMessage, isTyping
    ├── displays: mode selector buttons, message bubbles
    ├── handles: text input, message formatting
    └── features: grounding sources display, image rendering
```

## Coding Conventions

### TypeScript

- Use interfaces for component props (e.g., `interface ReaderProps`)
- Export types from `types.ts`
- Use strict typing for Gemini API responses

### React Patterns

- Functional components with hooks
- `useRef` for mutable values that don't trigger re-renders
- `useState` for UI state
- `useEffect` for side effects and cleanup

### Styling

- Tailwind CSS classes inline
- Custom classes defined in `index.html` `<style>` block
- Glass morphism effects: `.glass`, `.glass-strong`
- Gradient text: `.text-gradient`
- Animation utilities in Tailwind config

### Naming Conventions

- Components: PascalCase (`MuscleViz.tsx`)
- Constants: UPPER_SNAKE_CASE (`CHAPTER_1`, `MODES_CONFIG`)
- Types: PascalCase (`IntelligenceMode`, `Message`)
- Functions: camelCase (`handleSendMessage`, `getChatSession`)

## Important Implementation Details

### API Key Security

The Gemini API key is injected at build time via Vite's `define` option. Never commit `.env.local` files.

### Audio Handling

AudioContext requires user interaction before playing. The AudioPlayer handles this with proper state management and cleanup in useEffect.

### Three.js Resource Management

MuscleViz properly disposes of:
- Geometries and materials
- Textures
- Renderer
- Animation frames
- Event listeners

### Mode System

Each mode has associated colors and styling:
- Mentor: Amber (#F59E0B)
- Researcher: Cyan (#06B6D4)
- Coach: Emerald (#10B981)
- Visionary: Purple (#A855F7)

## Content Structure

The eBook is structured with:
- `EBOOK_METADATA`: title, subtitle, total chapters
- `CHAPTER_1`: chapter data (id, title, subtitle, readTime, keyPoints, quote)
- `CHAPTER_TEXT_PLAIN`: full chapter text for AI context

Content is in Spanish, focused on muscle as an endocrine organ ("El Músculo: Tu Órgano de Longevidad").

## Common Tasks

### Adding a New Chapter

1. Define chapter data in `constants.ts` following `Chapter` interface
2. Add chapter text to a new constant (e.g., `CHAPTER_2_TEXT_PLAIN`)
3. Update `EBOOK_METADATA.totalChapters`
4. Implement chapter navigation in `Reader.tsx`

### Adding a New AI Mode

1. Add mode key to `IntelligenceMode` type in `types.ts`
2. Add configuration to `MODES_CONFIG` in `constants.ts`
3. Add model/tool logic in `getChatSession()` in `App.tsx`

### Modifying 3D Visualization

- Texture generation: `createMuscleTexture()` function
- Particle behavior: `particles.forEach()` in animation loop
- Lighting: adjust `keyLight`, `fillLight`, `rimLight`

## Potential Improvements

- Implement chapter navigation and state persistence
- Add user authentication for progress tracking
- Implement actual audio progress tracking
- Add loading states for 3D visualization
- Implement proper error boundaries

## Testing Notes

Currently no test framework is configured. Consider adding:
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests

## Deployment

The app is designed for Google AI Studio deployment. The `metadata.json` file contains app metadata. For other deployments:

1. Run `npm run build`
2. Serve the `dist/` folder
3. Ensure GEMINI_API_KEY is properly configured

## Language

- UI and content: Spanish (es)
- Code comments: English
- AI responses: Spanish (configured in system prompts)
