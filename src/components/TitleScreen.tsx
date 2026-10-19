import React from 'react';
import { Play, Volume2, VolumeX, Music, Shield, ArrowUp, ArrowDown } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TitleScreenProps {
  onStart: () => void;
  highScore: number;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  onToggleSfx: () => void;
  onToggleBgm: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  highScore,
  sfxEnabled,
  bgmEnabled,
  onToggleSfx,
  onToggleBgm,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 pointer-events-auto bg-black/40 backdrop-blur-[2px]">
      {/* Top Bar with High Score & Audio Toggles */}
      <div className="w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-400 font-tech">
          <span className="text-xs uppercase tracking-wider text-slate-400">최고 기록 (BEST)</span>
          <span className="text-lg font-arcade font-bold text-yellow-400 tabular-nums">
            {highScore.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleBgm();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              bgmEnabled
                ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950/80 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
            title="BGM 토글 (BGM Toggle)"
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSfx();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              sfxEnabled
                ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950/80 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
            title="효과음 토글 (SFX Toggle)"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Bespoke Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl">
        {/* Bespoke Inline SVG Logo */}
        <div className="relative mb-3 group">
          <svg className="w-72 sm:w-96 h-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]" viewBox="0 0 400 90">
            <defs>
              <linearGradient id="neonTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              className="font-arcade font-black text-4xl sm:text-5xl tracking-widest fill-transparent"
              stroke="url(#neonTextGrad)"
              strokeWidth="2.5"
              filter="url(#glowEffect)"
            >
              NEON DASH
            </text>
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              className="font-arcade font-black text-4xl sm:text-5xl tracking-widest fill-white/90"
            >
              NEON DASH
            </text>
          </svg>
          <div className="text-xs sm:text-sm font-tech tracking-widest text-cyan-400/90 uppercase font-semibold mt-1">
            사이버펑크 장애물 달리기 게임
          </div>
        </div>

        {/* Core Mechanic Visual Guide (Jump vs Duck) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 my-6 w-full max-w-md">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/40 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-1.5 text-rose-400 font-bold font-tech text-sm">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300">
                <ArrowUp className="w-4 h-4" />
              </span>
              바닥 장애물 ➔ 점프
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              가시 및 레이저 바리케이드를 <span className="text-rose-400 font-semibold">스페이스바 / ↑ 키</span>로 뛰어넘으세요!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/40 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-1.5 text-cyan-400 font-bold font-tech text-sm">
              <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                <ArrowDown className="w-4 h-4" />
              </span>
              공중 장애물 ➔ 엎드리기
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              머리 위 레이저와 비행 드론을 <span className="text-cyan-400 font-semibold">↓ 키 / S 키</span>로 슬라이딩해 통과하세요!
            </p>
          </div>
        </div>

        {/* Start Game CTA Button */}
        <button
          onClick={onStart}
          className="cursor-pointer group relative px-10 py-4 rounded-2xl font-arcade font-bold text-lg text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.7)] hover:shadow-[0_0_35px_rgba(6,182,212,1)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-3"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>게임 시작 (START)</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-900/20 text-slate-900 font-tech font-bold uppercase tracking-wider">
            Space / Enter
          </span>
        </button>
      </div>

      {/* Control Hint Line */}
      <div className="text-center font-tech text-xs sm:text-sm text-slate-400/90 py-2 px-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <span className="text-cyan-400 font-semibold">Space / ↑ / W</span> 점프 ·{' '}
        <span className="text-rose-400 font-semibold">↓ / S</span> 엎드리기 ·{' '}
        <span className="text-yellow-400 font-semibold">Esc / P</span> 일시정지 ·{' '}
        <span className="text-slate-300">터치/버튼 지원</span>
      </div>
    </div>
  );
};
