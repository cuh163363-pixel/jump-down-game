import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, GameStats } from './game/types';
import { GAME_CONSTANTS } from './game/constants';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(soundManager.getSfxEnabled());
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(soundManager.getBgmEnabled());

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    distance: 0,
    coins: 0,
    obstaclesDodged: 0,
    currentSpeed: GAME_CONSTANTS.INITIAL_SPEED,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set logical canvas resolution
    canvas.width = GAME_CONSTANTS.CANVAS_WIDTH;
    canvas.height = GAME_CONSTANTS.CANVAS_HEIGHT;

    // Initialize Game Engine
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    // Synchronize engine state changes to React
    engine.onStateChange = (nextState) => {
      setGameState(nextState);
    };

    engine.onStatsUpdate = (nextStats) => {
      setStats(nextStats);
    };

    engine.onGameOver = (finalStats, newHigh) => {
      setStats(finalStats);
      setIsNewHigh(newHigh);
    };

    // Start 60fps render loop
    engine.start();

    // Check initial high score
    try {
      const stored = parseInt(localStorage.getItem('neondash_highscore') || '0', 10);
      setStats((prev) => ({ ...prev, highScore: stored }));
    } catch {}

    return () => {
      engine.stop();
      soundManager.stopBgm();
    };
  }, []);

  const handleStartGame = () => {
    engineRef.current?.startGame();
  };

  const handleRestartGame = () => {
    engineRef.current?.restartGame();
  };

  const handleResumeGame = () => {
    engineRef.current?.togglePause();
  };

  const handlePauseGame = () => {
    engineRef.current?.togglePause();
  };

  const handleGoHome = () => {
    engineRef.current?.goToTitle();
  };

  const handleToggleSfx = () => {
    const nextVal = soundManager.toggleSfx();
    setSfxEnabled(nextVal);
  };

  const handleToggleBgm = () => {
    const nextVal = soundManager.toggleBgm();
    setBgmEnabled(nextVal);
  };

  const handleTouchJump = () => {
    if (gameState === 'TITLE') {
      handleStartGame();
    } else if (gameState === 'GAMEOVER') {
      handleRestartGame();
    } else {
      engineRef.current?.triggerJump();
    }
  };

  const handleTouchStartDuck = () => {
    engineRef.current?.startDuck();
  };

  const handleTouchEndDuck = () => {
    engineRef.current?.endDuck();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05050e] flex items-center justify-center select-none font-tech">
      {/* Container maintaining 16:9 canvas ratio with maximum viewport usage */}
      <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] flex items-center justify-center">
        {/* Isolated Canvas Viewport */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block drop-shadow-2xl"
          style={{ imageRendering: 'auto' }}
        />

        {/* Title Screen Overlay */}
        {gameState === 'TITLE' && (
          <TitleScreen
            onStart={handleStartGame}
            highScore={stats.highScore}
            sfxEnabled={sfxEnabled}
            bgmEnabled={bgmEnabled}
            onToggleSfx={handleToggleSfx}
            onToggleBgm={handleToggleBgm}
          />
        )}

        {/* Active Game HUD (Perimeter Status Clusters) */}
        {gameState === 'PLAYING' && (
          <>
            <GameHUD
              stats={stats}
              onPause={handlePauseGame}
              sfxEnabled={sfxEnabled}
              bgmEnabled={bgmEnabled}
              onToggleSfx={handleToggleSfx}
              onToggleBgm={handleToggleBgm}
            />
            {/* On-screen touch buttons for mobile / touch screens */}
            <TouchControls
              onJump={handleTouchJump}
              onStartDuck={handleTouchStartDuck}
              onEndDuck={handleTouchEndDuck}
            />
          </>
        )}

        {/* Paused Modal */}
        {gameState === 'PAUSED' && (
          <PauseModal
            onResume={handleResumeGame}
            onRestart={handleRestartGame}
            onHome={handleGoHome}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'GAMEOVER' && (
          <GameOverModal
            stats={stats}
            isNewHigh={isNewHigh}
            onRestart={handleRestartGame}
            onHome={handleGoHome}
          />
        )}
      </div>
    </div>
  );
}
