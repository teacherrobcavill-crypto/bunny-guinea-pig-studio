import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Download,
  Award,
  Unlock,
  RotateCcw,
  FileText,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ERAS } from '../../data/erasData';

const ESSAY_PROMPTS = [
  {
    id: 'reverb_evolution',
    title: 'Q6(a): Evolution of Artificial Reverberation (1947–1985) [15 Marks]',
    question:
      'Evaluate how artificial reverberation technology evolved from Bill Putnam’s 1947 acoustic echo chambers through the EMT 140 mechanical plate to 1980s gated reverb architectures, explaining the acoustic physics and sonic impact on commercial recordings.',
    keywords: [
      'pre-delay',
      'rt60',
      'non-parallel',
      'tile',
      'emt 140',
      'dispersive',
      'damper',
      'piezo',
      'ssl',
      'listen mic',
      'drawmer',
      'sidechain',
      'hold',
      'townhouse'
    ]
  },
  {
    id: 'multitrack_noise',
    title: 'Q6(b): Multitrack Capacity, Sync & Noise Floor (1955–1995) [15 Marks]',
    question:
      'Trace the technological developments that allowed engineers to expand from 4-track reduction bouncing to 46-track SMPTE-locked analogue tape and 16-bit PCM digital recording, analysing how latency, generation hiss, and crosstalk were overcome.',
    keywords: [
      'sel-sync',
      'record head',
      'generation loss',
      'studer',
      'bounce',
      'smpte',
      'guard band',
      'track 23',
      'bi-phase',
      'dolby',
      'companding',
      'nyquist',
      'dither',
      '16-bit'
    ]
  },
  {
    id: 'synthesis_timeline',
    title: 'Q6(c): Subtractive Voltage Control to FM & Wavetable Synthesis [15 Marks]',
    question:
      'Compare the sound generation architectures of 1960s Moog voltage-controlled subtractive synthesis, 1980s Fairlight CMI sampling and Yamaha DX7 FM synthesis, and modern 3D morphing wavetable synthesizers.',
    keywords: [
      '1v/oct',
      'vco',
      'ladder',
      '24db',
      'adsr',
      'fairlight',
      '8-bit',
      'aliasing',
      'dx7',
      'carrier',
      'modulator',
      'sideband',
      'wavetable',
      'unison'
    ]
  },
  {
    id: 'dynamics_loudness',
    title: 'Q6(d): Dynamic Control from Vari-Mu Tubes to LUFS Streaming [15 Marks]',
    question:
      'Discuss how dynamic range control and loudness measurement evolved from 1950s Fairchild 660 variable-mu tube limiters and SSL VCA bus compression to the 2000s Loudness War and modern ITU-R BS.1770 LUFS streaming normalisation.',
    keywords: [
      'vari-mu',
      '6386',
      'remote-cutoff',
      'soft knee',
      'vca',
      'bus compressor',
      'brickwall',
      'inter-sample',
      'dbtp',
      'k-weighting',
      '-14 lufs',
      'crest factor',
      'normalisation'
    ]
  }
];

function evaluateEdexcelEssay(text, promptObj) {
  const clean = (text || '').toLowerCase();
  const words = clean.trim() ? clean.trim().split(/\s+/).length : 0;
  const matched = promptObj.keywords.filter((kw) => clean.includes(kw));
  const missed = promptObj.keywords.filter((kw) => !clean.includes(kw));

  // AO3 (5 marks: accurate technical terminology) + AO4 (10 marks: chronological comparison & sonic evaluation)
  const kwRatio = matched.length / promptObj.keywords.length;
  const lengthFactor = Math.min(1, words / 220);

  const ao3 = Math.min(5, Math.round(kwRatio * 4 + lengthFactor * 1));
  const ao4 = Math.min(10, Math.round(kwRatio * 6 + lengthFactor * 4));
  const total = Math.min(15, ao3 + ao4);

  let level = 'Level 1 (1–3 Marks): Basic descriptive statements with limited technical detail.';
  if (total >= 13) level = 'Level 5 (13–15 Marks): Sustained, perceptive AO3/AO4 technical & chronological evaluation.';
  else if (total >= 10) level = 'Level 4 (10–12 Marks): Detailed multi-era technical analysis with clear cause-and-effect.';
  else if (total >= 7) level = 'Level 3 (7–9 Marks): Competent technical explanation across at least two eras.';
  else if (total >= 4) level = 'Level 2 (4–6 Marks): Partial technical knowledge; needs deeper physical/sonic links.';
  else if (words === 0) level = 'Unmarked (0/15): Draft your response below to generate AO3/AO4 rubric feedback.';

  return { words, matched, missed, ao3, ao4, total, level };
}

