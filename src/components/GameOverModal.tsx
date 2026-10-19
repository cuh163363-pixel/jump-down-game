import React from 'react';
import { RotateCcw, Home, Trophy, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { GameStats } from '../game/types';

interface GameOverModalProps {
  stats: GameStats;
  isNewHigh: boolean;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewHigh,
  onRestart,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs pointer-events-auto">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-950/95 border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.35)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Game Over Title Lockup */}
        <div className="text-xs font-tech font-bold uppercase tracking-widest text-rose-500 mb-1">
          COLLISION DETECTED
        </div>
        <h2 className="text-3xl sm:text-4xl font-arcade font-black text-rose-500 neon-glow-pink tracking-wider mb-2">
          GAME OVER
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-tech">
          장애물과 충돌하여 러닝이 종료되었습니다.
        </p>

        {/* High Score Celebration Badge */}
        {isNewHigh && (
          <div className="mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 border border-yellow-400/60 flex items-center gap-2 text-yellow-300 font-arcade text-xs font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>최고 기록 갱신! (NEW BEST RECORD!)</span>
          </div>
        )}

        {/* Main Score Showcase */}
        <div className="w-full p-4 mb-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-tech text-slate-400 uppercase tracking-wider mb-1">최종 점수 (FINAL SCORE)</span>
          <span className="text-4xl sm:text-5xl font-arcade font-black text-cyan-400 neon-glow-cyan tabular-nums">
            {stats.score.toLocaleString()}
          </span>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-tech text-slate-400 uppercase">이동 거리</span>
            <span className="text-lg font-arcade font-bold text-slate-200 tabular-nums mt-0.5">
              {stats.distance} <span className="text-xs text-slate-400 font-tech">m</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-tech text-slate-400 uppercase">회피 성공</span>
            <span className="text-lg font-arcade font-bold text-cyan-400 tabular-nums mt-0.5">
              {stats.obstaclesDodged}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-tech text-slate-400 uppercase">코인 획득</span>
            <span className="text-lg font-arcade font-bold text-yellow-400 tabular-nums mt-0.5">
              {stats.coins}
            </span>
          </div>
        </div>

        {/* Quick Strategy Tip for next run */}
        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900/40 border border-slate-800/80 mb-6 flex items-center justify-center gap-3 text-xs font-tech text-slate-400">
          <span className="flex items-center gap-1 text-rose-400">
            <ArrowUp className="w-3.5 h-3.5" /> 바닥은 점프
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-cyan-400">
            <ArrowDown className="w-3.5 h-3.5" /> 공중은 엎드리기
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="cursor-pointer w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-arcade font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:shadow-[0_0_30px_rgba(244,63,94,0.9)] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>다시 도전 (Space / Enter)</span>
          </button>

          <button
            onClick={onHome}
            className="cursor-pointer w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-tech font-semibold text-sm transition-all flex items-center justify-center gap-2"
            title="메인 메뉴로 이동"
          >
            <Home className="w-4 h-4" />
            <span>메인</span>
          </button>
        </div>
      </div>
    </div>
  );
};
