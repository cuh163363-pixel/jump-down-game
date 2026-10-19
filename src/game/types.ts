export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type ObstacleType = 
  | 'LOW_SPIKE'       // Ground spikes: JUMP to avoid
  | 'LOW_BARRIER'     // Ground laser barricade: JUMP to avoid
  | 'HIGH_LASER'      // Overhead laser beam: DUCK to avoid
  | 'HIGH_DRONE'      // Flying security drone with spotlight: DUCK to avoid
  | 'MEDIUM_SAW';     // Floating saw or mid-height drone

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  dodgeAction: 'JUMP' | 'DUCK';
  animTimer: number;
  cleared: boolean;
}

export type CollectibleType = 'COIN' | 'SHIELD' | 'MAGNET';

export interface Collectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulseTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'smoke' | 'slide_spark' | 'confetti' | 'shield_break';
}

export interface Player {
  x: number;
  y: number;
  vy: number;
  standingWidth: number;
  standingHeight: number;
  duckingWidth: number;
  duckingHeight: number;
  isGrounded: boolean;
  isDucking: boolean;
  hasShield: boolean;
  hasMagnet: boolean;
  magnetTimer: number;
  runCycle: number;
  jumpCount: number;
  maxJumps: number;
  trail: { x: number; y: number; alpha: number; isDucking: boolean }[];
}

export interface GameStats {
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  obstaclesDodged: number;
  currentSpeed: number;
}
