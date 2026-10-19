import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs pointer-events-auto">
      <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl sm:text-3xl font-arcade font-bold text-cyan-400 neon-glow-cyan mb-1">
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 font-tech mb-6">게임이 일시정지 되었습니다</p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="cursor-pointer w-full py-3.5 px-6 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-arcade font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>이어하기 (Resume)</span>
          </button>

          <button
            onClick={onRestart}
            className="cursor-pointer w-full py-3.5 px-6 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-tech font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>처음부터 재시작</span>
          </button>

          <button
            onClick={onHome}
            className="cursor-pointer w-full py-3 px-6 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 font-tech text-xs transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>메인 타이틀로</span>
          </button>
        </div>
      </div>
    </div>
  );
};
