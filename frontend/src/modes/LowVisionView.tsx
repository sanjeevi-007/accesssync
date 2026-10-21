import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ScanInstruction } from '../hooks/useLiveScans';
import { useSpeech } from '../hooks/useSpeech';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Sun,
  Contrast,
  Palette,
} from 'lucide-react';

interface LowVisionViewProps {
  instructions: ScanInstruction[];
  areaName?: string;
  onResetToIdle?: () => void;
}

type ThemeType = 'default' | 'high-contrast' | 'yellow-on-black';
type FontScale = 100 | 150 | 200;

export const LowVisionView: React.FC<LowVisionViewProps> = ({
  instructions,
  areaName,
  onResetToIdle,
}) => {
  // Speech synthesis
  const { speak, stop, isSpeaking } = useSpeech();

  // Load preferences from localStorage or defaults
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('accessease_lowvision_theme');
    if (saved === 'high-contrast' || saved === 'yellow-on-black' || saved === 'default') {
      return saved;
    }
    return 'default';
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = localStorage.getItem('accessease_lowvision_fontscale');
    if (saved === '150') return 150;
    if (saved === '200') return 200;
    return 100;
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('accessease_lowvision_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accessease_lowvision_fontscale', fontScale.toString());
  }, [fontScale]);

  // Reset to default settings
  const handleReset = useCallback(() => {
    setTheme('default');
    setFontScale(100);
    localStorage.setItem('accessease_lowvision_theme', 'default');
    localStorage.setItem('accessease_lowvision_fontscale', '100');
  }, []);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Resolve area name
  const resolvedAreaName = useMemo(() => {
    if (areaName && areaName.trim()) return areaName;
    if (instructions.length > 0 && instructions[0].title) {
      const parts = instructions[0].title.split(' - ');
      return parts[0].trim();
    }
    return 'Main Entrance (City Central Library)';
  }, [areaName, instructions]);

  // Detect potential obstructions
  const obstructionInstructions = useMemo(() => {
    const keywords = ['obstacle', 'step', 'stairs', 'caution', 'warning', 'careful', 'barrier', 'faded', 'curb', 'glass'];
    return instructions.filter((inst) =>
      keywords.some((kw) => inst.content.toLowerCase().includes(kw) || inst.title.toLowerCase().includes(kw))
    );
  }, [instructions]);

  // Full speech transcript
  const speechText = useMemo(() => {
    const header = `Guidance for ${resolvedAreaName}. Low Vision Mode.`;
    const body = instructions.map((i, idx) => `Step ${idx + 1}: ${i.content}`).join(' ');
    return `${header} ${body}`;
  }, [resolvedAreaName, instructions]);

  // Speech toggle
  const toggleSpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(speechText);
    }
  };

  // Font scale typography styles (Base minimum 24px)
  const fontStyle = useMemo(() => {
    switch (fontScale) {
      case 200:
        return {
          h1: 'text-[44px] sm:text-[54px] leading-tight',
          h2: 'text-[36px] sm:text-[44px] leading-tight',
          h3: 'text-[32px] sm:text-[38px] leading-tight',
          body: 'text-[32px] sm:text-[36px] leading-normal',
          btn: 'text-[24px]',
          badge: 'text-[20px]',
        };
      case 150:
        return {
          h1: 'text-[38px] sm:text-[46px] leading-tight',
          h2: 'text-[30px] sm:text-[36px] leading-tight',
          h3: 'text-[28px] sm:text-[32px] leading-tight',
          body: 'text-[28px] sm:text-[32px] leading-normal',
          btn: 'text-[22px]',
          badge: 'text-[18px]',
        };
      case 100:
      default:
        return {
          h1: 'text-[30px] sm:text-[36px] leading-tight',
          h2: 'text-[26px] sm:text-[30px] leading-tight',
          h3: 'text-[24px] sm:text-[26px] leading-tight',
          body: 'text-[24px] sm:text-[26px] leading-normal',
          btn: 'text-[18px]',
          badge: 'text-[16px]',
        };
    }
  }, [fontScale]);

  // Theme-specific styles
  const themeClasses = useMemo(() => {
    switch (theme) {
      case 'high-contrast':
        return {
          container: 'bg-black text-white',
          card: 'bg-[#121212] border-4 border-white text-white',
          banner: 'bg-black border-4 border-white text-white',
          btnActive: 'bg-white text-black border-4 border-white font-black',
          btnInactive: 'bg-black text-white border-4 border-white hover:bg-[#222222]',
          obstruction: 'bg-black border-4 border-[#FF3333] text-[#FF4D4D]',
          badge: 'bg-black text-white border-2 border-white',
        };
      case 'yellow-on-black':
        return {
          container: 'bg-black text-[#FFFF00]',
          card: 'bg-[#121212] border-4 border-[#FFFF00] text-[#FFFF00]',
          banner: 'bg-black border-4 border-[#FFFF00] text-[#FFFF00]',
          btnActive: 'bg-[#FFFF00] text-black border-4 border-[#FFFF00] font-black',
          btnInactive: 'bg-black text-[#FFFF00] border-4 border-[#FFFF00] hover:bg-[#1C1C00]',
          obstruction: 'bg-black border-4 border-[#FF3333] text-[#FF5555]',
          badge: 'bg-black text-[#FFFF00] border-2 border-[#FFFF00]',
        };
      case 'default':
      default:
        return {
          container: 'bg-[var(--color-bg)] text-[var(--color-text)]',
          card: 'bg-white border-3 border-[var(--color-primary)] text-[var(--color-text)]',
          banner: 'bg-[var(--color-surface)] border-3 border-[var(--color-primary)] text-[var(--color-text)]',
          btnActive: 'bg-[var(--color-primary)] text-white border-3 border-[var(--color-primary)] font-bold',
          btnInactive: 'bg-white text-[var(--color-text)] border-3 border-[var(--color-primary)] hover:bg-gray-100',
          obstruction: 'bg-red-50 border-4 border-[var(--color-danger)] text-red-950',
          badge: 'bg-purple-100 text-[var(--color-mode-lowvision)] border-2 border-purple-600',
        };
    }
  }, [theme]);

  return (
    <div
      className={`min-h-screen ${themeClasses.container} flex flex-col justify-between p-6 sm:p-10 font-sans transition-none`}
    >
      {/* Semantic Landmark: HEADER */}
      <header className="border-b-4 border-current pb-6 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded font-black uppercase ${themeClasses.badge} ${fontStyle.badge}`}>
                Mode: Low-Vision
              </span>
              <span className={`font-bold ${fontStyle.badge}`}>
                City Central Library
              </span>
            </div>
            {/* Area Title */}
            <h1 className={`font-black mt-2 tracking-tight ${fontStyle.h1}`}>
              {resolvedAreaName}
            </h1>
          </div>

          {onResetToIdle && (
            <button
              type="button"
              onClick={onResetToIdle}
              className={`min-h-[56px] px-6 py-3 rounded ${themeClasses.btnInactive} font-bold inline-flex items-center justify-center gap-2 ${fontStyle.btn}`}
              aria-label="Return to card tap idle screen"
            >
              <ArrowLeft className="w-6 h-6" aria-hidden="true" />
              <span>Tap New Card</span>
            </button>
          )}
        </div>

        {/* CONTROLS BAR: THEMES, FONT SIZES, RESET, SPEECH (ALL >= 56px TALL) */}
        <div className={`mt-6 p-5 rounded-lg border-4 ${themeClasses.banner} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Font Size Scaling Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold mr-2 ${fontStyle.btn}`}>Text Size:</span>
              <button
                type="button"
                onClick={() => setFontScale(100)}
                className={`min-h-[56px] min-w-[56px] px-4 py-2 rounded ${
                  fontScale === 100 ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold`}
                aria-label="Set base font size to 100 percent (24px)"
              >
                A (100%)
              </button>
              <button
                type="button"
                onClick={() => setFontScale(150)}
                className={`min-h-[56px] min-w-[56px] px-4 py-2 rounded ${
                  fontScale === 150 ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold`}
                aria-label="Set base font size to 150 percent (36px)"
              >
                A+ (150%)
              </button>
              <button
                type="button"
                onClick={() => setFontScale(200)}
                className={`min-h-[56px] min-w-[56px] px-4 py-2 rounded ${
                  fontScale === 200 ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold`}
                aria-label="Set base font size to 200 percent (48px)"
              >
                A++ (200%)
              </button>
            </div>

            {/* High-Contrast Themes Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold mr-2 ${fontStyle.btn}`}>Theme:</span>
              <button
                type="button"
                onClick={() => setTheme('default')}
                className={`min-h-[56px] px-4 py-2 rounded ${
                  theme === 'default' ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold inline-flex items-center gap-2`}
                aria-label="Switch to standard light theme"
              >
                <Sun className="w-5 h-5" aria-hidden="true" />
                <span>Default</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('high-contrast')}
                className={`min-h-[56px] px-4 py-2 rounded ${
                  theme === 'high-contrast' ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold inline-flex items-center gap-2`}
                aria-label="Switch to White on Black high-contrast theme"
              >
                <Contrast className="w-5 h-5" aria-hidden="true" />
                <span>White on Black</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('yellow-on-black')}
                className={`min-h-[56px] px-4 py-2 rounded ${
                  theme === 'yellow-on-black' ? themeClasses.btnActive : themeClasses.btnInactive
                } font-bold inline-flex items-center gap-2`}
                aria-label="Switch to Yellow on Black high-contrast theme"
              >
                <Palette className="w-5 h-5" aria-hidden="true" />
                <span>Yellow on Black</span>
              </button>
            </div>
          </div>

          {/* Action Row: Reset and Optional Audio Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t-2 border-current">
            <button
              type="button"
              onClick={handleReset}
              className={`min-h-[56px] px-5 py-2.5 rounded ${themeClasses.btnInactive} font-bold inline-flex items-center gap-2 ${fontStyle.btn}`}
              aria-label="Reset font size and theme to default settings"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              <span>Reset to Default</span>
            </button>

            <button
              type="button"
              onClick={toggleSpeech}
              className={`min-h-[56px] px-6 py-2.5 rounded ${
                isSpeaking ? themeClasses.btnActive : themeClasses.btnInactive
              } font-bold inline-flex items-center gap-2 ${fontStyle.btn}`}
              aria-label={isSpeaking ? 'Stop reading instructions aloud' : 'Read instructions aloud with voice synthesis'}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-6 h-6" aria-hidden="true" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-6 h-6" aria-hidden="true" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Semantic Landmark: MAIN */}
      <main className="flex-1 space-y-8 max-w-5xl">
        {/* OBSTRUCTION / HAZARD PANEL: BOLD RED BORDER, HIGH CONTRAST */}
        {obstructionInstructions.length > 0 && (
          <section aria-label="Obstruction and Hazard Alert">
            <div
              role="alert"
              className={`p-6 rounded-lg ${themeClasses.obstruction} space-y-2`}
            >
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-10 h-10 shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className={`font-black uppercase tracking-wider ${fontStyle.h2}`}>
                    CAUTION: Physical Obstruction Notice
                  </h2>
                  {obstructionInstructions.map((obs) => (
                    <p key={`obs-${obs.id}`} className={`font-bold mt-2 ${fontStyle.body}`}>
                      {obs.content}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SHORT, BOLD DIRECTIONS (LARGE TOUCH CARDS) */}
        <section aria-labelledby="directions-heading" className="space-y-6">
          <h2 id="directions-heading" className={`font-black ${fontStyle.h2}`}>
            Wayfinding Directions
          </h2>

          {instructions.length === 0 ? (
            <div className={`p-8 rounded-lg ${themeClasses.card} ${fontStyle.body}`}>
              <p>Welcome to City Central Library. Reception desk is 10 meters straight ahead along the main entryway.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {instructions.map((inst, index) => (
                <div
                  key={inst.id}
                  className={`p-6 sm:p-8 rounded-lg ${themeClasses.card} space-y-3`}
                >
                  <div className="flex items-center justify-between border-b-2 border-current pb-2">
                    <span className={`font-black uppercase tracking-wider ${fontStyle.badge}`}>
                      Direction Step {index + 1}
                    </span>
                    <span className={`font-black ${fontStyle.badge}`}>
                       CCL
                    </span>
                  </div>

                  <h3 className={`font-black ${fontStyle.h3}`}>
                    {inst.title}
                  </h3>

                  <p className={`font-bold leading-relaxed ${fontStyle.body}`}>
                    {inst.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Semantic Landmark: FOOTER */}
      <footer className="mt-12 pt-6 border-t-4 border-current text-center font-bold">
        <p className={fontStyle.badge}>
          City Central Library &bull; Low-Vision Navigation Terminal &bull; Ask staff at reception for personal assistance
        </p>
      </footer>
    </div>
  );
};
