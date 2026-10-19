import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TouchControlsProps {
  onJump: () => void;
  onStartDuck: () => void;
  onEndDuck: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onJump,
  onStartDuck,
  onEndDuck,
}) => {
  const [jumpPressed, setJumpPressed] = useState(false);
  const [duckPressed, setDuckPressed] = useState(false);

  return (
    <div className="absolute inset-x-0 bottom-4 sm:bottom-6 px-4 sm:px-8 z-15 pointer-events-none flex justify-between items-end">
      {/* Duck / Slide Button (Bottom Left) */}
      <button
        type="button"
        className={`pointer-events-auto cursor-pointer select-none touch-none w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all duration-75 shadow-lg active:scale-90 ${
          duckPressed
            ? 'bg-cyan-500/40 border-cyan-400 text-white scale-95 shadow-[0_0_20px_rgba(6,182,212,0.8)]'
            : 'bg-slate-950/70 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          setDuckPressed(true);
          onStartDuck();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          setDuckPressed(false);
          onEndDuck();
        }}
        onPointerLeave={(e) => {
          e.preventDefault();
          setDuckPressed(false);
          onEndDuck();
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          setDuckPressed(false);
          onEndDuck();
        }}
        title="엎드리기 / 슬라이딩"
      >
        <ArrowDown className="w-7 h-7 sm:w-8 sm:h-8" />
        <span className="text-[10px] sm:text-xs font-tech font-bold uppercase tracking-wider">
          엎드리기
        </span>
      </button>

      {/* Jump Button (Bottom Right) */}
      <button
        type="button"
        className={`pointer-events-auto cursor-pointer select-none touch-none w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all duration-75 shadow-lg active:scale-90 ${
          jumpPressed
            ? 'bg-rose-500/40 border-rose-400 text-white scale-95 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
            : 'bg-slate-950/70 border-rose-500/40 text-rose-400 hover:border-rose-400'
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          setJumpPressed(true);
          onJump();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          setJumpPressed(false);
        }}
        onPointerLeave={(e) => {
          e.preventDefault();
          setJumpPressed(false);
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          setJumpPressed(false);
        }}
        title="점프"
      >
        <ArrowUp className="w-7 h-7 sm:w-8 sm:h-8" />
        <span className="text-[10px] sm:text-xs font-tech font-bold uppercase tracking-wider">
          점프
        </span>
      </button>
    </div>
  );
};
