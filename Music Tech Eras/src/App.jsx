import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CheckCircle2,
  Lock,
  Volume2,
  VolumeX,
  ArrowRight,
  Unlock
} from 'lucide-react';
import { ERAS } from './data/erasData';
import { stopAllAudio, subscribeAudioStatus } from './audio/SharedAudioContext';
import ModuleLayout from './components/common/ModuleLayout';
import GradebookDashboard from './components/dashboard/GradebookDashboard';

// Era 1 (1930s–1963)
import SlapbackModule from './components/modules/era1/SlapbackModule';
import ChamberModule from './components/modules/era1/ChamberModule';
import PultecModule from './components/modules/era1/PultecModule';
import VariMuModule from './components/modules/era1/VariMuModule';
import ModularSynthModule from './components/modules/era1/ModularSynthModule';

// Era 2 (1964–1969)
import BouncingModule from './components/modules/era2/BouncingModule';
import SelSyncModule from './components/modules/era2/SelSyncModule';
import FlangeAdtModule from './components/modules/era2/FlangeAdtModule';
import EmtPlateModule from './components/modules/era2/EmtPlateModule';

// Era 3 (1969–1995)
import SmpteSyncModule from './components/modules/era3/SmpteSyncModule';
import DolbyModule from './components/modules/era3/DolbyModule';
import SslChannelModule from './components/modules/era3/SslChannelModule';
import GatedReverbModule from './components/modules/era3/GatedReverbModule';

// Era 4 (1980s–2000s)
import QuantizeDitherModule from './components/modules/era4/QuantizeDitherModule';
import FairlightModule from './components/modules/era4/FairlightModule';
import StepSequencerModule from './components/modules/era4/StepSequencerModule';
import Dx7FmModule from './components/modules/era4/Dx7FmModule';

// Era 5 (Modern Era)
import WavetableModule from './components/modules/era5/WavetableModule';
import LufsMeteringModule from './components/modules/era5/LufsMeteringModule';
import AnalogModelingModule from './components/modules/era5/AnalogModelingModule';

const MODULE_COMPONENTS = {
  slapback: SlapbackModule,
  chamber: ChamberModule,
  pultec: PultecModule,
  varimu: VariMuModule,
  modular: ModularSynthModule,
  bouncing: BouncingModule,
  selsync: SelSyncModule,
  flange: FlangeAdtModule,
  plate: EmtPlateModule,
  smpte: SmpteSyncModule,
  dolby: DolbyModule,
  ssl: SslChannelModule,
  gated: GatedReverbModule,
  quantize: QuantizeDitherModule,
  fairlight: FairlightModule,
  sequencer: StepSequencerModule,
  fm: Dx7FmModule,
  wavetable: WavetableModule,
  lufs: LufsMeteringModule,
  'analog-modeled': AnalogModelingModule
};

