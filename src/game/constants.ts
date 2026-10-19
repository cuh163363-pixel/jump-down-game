export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,
  GROUND_Y: 420,
  
  // Physics
  GRAVITY: 1480,          // pixels / s^2
  JUMP_FORCE: -640,       // initial jump velocity
  DOUBLE_JUMP_FORCE: -540,// double jump velocity
  FALL_MULTIPLIER: 1.45,  // heavier fall for snappy platformer feel
  
  // Speed settings
  INITIAL_SPEED: 380,     // pixels / s
  MAX_SPEED: 780,
  SPEED_ACCEL: 4.8,       // speed increase per second
  
  // Player dimensions
  PLAYER_X: 130,
  PLAYER_STANDING_WIDTH: 38,
  PLAYER_STANDING_HEIGHT: 68,
  PLAYER_DUCKING_WIDTH: 54,
  PLAYER_DUCKING_HEIGHT: 32,
  
  // Timing
  COYOTE_TIME: 0.1,       // seconds
  JUMP_BUFFER_TIME: 0.12, // seconds
  
  // Obstacle Dimensions
  LOW_SPIKE_W: 42,
  LOW_SPIKE_H: 38,
  
  LOW_BARRIER_W: 46,
  LOW_BARRIER_H: 50,
  
  // HIGH Obstacles: clearance underneath must be > ducking height (32px), but < standing height (68px)
  // Player standing y = GROUND_Y - 68 = 352. Head is at 352.
  // Player ducking y = GROUND_Y - 32 = 388. Head is at 388.
  // High laser: starts at y = 330 to 376 (height 46).
  // When standing: player Y is 352..420 -> overlaps with 330..376! -> HIT!
  // When ducking: player Y is 388..420 -> completely below 376 (12px safe clearance)! -> SAFE!
  // When jumping: player Y is < 352 -> crashes straight into laser! -> HIT!
  HIGH_LASER_Y: 332,
  HIGH_LASER_W: 56,
  HIGH_LASER_H: 46,
  
  HIGH_DRONE_Y: 324,
  HIGH_DRONE_W: 50,
  HIGH_DRONE_H: 52,
};
