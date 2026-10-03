import React, { useEffect, useRef, useState } from 'react';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface ObstacleObj {
  x: number;
  y: number;
  width: number;
  height: number;
  type: number;
  passed: boolean;
}

interface CheeseObj {
  x: number;
  y: number;
  r: number;
}

export interface GameCanvasProps {
  isPlaying: boolean;
  isPaused: boolean;
  onGameOver: (stats: {
    score: number;
    cheeses: number;
    obstacles: number;
    duration: number;
  }) => void;
  onScoreUpdate: (score: number) => void;
  onPauseToggle: () => void;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  difficulty: 'facil' | 'normal' | 'dificil';
}

export const GameCanvas: React.FC<GameCanvasProps> = React.memo(({
  isPlaying,
  isPaused,
  onGameOver,
  onScoreUpdate,
  onPauseToggle,
  soundEnabled,
  hapticsEnabled,
  difficulty,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs for props to prevent re-triggering the game loop when state updates
  const onGameOverRef = useRef(onGameOver);
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onPauseToggleRef = useRef(onPauseToggle);
  const soundEnabledRef = useRef(soundEnabled);
  const hapticsEnabledRef = useRef(hapticsEnabled);
  const difficultyRef = useRef(difficulty);
  const isPausedRef = useRef(isPaused);

  // Sync refs on every render
  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onScoreUpdateRef.current = onScoreUpdate;
    onPauseToggleRef.current = onPauseToggle;
    soundEnabledRef.current = soundEnabled;
    hapticsEnabledRef.current = hapticsEnabled;
    difficultyRef.current = difficulty;
    isPausedRef.current = isPaused;
  });

  // Direct jump trigger function ref
  const jumpHandlerRef = useRef<(() => void) | null>(null);

  // Cached sprite canvas references for 60FPS mobile performance
  const bgAlleyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const groundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteCheeseRef = useRef<HTMLCanvasElement | null>(null);
  const spriteTrapRef = useRef<HTMLCanvasElement | null>(null);
  const spriteCanRef = useRef<HTMLCanvasElement | null>(null);
  const spriteBottleRef = useRef<HTMLCanvasElement | null>(null);

  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // Pre-render static alleyway background and sprite assets ONCE
  const initCachedAssets = (width: number, height: number, groundHeight: number) => {
    if (bgAlleyCanvasRef.current && spriteCheeseRef.current) return;

    // 1. Authentic Dark Urban Alleyway Wall (Callejón Oscuro con Ladrillos, Tuberías y Escalera de Incendios)
    const alley = document.createElement('canvas');
    alley.width = width;
    alley.height = height;
    const actx = alley.getContext('2d', { alpha: false });
    if (actx) {
      // Atmospheric dark alley base gradient
      const wallGrad = actx.createLinearGradient(0, 0, 0, height);
      wallGrad.addColorStop(0, '#090504');
      wallGrad.addColorStop(0.3, '#170c09');
      wallGrad.addColorStop(0.8, '#24120e');
      wallGrad.addColorStop(1, '#0d0705');
      actx.fillStyle = wallGrad;
      actx.fillRect(0, 0, width, height);

      // Detailed Weathered Alley Brick Wall (Ladrillos del Callejón)
      const brickW = 46;
      const brickH = 20;
      const wallBottom = height - groundHeight;

      for (let y = 0; y < wallBottom; y += brickH) {
        // Mortar line
        actx.fillStyle = '#0a0605';
        actx.fillRect(0, y, width, 2);

        const offset = ((y / brickH) | 0) % 2 === 0 ? 0 : brickW / 2;
        for (let x = -offset; x < width + brickW; x += brickW) {
          // Individual brick color variations (aged brick clay tones)
          const shade = (x * 13 + y * 7) % 7;
          if (shade === 0) actx.fillStyle = '#3d1d16';
          else if (shade === 1) actx.fillStyle = '#48221a';
          else if (shade === 2) actx.fillStyle = '#2c1510';
          else if (shade === 3) actx.fillStyle = '#361913';
          else if (shade === 4) actx.fillStyle = '#4f271e';
          else actx.fillStyle = '#28130f';

          actx.fillRect(x + 2, y + 2, brickW - 4, brickH - 2);

          // Subtle brick chip / texture speckle
          if ((x + y) % 5 === 0) {
            actx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            actx.fillRect(x + 10, y + 6, 8, 3);
          }
        }
      }

      // Alley Fire Escape (Escalera de incendios de metal)
      actx.fillStyle = '#1e293b';
      // Platform 1
      actx.fillRect(180, 160, 190, 8);
      actx.fillRect(180, 120, 4, 40);
      actx.fillRect(366, 120, 4, 40);
      actx.fillRect(180, 120, 190, 4);
      // Railing bars
      for (let rx = 195; rx < 360; rx += 22) {
        actx.fillRect(rx, 124, 2, 36);
      }
      // Diagonal ladder
      actx.lineWidth = 3;
      actx.strokeStyle = '#334155';
      actx.beginPath();
      actx.moveTo(210, 168);
      actx.lineTo(270, 260);
      actx.moveTo(226, 168);
      actx.lineTo(286, 260);
      actx.stroke();
      // Ladder rungs
      for (let ld = 0; ld < 6; ld++) {
        const lx1 = 210 + ld * 10;
        const ly1 = 168 + ld * 15;
        actx.beginPath();
        actx.moveTo(lx1, ly1);
        actx.lineTo(lx1 + 16, ly1);
        actx.stroke();
      }

      // Industrial Overhead Conduit & Hanging Cables (Cables y tuberías aéreas del callejón)
      actx.fillStyle = '#334155';
      actx.fillRect(0, 42, width, 7);
      actx.fillStyle = '#475569';
      actx.fillRect(0, 40, width, 2);

      // Hanging slack electrical wires across the alley
      actx.strokeStyle = '#1e293b';
      actx.lineWidth = 2;
      actx.beginPath();
      actx.moveTo(0, 50);
      actx.quadraticCurveTo(width * 0.25, 95, width * 0.5, 60);
      actx.quadraticCurveTo(width * 0.75, 100, width, 55);
      actx.stroke();

      actx.beginPath();
      actx.moveTo(0, 60);
      actx.quadraticCurveTo(width * 0.4, 115, width * 0.8, 70);
      actx.quadraticCurveTo(width * 0.9, 85, width, 68);
      actx.stroke();

      // Vertical Downspout Drain Pipes with metal brackets (Bajantes pluviales del callejón)
      const drainX = [120, 490, 830];
      drainX.forEach((dx) => {
        actx.fillStyle = '#1e293b';
        actx.fillRect(dx, 40, 14, wallBottom - 40);
        actx.fillStyle = '#334155';
        actx.fillRect(dx - 3, 75, 20, 6);
        actx.fillRect(dx - 3, 200, 20, 6);
        actx.fillRect(dx - 3, 340, 20, 6);
        // Drain spout curve at bottom
        actx.fillStyle = '#0f172a';
        actx.beginPath();
        actx.arc(dx + 7, wallBottom - 6, 8, 0, Math.PI);
        actx.fill();
      });

      // Vintage Alley Street Lamp casting light on the wall (Farol de pared)
      const lampX = 640;
      const lampY = 110;
      // Lamp fixture arm
      actx.strokeStyle = '#0f172a';
      actx.lineWidth = 4;
      actx.beginPath();
      actx.moveTo(lampX, lampY + 30);
      actx.lineTo(lampX, lampY);
      actx.lineTo(lampX + 28, lampY);
      actx.stroke();
      // Lamp shade
      actx.fillStyle = '#1e293b';
      actx.beginPath();
      actx.moveTo(lampX + 16, lampY);
      actx.lineTo(lampX + 40, lampY);
      actx.lineTo(lampX + 48, lampY + 12);
      actx.lineTo(lampX + 8, lampY + 12);
      actx.closePath();
      actx.fill();
      // Lamp bulb glow
      actx.fillStyle = '#fef08a';
      actx.beginPath();
      actx.arc(lampX + 28, lampY + 14, 5, 0, Math.PI * 2);
      actx.fill();
      // Radial warm light cone down the alley wall
      const lightGrad = actx.createRadialGradient(lampX + 28, lampY + 15, 6, lampX + 28, lampY + 110, 190);
      lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      lightGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      actx.fillStyle = lightGrad;
      actx.beginPath();
      actx.moveTo(lampX + 28, lampY + 15);
      actx.lineTo(lampX - 110, wallBottom);
      actx.lineTo(lampX + 160, wallBottom);
      actx.closePath();
      actx.fill();

      // Alley Graffiti Tags ("QUESO", paw print, grunge)
      actx.save();
      actx.font = 'bold 22px monospace';
      actx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      actx.rotate(-0.06);
      actx.fillText('QUESO', 50, 310);
      actx.restore();

      actx.save();
      actx.font = 'bold 16px sans-serif';
      actx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      actx.rotate(0.04);
      actx.fillText('🐾 RUN', 730, 280);
      actx.restore();

      // Weathered alley poster
      actx.fillStyle = '#d4d4d8';
      actx.fillRect(390, 240, 34, 46);
      actx.fillStyle = '#ef4444';
      actx.fillRect(394, 246, 26, 8);
      actx.fillStyle = '#71717a';
      actx.fillRect(394, 258, 22, 2);
      actx.fillRect(394, 264, 24, 2);
      actx.fillRect(394, 270, 18, 2);

      // Bottom grime and shadow gradient near asphalt
      const shadowGrad = actx.createLinearGradient(0, wallBottom - 70, 0, wallBottom);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      actx.fillStyle = shadowGrad;
      actx.fillRect(0, wallBottom - 70, width, 70);
    }
    bgAlleyCanvasRef.current = alley;

    // 2. Asphalt Alley Road & Sidewalk Curb Tile
    const ground = document.createElement('canvas');
    ground.width = width;
    ground.height = groundHeight;
    const gctx = ground.getContext('2d', { alpha: false });
    if (gctx) {
      gctx.fillStyle = '#18181b';
      gctx.fillRect(0, 0, width, groundHeight);

      // Sidewalk concrete curb
      gctx.fillStyle = '#27272a';
      gctx.fillRect(0, 0, width, 8);
      gctx.fillStyle = '#3f3f46';
      gctx.fillRect(0, 0, width, 2);

      // Yellow curb / road dashes
      gctx.fillStyle = '#ca8a04';
      for (let x = 12; x < width; x += 84) {
        gctx.fillRect(x, 4, 34, 4);
      }

      // Asphalt texture particles
      for (let i = 0; i < 90; i++) {
        gctx.fillStyle = i % 2 === 0 ? '#3f3f46' : '#09090b';
        gctx.fillRect((i * 47) % width, (i * 23) % groundHeight, 3, 2);
      }

      // Sewer storm drain grate (Alcantarilla del callejón)
      gctx.fillStyle = '#09090b';
      gctx.fillRect(380, 16, 50, 24);
      gctx.fillStyle = '#334155';
      gctx.fillRect(380, 16, 50, 3);
      gctx.fillRect(380, 37, 50, 3);
      for (let sx = 385; sx < 428; sx += 8) {
        gctx.fillRect(sx, 18, 3, 20);
      }

      // Alley puddle reflection
      gctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
      gctx.beginPath();
      gctx.ellipse(660, 32, 48, 12, 0, 0, Math.PI * 2);
      gctx.fill();
    }
    groundCanvasRef.current = ground;

    // 3. Cached Cheese Sprite (44x44)
    const chCv = document.createElement('canvas');
    chCv.width = 44;
    chCv.height = 44;
    const cctx = chCv.getContext('2d');
    if (cctx) {
      // Glow circle
      cctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      cctx.beginPath();
      cctx.arc(22, 22, 20, 0, Math.PI * 2);
      cctx.fill();

      // Cheese wedge
      cctx.fillStyle = '#fde047';
      cctx.beginPath();
      cctx.moveTo(10, 31);
      cctx.lineTo(22, 10);
      cctx.lineTo(34, 28);
      cctx.lineTo(32, 33);
      cctx.closePath();
      cctx.fill();

      // Cheese holes
      cctx.fillStyle = '#d97706';
      cctx.beginPath();
      cctx.arc(20, 24, 2.5, 0, Math.PI * 2);
      cctx.arc(26, 19, 1.8, 0, Math.PI * 2);
      cctx.arc(27, 28, 2, 0, Math.PI * 2);
      cctx.fill();
    }
    spriteCheeseRef.current = chCv;

    // 4. Cached Alley Rock & Trap Hazard Sprite (54x40) - Substantially larger and clearly visible
    const trapCv = document.createElement('canvas');
    trapCv.width = 54;
    trapCv.height = 40;
    const tctx = trapCv.getContext('2d');
    if (tctx) {
      // Dark ground shadow
      tctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      tctx.beginPath();
      tctx.ellipse(27, 37, 24, 4, 0, 0, Math.PI * 2);
      tctx.fill();

      // Jagged street boulder / rock hazard base
      tctx.fillStyle = '#334155';
      tctx.beginPath();
      tctx.moveTo(3, 38);
      tctx.lineTo(8, 22);
      tctx.lineTo(16, 12);
      tctx.lineTo(32, 10);
      tctx.lineTo(46, 20);
      tctx.lineTo(51, 38);
      tctx.closePath();
      tctx.fill();

      // Rock facet light shading (left & top highlights)
      tctx.fillStyle = '#64748b';
      tctx.beginPath();
      tctx.moveTo(8, 22);
      tctx.lineTo(16, 12);
      tctx.lineTo(32, 10);
      tctx.lineTo(26, 24);
      tctx.lineTo(14, 34);
      tctx.closePath();
      tctx.fill();

      // Crisp top light edge highlight
      tctx.strokeStyle = '#94a3b8';
      tctx.lineWidth = 2;
      tctx.beginPath();
      tctx.moveTo(8, 22);
      tctx.lineTo(16, 12);
      tctx.lineTo(32, 10);
      tctx.lineTo(46, 20);
      tctx.stroke();

      // Steel trap / sharp hazard spikes mounted on the rock
      tctx.strokeStyle = '#f1f5f9';
      tctx.lineWidth = 2.5;
      tctx.beginPath();
      tctx.moveTo(14, 18);
      tctx.lineTo(24, 2);
      tctx.lineTo(34, 18);
      tctx.stroke();

      // Warning hazard spring / luminous amber cheese bait on top
      tctx.fillStyle = '#f59e0b';
      tctx.beginPath();
      tctx.arc(24, 7, 5, 0, Math.PI * 2);
      tctx.fill();
      tctx.fillStyle = '#fef08a';
      tctx.beginPath();
      tctx.arc(23, 6, 2, 0, Math.PI * 2);
      tctx.fill();

      // Crack lines on the rock
      tctx.strokeStyle = '#0f172a';
      tctx.lineWidth = 1.5;
      tctx.beginPath();
      tctx.moveTo(24, 22);
      tctx.lineTo(28, 30);
      tctx.lineTo(24, 38);
      tctx.stroke();
    }
    spriteTrapRef.current = trapCv;

    // 5. Cached Trash Can Sprite (44x64)
    const canCv = document.createElement('canvas');
    canCv.width = 44;
    canCv.height = 64;
    const canCtx = canCv.getContext('2d');
    if (canCtx) {
      canCtx.fillStyle = '#475569';
      canCtx.beginPath();
      canCtx.moveTo(4, 62);
      canCtx.lineTo(1, 4);
      canCtx.lineTo(41, 4);
      canCtx.lineTo(38, 62);
      canCtx.closePath();
      canCtx.fill();

      canCtx.fillStyle = '#64748b';
      canCtx.fillRect(0, 0, 42, 6);

      canCtx.strokeStyle = '#1e293b';
      canCtx.lineWidth = 2;
      canCtx.beginPath();
      canCtx.moveTo(12, 10);
      canCtx.lineTo(14, 56);
      canCtx.moveTo(21, 10);
      canCtx.lineTo(21, 56);
      canCtx.moveTo(30, 10);
      canCtx.lineTo(28, 56);
      canCtx.stroke();
    }
    spriteCanRef.current = canCv;

    // 6. Cached Bottle Sprite (28x60)
    const btlCv = document.createElement('canvas');
    btlCv.width = 28;
    btlCv.height = 60;
    const btlCtx = btlCv.getContext('2d');
    if (btlCtx) {
      btlCtx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      btlCtx.beginPath();
      btlCtx.moveTo(4, 58);
      btlCtx.lineTo(4, 24);
      btlCtx.lineTo(9, 10);
      btlCtx.lineTo(9, 2);
      btlCtx.lineTo(17, 2);
      btlCtx.lineTo(17, 10);
      btlCtx.lineTo(22, 24);
      btlCtx.lineTo(22, 58);
      btlCtx.closePath();
      btlCtx.fill();

      btlCtx.fillStyle = '#ef4444';
      btlCtx.fillRect(9, 0, 8, 4);

      btlCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      btlCtx.fillRect(6, 26, 3, 26);
    }
    spriteBottleRef.current = btlCv;
  };

  // Main game runner effect - ONLY starts/stops when isPlaying changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const V_WIDTH = 960;
    const V_HEIGHT = 540;
    const GROUND_HEIGHT = 80;
    const GROUND_Y = V_HEIGHT - GROUND_HEIGHT;

    // Snappy, responsive arcade physics (tuned for 60 updates/sec)
    const GRAVITY = 1.05;
    const JUMP_FORCE = -17.2;

    initCachedAssets(V_WIDTH, V_HEIGHT, GROUND_HEIGHT);

    if (!isPlaying) {
      // Draw static preview
      if (bgAlleyCanvasRef.current) ctx.drawImage(bgAlleyCanvasRef.current, 0, 0);
      if (groundCanvasRef.current) ctx.drawImage(groundCanvasRef.current, 0, GROUND_Y);
      return;
    }

    // Dynamic arcade runner speed tuned for fluid mobile responsiveness:
    // Comfortable, accessible initial speed that ramps gradually:
    // Facil: 9.2 px/step | Normal: 10.8 px/step | Dificil: 12.5 px/step
    const currentDiff = difficultyRef.current;
    const speedMultiplier = currentDiff === 'facil' ? 0.85 : currentDiff === 'dificil' ? 1.16 : 1.0;
    const baseSpeed = 10.8 * speedMultiplier;

    // Game state variables for THIS run
    let currentScore = 0;
    let cheesesCollected = 0;
    let obstaclesDodgeCount = 0;
    const runStartTime = Date.now();
    let frameCount = 0;

    let scrollBg = 0;
    let scrollGround = 0;
    let lastSpawnX = V_WIDTH + 80;
    let isGameOver = false;
    let consecutiveObstaclesCount = 0;

    let pauseStartTimestamp = 0;
    let totalPausedDuration = 0;

    // Jump Buffer & Coyote Time system for flawless mobile consecutive jumping
    let jumpBufferTicks = 0;
    const JUMP_BUFFER_WINDOW = 10; // ~160ms buffer window
    let coyoteTicks = 0;
    const COYOTE_WINDOW = 5; // ~80ms grace window after leaving ground

    const triggerJumpAction = () => {
      jumpBufferTicks = JUMP_BUFFER_WINDOW;
    };

    // Report initial score
    onScoreUpdateRef.current(0);

    // Player definition
    const player = {
      x: 100,
      y: GROUND_Y - 35,
      width: 62,
      height: 35,
      vy: 0,
      isGrounded: true,
      currentRotation: 0,
      targetRotation: 0,

      draw(fCount: number) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const bnc = this.isGrounded ? Math.sin(fCount * 0.5) * 2.2 : 0;

        ctx.translate(this.width / 2, this.height / 2 + bnc);
        ctx.rotate(this.currentRotation);
        ctx.translate(-this.width / 2, -this.height / 2);

        // Tail
        ctx.beginPath();
        ctx.moveTo(6, 20);
        const tailWiggle = this.isGrounded ? Math.sin(fCount * 0.55) * 7 : -7;
        ctx.quadraticCurveTo(-14, 10 + tailWiggle, -28, 22);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Body Oval
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.ellipse(30, 20, 25, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.ellipse(32, 23, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big outer ear
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.arc(41, 6, 8.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner ear pink
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(42, 6, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.ellipse(47, 18, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pink nose
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(58, 21, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye with shiny spark
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(46, 14, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(45, 13, 1, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(52, 19);
        ctx.lineTo(66, 16);
        ctx.moveTo(52, 21);
        ctx.lineTo(67, 24);
        ctx.stroke();

        // Animated Running Legs
        ctx.fillStyle = '#d6d3d1';
        if (this.isGrounded) {
          const leg1 = Math.sin(fCount * 0.7) * 9;
          const leg2 = Math.sin(fCount * 0.7 + Math.PI) * 9;
          ctx.beginPath();
          ctx.ellipse(20 + leg1, 33, 4.5, 5, 0, 0, Math.PI * 2);
          ctx.ellipse(42 + leg2, 33, 4.5, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(18, 30, 4, 4, -0.4, 0, Math.PI * 2);
          ctx.ellipse(44, 28, 4, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      },

      update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y + this.height >= GROUND_Y) {
          this.y = GROUND_Y - this.height;
          this.vy = 0;
          this.isGrounded = true;
          coyoteTicks = COYOTE_WINDOW;
          // Smoothly return to horizontal position upon landing
          this.targetRotation = 0;
        } else {
          this.isGrounded = false;
          if (coyoteTicks > 0) coyoteTicks--;

          // Aerodynamic leap rotation: tilts smoothly forward into the leap arc while ascending,
          // then gracefully transitions towards landing angle
          if (this.vy < 0) {
            this.targetRotation = -0.26; // Smooth forward leap tilt (~15 degrees)
          } else {
            this.targetRotation = 0.14; // Forward descent angle preparing for touchdown
          }
        }

        // Fluid spring interpolation for silky-smooth 60fps rotation
        this.currentRotation += (this.targetRotation - this.currentRotation) * 0.22;

        // Process buffered jump input (allows continuous/immediate jumping without missing taps)
        if (jumpBufferTicks > 0) {
          if (this.isGrounded || coyoteTicks > 0) {
            jumpBufferTicks = 0;
            coyoteTicks = 0;
            this.vy = JUMP_FORCE;
            this.isGrounded = false;
            if (soundEnabledRef.current) soundFx.play('jump');
            if (hapticsEnabledRef.current) haptics.jump();
          } else {
            jumpBufferTicks--;
          }
        }
      },

      jump() {
        triggerJumpAction();
        return true;
      },
    };

    // Attach to jump ref
    jumpHandlerRef.current = () => {
      if (!isGameOver && !isPausedRef.current) {
        triggerJumpAction();
      }
    };

    const obstacles: ObstacleObj[] = [];
    const cheeses: CheeseObj[] = [];
    const floatingTexts: FloatingText[] = [];
    const particles: Particle[] = [];

    const spawnObstacle = (x: number, diffProgress: number): ObstacleObj => {
      // At higher difficulty, spawn more tall obstacles (trash cans & bottles) vs rock/trap
      const tallChance = 0.25 + diffProgress * 0.55; // 25% -> 80% tall obstacles
      let type = 0;
      if (Math.random() < tallChance) {
        type = Math.random() < 0.5 ? 1 : 2; // Trash can (1, 62px) or Bottle (2, 56px)
      } else {
        type = 0; // Rock / Trap hazard (0, 38px)
      }

      let w = 52;
      let h = 38;
      if (type === 1) {
        w = 42;
        h = 62;
      } else if (type === 2) {
        w = 26;
        h = 56;
      }
      return {
        x,
        y: GROUND_Y - h,
        width: w,
        height: h,
        type,
        passed: false,
      };
    };

    const addFloatingText = (x: number, y: number, text: string, color: string, size = 18) => {
      floatingTexts.push({ x, y, text, color, alpha: 1.0, vy: -2.0, size });
    };

    const addParticles = (x: number, y: number, color: string, count = 6) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 5 - 2,
          size: 3 + Math.random() * 2,
          alpha: 1.0,
          color,
        });
      }
    };

    const spawnCycle = (speed: number, obstacleProb: number, diffProgress: number) => {
      lastSpawnX -= speed;

      if (lastSpawnX < V_WIDTH + 60) {
        const rnd = Math.random();
        const newX = Math.max(V_WIDTH + 60, lastSpawnX);
        let addedWidth = 0;

        // Wave pacing: limit consecutive single obstacles to at most 2, then guarantee a cheese breather
        const canSpawnObstacle = consecutiveObstaclesCount < 2;
        const shouldSpawnObstacle = canSpawnObstacle && rnd < obstacleProb;

        if (shouldSpawnObstacle) {
          // Dynamic obstacle gap scaled to current speed and difficulty:
          // A jump takes ~33 frames (distance = 33 * speed).
          // Safe runway gently tightens from ~170px down to ~130px as difficulty builds:
          const jumpDistance = 33 * speed;
          const minSafeRunway = (170 - diffProgress * 40) + Math.random() * (70 - diffProgress * 20);
          const minGap = Math.max(480, jumpDistance + minSafeRunway);

          // As difficulty progresses (> 0.35), introduce rhythmic double obstacles!
          const canSpawnDouble = diffProgress > 0.35 && consecutiveObstaclesCount === 0 && Math.random() < ((diffProgress - 0.35) * 0.5);

          if (canSpawnDouble) {
            consecutiveObstaclesCount = 2; // Pair counted as two obstacles, next wave is guaranteed cheese!
            const obs1 = spawnObstacle(newX + minGap, diffProgress);
            obstacles.push(obs1);

            // Spaced precisely for a satisfying jump-land-jump rhythm:
            const pairRunway = 135 + Math.random() * 35;
            const pairGap = jumpDistance + pairRunway;
            const obs2 = spawnObstacle(newX + minGap + pairGap, diffProgress);
            obstacles.push(obs2);

            // 2 airborne cheeses between the pair
            for (let ci = 0; ci < 2; ci++) {
              cheeses.push({
                x: newX + minGap + obs1.width + 30 + ci * 44,
                y: GROUND_Y - 82,
                r: 14,
              });
            }

            addedWidth = minGap + pairGap + obs2.width;
          } else {
            consecutiveObstaclesCount++;
            const obs = spawnObstacle(newX + minGap, diffProgress);
            obstacles.push(obs);

            // Occasional airborne cheese above obstacles (35% chance)
            if (Math.random() < 0.35) {
              cheeses.push({
                x: obs.x + obs.width / 2,
                y: GROUND_Y - obs.height - 35,
                r: 14,
              });
            }

            addedWidth = minGap + obs.width;
          }
        } else {
          consecutiveObstaclesCount = 0;

          // As difficulty increases, more cheeses appear in high jumping arcs instead of simple ground lines
          const arcChance = 0.35 + diffProgress * 0.35; // 35% -> 70% arcs
          const isArc = rnd < arcChance;

          if (!isArc) {
            // Straight line cheeses (balanced 3 to 4 cheeses)
            const minGap = (290 - diffProgress * 40) + Math.random() * 70;
            const count = 3 + Math.floor(Math.random() * 2);
            const spacing = 48;
            for (let i = 0; i < count; i++) {
              cheeses.push({
                x: newX + minGap + i * spacing,
                y: GROUND_Y - 26,
                r: 14,
              });
            }
            addedWidth = minGap + count * spacing;
          } else {
            // Cheeses in jump arc (balanced 4 to 5 cheeses)
            const minGap = (305 - diffProgress * 35) + Math.random() * 70;
            const count = 4 + Math.floor(Math.random() * 2);
            const spacing = 50;
            for (let i = 0; i < count; i++) {
              const nx = (i / (count - 1)) * 2 - 1;
              const arcH = 100 * (1 - nx * nx);
              cheeses.push({
                x: newX + minGap + i * spacing,
                y: GROUND_Y - 26 - arcH,
                r: 14,
              });
            }
            addedWidth = minGap + count * spacing;
          }
        }

        lastSpawnX = newX + addedWidth;
      }
    };

    // --- SEPARATED PHYSICS UPDATE FUNCTION (Runs at fixed 60Hz step) ---
    const updatePhysics = () => {
      frameCount++;

      // Steady, continuous gradual progression based on score and survival time
      // Increases little by little ("poco a poco") as points climb through 500, 1000, 1500+
      const elapsedSeconds = Math.max(0, (Date.now() - runStartTime - totalPausedDuration) / 1000);

      // Score-driven steady acceleration: +0.65 px/step per 100 points
      const scoreSpeedBonus = (currentScore / 100) * 0.65;
      // Gentle baseline for continuous survival:
      const timeSpeedBonus = Math.min(2.0, (elapsedSeconds / 15) * 0.15);
      const totalSpeedBonus = Math.min(11.5, scoreSpeedBonus + timeSpeedBonus);
      const currentSpeed = baseSpeed + totalSpeedBonus;

      // Normalized difficulty progress based on total speed acquired:
      const diffProgress = Math.min(1.0, totalSpeedBonus / 10.0);

      // Obstacle probability scaling gradually with progressive difficulty:
      // Facil: 40% -> 58% | Normal: 45% -> 68% | Dificil: 52% -> 76%
      const diffBaseProb = currentDiff === 'facil' ? 0.40 : currentDiff === 'dificil' ? 0.52 : 0.45;
      const diffMaxBonus = currentDiff === 'facil' ? 0.18 : currentDiff === 'dificil' ? 0.24 : 0.23;
      const obstacleProbability = diffBaseProb + diffProgress * diffMaxBonus;

      // Parallax scroll positions update
      scrollBg += currentSpeed * 0.35;
      scrollGround += currentSpeed;

      // Spawn manager with progressive difficulty
      spawnCycle(currentSpeed, obstacleProbability, diffProgress);

      // Dust particle while running on asphalt
      if (player.isGrounded && frameCount % 6 === 0) {
        particles.push({
          x: player.x + 8,
          y: GROUND_Y - 4,
          vx: -(currentSpeed * 0.3 + Math.random() * 2),
          vy: -Math.random() * 1.5,
          size: 2.5 + Math.random() * 2,
          alpha: 0.6,
          color: '#a8a29e',
        });
      }

      // Obstacles physics & dodge detection
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= currentSpeed;

        // Dodge detection: player passed obstacle without crash
        if (!obs.passed && obs.x + obs.width < player.x) {
          obs.passed = true;
          obstaclesDodgeCount++;
          currentScore += 15;
          onScoreUpdateRef.current(currentScore);
          addFloatingText(obs.x + 20, obs.y - 12, '+15 ⚡', '#34d399');
          if (soundEnabledRef.current) soundFx.play('dodge');
          if (hapticsEnabledRef.current) haptics.dodge();
        }

        if (obs.x + obs.width < -40) {
          obstacles.splice(i, 1);
        }
      }

      // Cheeses physics & collection detection
      for (let i = cheeses.length - 1; i >= 0; i--) {
        const ch = cheeses[i];
        ch.x -= currentSpeed;

        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.hypot(px - ch.x, py - ch.y);

        if (dist < 36) {
          cheesesCollected++;
          currentScore += 10;
          onScoreUpdateRef.current(currentScore);
          addFloatingText(ch.x, ch.y - 14, '+10 🧀', '#fbbf24');
          addParticles(ch.x, ch.y, '#fde047', 8);

          if (soundEnabledRef.current) soundFx.play('cheese');
          if (hapticsEnabledRef.current) haptics.cheese();

          cheeses.splice(i, 1);
        } else if (ch.x < -30) {
          cheeses.splice(i, 1);
        }
      }

      // Player physics update
      player.update();

      // Particle physics update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      // Floating texts physics update
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= ft.size && ft.size > 20 ? 0.015 : 0.025;

        if (ft.alpha <= 0) {
          floatingTexts.splice(i, 1);
        }
      }

      // Collision detection with Obstacles
      const px = player.x + 10;
      const py = player.y + 6;
      const pw = player.width - 20;
      const ph = player.height - 8;

      for (const obs of obstacles) {
        const ox = obs.x + 4;
        const oy = obs.y + 4;
        const ow = obs.width - 8;
        const oh = obs.height - 6;

        if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
          // Crash!
          isGameOver = true;
          addParticles(player.x + 30, player.y + 15, '#ef4444', 16);
          if (soundEnabledRef.current) soundFx.play('hit');
          if (hapticsEnabledRef.current) haptics.impact();

          const duration = Math.max(1, Math.floor((Date.now() - runStartTime - totalPausedDuration) / 1000));
          onGameOverRef.current({
            score: currentScore,
            cheeses: cheesesCollected,
            obstacles: obstaclesDodgeCount,
            duration,
          });
          return;
        }
      }
    };

    // --- SEPARATED RENDER FUNCTION (Runs on requestAnimationFrame refresh) ---
    const renderCanvas = () => {
      // 1. Blit pre-cached alleyway brick wall
      if (bgAlleyCanvasRef.current) {
        const w = bgAlleyCanvasRef.current.width;
        let off = -(scrollBg % w);
        if (off > 0) off -= w;
        ctx.drawImage(bgAlleyCanvasRef.current, off, 0);
        ctx.drawImage(bgAlleyCanvasRef.current, off + w, 0);
      }

      // 2. Blit ground & sewer curb
      if (groundCanvasRef.current) {
        const w = groundCanvasRef.current.width;
        let off = -(scrollGround % w);
        if (off > 0) off -= w;
        ctx.drawImage(groundCanvasRef.current, off, GROUND_Y);
        ctx.drawImage(groundCanvasRef.current, off + w, GROUND_Y);
      }

      // 3. Draw obstacles from pre-cached sprites
      for (const obs of obstacles) {
        if (obs.type === 0 && spriteTrapRef.current) {
          ctx.drawImage(spriteTrapRef.current, obs.x, obs.y);
        } else if (obs.type === 1 && spriteCanRef.current) {
          ctx.drawImage(spriteCanRef.current, obs.x, obs.y);
        } else if (spriteBottleRef.current) {
          ctx.drawImage(spriteBottleRef.current, obs.x, obs.y);
        }
      }

      // 4. Draw cheeses from pre-cached sprite
      if (spriteCheeseRef.current) {
        for (const ch of cheeses) {
          ctx.drawImage(spriteCheeseRef.current, ch.x - 22, ch.y - 22);
        }
      }

      // 5. Draw player
      player.draw(frameCount);

      // 6. Draw particles (single GPU batch)
      if (particles.length > 0) {
        ctx.save();
        for (const p of particles) {
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // 7. Draw floating texts
      if (floatingTexts.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#020617';

        for (const ft of floatingTexts) {
          const fontSize = ft.size || 18;
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          ctx.lineWidth = fontSize > 20 ? 5 : 3;
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.fillStyle = ft.color;
          ctx.strokeText(ft.text, ft.x, ft.y);
          ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
      }
    };

    // --- HIGH-RESOLUTION TIMESTAMP FIXED-TIMESTEP GAME LOOP ---
    const FIXED_TIMESTEP = 1000 / 60; // 16.6667ms per physics tick (locked 60 FPS physics)
    let accumulator = 0;
    let lastTimestamp = performance.now();
    let animationFrameId: number;

    const gameLoop = (timestamp: DOMHighResTimeStamp) => {
      if (isGameOver) return;

      // Handle pause state
      if (isPausedRef.current) {
        if (pauseStartTimestamp === 0) {
          pauseStartTimestamp = Date.now();
        }
        lastTimestamp = timestamp;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      if (pauseStartTimestamp !== 0) {
        totalPausedDuration += Date.now() - pauseStartTimestamp;
        pauseStartTimestamp = 0;
      }

      // Compute elapsed high-res time
      const frameDelta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Clamp frameDelta (prevent spiral of death on background tab resume)
      const clampedDelta = Math.min(frameDelta, 120);
      accumulator += clampedDelta;

      // 1. UPDATE PHYSICS IN FIXED DISCRETE STEPS
      while (accumulator >= FIXED_TIMESTEP) {
        updatePhysics();
        accumulator -= FIXED_TIMESTEP;
        if (isGameOver) return;
      }

      // 2. RENDER AT MONITOR REFRESH RATE
      renderCanvas();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jumpHandlerRef.current?.();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        onPauseToggleRef.current();
      }
    };

    const handleCustomJump = () => {
      jumpHandlerRef.current?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('alleyway_jump_action', handleCustomJump);

    lastTimestamp = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('alleyway_jump_action', handleCustomJump);
      jumpHandlerRef.current = null;
    };
  }, [isPlaying]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPausedRef.current) return;

    // Visual ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTouchFeedback({ x, y, active: true });
    setTimeout(() => setTouchFeedback((prev) => ({ ...prev, active: false })), 200);

    // Immediate jump invocation
    jumpHandlerRef.current?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video max-h-[calc(100dvh-170px)] sm:max-h-[calc(100dvh-185px)] landscape:max-h-[calc(100dvh-60px)] md:max-h-[78vh] bg-slate-900 rounded-2xl landscape:rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/80 touch-none flex items-center justify-center select-none mx-auto"
    >
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        onPointerDown={handlePointerDown}
        className="w-full h-full max-h-full object-contain cursor-pointer touch-none block"
      />

      {/* Visual Touch Ripple on Mobile */}
      {touchFeedback.active && (
        <span
          className="absolute pointer-events-none rounded-full bg-amber-400/25 border-2 border-amber-300 animate-ping"
          style={{
            left: touchFeedback.x - 24,
            top: touchFeedback.y - 24,
            width: 48,
            height: 48,
          }}
        />
      )}
    </div>
  );
});
