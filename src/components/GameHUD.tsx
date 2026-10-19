import React from 'react';
import { Shield, Magnet, Pause, Volume2, VolumeX, Music, Zap } from 'lucide-react';
import { GameStats } from '../game/types';
import { soundManager } from '../audio/soundManager';

interface GameHUDProps {
  stats: GameStats;
  onPause: () => void;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  onToggleSfx: () => void;
  onToggleBgm: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  onPause,
  sfxEnabled,
  bgmEnabled,
  onToggleSfx,
  onToggleBgm,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-4 sm:p-6 flex flex-col justify-between">
      {/* Top Perimeter Status Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left Cluster: Score & Distance */}
        <div className="flex items-center gap-3">
          {/* Score */}
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex flex-col">
            <span className="text-[10px] font-tech uppercase tracking-wider text-slate-400">SCORE</span>
            <span className="text-xl sm:text-2xl font-arcade font-bold text-cyan-400 tabular-nums">
              {stats.score.toLocaleString()}
            </span>
          </div>

          {/* Distance */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] font-tech uppercase tracking-wider text-slate-400">DISTANCE</span>
            <span className="text-base sm:text-lg font-arcade font-semibold text-slate-200 tabular-nums">
              {stats.distance} <span className="text-xs text-cyan-400 font-tech">m</span>
            </span>
          </div>

          {/* Coins */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-yellow-500/30 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-400/20 border border-yellow-400 flex items-center justify-center text-[10px] text-yellow-300 font-bold">
              ⚡
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-tech uppercase tracking-wider text-slate-400">COINS</span>
              <span className="text-base sm:text-lg font-arcade font-semibold text-yellow-400 tabular-nums">
                {stats.coins}
              </span>
            </div>
          </div>
        </div>

        {/* Right Cluster: Speed, Sound, Pause Buttons (pointer-events-auto on interactive controls) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Speed meter */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-tech text-slate-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SPEED</span>
            <span className="font-arcade text-cyan-300 font-bold tabular-nums">{stats.currentSpeed}</span>
          </div>

          {/* BGM Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleBgm();
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              bgmEnabled
                ? 'bg-slate-950/80 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
                : 'bg-slate-950/80 border-slate-800 text-slate-600 hover:text-slate-400'
            }`}
            title="배경음 토글"
          >
            <Music className="w-4 h-4" />
          </button>

          {/* SFX Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSfx();
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              sfxEnabled
                ? 'bg-slate-950/80 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
                : 'bg-slate-950/80 border-slate-800 text-slate-600 hover:text-slate-400'
            }`}
            title="효과음 토글"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer"
            title="일시 정지 (Esc / P)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom status cluster: Dodged obstacles & keyboard reminder */}
      <div className="flex items-end justify-between w-full">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-tech text-slate-400">
          <span>피한 장애물:</span>
          <span className="text-cyan-400 font-bold font-arcade tabular-nums">{stats.obstaclesDodged}</span>
          <span className="text-slate-600">|</span>
          <span>최고:</span>
          <span className="text-yellow-400 font-bold font-arcade tabular-nums">{stats.highScore.toLocaleString()}</span>
        </div>

        {/* Minimal control hint */}
        <div className="hidden md:flex items-center gap-3 text-xs font-tech text-slate-500 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/50">
          <span><span className="text-cyan-400">▲/Space</span> 점프</span>
          <span><span className="text-rose-400">▼/S</span> 엎드리기</span>
        </div>
      </div>
    </div>
  );
};