const STORAGE_KEY = 'audio_timeline_labs_v2_state';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export default function App() {
  const saved = loadSavedState();

  const [activeEraId, setActiveEraId] = useState('era-1');
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [view, setView] = useState('era'); // 'era' | 'module' | 'dashboard'
  const [anyAudioPlaying, setAnyAudioPlaying] = useState(false);

  const [teacherMode, setTeacherMode] = useState(() => Boolean(saved?.teacherMode));
  const [studentProfile, setStudentProfile] = useState(
    () => saved?.studentProfile || { name: '', candidateNumber: '' }
  );
  const [moduleProgress, setModuleProgress] = useState(() => saved?.moduleProgress || {});
  const [essayState, setEssayState] = useState(
    () => saved?.essayState || { promptId: 'reverb_evolution', drafts: {}, overrides: {} }
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          teacherMode,
          studentProfile,
          moduleProgress,
          essayState
        })
      );
    } catch (_) {}
  }, [teacherMode, studentProfile, moduleProgress, essayState]);

  useEffect(() => {
    return subscribeAudioStatus((playing) => setAnyAudioPlaying(playing));
  }, []);

  const currentEra = ERAS.find((e) => e.id === activeEraId) || ERAS[0];
  const currentModuleMeta = activeModuleId
    ? currentEra.modules.find((m) => m.id === activeModuleId) ||
      ERAS.flatMap((e) => e.modules).find((m) => m.id === activeModuleId)
    : null;

  const totalUnlockedCount = ERAS.reduce(
    (sum, era) => sum + era.modules.filter((m) => moduleProgress[m.id]?.unlocked).length,
    0
  );

  const handlePassQuiz = (modId, answers, score, total, passed) => {
    setModuleProgress((prev) => {
      const existing = prev[modId] || { attempts: 0, unlocked: false, score: 0 };
      return {
        ...prev,
        [modId]: {
          unlocked: existing.unlocked || passed,
          score: Math.max(existing.score || 0, score),
          total,
          answers,
          attempts: (existing.attempts || 0) + 1
        }
      };
    });
  };

  const handleRelock = (modId) => {
    setModuleProgress((prev) => ({
      ...prev,
      [modId]: {
        ...(prev[modId] || {}),
        unlocked: false
      }
    }));
  };

  const openModule = (eraId, modId) => {
    stopAllAudio();
    setActiveEraId(eraId);
    setActiveModuleId(modId);
    setView('module');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchEra = (eraId) => {
    stopAllAudio();
    setActiveEraId(eraId);
    setActiveModuleId(null);
    setView('era');
  };

  const ActiveHardwareComponent = activeModuleId ? MODULE_COMPONENTS[activeModuleId] : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#09090b', color: '#f4f4f5' }}>
      {/* TOP NAVIGATION HEADER */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 28px',
          borderBottom: '1px solid #27272a',
          backgroundColor: 'rgba(9, 9, 11, 0.92)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          onClick={() => switchEra(activeEraId)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              background: `linear-gradient(135deg, ${currentEra.accent}, #18181b)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 18px ${currentEra.accent}44`
            }}
          >
            <Volume2 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              Audio Timeline Labs
            </h1>
            <span style={{ fontSize: '0.73rem', color: '#a1a1aa' }}>
              Edexcel A-Level Music Technology (9MT0) • AoS 3 Interactive Studio Suite
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Global ON AIR / Panic Mute Button */}
          {anyAudioPlaying && (
            <button
              onClick={stopAllAudio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
              title="Silence all running Web Audio stems and synthesizers"
            >
              <VolumeX size={14} />
              <span>ON AIR • SILENCE AUDIO</span>
            </button>
          )}

          {/* Educator Master Preview Toggle */}
          <button
            onClick={() => setTeacherMode(!teacherMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              border: teacherMode ? '1px solid #f59e0b' : '1px solid #27272a',
              backgroundColor: teacherMode ? 'rgba(245, 158, 11, 0.16)' : '#141417',
              color: teacherMode ? '#fcd34d' : '#a1a1aa',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
            title="Toggle Educator Preview to unlock all 20 DSP hardware modules immediately"
          >
            <Unlock size={14} />
            <span>{teacherMode ? 'Educator Mode: ON' : 'Educator Mode'}</span>
          </button>

          {/* Gradebook & 15-Mark Exam Button */}
          <button
            onClick={() => {
              stopAllAudio();
              setView(view === 'dashboard' ? 'era' : 'dashboard');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 15px',
              borderRadius: '8px',
              border: view === 'dashboard' ? `1px solid ${currentEra.accent}` : '1px solid #3f3f46',
              backgroundColor: view === 'dashboard' ? 'rgba(255,255,255,0.09)' : '#18181b',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            <LayoutDashboard size={15} color={currentEra.accent} />
            <span>Gradebook &amp; Q6 Essay ({totalUnlockedCount}/20)</span>
          </button>
        </div>
      </header>

      {/* CHRONOLOGICAL 5-ERA TIMELINE BAR */}
      <nav
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(160px, 1fr))',
          borderBottom: '1px solid #27272a',
          backgroundColor: '#0e0e11',
          overflowX: 'auto'
        }}
      >
        {ERAS.map((era) => {
          const IconComponent = era.icon;
          const isActive = era.id === activeEraId && view !== 'dashboard';
          const eraUnlocked = era.modules.filter((m) => moduleProgress[m.id]?.unlocked || teacherMode).length;

          return (
            <button
              key={era.id}
              onClick={() => switchEra(era.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 18px',
                border: 'none',
                borderRight: '1px solid #1f1f23',
                borderBottom: isActive ? `3px solid ${era.accent}` : '3px solid transparent',
                backgroundColor: isActive ? 'rgba(255,255,255,0.035)' : 'transparent',
                color: isActive ? '#ffffff' : '#71717a',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.16s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <IconComponent size={15} color={isActive ? era.accent : '#71717a'} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isActive ? era.accent : '#71717a' }}>
                    Era {era.number}
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: isActive ? '#d4d4d8' : '#52525b' }}>
                  {eraUnlocked}/{era.modules.length}
                </span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isActive ? '#f4f4f5' : '#a1a1aa' }}>
                {era.title}
              </div>
              <div style={{ fontSize: '0.73rem', opacity: 0.85, marginTop: '2px' }}>
                {era.subtitle}
              </div>
            </button>
          );
        })}
      </nav>

      {/* MAIN WORKSPACE */}
      <main style={{ flex: 1, padding: '30px 28px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {view === 'dashboard' ? (
          <GradebookDashboard
            studentProfile={studentProfile}
            setStudentProfile={setStudentProfile}
            moduleProgress={moduleProgress}
            teacherMode={teacherMode}
            setTeacherMode={setTeacherMode}
            essayState={essayState}
            setEssayState={setEssayState}
            onOpenModule={openModule}
            onResetProgress={() => {
              stopAllAudio();
              setModuleProgress({});
            }}
          />
        ) : view === 'module' && currentModuleMeta && ActiveHardwareComponent ? (
          <ModuleLayout
            key={currentModuleMeta.id}
            era={currentEra}
            moduleMeta={currentModuleMeta}
            isUnlocked={Boolean(moduleProgress[currentModuleMeta.id]?.unlocked)}
            teacherMode={teacherMode}
            savedQuizAnswers={moduleProgress[currentModuleMeta.id]?.answers || {}}
            onPassQuiz={handlePassQuiz}
            onRelock={handleRelock}
            onBack={() => {
              stopAllAudio();
              setView('era');
            }}
          >
            <ActiveHardwareComponent />
          </ModuleLayout>
        ) : (
          /* ERA OVERVIEW & MODULE CARDS */
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '28px',
                borderBottom: '1px solid #27272a',
                paddingBottom: '22px'
              }}
            >
              <div style={{ maxWidth: '780px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', backgroundColor: `${currentEra.accent}18`, color: currentEra.accent, fontSize: '0.74rem', fontWeight: 700, marginBottom: '10px' }}>
                  <span>ERA {currentEra.number} STUDIO AESTHETIC: {currentEra.theme.toUpperCase()}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
                  {currentEra.title}: {currentEra.subtitle}
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#a1a1aa', fontSize: '0.94rem', lineHeight: 1.55 }}>
                  {currentEra.summary}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                <BookOpen size={18} color={currentEra.accent} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Primary Archive Format
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f4f4f5' }}>
                    {currentEra.archiveName}
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {currentEra.modules.map((mod, index) => {
                const rec = moduleProgress[mod.id];
                const unlocked = Boolean(rec?.unlocked) || teacherMode;

                return (
                  <div
                    key={mod.id}
                    onClick={() => openModule(currentEra.id, mod.id)}
                    style={{
                      backgroundColor: '#141417',
                      borderRadius: '12px',
                      border: unlocked ? `1px solid ${currentEra.accent}77` : '1px solid #27272a',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'transform 0.16s ease, border-color 0.16s ease',
                      boxShadow: unlocked ? `0 8px 24px ${currentEra.accent}12` : '0 4px 14px rgba(0,0,0,0.35)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: currentEra.accent, letterSpacing: '0.05em' }}>
                          LAB {currentEra.number}.{index + 1} • {mod.year}
                        </span>

                        {unlocked ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: currentEra.accent }}>
                            <CheckCircle2 size={14} />
                            <span>{rec?.unlocked ? '3/3 UNLOCKED' : 'EDUCATOR READY'}</span>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#a1a1aa' }}>
                            <Lock size={13} />
                            <span>QUIZ GATED</span>
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.16rem', fontWeight: 800, color: '#fff' }}>
                        {mod.name}
                      </h3>

                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '8px' }}>
                        {mod.pioneer} • <span style={{ color: currentEra.accent }}>{mod.tag}</span>
                      </div>

                      <p style={{ margin: '0 0 18px 0', fontSize: '0.83rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                        {mod.summary}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: unlocked ? `${currentEra.accent}20` : '#1f1f23',
                        color: unlocked ? currentEra.accent : '#e4e4e7',
                        fontWeight: 700,
                        fontSize: '0.82rem'
                      }}
                    >
                      <span>{unlocked ? 'Open Live DSP Hardware Lab' : 'Read Archive & Unlock Hardware'}</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
