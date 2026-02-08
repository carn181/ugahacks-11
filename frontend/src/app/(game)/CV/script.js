/**
 * CV: Hand detection (open hand = aura particles),
 * single-finger swipe gestures for spells, spell/penalty callbacks,
 * and attack/defense/reflect effects.
 */

import { SPELL_PATTERNS } from "./gameState.js";

function getHandCenterAndRadius(landmarks, width, height) {
  const xs = landmarks.map((l) => l.x * width);
  const ys = landmarks.map((l) => l.y * height);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  let maxR = 0;
  for (let i = 0; i < landmarks.length; i++) {
    const d = Math.hypot(xs[i] - cx, ys[i] - cy);
    if (d > maxR) maxR = d;
  }
  const radius = Math.max(maxR * 1.4, 40);
  return { cx, cy, radius };
}

function detectOpenHand(landmarks, handLabel) {
  let extendedFingers = 0;
  const fingerTips = [8, 12, 16, 20];
  const pipJoints = [6, 10, 14, 18];
  for (let i = 0; i < fingerTips.length; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[pipJoints[i]].y) extendedFingers++;
  }
  if (handLabel === "Left") {
    if (landmarks[4].x > landmarks[3].x) extendedFingers++;
  } else {
    if (landmarks[4].x < landmarks[3].x) extendedFingers++;
  }
  return extendedFingers >= 5;
}

function detectSingleIndexFinger(landmarks, handLabel) {
  let extendedFingers = 0;
  const fingerTips = [8, 12, 16, 20];
  const pipJoints = [6, 10, 14, 18];
  for (let i = 0; i < fingerTips.length; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[pipJoints[i]].y) extendedFingers++;
  }
  const thumbExtended = handLabel === "Left" ? landmarks[4].x > landmarks[3].x : landmarks[4].x < landmarks[3].x;
  const indexExtended = landmarks[8].y < landmarks[6].y;
  // Only index finger extended (no thumb, no other fingers)
  return indexExtended && !thumbExtended && extendedFingers === 1;
}

const PARTICLE_COUNT_PER_HAND = 54;
const PARTICLE_ORBIT_SPEED = 0.035;
const PARTICLE_SIZE = 4.2;

