import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Unlock
} from 'lucide-react';
import { MODULE_CONTENT } from '../../data/quizzesData';
import { stopAllAudio } from '../../audio/SharedAudioContext';

/**
 * ModuleLayout.jsx
 * Standardized Edexcel AoS 3 split-screen container:
 *  - Left: Era-themed Archive Manual (Service Bulletin / Tape Box / Recall Sheet / Help.chm / Inspector)
 *  - Right: Gated 3-Question Micro-Assessment OR Unlocked Live Web Audio Hardware Lab
 */
export default function ModuleLayout({
  era,
  moduleMeta,
  isUnlocked,
  teacherMode,
  savedQuizAnswers = {},
  onPassQuiz,
  onRelock,
  onBack,
  children
}) {
  const content = MODULE_CONTENT[moduleMeta.id];
  const [answers, setAnswers] = useState(savedQuizAnswers);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkedOnce, setCheckedOnce] = useState(false);

  const effectiveUnlocked = isUnlocked || teacherMode;
  const styleCfg = era.archiveStyle;

  const handleValidate = (e) => {
    e.preventDefault();
    if (!content) return;

    let score = 0;
    for (const q of content.questions) {
      if (answers[q.id] === q.correct) {
        score += 1;
      }
    }

    setCheckedOnce(true);
    const total = content.questions.length;

    if (score === total) {
      setErrorMsg('');
      onPassQuiz(moduleMeta.id, answers, score, total, true);
    } else {
      setErrorMsg(
        `You scored ${score}/${total}. Review ${era.archiveName} on the left and correct the highlighted answers to power on the hardware.`
      );
      onPassQuiz(moduleMeta.id, answers, score, total, false);
    }
  };

  return (
    <div>
      {/* Top Return Navigation */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <button
          onClick={() => {
            stopAllAudio();
            onBack();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
        >
          ← Return to Era {era.number} ({era.title})
        </button>

        {!effectiveUnlocked && (
          <button
            type="button"
            onClick={() => {
              const autoAnswers = {};
              content.questions.forEach((q) => {
                autoAnswers[q.id] = q.correct;
              });
              setAnswers(autoAnswers);
              onPassQuiz(moduleMeta.id, autoAnswers, content.questions.length, content.questions.length, true);
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed #52525b',
              borderRadius: '6px',
              color: '#a1a1aa',
              fontSize: '0.75rem',
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Bypass assessment gate for classroom demonstration"
          >
            <Unlock size={13} />
            <span>Demo Bypass Gate</span>
          </button>
        )}
      </div>

      {/* Module Title Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #27272a',
          paddingBottom: '18px',
          marginBottom: '28px'
        }}
      >
        <div>
          <span
            style={{
              color: era.accent,
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            ERA {era.number} ({era.title}) • {moduleMeta.year} • {moduleMeta.pioneer}
          </span>
          <h2 style={{ margin: '5px 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            {moduleMeta.name}
          </h2>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            {content?.subtitle || moduleMeta.summary}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {effectiveUnlocked && !teacherMode && (
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setCheckedOnce(false);
                onRelock(moduleMeta.id);
              }}
              style={{
                background: 'none',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                color: '#a1a1aa',
                fontSize: '0.75rem',
                padding: '7px 11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RotateCcw size={13} />
              <span>Re-take Quiz</span>
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 15px',
              borderRadius: '6px',
              backgroundColor: effectiveUnlocked ? `${era.accent}18` : 'rgba(239,68,68,0.1)',
              border: effectiveUnlocked ? `1px solid ${era.accent}` : '1px solid #ef4444'
            }}
          >
            {effectiveUnlocked ? (
              <CheckCircle2 size={17} color={era.accent} />
            ) : (
              <Lock size={17} color="#ef4444" />
            )}
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: effectiveUnlocked ? era.accent : '#ef4444'
              }}
            >
              {effectiveUnlocked
                ? teacherMode && !isUnlocked
                  ? 'EDUCATOR UNLOCKED'
                  : 'HARDWARE UNLOCKED'
                : 'HARDWARE GATED'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left Archive Manual, Right Quiz or Live Hardware */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: effectiveUnlocked ? 'minmax(320px, 0.85fr) minmax(0, 1.35fr)' : '1.05fr 1fr',
          gap: '28px',
          alignItems: 'start'
        }}
      >
        {/* LEFT: ERA ARCHIVE DOCUMENT */}
        <div
          style={{
            background: styleCfg.bg,
            borderRadius: '10px',
            border: styleCfg.border,
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.75), 0 10px 24px rgba(0,0,0,0.45)',
            padding: '24px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: `1px solid ${era.accent}66`,
              paddingBottom: '12px',
              marginBottom: '18px'
            }}
          >
            <BookOpen size={19} color={era.accent} />
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                {era.archiveName}
              </div>
              <h3
                style={{
                  margin: 0,
                  color: era.accent,
                  fontFamily: styleCfg.font,
                  fontSize: '0.98rem',
                  letterSpacing: '0.5px'
                }}
              >
                {content?.bulletinCode}
              </h3>
            </div>
          </div>

          <div
            style={{
              color: styleCfg.bodyColor,
              fontSize: '0.86rem',
              lineHeight: '1.62',
              fontFamily: styleCfg.font,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {content?.sections.map((sec, idx) => (
              <div key={idx}>
                <h4
                  style={{
                    color: styleCfg.headingColor,
                    margin: '0 0 6px 0',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {sec.heading}
                </h4>
                {sec.body && <p style={{ margin: 0 }}>{sec.body}</p>}
                {sec.formula && (
                  <pre
                    style={{
                      margin: '10px 0 0 0',
                      padding: '11px 14px',
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      borderLeft: `3px solid ${era.accent}`,
                      borderRadius: '4px',
                      color: '#f8fafc',
                      fontSize: '0.78rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}
                  >
                    {sec.formula}
                  </pre>
                )}
                {sec.bullets && (
                  <ul style={{ paddingLeft: '18px', margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: PROCEDURAL MICRO-ASSESSMENT OR INTERACTIVE DSP HARDWARE */}
        <div>
          {!effectiveUnlocked ? (
            <div
              style={{
                backgroundColor: '#18181b',
                borderRadius: '10px',
                border: '1px solid #3f3f46',
                padding: '26px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <HelpCircle size={22} color={era.accent} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                    Edexcel AoS 3 Micro-Assessment
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                    Score 3/3 using {era.archiveName} on the left to unlock the interactive studio hardware.
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    fontSize: '0.83rem',
                    marginBottom: '16px'
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {content?.questions.map((q, idx) => {
                  const selected = answers[q.id];
                  const isWrong = checkedOnce && selected !== q.correct;
                  const isRight = checkedOnce && selected === q.correct;

                  return (
                    <div
                      key={q.id}
                      style={{
                        backgroundColor: 'rgba(39, 39, 42, 0.35)',
                        padding: '15px',
                        borderRadius: '8px',
                        border: isWrong
                          ? '1px solid #ef444488'
                          : isRight
                            ? '1px solid #22c55e88'
                            : '1px solid #27272a'
                      }}
                    >
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 600, color: '#f4f4f5' }}>
                        {idx + 1}. {q.question}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {q.options.map((opt, optIdx) => {
                          const active = selected === optIdx;
                          return (
                            <label
                              key={optIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                fontSize: '0.83rem',
                                color: '#e4e4e7',
                                cursor: 'pointer',
                                padding: '7px 10px',
                                borderRadius: '5px',
                                backgroundColor: active ? `${era.accent}22` : 'rgba(0,0,0,0.2)',
                                border: active ? `1px solid ${era.accent}` : '1px solid transparent'
                              }}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={active}
                                onChange={() => setAnswers({ ...answers, [q.id]: optIdx })}
                                style={{ accentColor: era.accent, marginTop: '3px' }}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>

                      {isRight && (
                        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#86efac' }}>
                          ✓ Correct: {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="submit"
                  style={{
                    backgroundColor: era.accent,
                    color: '#09090b',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px'
                  }}
                >
                  <span>Validate Answers &amp; Power On Hardware</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          ) : (
            <div>{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