export default function GradebookDashboard({
  studentProfile,
  setStudentProfile,
  moduleProgress,
  teacherMode,
  setTeacherMode,
  essayState,
  setEssayState,
  onOpenModule,
  onResetProgress
}) {
  const [selectedPromptId, setSelectedPromptId] = useState(essayState.promptId || ESSAY_PROMPTS[0].id);
  const activePrompt = ESSAY_PROMPTS.find((p) => p.id === selectedPromptId) || ESSAY_PROMPTS[0];
  const currentDraft = essayState.drafts?.[selectedPromptId] || '';
  const teacherOverride = essayState.overrides?.[selectedPromptId];

  const evalResult = evaluateEdexcelEssay(currentDraft, activePrompt);
  const finalEssayMark =
    teacherOverride !== undefined && teacherOverride !== '' ? Number(teacherOverride) : evalResult.total;

  // Compute aggregate stats across all 20 modules (60 quiz marks)
  let unlockedCount = 0;
  let earnedQuizMarks = 0;
  const totalQuizMarks = 60;

  ERAS.forEach((era) => {
    era.modules.forEach((m) => {
      const rec = moduleProgress[m.id];
      if (rec?.unlocked) unlockedCount += 1;
      if (typeof rec?.score === 'number') earnedQuizMarks += rec.score;
    });
  });

  const exportCsv = () => {
    const rows = [
      ['Candidate Name', studentProfile.name || 'Unnamed Student'],
      ['Candidate Number', studentProfile.candidateNumber || 'N/A'],
      ['Unlocked Modules', `${unlockedCount}/20`],
      ['Micro-Assessment Total', `${earnedQuizMarks}/${totalQuizMarks}`],
      ['AoS 3 15-Mark Essay Prompt', activePrompt.title],
      ['AoS 3 Essay Score', `${finalEssayMark}/15`],
      [],
      ['Era', 'Module ID', 'Module Title', 'Status', 'Quiz Score', 'Attempts']
    ];

    ERAS.forEach((era) => {
      era.modules.forEach((m) => {
        const rec = moduleProgress[m.id] || {};
        rows.push([
          `Era ${era.number} (${era.title})`,
          m.id,
          m.name,
          rec.unlocked ? 'UNLOCKED' : 'LOCKED',
          `${rec.score ?? 0}/3`,
          String(rec.attempts ?? 0)
        ]);
      });
    });

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AoS3_Gradebook_${(studentProfile.name || 'Student').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Top Banner & Candidate / Educator Controls */}
      <div
        style={{
          backgroundColor: '#18181b',
          borderRadius: '12px',
          border: '1px solid #27272a',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '18px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>
            PEARSON EDEXCEL A-LEVEL MUSIC TECHNOLOGY (9MT0) • AOS 3 PORTFOLIO
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
            Student &amp; Educator Assessment Gradebook
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTeacherMode(!teacherMode)}
            style={{
              backgroundColor: teacherMode ? 'rgba(245, 158, 11, 0.2)' : '#27272a',
              border: teacherMode ? '1px solid #f59e0b' : '1px solid #3f3f46',
              color: teacherMode ? '#fcd34d' : '#e4e4e7',
              borderRadius: '8px',
              padding: '9px 14px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Unlock size={15} />
            <span>{teacherMode ? 'Educator Master Unlock: ON' : 'Educator Master Unlock: OFF'}</span>
          </button>

          <button
            onClick={exportCsv}
            style={{
              backgroundColor: '#10b981',
              border: 'none',
              color: '#052e16',
              borderRadius: '8px',
              padding: '9px 15px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} />
            <span>Export CSV Gradebook</span>
          </button>

          <button
            onClick={onResetProgress}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ef444488',
              color: '#fca5a5',
              borderRadius: '8px',
              padding: '9px 12px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Scores</span>
          </button>
        </div>
      </div>

      {/* Candidate Details + KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(3, 1fr)', gap: '14px' }}>
        <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '10px', border: '1px solid #27272a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '4px', fontWeight: 700 }}>
              CANDIDATE NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Taylor"
              value={studentProfile.name}
              onChange={(e) => setStudentProfile({ ...studentProfile, name: e.target.value })}
              style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.83rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '4px', fontWeight: 700 }}>
              CANDIDATE / CENTRE ID
            </label>
            <input
              type="text"
              placeholder="e.g. 9MT0-4021"
              value={studentProfile.candidateNumber}
              onChange={(e) => setStudentProfile({ ...studentProfile, candidateNumber: e.target.value })}
              style={{ width: '100%', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.83rem' }}
            />
          </div>
        </div>

        <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '10px', border: '1px solid #27272a' }}>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700 }}>HARDWARE LABS UNLOCKED</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {unlockedCount} <span style={{ fontSize: '1rem', color: '#71717a' }}>/ 20</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '10px', border: '1px solid #27272a' }}>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700 }}>MICRO-ASSESSMENT MARKS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d4af37', marginTop: '4px' }}>
            {earnedQuizMarks} <span style={{ fontSize: '1rem', color: '#71717a' }}>/ {totalQuizMarks}</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '10px', border: '1px solid #27272a' }}>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700 }}>COMPONENT 4 Q6 ESSAY</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} color="#10b981" />
            <span>
              {finalEssayMark} <span style={{ fontSize: '1rem', color: '#71717a' }}>/ 15</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5-Era x 20-Module Matrix */}
      <div style={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', padding: '22px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
          AoS 3 Chronological Module Matrix (Click Any Lab to Launch)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
          {ERAS.map((era) => (
            <div key={era.id} style={{ backgroundColor: '#09090b', borderRadius: '10px', border: `1px solid ${era.accent}44`, padding: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: era.accent, marginBottom: '2px' }}>
                ERA {era.number} • {era.title}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '10px' }}>
                {era.subtitle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {era.modules.map((m) => {
                  const rec = moduleProgress[m.id];
                  const unlocked = Boolean(rec?.unlocked);
                  return (
                    <button
                      key={m.id}
                      onClick={() => onOpenModule(era.id, m.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: unlocked ? `1px solid ${era.accent}66` : '1px solid #27272a',
                        backgroundColor: unlocked ? `${era.accent}12` : '#141417',
                        color: '#e4e4e7',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: '6px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        {unlocked ? <CheckCircle2 size={13} color={era.accent} /> : <Lock size={13} color="#71717a" />}
                        <span>{m.name}</span>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: unlocked ? era.accent : '#71717a', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                        {rec?.score ?? 0}/3 <ExternalLink size={11} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edexcel Component 4 Question 6 (15-Mark Extended Essay Trainer & Rubric Evaluator) */}
      <div style={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <FileText size={20} color="#10b981" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Edexcel Component 4 (9MT0/04) Question 6 — 15-Mark Extended Essay Evaluator
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
              Assesses AO3 (5 marks: technical engineering accuracy) &amp; AO4 (10 marks: cross-era analytical evaluation).
            </span>
          </div>
        </div>

        <select
          value={selectedPromptId}
          onChange={(e) => {
            setSelectedPromptId(e.target.value);
            setEssayState({ ...essayState, promptId: e.target.value });
          }}
          style={{
            width: '100%',
            backgroundColor: '#09090b',
            color: '#f8fafc',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '0.86rem',
            fontWeight: 700,
            marginBottom: '12px'
          }}
        >
          {ESSAY_PROMPTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <div
          style={{
            backgroundColor: '#09090b',
            borderLeft: '3px solid #10b981',
            padding: '12px 16px',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.86rem',
            lineHeight: 1.55,
            marginBottom: '14px'
          }}
        >
          {activePrompt.question}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '18px', alignItems: 'start' }}>
          <div>
            <textarea
              rows={10}
              placeholder="Write your cross-era technical evaluation here (aim for 220+ words citing specific hardware models, acoustic/DSP formulas, and commercial studio impact)..."
              value={currentDraft}
              onChange={(e) =>
                setEssayState({
                  ...essayState,
                  promptId: selectedPromptId,
                  drafts: { ...(essayState.drafts || {}), [selectedPromptId]: e.target.value }
                })
              }
              style={{
                width: '100%',
                backgroundColor: '#09090b',
                color: '#f4f4f5',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '0.86rem',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a1a1aa', marginTop: '6px' }}>
              <span>Word Count: {evalResult.words} words (Target: 220–300 words)</span>
              <span>Auto-saved to browser storage</span>
            </div>
          </div>

          {/* Live AO3 / AO4 Diagnostic Panel */}
          <div style={{ backgroundColor: '#09090b', borderRadius: '10px', border: '1px solid #27272a', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 800, fontSize: '0.82rem', marginBottom: '8px' }}>
              <Sparkles size={15} />
              <span>PROVISIONAL RUBRIC DIAGNOSTIC: {finalEssayMark} / 15</span>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#e4e4e7', marginBottom: '10px' }}>
              <strong>Descriptor:</strong> {evalResult.level}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '0.75rem' }}>
              <div style={{ backgroundColor: '#18181b', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#a1a1aa' }}>AO3 Technical:</span>{' '}
                <strong style={{ color: '#38bdf8' }}>{evalResult.ao3} / 5</strong>
              </div>
              <div style={{ backgroundColor: '#18181b', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#a1a1aa' }}>AO4 Evaluation:</span>{' '}
                <strong style={{ color: '#10b981' }}>{evalResult.ao4} / 10</strong>
              </div>
            </div>

            <div style={{ fontSize: '0.73rem', color: '#86efac', marginBottom: '6px' }}>
              <strong>Detected AoS 3 Concepts ({evalResult.matched.length}/{activePrompt.keywords.length}):</strong>{' '}
              {evalResult.matched.length ? evalResult.matched.join(', ') : 'None yet'}
            </div>

            {evalResult.missed.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginBottom: '12px' }}>
                <strong>Suggested Technical Terms to Integrate:</strong> {evalResult.missed.slice(0, 8).join(', ')}
              </div>
            )}

            {teacherMode && (
              <div style={{ borderTop: '1px solid #27272a', paddingTop: '10px', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#fcd34d', fontWeight: 700, marginBottom: '4px' }}>
                  EDUCATOR MODERATED MARK OVERRIDE (0–15):
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  placeholder="Auto"
                  value={teacherOverride ?? ''}
                  onChange={(e) =>
                    setEssayState({
                      ...essayState,
                      overrides: { ...(essayState.overrides || {}), [selectedPromptId]: e.target.value }
                    })
                  }
                  style={{ width: '90px', backgroundColor: '#18181b', border: '1px solid #f59e0b', borderRadius: '5px', padding: '5px 8px', color: '#fff', fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