function drawParticlesAroundHand(ctx, cx, cy, radius, time) {
  for (let i = 0; i < PARTICLE_COUNT_PER_HAND; i++) {
    const angle = time * PARTICLE_ORBIT_SPEED + (i / PARTICLE_COUNT_PER_HAND) * Math.PI * 2;
    const jitter = 0.85 + 0.3 * Math.sin(time * 0.003 + i * 0.5);
    const r = radius * jitter;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const size = PARTICLE_SIZE * (0.7 + 0.3 * Math.sin(time * 0.002 + i));
    const alpha = 0.5 + 0.4 * Math.sin(time * 0.001 + i * 0.3);
    ctx.save();
    const hue = 30 + 40 * Math.sin(time * 0.8 + i * 0.35);
    ctx.shadowColor = `hsla(${hue}, 95%, 65%, 0.95)`;
    ctx.shadowBlur = 18;
    ctx.fillStyle = `hsla(${hue}, 95%, 65%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Wand detection: ROI around hand, color mask (Expo marker), morph to reduce grain
const WAND_HISTORY_LEN = 30;
/** Trace settings (very lenient to accept noisy swipes). */
const TRACE_MAX_POINTS = 64;
const TRACE_MIN_DIST = 5;
const TRACE_IDLE_MS = 200;
const TRACE_MIN_LEN = 45;
const TRACE_TOO_FAST_PX_PER_S = 1800;
const TRACE_SMOOTHING = 0.4;
const POINTER_LOST_GRACE_MS = 300;

function traceLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

function detectSwipeGesture(points) {
  if (points.length < 6) return null;
  const len = traceLength(points);
  if (len < TRACE_MIN_LEN) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const diag = Math.hypot(w, h);
  if (diag < 30) return null;

  // Circle (reflect): loose loop with similar width/height and a near-closed path
  const start = points[0];
  const end = points[points.length - 1];
  const closeDist = Math.hypot(end.x - start.x, end.y - start.y);
  const ratio = w / Math.max(1, h);
  const isCircle =
    len > diag * 2.0 &&
    closeDist < diag * 0.6 &&
    ratio > 0.5 &&
    ratio < 2.2;
  if (isCircle) return "reflect";

  // Horizontal swipe (attack): very lenient on backtracking
  if (w > h * 1.15 && w > 40) return "attack";
  // Vertical swipe (defense)
  if (h > w * 1.15 && h > 40) return "defense";

  return null;
}


/** Attack (fireball) animation state */
let fireballEndTime = 0;
let fireballStart = { x: 0, y: 0 };

function drawFireball(ctx, time) {
  if (time > fireballEndTime) return;
  const t = (fireballEndTime - time) * 2;
  const x = fireballStart.x + 80 * Math.sin(t * 0.5);
  const y = fireballStart.y - 60 * t;
  const r = 15 + 10 * Math.sin(t * 3);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  g.addColorStop(0, "rgba(255, 200, 50, 0.95)");
  g.addColorStop(0.4, "rgba(255, 100, 0, 0.7)");
  g.addColorStop(1, "rgba(200, 50, 0, 0)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Defense (ice) animation state */
let iceEndTime = 0;
let iceCenter = { x: 0, y: 0 };

function drawIce(ctx, time) {
  if (time > iceEndTime) return;
  const t = Math.max(0, iceEndTime - time);
  const pulse = 0.6 + 0.4 * Math.sin((1.2 - t) * 6);
  const r = 40 + 25 * pulse;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(iceCenter.x, iceCenter.y, 0, iceCenter.x, iceCenter.y, r);
  g.addColorStop(0, "rgba(180, 230, 255, 0.9)");
  g.addColorStop(0.5, "rgba(120, 200, 255, 0.5)");
  g.addColorStop(1, "rgba(80, 140, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(iceCenter.x, iceCenter.y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + time * 1.5;
    const len = r * (0.6 + 0.4 * Math.sin(time * 2 + i));
    ctx.strokeStyle = "rgba(200, 245, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(iceCenter.x + Math.cos(a) * (r * 0.2), iceCenter.y + Math.sin(a) * (r * 0.2));
    ctx.lineTo(iceCenter.x + Math.cos(a) * len, iceCenter.y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Reflect (shimmer/mirror) animation state */
let reflectEndTime = 0;
let reflectCenter = { x: 0, y: 0 };

function drawReflect(ctx, time, width, height) {
  if (time > reflectEndTime) return;
  const t = Math.max(0, reflectEndTime - time);
  const strength = 0.3 + 0.7 * (1 - t / 1.1);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(200, 220, 255, ${0.35 * strength})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const offset = (i - 3) * 10 + Math.sin(time * 3 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(reflectCenter.x - 50, reflectCenter.y + offset);
    ctx.lineTo(reflectCenter.x + 50, reflectCenter.y - offset);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(220, 240, 255, ${0.5 * strength})`;
  ctx.beginPath();
  ctx.arc(reflectCenter.x, reflectCenter.y, 55 + 10 * Math.sin(time * 4), 0, Math.PI * 2);
  ctx.stroke();
  const shimmer = ctx.createLinearGradient(0, 0, width, height);
  shimmer.addColorStop(0, "rgba(160, 200, 255, 0)");
  shimmer.addColorStop(0.5, "rgba(200, 230, 255, 0.25)");
  shimmer.addColorStop(1, "rgba(160, 200, 255, 0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Initialize hand + face tracking with swipe gestures and spell/penalty callbacks.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   onSpellCast?: (spell: { id: string, name: string }) => void;
 *   onPenalty?: (reason: 'wrong_pattern'|'not_in_arsenal'|'too_fast') => void;
 *   getPlayerArsenal?: () => Set<string>;
 *   hatImageUrl?: string;
 * }} options
 * @returns {{ cleanup: () => void; setPlayerArsenal: (s: Set<string>) => void }}
 */
export function initHandDetection(video, canvas, options = {}) {
  const Hands = typeof window !== "undefined" ? window.Hands : null;
  const Camera = typeof window !== "undefined" ? window.Camera : null;
  const FaceMesh = typeof window !== "undefined" ? window.FaceMesh : null;
  if (!Hands || !Camera) {
    throw new Error("MediaPipe Hands and Camera must be loaded before initHandDetection (e.g. from CDN).");
  }

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  let startTime = Date.now();

  let playerArsenal = new Set(["attack", "defense", "reflect"]);
  const wandHistory = [];
  let lastWandPos = null;
  let lastOpenHand = null;
  const trace = [];
  let lastTraceTime = 0;
  let lastTooFastTime = 0;
  let lastCastTime = 0;
  let lastPointerTime = 0;
  let faceLandmarks = null;
  let hatImg = null;
  let hatReady = false;


  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 4,
    modelComplexity: 0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  });

  let faceMesh = null;
  if (FaceMesh) {
    faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        faceLandmarks = results.multiFaceLandmarks[0];
      } else {
        faceLandmarks = null;
      }
    });
  }

  if (options.hatImageUrl) {
    hatImg = new Image();
    hatImg.onload = () => {
      hatReady = true;
    };
    hatImg.src = options.hatImageUrl;
  }

  hands.onResults((results) => {
    if (!ctx) return;
    const time = (Date.now() - startTime) / 1000;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);

    // Trace trail (wizardly glow)
    if (trace.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(180, 120, 255, 0.55)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(trace[0].x, trace[0].y);
      for (let i = 1; i < trace.length; i++) ctx.lineTo(trace[i].x, trace[i].y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 210, 120, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    let singleFingerPos = null;
    const openHandCenters = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handLabel = results.multiHandedness[i].label;
        const { cx, cy, radius } = getHandCenterAndRadius(landmarks, w, h);
        const open = detectOpenHand(landmarks, handLabel);
        const singleFinger = detectSingleIndexFinger(landmarks, handLabel);
        if (open) {
          openHandCenters.push({ cx, cy, radius });
          drawParticlesAroundHand(ctx, cx, cy, radius, time);
        }
        if (!singleFingerPos && singleFinger) {
          singleFingerPos = { x: landmarks[8].x * w, y: landmarks[8].y * h };
        }
      }
    }
    lastOpenHand = openHandCenters.length > 0 ? openHandCenters[0] : null;

    const now = Date.now();
    if (singleFingerPos) {
      lastPointerTime = now;
      if (!lastWandPos) lastWandPos = { x: singleFingerPos.x, y: singleFingerPos.y };
      else {
        lastWandPos = {
          x: lastWandPos.x + (singleFingerPos.x - lastWandPos.x) * TRACE_SMOOTHING,
          y: lastWandPos.y + (singleFingerPos.y - lastWandPos.y) * TRACE_SMOOTHING,
        };
      }
      wandHistory.push({ x: lastWandPos.x, y: lastWandPos.y, t: now });
      if (wandHistory.length > WAND_HISTORY_LEN) wandHistory.shift();
      ctx.save();
      ctx.strokeStyle = "rgba(255, 210, 120, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lastWandPos.x, lastWandPos.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (
        trace.length === 0 ||
        Math.hypot(lastWandPos.x - trace[trace.length - 1].x, lastWandPos.y - trace[trace.length - 1].y) > TRACE_MIN_DIST
      ) {
        const dt = trace.length > 0 ? (now - trace[trace.length - 1].t) / 1000 : 0;
        const dist = trace.length > 0 ? Math.hypot(lastWandPos.x - trace[trace.length - 1].x, lastWandPos.y - trace[trace.length - 1].y) : 0;
        const speed = dt > 0 ? dist / dt : 0;
        if (speed > TRACE_TOO_FAST_PX_PER_S && now - lastTooFastTime > 900) {
          lastTooFastTime = now;
          if (options.onPenalty) options.onPenalty("too_fast");
        } else {
          trace.push({ x: lastWandPos.x, y: lastWandPos.y, t: now });
          if (trace.length > TRACE_MAX_POINTS) trace.shift();
          lastTraceTime = now;
        }
      }
    } else {
      if (lastWandPos && now - lastPointerTime <= POINTER_LOST_GRACE_MS) {
        // keep last position briefly to avoid flicker
      } else {
        lastWandPos = null;
      }
      if (trace.length > 0 && now - lastTraceTime > TRACE_IDLE_MS) {
        const gesture = detectSwipeGesture(trace);
        if (gesture && now - lastCastTime > 300) {
          lastCastTime = now;
          const spell = SPELL_PATTERNS.find((s) => s.id === gesture);
          const arsenal = options.getPlayerArsenal ? options.getPlayerArsenal() : playerArsenal;
          if (spell && arsenal.has(spell.id)) {
            if (options.onSpellCast) options.onSpellCast(spell);
            if (spell.id === "attack" && wandHistory.length > 0) {
              const last = wandHistory[wandHistory.length - 1];
              fireballStart = { x: last.x, y: last.y };
              fireballEndTime = time + 1.2;
            }
            if (spell.id === "defense") {
              const origin = lastWandPos || (lastOpenHand ? { x: lastOpenHand.cx, y: lastOpenHand.cy } : null);
              if (origin) {
                iceCenter = { x: origin.x, y: origin.y };
                iceEndTime = time + 1.1;
              }
            }
            if (spell.id === "reflect") {
              const origin = lastWandPos || (lastOpenHand ? { x: lastOpenHand.cx, y: lastOpenHand.cy } : null);
              if (origin) {
                reflectCenter = { x: origin.x, y: origin.y };
                reflectEndTime = time + 1.1;
              }
            }
          } else if (spell && options.onPenalty) {
            options.onPenalty("not_in_arsenal");
          }
        } else if (!gesture) {
          const len = traceLength(trace);
          if (len > TRACE_MIN_LEN * 1.6 && options.onPenalty) {
            options.onPenalty("wrong_pattern");
          }
        }
        trace.length = 0;
      }
    }

    if (hatReady && hatImg && faceLandmarks) {
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (let i = 0; i < faceLandmarks.length; i++) {
        const p = faceLandmarks[i];
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const faceW = (maxX - minX) * w;
      const faceH = (maxY - minY) * h;
      const faceCX = (minX + maxX) * 0.5 * w;
      const hatW = faceW * 1.9;
      const hatH = hatW * (hatImg.height / hatImg.width);
      const hatX = faceCX - hatW / 2;
      const hatY = minY * h - hatH * 0.85;
      ctx.save();
      ctx.drawImage(hatImg, hatX, hatY, hatW, hatH);
      ctx.restore();
    }

    if (time <= fireballEndTime) drawFireball(ctx, time);
    if (time <= iceEndTime) drawIce(ctx, time);
    if (time <= reflectEndTime) drawReflect(ctx, time, w, h);
  });

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
      if (faceMesh) await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480,
  });
  camera.start();

  function cleanup() {
    try {
      if (camera && typeof camera.stop === "function") camera.stop();
    } catch (_) {}
  }

  return {
    cleanup,
    setPlayerArsenal: (s) => { playerArsenal = s; },
  };
}

export { SPELL_PATTERNS };
