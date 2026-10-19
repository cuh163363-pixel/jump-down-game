import { GAME_CONSTANTS } from './constants';
import { Collectible, GameState, GameStats, Obstacle, Particle, Player } from './types';
import { soundManager } from '../audio/soundManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState = 'TITLE';
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // React state synchronization callbacks
  public onStateChange?: (state: GameState) => void;
  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (stats: GameStats, isNewHigh: boolean) => void;

  // Player
  private player: Player = {
    x: GAME_CONSTANTS.PLAYER_X,
    y: GAME_CONSTANTS.GROUND_Y - GAME_CONSTANTS.PLAYER_STANDING_HEIGHT,
    vy: 0,
    standingWidth: GAME_CONSTANTS.PLAYER_STANDING_WIDTH,
    standingHeight: GAME_CONSTANTS.PLAYER_STANDING_HEIGHT,
    duckingWidth: GAME_CONSTANTS.PLAYER_DUCKING_WIDTH,
    duckingHeight: GAME_CONSTANTS.PLAYER_DUCKING_HEIGHT,
    isGrounded: true,
    isDucking: false,
    hasShield: false,
    hasMagnet: false,
    magnetTimer: 0,
    runCycle: 0,
    jumpCount: 0,
    maxJumps: 2,
    trail: [],
  };

  // Game world
  private speed: number = GAME_CONSTANTS.INITIAL_SPEED;
  private distance: number = 0;
  private score: number = 0;
  private coins: number = 0;
  private obstaclesDodged: number = 0;
  private highScore: number = 0;

  // Input states
  private keys: {
    jump: boolean;
    duck: boolean;
  } = { jump: false, duck: false };

  private jumpBufferTimer: number = 0;
  private coyoteTimer: number = 0;

  // Objects
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private nextObstacleDistance: number = 420;
  private nextCollectibleDistance: number = 180;

  // Screen shake & hitstop
  private screenShake: number = 0;
  private hitstopTimer: number = 0;

  // Parallax background offsets
  private bgStarsOffset: number = 0;
  private bgSkylineOffset: number = 0;
  private bgMidBuildingsOffset: number = 0;
  private gridOffset: number = 0;

  // Neon buildings pre-generated for consistent aesthetic
  private buildingsLayer1: { x: number; width: number; height: number; color: string; neonColor: string }[] = [];
  private buildingsLayer2: { x: number; width: number; height: number; color: string; neonColor: string }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    try {
      this.highScore = parseInt(localStorage.getItem('neondash_highscore') || '0', 10);
    } catch {
      this.highScore = 0;
    }

    this.initBackgroundBuildings();
    this.setupInputs();
  }

  private initBackgroundBuildings() {
    let currentX = 0;
    const colors1 = ['#0f172a', '#111827', '#1e1b4b', '#172554'];
    const neon1 = ['#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6'];

    for (let i = 0; i < 25; i++) {
      const w = 60 + Math.random() * 80;
      const h = 140 + Math.random() * 190;
      this.buildingsLayer1.push({
        x: currentX,
        width: w,
        height: h,
        color: colors1[Math.floor(Math.random() * colors1.length)],
        neonColor: neon1[Math.floor(Math.random() * neon1.length)],
      });
      currentX += w + 8;
    }

    currentX = 0;
    const colors2 = ['#1e293b', '#1f2937', '#312e81', '#1e3a8a'];
    const neon2 = ['#22d3ee', '#f43f5e', '#a855f7', '#60a5fa'];
    for (let i = 0; i < 20; i++) {
      const w = 70 + Math.random() * 100;
      const h = 80 + Math.random() * 120;
      this.buildingsLayer2.push({
        x: currentX,
        width: w,
        height: h,
        color: colors2[Math.floor(Math.random() * colors2.length)],
        neonColor: neon2[Math.floor(Math.random() * neon2.length)],
      });
      currentX += w + 15;
    }
  }

  private setupInputs() {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on Space and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (this.state === 'TITLE') {
          this.startGame();
          return;
        }
        if (this.state === 'GAMEOVER') {
          this.restartGame();
          return;
        }
        this.triggerJump();
      }

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.startDuck();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.togglePause();
      }

      if (e.code === 'Enter') {
        if (this.state === 'TITLE') {
          this.startGame();
        } else if (this.state === 'GAMEOVER') {
          this.restartGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.keys.jump = false;
        // Variable jump height: release early to cut upward velocity
        if (this.player.vy < -200) {
          this.player.vy *= 0.55;
        }
      }

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.endDuck();
      }
    };

    const handleBlur = () => {
      this.keys.jump = false;
      this.keys.duck = false;
      this.player.isDucking = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
  }

  // Public control methods for UI buttons / touch
  public triggerJump() {
    soundManager.unlock();
    this.keys.jump = true;
    this.jumpBufferTimer = GAME_CONSTANTS.JUMP_BUFFER_TIME;

    if (this.state !== 'PLAYING') return;

    // Ground jump or coyote jump
    if (this.player.isGrounded || this.coyoteTimer > 0) {
      this.executeJump(false);
    } else if (this.player.jumpCount < this.player.maxJumps) {
      // Double jump in mid-air
      this.executeJump(true);
    }
  }

  private executeJump(isDoubleJump: boolean) {
    this.player.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.player.isDucking = false; // Cannot duck while initiating jump

    if (isDoubleJump) {
      this.player.vy = GAME_CONSTANTS.DOUBLE_JUMP_FORCE;
      this.player.jumpCount = 2;
      this.spawnJumpParticles(this.player.x + 20, this.player.y + 40, '#a855f7');
      soundManager.playJump();
    } else {
      this.player.vy = GAME_CONSTANTS.JUMP_FORCE;
      this.player.jumpCount = 1;
      this.spawnJumpParticles(this.player.x + 20, GAME_CONSTANTS.GROUND_Y, '#06b6d4');
      soundManager.playJump();
    }
  }

  public startDuck() {
    soundManager.unlock();
    this.keys.duck = true;
    if (this.state !== 'PLAYING') return;

    if (!this.player.isDucking) {
      this.player.isDucking = true;
      soundManager.playDuck();

      // Fast-fall mechanic: if player ducks mid-air, slam down faster!
      if (!this.player.isGrounded && this.player.vy < 300) {
        this.player.vy = 480;
      }

      // Slide sparks
      if (this.player.isGrounded) {
        this.spawnSlideSparks();
      }
    }
  }

  public endDuck() {
    this.keys.duck = false;
    this.player.isDucking = false;
  }

  public startGame() {
    soundManager.unlock();
    soundManager.playClick();
    soundManager.startBgm();

    this.resetState();
    this.setState('PLAYING');
  }

  public goToTitle() {
    soundManager.stopBgm();
    this.resetState();
    this.setState('TITLE');
  }

  public restartGame() {
    soundManager.unlock();
    soundManager.playClick();
    soundManager.startBgm();

    this.resetState();
    this.setState('PLAYING');
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      soundManager.playClick();
      this.setState('PAUSED');
    } else if (this.state === 'PAUSED') {
      soundManager.playClick();
      this.setState('PLAYING');
    }
  }

  private setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  private resetState() {
    this.speed = GAME_CONSTANTS.INITIAL_SPEED;
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.obstaclesDodged = 0;
    this.screenShake = 0;
    this.hitstopTimer = 0;

    this.player.y = GAME_CONSTANTS.GROUND_Y - GAME_CONSTANTS.PLAYER_STANDING_HEIGHT;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.isDucking = false;
    this.player.hasShield = false;
    this.player.hasMagnet = false;
    this.player.magnetTimer = 0;
    this.player.jumpCount = 0;
    this.player.trail = [];

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.nextObstacleDistance = 380;
    this.nextCollectibleDistance = 140;

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }

  public start() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling on lag

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // --- Game Loop Update ---

  private update(dt: number) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.state !== 'PLAYING') {
      // Idle running animation on title screen for visual flair
      if (this.state === 'TITLE') {
        this.player.runCycle += dt * 8;
        this.updateParallax(dt * 0.4);
      }
      return;
    }

    // Increase game speed gradually
    if (this.speed < GAME_CONSTANTS.MAX_SPEED) {
      this.speed += GAME_CONSTANTS.SPEED_ACCEL * dt;
    }

    // Distance & score progression
    const distanceTraveled = this.speed * dt * 0.1;
    this.distance += distanceTraveled;
    this.score += Math.round(distanceTraveled * 1.2);

    // Update parallax
    this.updateParallax(dt);

    // Update player physics
    this.updatePlayer(dt);

    // Spawn and update obstacles
    this.updateObstacles(dt);

    // Spawn and update collectibles
    this.updateCollectibles(dt);

    // Update particles
    this.updateParticles(dt);

    // Power-up timers
    if (this.player.hasMagnet) {
      this.player.magnetTimer -= dt;
      if (this.player.magnetTimer <= 0) {
        this.player.hasMagnet = false;
      }
    }

    // Broadcast stats to UI
    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        score: this.score,
        highScore: Math.max(this.score, this.highScore),
        distance: Math.floor(this.distance),
        coins: this.coins,
        obstaclesDodged: this.obstaclesDodged,
        currentSpeed: Math.round(this.speed),
      });
    }
  }

  private updateParallax(dt: number) {
    const moveAmount = this.speed * dt;
    this.bgStarsOffset = (this.bgStarsOffset + moveAmount * 0.05) % GAME_CONSTANTS.CANVAS_WIDTH;
    this.bgSkylineOffset = (this.bgSkylineOffset + moveAmount * 0.18) % 1800;
    this.bgMidBuildingsOffset = (this.bgMidBuildingsOffset + moveAmount * 0.45) % 1800;
    this.gridOffset = (this.gridOffset + moveAmount) % 40;
  }

  private updatePlayer(dt: number) {
    // Jump buffering
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.player.isGrounded) {
        this.executeJump(false);
      }
    }

    // Coyote time
    if (!this.player.isGrounded && this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    // Gravity
    let currentGravity = GAME_CONSTANTS.GRAVITY;
    if (this.player.vy > 0) {
      // Heavier fall
      currentGravity *= GAME_CONSTANTS.FALL_MULTIPLIER;
    }
    if (this.player.isDucking && !this.player.isGrounded) {
      // Extra heavy fast-fall if holding duck in air
      currentGravity *= 1.8;
    }

    this.player.vy += currentGravity * dt;
    this.player.y += this.player.vy * dt;

    // Ground collision
    const targetHeight = this.player.isDucking
      ? this.player.duckingHeight
      : this.player.standingHeight;
    const groundLevelY = GAME_CONSTANTS.GROUND_Y - targetHeight;

    if (this.player.y >= groundLevelY) {
      this.player.y = groundLevelY;
      this.player.vy = 0;
      if (!this.player.isGrounded) {
        // Landing impact
        this.player.isGrounded = true;
        this.player.jumpCount = 0;
        this.spawnLandingParticles(this.player.x + 20, GAME_CONSTANTS.GROUND_Y);
      }
      this.coyoteTimer = GAME_CONSTANTS.COYOTE_TIME;
    } else {
      this.player.isGrounded = false;
    }

    // Player running animation
    if (this.player.isGrounded) {
      this.player.runCycle += dt * (this.speed / 28);
      // Continuous slide sparks if ducking
      if (this.player.isDucking && Math.random() < 0.35) {
        this.spawnSlideSparks();
      }
    }

    // Player motion trail
    if (Math.random() < 0.4) {
      this.player.trail.push({
        x: this.player.x,
        y: this.player.y,
        alpha: 0.45,
        isDucking: this.player.isDucking,
      });
      if (this.player.trail.length > 8) {
        this.player.trail.shift();
      }
    }

    // Decay trail alpha
    for (const t of this.player.trail) {
      t.alpha -= dt * 2.2;
    }
    this.player.trail = this.player.trail.filter((t) => t.alpha > 0);
  }

  // --- Obstacle Generation & Collisions ---

  private updateObstacles(dt: number) {
    this.nextObstacleDistance -= this.speed * dt;

    if (this.nextObstacleDistance <= 0) {
      this.spawnObstacle();
      // Distance to next obstacle ramps with speed, maintaining fair reaction window (0.7s - 1.2s)
      const reactionTime = 0.85 + Math.random() * 0.45 - (this.speed - 380) * 0.0006;
      this.nextObstacleDistance = Math.max(340, this.speed * reactionTime);
    }

    // Move obstacles and check collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed * dt;
      obs.animTimer += dt;

      // Obstacle dodged tracking
      if (!obs.cleared && obs.x + obs.width < this.player.x) {
        obs.cleared = true;
        this.obstaclesDodged++;
        this.score += 75;
      }

      // Collision Check
      if (this.checkCollision(obs)) {
        if (this.player.hasShield) {
          // Shield absorbs the blow!
          this.player.hasShield = false;
          soundManager.playShieldBreak();
          this.screenShake = 12;
          this.hitstopTimer = 0.04;
          this.spawnShieldBreakParticles(obs.x + obs.width / 2, obs.y + obs.height / 2);
          // Destroy obstacle
          this.obstacles.splice(i, 1);
          continue;
        } else {
          // Obstacle crash -> Game Over!
          this.handleCrash(obs);
          return;
        }
      }

      // Remove offscreen
      if (obs.x + obs.width < -100) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private spawnObstacle() {
    const types: ('LOW_SPIKE' | 'LOW_BARRIER' | 'HIGH_LASER' | 'HIGH_DRONE')[] = [
      'LOW_SPIKE',
      'LOW_BARRIER',
      'HIGH_LASER',
      'HIGH_DRONE',
    ];

    // Pick obstacle type
    const type = types[Math.floor(Math.random() * types.length)];
    let width = 45;
    let height = 45;
    let y = GAME_CONSTANTS.GROUND_Y - height;
    let color = '#ef4444';
    let glowColor = '#f87171';
    let dodgeAction: 'JUMP' | 'DUCK' = 'JUMP';

    if (type === 'LOW_SPIKE') {
      width = GAME_CONSTANTS.LOW_SPIKE_W;
      height = GAME_CONSTANTS.LOW_SPIKE_H;
      y = GAME_CONSTANTS.GROUND_Y - height;
      color = '#f43f5e';
      glowColor = '#fb7185';
      dodgeAction = 'JUMP';
    } else if (type === 'LOW_BARRIER') {
      width = GAME_CONSTANTS.LOW_BARRIER_W;
      height = GAME_CONSTANTS.LOW_BARRIER_H;
      y = GAME_CONSTANTS.GROUND_Y - height;
      color = '#eab308';
      glowColor = '#fde047';
      dodgeAction = 'JUMP';
    } else if (type === 'HIGH_LASER') {
      // HIGH_LASER: Must DUCK under!
      width = GAME_CONSTANTS.HIGH_LASER_W;
      height = GAME_CONSTANTS.HIGH_LASER_H;
      y = GAME_CONSTANTS.HIGH_LASER_Y;
      color = '#06b6d4';
      glowColor = '#22d3ee';
      dodgeAction = 'DUCK';
    } else if (type === 'HIGH_DRONE') {
      // HIGH_DRONE: Flying drone, must DUCK under!
      width = GAME_CONSTANTS.HIGH_DRONE_W;
      height = GAME_CONSTANTS.HIGH_DRONE_H;
      y = GAME_CONSTANTS.HIGH_DRONE_Y;
      color = '#a855f7';
      glowColor = '#c084fc';
      dodgeAction = 'DUCK';
    }

    this.obstacles.push({
      id: Math.random().toString(36).substring(2, 9),
      type,
      x: GAME_CONSTANTS.CANVAS_WIDTH + 60,
      y,
      width,
      height,
      color,
      glowColor,
      dodgeAction,
      animTimer: 0,
      cleared: false,
    });
  }

  private checkCollision(obs: Obstacle): boolean {
    const isDucking = this.player.isDucking;
    const playerWidth = isDucking ? this.player.duckingWidth : this.player.standingWidth;
    const playerHeight = isDucking ? this.player.duckingHeight : this.player.standingHeight;
    const playerX = this.player.x;
    const playerY = this.player.y;

    // Hitbox padding for forgiving pixel-perfect feel
    const playerBox = {
      x: playerX + 6,
      y: playerY + 4,
      width: playerWidth - 12,
      height: playerHeight - 6,
    };

    const obstacleBox = {
      x: obs.x + 4,
      y: obs.y + 4,
      width: obs.width - 8,
      height: obs.height - 8,
    };

    // AABB intersection
    const overlaps =
      playerBox.x < obstacleBox.x + obstacleBox.width &&
      playerBox.x + playerBox.width > obstacleBox.x &&
      playerBox.y < obstacleBox.y + obstacleBox.height &&
      playerBox.y + playerBox.height > obstacleBox.y;

    return overlaps;
  }

  private handleCrash(obs: Obstacle) {
    soundManager.stopBgm();
    soundManager.playHit();
    soundManager.playGameOver();

    // Visual juice
    this.screenShake = 22;
    this.hitstopTimer = 0.08;
    this.spawnCrashParticles(this.player.x + 20, this.player.y + 20, obs.color);

    // Check high score
    const isNewHigh = this.score > this.highScore;
    if (isNewHigh) {
      this.highScore = this.score;
      try {
        localStorage.setItem('neondash_highscore', String(this.highScore));
      } catch {}
    }

    this.setState('GAMEOVER');

    const finalStats: GameStats = {
      score: this.score,
      highScore: this.highScore,
      distance: Math.floor(this.distance),
      coins: this.coins,
      obstaclesDodged: this.obstaclesDodged,
      currentSpeed: Math.round(this.speed),
    };

    if (this.onGameOver) {
      this.onGameOver(finalStats, isNewHigh);
    }
  }

  // --- Collectibles ---

  private updateCollectibles(dt: number) {
    this.nextCollectibleDistance -= this.speed * dt;

    if (this.nextCollectibleDistance <= 0) {
      this.spawnCollectibleCluster();
      this.nextCollectibleDistance = 240 + Math.random() * 300;
    }

    const playerCenter = {
      x: this.player.x + 20,
      y: this.player.y + (this.player.isDucking ? 16 : 34),
    };

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.x -= this.speed * dt;
      item.pulseTimer += dt * 4;

      // Magnet attraction
      if (this.player.hasMagnet) {
        const dx = playerCenter.x - item.x;
        const dy = playerCenter.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260) {
          item.x += (dx / dist) * 450 * dt;
          item.y += (dy / dist) * 450 * dt;
        }
      }

      // Check pickup
      const dx = playerCenter.x - item.x;
      const dy = playerCenter.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < item.radius + 26) {
        this.collectItem(item);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Remove offscreen
      if (item.x < -50) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnCollectibleCluster() {
    // 80% chance of coins, 12% shield, 8% magnet
    const rand = Math.random();
    if (rand < 0.8) {
      // Coin arc or line
      const count = 3 + Math.floor(Math.random() * 3);
      const isHighArc = Math.random() > 0.5;
      const startX = GAME_CONSTANTS.CANVAS_WIDTH + 50;

      for (let i = 0; i < count; i++) {
        let y = GAME_CONSTANTS.GROUND_Y - 26;
        if (isHighArc) {
          // Arc requiring jump to collect
          const arc = Math.sin((i / (count - 1)) * Math.PI);
          y = GAME_CONSTANTS.GROUND_Y - 50 - arc * 70;
        }
        this.collectibles.push({
          id: Math.random().toString(),
          type: 'COIN',
          x: startX + i * 42,
          y,
          radius: 12,
          collected: false,
          pulseTimer: i * 0.4,
        });
      }
    } else if (rand < 0.92 && !this.player.hasShield) {
      // Shield powerup (spawned at medium height)
      this.collectibles.push({
        id: Math.random().toString(),
        type: 'SHIELD',
        x: GAME_CONSTANTS.CANVAS_WIDTH + 60,
        y: GAME_CONSTANTS.GROUND_Y - 60,
        radius: 16,
        collected: false,
        pulseTimer: 0,
      });
    } else {
      // Magnet powerup
      this.collectibles.push({
        id: Math.random().toString(),
        type: 'MAGNET',
        x: GAME_CONSTANTS.CANVAS_WIDTH + 60,
        y: GAME_CONSTANTS.GROUND_Y - 55,
        radius: 16,
        collected: false,
        pulseTimer: 0,
      });
    }
  }

  private collectItem(item: Collectible) {
    if (item.type === 'COIN') {
      this.coins++;
      this.score += 50;
      soundManager.playCollectCoin();
      this.spawnPickupParticles(item.x, item.y, '#eab308');
    } else if (item.type === 'SHIELD') {
      this.player.hasShield = true;
      this.score += 150;
      soundManager.playShieldPickup();
      this.spawnPickupParticles(item.x, item.y, '#38bdf8');
    } else if (item.type === 'MAGNET') {
      this.player.hasMagnet = true;
      this.player.magnetTimer = 8; // 8 seconds magnet
      this.score += 150;
      soundManager.playShieldPickup();
      this.spawnPickupParticles(item.x, item.y, '#c084fc');
    }
  }

  // --- Particle Systems ---

  private spawnLandingParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 120 - 40,
        vy: -Math.random() * 60 - 20,
        size: 2 + Math.random() * 3,
        color: '#06b6d4',
        alpha: 0.8,
        life: 0,
        maxLife: 0.25,
        type: 'smoke',
      });
    }
  }

  private spawnJumpParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        vx: (Math.random() - 0.5) * 90 - 40,
        vy: Math.random() * 120 + 40,
        size: 3 + Math.random() * 3,
        color,
        alpha: 0.9,
        life: 0,
        maxLife: 0.35,
        type: 'spark',
      });
    }
  }

  private spawnSlideSparks() {
    const x = this.player.x + 8;
    const y = GAME_CONSTANTS.GROUND_Y - 4;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x,
        y,
        vx: -Math.random() * 220 - 90,
        vy: -Math.random() * 80,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#f59e0b' : '#38bdf8',
        alpha: 1,
        life: 0,
        maxLife: 0.22,
        type: 'slide_spark',
      });
    }
  }

  private spawnCrashParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.3 ? color : '#f43f5e',
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'spark',
      });
    }
  }

  private spawnShieldBreakParticles(x: number, y: number) {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: '#38bdf8',
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        type: 'shield_break',
      });
    }
  }

  private spawnPickupParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.35,
        type: 'spark',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt; // gravity on particles
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Rendering Pipeline ---

  public render() {
    const ctx = this.ctx;
    const width = GAME_CONSTANTS.CANVAS_WIDTH;
    const height = GAME_CONSTANTS.CANVAS_HEIGHT;

    ctx.save();

    // Screen shake transform
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Deep Space / Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#050512');
    skyGrad.addColorStop(0.5, '#0b0f24');
    skyGrad.addColorStop(1, '#1e1138');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Stars & Cyber grid in sky
    this.renderStarfield(ctx, width, height);

    // 3. Parallax Skyline Layers
    this.renderSkyline(ctx, width);

    // 4. Ground Runway & Perspective Grid
    this.renderGround(ctx, width, height);

    // 5. Collectibles
    this.renderCollectibles(ctx);

    // 6. Obstacles
    this.renderObstacles(ctx);

    // 7. Player
    this.renderPlayer(ctx);

    // 8. Particles
    this.renderParticles(ctx);

    // 9. Speed streaks when accelerating fast
    if (this.speed > 550) {
      this.renderSpeedLines(ctx, width, height);
    }

    ctx.restore();
  }

  private renderStarfield(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const seed = 42;
    for (let i = 0; i < 45; i++) {
      const x = (i * 73 - this.bgStarsOffset * 0.4 + width * 2) % width;
      const y = ((i * 37 + seed) % (height * 0.55));
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(x, y, size, size);
    }

    // Neon Cyber Sun / Moon
    const sunGrad = ctx.createRadialGradient(720, 140, 10, 720, 140, 70);
    sunGrad.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
    sunGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.4)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(720, 140, 70, 0, Math.PI * 2);
    ctx.fill();

    // Sun horizontal scanline stripes
    ctx.fillStyle = '#0b0f24';
    for (let y = 110; y <= 180; y += 8) {
      const sliceH = (y - 110) * 0.05 + 1.5;
      ctx.fillRect(650, y, 140, sliceH);
    }
  }

  private renderSkyline(ctx: CanvasRenderingContext2D, canvasWidth: number) {
    // Back Layer Buildings
    ctx.save();
    ctx.translate(-this.bgSkylineOffset, 0);
    for (let repeat = 0; repeat < 2; repeat++) {
      const baseOffset = repeat * 1800;
      for (const b of this.buildingsLayer1) {
        const drawX = baseOffset + b.x;
        if (drawX + b.width < this.bgSkylineOffset - 100 || drawX > this.bgSkylineOffset + canvasWidth + 100) {
          continue;
        }
        const drawY = GAME_CONSTANTS.GROUND_Y - b.height;
        ctx.fillStyle = b.color;
        ctx.fillRect(drawX, drawY, b.width, b.height);

        // Neon outline roof
        ctx.strokeStyle = b.neonColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX, drawY, b.width, 2);

        // Scattered window lights
        ctx.fillStyle = b.neonColor;
        ctx.globalAlpha = 0.25;
        for (let wy = drawY + 15; wy < GAME_CONSTANTS.GROUND_Y - 20; wy += 22) {
          for (let wx = drawX + 8; wx < drawX + b.width - 12; wx += 14) {
            if ((wx + wy) % 5 === 0) {
              ctx.fillRect(wx, wy, 4, 6);
            }
          }
        }
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.restore();

    // Mid Layer Buildings
    ctx.save();
    ctx.translate(-this.bgMidBuildingsOffset, 0);
    for (let repeat = 0; repeat < 2; repeat++) {
      const baseOffset = repeat * 1800;
      for (const b of this.buildingsLayer2) {
        const drawX = baseOffset + b.x;
        if (drawX + b.width < this.bgMidBuildingsOffset - 100 || drawX > this.bgMidBuildingsOffset + canvasWidth + 100) {
          continue;
        }
        const drawY = GAME_CONSTANTS.GROUND_Y - b.height;
        ctx.fillStyle = b.color;
        ctx.fillRect(drawX, drawY, b.width, b.height);

        // Glowing antenna on top
        ctx.strokeStyle = b.neonColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(drawX + b.width / 2, drawY);
        ctx.lineTo(drawX + b.width / 2, drawY - 14);
        ctx.stroke();

        ctx.fillStyle = b.neonColor;
        ctx.beginPath();
        ctx.arc(drawX + b.width / 2, drawY - 14, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderGround(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = GAME_CONSTANTS.GROUND_Y;

    // Glowing horizon road line
    ctx.save();
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.restore();

    // Ground platform gradient
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, '#090d1f');
    groundGrad.addColorStop(0.3, '#050711');
    groundGrad.addColorStop(1, '#020308');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);

    // Dynamic horizontal grid lines (perspective simulation)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      const y = groundY + Math.pow(i / 6, 1.8) * (height - groundY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Moving vertical perspective lines
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.25)';
    const spacing = 40;
    for (let x = -spacing; x <= width + spacing; x += spacing) {
      const currentX = x - this.gridOffset;
      ctx.beginPath();
      ctx.moveTo(currentX, groundY);
      // Perspective flare downwards
      const targetX = width * 0.5 + (currentX - width * 0.5) * 1.6;
      ctx.lineTo(targetX, height);
      ctx.stroke();
    }
  }

  private renderCollectibles(ctx: CanvasRenderingContext2D) {
    for (const item of this.collectibles) {
      ctx.save();
      ctx.translate(item.x, item.y);

      if (item.type === 'COIN') {
        // Floating spin bob
        const scaleX = Math.cos(item.pulseTimer);
        ctx.scale(scaleX, 1);

        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner star
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else if (item.type === 'SHIELD') {
        // Glowing cyan energy orb
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Hexagon core
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3 + item.pulseTimer * 0.5;
          const px = Math.cos(angle) * 7;
          const py = Math.sin(angle) * 7;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 'MAGNET') {
        // Purple magnetic orb
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(192, 132, 252, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Magnet icon
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -2, 6, Math.PI, 0, false);
        ctx.lineTo(6, 6);
        ctx.lineTo(2, 6);
        ctx.lineTo(2, -1);
        ctx.lineTo(-2, -1);
        ctx.lineTo(-2, 6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.translate(obs.x, obs.y);

      // Distinct visual telegraph / Dodge indicator above obstacle
      ctx.save();
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      if (obs.dodgeAction === 'JUMP') {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 6;
        ctx.fillText('▲ JUMP', obs.width / 2, -10);
      } else {
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 6;
        ctx.fillText('▼ DUCK', obs.width / 2, -10);
      }
      ctx.restore();

      if (obs.type === 'LOW_SPIKE') {
        // Ground Spikes: must JUMP!
        ctx.shadowColor = obs.glowColor;
        ctx.shadowBlur = 12;

        const count = 3;
        const spikeW = obs.width / count;
        for (let s = 0; s < count; s++) {
          const sx = s * spikeW;
          const grad = ctx.createLinearGradient(sx, obs.height, sx, 0);
          grad.addColorStop(0, '#881337');
          grad.addColorStop(0.7, '#f43f5e');
          grad.addColorStop(1, '#ffffff');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(sx, obs.height);
          ctx.lineTo(sx + spikeW / 2, 2);
          ctx.lineTo(sx + spikeW, obs.height);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (obs.type === 'LOW_BARRIER') {
        // Cyber Laser Barricade: must JUMP!
        ctx.shadowColor = obs.glowColor;
        ctx.shadowBlur = 12;

        // Base frame
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, obs.width, obs.height);
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, obs.width, obs.height);

        // Hazard stripes
        ctx.fillStyle = obs.color;
        for (let i = -10; i < obs.width; i += 16) {
          ctx.beginPath();
          ctx.moveTo(i, obs.height);
          ctx.lineTo(i + 10, obs.height);
          ctx.lineTo(i + 20, 0);
          ctx.lineTo(i + 10, 0);
          ctx.closePath();
          ctx.fill();
        }

        // Top warning light
        const lightPulse = Math.sin(obs.animTimer * 10) > 0 ? '#ef4444' : '#fee2e2';
        ctx.fillStyle = lightPulse;
        ctx.fillRect(obs.width / 2 - 4, -5, 8, 5);
      } else if (obs.type === 'HIGH_LASER') {
        // Overhead Suspended Laser Beam: must DUCK/SLIDE under!
        ctx.shadowColor = obs.glowColor;
        ctx.shadowBlur = 16;

        // Left & right suspension emitter mounts
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, 0, 10, obs.height);
        ctx.fillRect(obs.width - 4, 0, 10, obs.height);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, 0, 10, obs.height);
        ctx.strokeRect(obs.width - 4, 0, 10, obs.height);

        // Core high-voltage laser beam
        const laserGrad = ctx.createLinearGradient(0, 0, 0, obs.height);
        laserGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        laserGrad.addColorStop(0.5, '#ffffff');
        laserGrad.addColorStop(1, 'rgba(6, 182, 212, 0.4)');

        ctx.fillStyle = laserGrad;
        ctx.fillRect(4, 8, obs.width - 8, obs.height - 16);

        // Pulsing electric discharge arcs
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, obs.height / 2);
        for (let lx = 10; lx < obs.width - 6; lx += 8) {
          const jitter = (Math.sin(obs.animTimer * 20 + lx) * (obs.height * 0.25));
          ctx.lineTo(lx, obs.height / 2 + jitter);
        }
        ctx.stroke();

        // Clearance arrow pointing down to remind player to DUCK
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('SLIDE ➔', obs.width / 2, obs.height + 15);
      } else if (obs.type === 'HIGH_DRONE') {
        // Overhead Flying Security Drone: must DUCK/SLIDE under!
        ctx.shadowColor = obs.glowColor;
        ctx.shadowBlur = 14;

        // Drone main chassis
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, 10, obs.width - 8, obs.height - 24);
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 10, obs.width - 8, obs.height - 24);

        // Rotating propellor blades
        const propAngle = obs.animTimer * 25;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.width / 2 - Math.cos(propAngle) * 18, 5);
        ctx.lineTo(obs.width / 2 + Math.cos(propAngle) * 18, 5);
        ctx.stroke();

        // Red glowing camera eye in center
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(obs.width / 2, obs.height / 2 - 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Downward spotlight warning beam
        const spotGrad = ctx.createLinearGradient(
          obs.width / 2,
          obs.height - 10,
          obs.width / 2,
          obs.height + 25
        );
        spotGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
        spotGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.moveTo(obs.width / 2 - 6, obs.height - 14);
        ctx.lineTo(obs.width / 2 + 6, obs.height - 14);
        ctx.lineTo(obs.width / 2 + 18, obs.height + 22);
        ctx.lineTo(obs.width / 2 - 18, obs.height + 22);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    // Draw motion trail echoes
    for (const t of p.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#06b6d4';
      if (t.isDucking) {
        ctx.fillRect(t.x, t.y, p.duckingWidth, p.duckingHeight);
      } else {
        ctx.fillRect(t.x, t.y, p.standingWidth, p.standingHeight);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    if (this.state === 'GAMEOVER') {
      // Knockout ragdoll pose
      ctx.rotate(0.3);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, p.standingWidth, p.standingHeight * 0.7);
      // Glitch skull/eyes
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('X X', 6, 20);
      ctx.restore();
      return;
    }

    if (p.isDucking) {
      // --- DUCKING / SLIDING POSE ---
      const w = p.duckingWidth;
      const h = p.duckingHeight;

      // Sliding cybernetic board/shoes glow
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;

      // Body low profile torso
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, [6, 12, 4, 8]);
      ctx.fill();
      ctx.stroke();

      // Cyber Visor / Helmet (facing right, low)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(w - 18, 6, 12, 10, [2, 6, 6, 2]);
      ctx.fill();

      // Arm bracing on floor
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(10, h - 8, 16, 4);

      // Jet slide thruster exhaust
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(2, h - 10);
      ctx.lineTo(-12, h - 6);
      ctx.lineTo(2, h - 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // --- STANDING / RUNNING / JUMPING POSE ---
      const w = p.standingWidth;
      const h = p.standingHeight;

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;

      // Head & Cyber Helmet
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(6, 4, 22, 18, [6, 8, 4, 4]);
      ctx.fill();
      ctx.stroke();

      // Glowing Visor
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.fillRect(16, 10, 13, 6);

      // Torso & Cyber Armor
      const armorGrad = ctx.createLinearGradient(0, 22, 0, 44);
      armorGrad.addColorStop(0, '#1e293b');
      armorGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = armorGrad;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(6, 22, 22, 22, [4, 4, 4, 4]);
      ctx.fill();
      ctx.stroke();

      // Glowing power core on chest
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(17, 32, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (!p.isGrounded) {
        // Airborne Jumping pose
        // Tucked legs
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(10, 44, 8, 14);
        ctx.fillRect(18, 42, 8, 10);

        // Jet Boot Flames shooting down
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(11, 58);
        ctx.lineTo(15, 68);
        ctx.lineTo(19, 58);
        ctx.closePath();
        ctx.fill();
      } else {
        // Ground Running animation cycle
        const runAngle = Math.sin(p.runCycle);
        const leg1Y = 44;
        const leg1H = 20 + runAngle * 4;
        const leg2H = 20 - runAngle * 4;

        ctx.fillStyle = '#0284c7';
        // Left leg
        ctx.fillRect(8, leg1Y, 7, Math.max(12, leg1H));
        // Right leg
        ctx.fillRect(19, leg1Y, 7, Math.max(12, leg2H));

        // Shoes with neon soles
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(8, leg1Y + Math.max(12, leg1H) - 3, 10, 3);
        ctx.fillRect(19, leg1Y + Math.max(12, leg2H) - 3, 10, 3);
      }
    }

    // Shield Aura if active
    if (p.hasShield) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const centerX = p.isDucking ? p.duckingWidth / 2 : p.standingWidth / 2;
      const centerY = p.isDucking ? p.duckingHeight / 2 : p.standingHeight / 2;
      const radius = p.isDucking ? 30 : 42;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Magnet Aura if active
    if (p.hasMagnet) {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const centerX = p.isDucking ? p.duckingWidth / 2 : p.standingWidth / 2;
      const centerY = p.isDucking ? p.duckingHeight / 2 : p.standingHeight / 2;
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const y = (i * 67 + (this.distance * 3) % height) % (GAME_CONSTANTS.GROUND_Y - 20);
      const lineLen = 120 + Math.random() * 180;
      const x = width - ((this.distance * 5 + i * 110) % (width + lineLen));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + lineLen, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
