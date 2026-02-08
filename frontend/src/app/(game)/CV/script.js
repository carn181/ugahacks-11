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
  // Allow slight curl on other fingers (still predominantly single index).
  return indexExtended && !thumbExtended && extendedFingers <= 2;
}

function isFingerCurled(landmarks, tipIndex, pipIndex) {
  return landmarks[tipIndex].y > landmarks[pipIndex].y;
}

function detectHeartGesture(handA, handB) {
  if (!handA || !handB) return false;
  const thumbTipA = handA[4];
  const indexTipA = handA[8];
  const thumbTipB = handB[4];
  const indexTipB = handB[8];
  const wristA = handA[0];
  const wristB = handB[0];
  const scale = Math.max(0.001, Math.hypot(wristA.x - wristB.x, wristA.y - wristB.y));
  const thumbDist = Math.hypot(thumbTipA.x - thumbTipB.x, thumbTipA.y - thumbTipB.y) / scale;
  const indexDist = Math.hypot(indexTipA.x - indexTipB.x, indexTipA.y - indexTipB.y) / scale;
  const otherCurled =
    isFingerCurled(handA, 12, 10) &&
    isFingerCurled(handA, 16, 14) &&
    isFingerCurled(handA, 20, 18) &&
    isFingerCurled(handB, 12, 10) &&
    isFingerCurled(handB, 16, 14) &&
    isFingerCurled(handB, 20, 18);
  return thumbDist < 0.5 && indexDist < 0.5 && otherCurled;
}

function smoothLandmarks(prev, next, alpha) {
  if (!next) return null;
  if (!prev) return next.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  const out = new Array(next.length);
  for (let i = 0; i < next.length; i++) {
    const p = next[i];
    const q = prev[i] || p;
    out[i] = {
      x: q.x + (p.x - q.x) * alpha,
      y: q.y + (p.y - q.y) * alpha,
      z: typeof p.z === "number" ? (q.z ?? p.z) + (p.z - (q.z ?? p.z)) * alpha : p.z,
    };
  }
  return out;
}

function smoothBox(prev, next, alpha) {
  if (!next) return null;
  if (!prev) return { ...next };
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha,
    w: prev.w + (next.w - prev.w) * alpha,
    h: prev.h + (next.h - prev.h) * alpha,
  };
}

const OPEN_PALM_RIGHT_URL = "/—Pngtree—hand drawn minimalistic red cartoon_5577244.png";
const OPEN_PALM_LEFT_URL = "/—Pngtree—snowflake decorative element winter christmas_4030519.png";

function drawOpenPalmIcon(ctx, img, cx, cy, radius) {
  if (!img) return;
  const size = Math.max(48, radius * 1.4);
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

const WAND_HISTORY_LEN = 30;
const TRACE_MAX_POINTS = 72;
const TRACE_MIN_DIST = 4;
const TRACE_IDLE_MS = 320;
const TRACE_MIN_LEN = 25;
const TRACE_TOO_FAST_PX_PER_S = 2800;
const TRACE_SMOOTHING = 0.2;
const FACE_SMOOTHING = 0.2;
const HAT_SMOOTHING = 0.2;
const POINTER_LOST_GRACE_MS = 1800;

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

  const start = points[0];
  const end = points[points.length - 1];
  const closeDist = Math.hypot(end.x - start.x, end.y - start.y);
  const ratio = w / Math.max(1, h);
  const isCircle = len > diag * 1.4 && closeDist < diag * 0.9 && ratio > 0.4 && ratio < 2.6;
  if (isCircle) return "reflect";

  if (w > h * 1.05 && w > 25) return "attack";
  if (h > w * 1.05 && h > 25) return "defense";

  return null;
}

function drawFireball(ctx, time, state) {
  if (time > state.fireballEndTime) return;
  const t = (state.fireballEndTime - time) * 2;
  const x = state.fireballStart.x + 80 * Math.sin(t * 0.5);
  const y = state.fireballStart.y - 60 * t;
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

function drawIce(ctx, time, state) {
  if (time > state.iceEndTime) return;
  const t = Math.max(0, state.iceEndTime - time);
  const pulse = 0.6 + 0.4 * Math.sin((1.2 - t) * 6);
  const r = 40 + 25 * pulse;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(state.iceCenter.x, state.iceCenter.y, 0, state.iceCenter.x, state.iceCenter.y, r);
  g.addColorStop(0, "rgba(180, 230, 255, 0.9)");
  g.addColorStop(0.5, "rgba(120, 200, 255, 0.5)");
  g.addColorStop(1, "rgba(80, 140, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(state.iceCenter.x, state.iceCenter.y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + time * 1.5;
    const len = r * (0.6 + 0.4 * Math.sin(time * 2 + i));
    ctx.strokeStyle = "rgba(200, 245, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(state.iceCenter.x + Math.cos(a) * (r * 0.2), state.iceCenter.y + Math.sin(a) * (r * 0.2));
    ctx.lineTo(state.iceCenter.x + Math.cos(a) * len, state.iceCenter.y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawReflect(ctx, time, width, height, state) {
  if (time > state.reflectEndTime) return;
  const t = Math.max(0, state.reflectEndTime - time);
  const strength = 0.3 + 0.7 * (1 - t / 1.1);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(200, 220, 255, ${0.35 * strength})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const offset = (i - 3) * 10 + Math.sin(time * 3 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(state.reflectCenter.x - 50, state.reflectCenter.y + offset);
    ctx.lineTo(state.reflectCenter.x + 50, state.reflectCenter.y - offset);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(220, 240, 255, ${0.5 * strength})`;
  ctx.beginPath();
  ctx.arc(state.reflectCenter.x, state.reflectCenter.y, 55 + 10 * Math.sin(time * 4), 0, Math.PI * 2);
  ctx.stroke();
  const shimmer = ctx.createLinearGradient(0, 0, width, height);
  shimmer.addColorStop(0, "rgba(160, 200, 255, 0)");
  shimmer.addColorStop(0.5, "rgba(200, 230, 255, 0.25)");
  shimmer.addColorStop(1, "rgba(160, 200, 255, 0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawHeal(ctx, time, state) {
  if (time > state.healEndTime) return;
  const t = Math.max(0, state.healEndTime - time);
  const strength = 1 - t / 0.9;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(80, 255, 160, ${0.6 * strength})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const r = 10 + i * 6 + strength * 12;
    ctx.beginPath();
    ctx.arc(state.healCenter.x, state.healCenter.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(120, 255, 180, ${0.35 * (1 - strength)})`;
  ctx.beginPath();
  ctx.arc(state.healCenter.x, state.healCenter.y, 14 + strength * 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Initialize hand + face tracking with swipe gestures and spell/penalty callbacks.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   onSpellCast?: (playerId: 0 | 1, spell: { id: string, name: string }, meta?: { time?: number }) => void;
 *   onPenalty?: (playerId: 0 | 1, reason: 'wrong_pattern'|'not_in_arsenal'|'too_fast') => void;
 *   onPotionUse?: (playerId: 0 | 1) => void;
 *   canUsePotion?: (playerId: 0 | 1) => boolean;
 *   getPlayerArsenal?: () => Set<string>;
 *   getActivePlayer?: () => 0 | 1 | null | -1;
 *   mode?: 'single' | 'dual';
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
  const mode = options.mode === "dual" ? "dual" : "single";
  const PLAYER_COUNT = mode === "dual" ? 2 : 1;
  const playerColors = [
    { primary: "rgba(180, 120, 255, 0.55)", secondary: "rgba(255, 210, 120, 0.7)", cursor: "rgba(255, 210, 120, 0.95)" },
    { primary: "rgba(120, 200, 255, 0.55)", secondary: "rgba(120, 255, 210, 0.7)", cursor: "rgba(120, 255, 210, 0.95)" },
  ];
  const wandHistory = Array.from({ length: PLAYER_COUNT }, () => []);
  const lastWandPos = Array.from({ length: PLAYER_COUNT }, () => null);
  const lastOpenHand = Array.from({ length: PLAYER_COUNT }, () => null);
  const trace = Array.from({ length: PLAYER_COUNT }, () => []);
  const lastTraceTime = Array.from({ length: PLAYER_COUNT }, () => 0);
  const lastTooFastTime = Array.from({ length: PLAYER_COUNT }, () => 0);
  const lastCastTime = Array.from({ length: PLAYER_COUNT }, () => 0);
  const lastPointerTime = Array.from({ length: PLAYER_COUNT }, () => 0);
  const faceLandmarks = Array.from({ length: PLAYER_COUNT }, () => null);
  const lastHatBox = Array.from({ length: PLAYER_COUNT }, () => null);
  const effects = Array.from({ length: PLAYER_COUNT }, () => ({
    fireballEndTime: 0,
    fireballStart: { x: 0, y: 0 },
    iceEndTime: 0,
    iceCenter: { x: 0, y: 0 },
    reflectEndTime: 0,
    reflectCenter: { x: 0, y: 0 },
    healEndTime: 0,
    healCenter: { x: 0, y: 0 },
  }));
  const lastHeartTime = Array.from({ length: PLAYER_COUNT }, () => 0);
  const heartHoldStart = Array.from({ length: PLAYER_COUNT }, () => 0);
  let hatImg = null;
  let hatReady = false;
  let rightPalmImg = null;
  let rightPalmReady = false;
  let leftPalmImg = null;
  let leftPalmReady = false;

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
      maxNumFaces: mode === "dual" ? 2 : 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results) => {
      const faces = results.multiFaceLandmarks || [];
      if (mode === "single") {
        faceLandmarks[0] = smoothLandmarks(faceLandmarks[0], faces[0], FACE_SMOOTHING);
        return;
      }
      const bySide = [null, null];
      for (const f of faces) {
        let sumX = 0;
        for (let i = 0; i < f.length; i++) sumX += f[i].x;
        const cx = sumX / f.length;
        const displayX = 1 - cx;
        const side = displayX < 0.5 ? 0 : 1;
        if (!bySide[side]) bySide[side] = f;
      }
      faceLandmarks[0] = smoothLandmarks(faceLandmarks[0], bySide[0], FACE_SMOOTHING);
      faceLandmarks[1] = smoothLandmarks(faceLandmarks[1], bySide[1], FACE_SMOOTHING);
    });
  }

  if (options.hatImageUrl) {
    hatImg = new Image();
    hatImg.onload = () => {
      hatReady = true;
    };
    hatImg.src = options.hatImageUrl;
  }
  rightPalmImg = new Image();
  rightPalmImg.onload = () => {
    rightPalmReady = true;
  };
  rightPalmImg.src = OPEN_PALM_RIGHT_URL;

  leftPalmImg = new Image();
  leftPalmImg.onload = () => {
    leftPalmReady = true;
  };
  leftPalmImg.src = OPEN_PALM_LEFT_URL;

  hands.onResults((results) => {
    if (!ctx) return;
    const time = (Date.now() - startTime) / 1000;
    const allowInput = time > 0.7;

    ctx.clearRect(0, 0, w, h);

    const activePlayer = options.getActivePlayer ? options.getActivePlayer() : null;
    const blockAll = activePlayer === -1;

    for (let p = 0; p < PLAYER_COUNT; p++) {
      if (trace[p].length > 1 && !blockAll && (activePlayer == null || activePlayer === p)) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = playerColors[p].primary;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(trace[p][0].x, trace[p][0].y);
        for (let i = 1; i < trace[p].length; i++) ctx.lineTo(trace[p][i].x, trace[p][i].y);
        ctx.stroke();
        ctx.strokeStyle = playerColors[p].secondary;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    const singleFingerPos = [null, null];
    const openHandCenters = [[], []];
    const openHandList = [];
    const handsBySide = [[], []];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handLabel = results.multiHandedness[i].label;
        const { cx, cy, radius } = getHandCenterAndRadius(landmarks, w, h);
        const open = detectOpenHand(landmarks, handLabel);
        const singleFinger = detectSingleIndexFinger(landmarks, handLabel);
        const displayX = w - cx;
        const side = mode === "dual" ? (displayX < w / 2 ? 0 : 1) : 0;
        handsBySide[side].push(landmarks);

        if (open) {
          openHandCenters[side].push({ cx, cy, radius });
          openHandList.push({ cx, cy, radius, handLabel });
        }

        if (!allowInput || !singleFinger) continue;
        const target = openHandCenters[side][0];
        const score = target ? Math.hypot(cx - target.cx, cy - target.cy) : 0;
        const conf = results.multiHandedness?.[i]?.score ?? 0.5;
        const pointer = { x: landmarks[8].x * w, y: landmarks[8].y * h, score, conf };
        if (
          !singleFingerPos[side] ||
          pointer.score < singleFingerPos[side].score ||
          pointer.conf > (singleFingerPos[side].conf ?? 0)
        ) {
          singleFingerPos[side] = pointer;
        }
      }
    }

    for (let p = 0; p < PLAYER_COUNT; p++) {
      lastOpenHand[p] = openHandCenters[p][0] || null;
    }

    if ((rightPalmReady || leftPalmReady) && openHandList.length > 0) {
      const limited = openHandList.slice(0, 4);
      for (const hand of limited) {
        const isLeft = hand.handLabel === "Left";
        if (isLeft && leftPalmReady) {
          drawOpenPalmIcon(ctx, leftPalmImg, hand.cx, hand.cy, hand.radius);
        } else if (!isLeft && rightPalmReady) {
          drawOpenPalmIcon(ctx, rightPalmImg, hand.cx, hand.cy, hand.radius);
        }
      }
    }

    if (!blockAll) {
      for (let p = 0; p < PLAYER_COUNT; p++) {
        if (activePlayer != null && activePlayer !== p) continue;
        const handList = handsBySide[p];
        if (handList.length >= 2) {
          const now = Date.now();
          const canUsePotion = options.canUsePotion ? options.canUsePotion(p) : true;
          const isHeart = detectHeartGesture(handList[0], handList[1]);
          if (!isHeart) {
            heartHoldStart[p] = 0;
            continue;
          }
          if (!heartHoldStart[p]) heartHoldStart[p] = now;
          const heldMs = now - heartHoldStart[p];
          if (canUsePotion && heldMs >= 450 && now - lastHeartTime[p] > 1800) {
            lastHeartTime[p] = now;
            heartHoldStart[p] = 0;
            const heartX = (handList[0][4].x + handList[1][4].x) * 0.5 * w;
            const heartY = (handList[0][4].y + handList[1][4].y) * 0.5 * h;
            effects[p].healCenter = { x: heartX, y: heartY };
            effects[p].healEndTime = time + 0.9;
            if (options.onPotionUse) options.onPotionUse(p);
          }
        }
      }
    }

    const now = Date.now();
    for (let p = 0; p < PLAYER_COUNT; p++) {
      const tip = singleFingerPos[p];
      if (allowInput && tip) {
        lastPointerTime[p] = now;
        if (!lastWandPos[p]) lastWandPos[p] = { x: tip.x, y: tip.y };
        else {
          lastWandPos[p] = {
            x: lastWandPos[p].x + (tip.x - lastWandPos[p].x) * TRACE_SMOOTHING,
            y: lastWandPos[p].y + (tip.y - lastWandPos[p].y) * TRACE_SMOOTHING,
          };
        }
      }
    }

    for (let p = 0; p < PLAYER_COUNT; p++) {
      if (blockAll || (activePlayer != null && activePlayer !== p)) {
        trace[p].length = 0;
        continue;
      }

      const tip = singleFingerPos[p];
      if (allowInput && tip && lastWandPos[p]) {
        wandHistory[p].push({ x: lastWandPos[p].x, y: lastWandPos[p].y, t: now });
        if (wandHistory[p].length > WAND_HISTORY_LEN) wandHistory[p].shift();
        ctx.save();
        ctx.strokeStyle = playerColors[p].cursor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lastWandPos[p].x, lastWandPos[p].y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (
          trace[p].length === 0 ||
          Math.hypot(lastWandPos[p].x - trace[p][trace[p].length - 1].x, lastWandPos[p].y - trace[p][trace[p].length - 1].y) > TRACE_MIN_DIST
        ) {
          const dt = trace[p].length > 0 ? (now - trace[p][trace[p].length - 1].t) / 1000 : 0;
          const dist = trace[p].length > 0 ? Math.hypot(lastWandPos[p].x - trace[p][trace[p].length - 1].x, lastWandPos[p].y - trace[p][trace[p].length - 1].y) : 0;
          const speed = dt > 0 ? dist / dt : 0;
          if (speed > TRACE_TOO_FAST_PX_PER_S && now - lastTooFastTime[p] > 900) {
            lastTooFastTime[p] = now;
            if (options.onPenalty) options.onPenalty(p, "too_fast");
          } else {
            trace[p].push({ x: lastWandPos[p].x, y: lastWandPos[p].y, t: now });
            if (trace[p].length > TRACE_MAX_POINTS) trace[p].shift();
            lastTraceTime[p] = now;
          }
        }
      } else {
        if (lastWandPos[p] && now - lastPointerTime[p] <= POINTER_LOST_GRACE_MS) {
          ctx.save();
          ctx.strokeStyle = playerColors[p].cursor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(lastWandPos[p].x, lastWandPos[p].y, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          lastWandPos[p] = null;
        }
        if (trace[p].length > 0 && now - lastTraceTime[p] > TRACE_IDLE_MS) {
          const gesture = detectSwipeGesture(trace[p]);
          if (gesture && now - lastCastTime[p] > 300) {
            lastCastTime[p] = now;
            const spell = SPELL_PATTERNS.find((s) => s.id === gesture);
            const arsenal = options.getPlayerArsenal ? options.getPlayerArsenal() : playerArsenal;
            if (spell && arsenal.has(spell.id)) {
              if (options.onSpellCast) options.onSpellCast(p, spell, { time: now });
              if (spell.id === "attack") {
        const opponent = p === 0 ? 1 : 0;
        const oppHand = lastOpenHand[opponent];
        const fallbackX = mode === "dual"
          ? (opponent === 0 ? w * 0.25 : w * 0.75)
          : w * 0.5;
        const pos = oppHand ? { x: oppHand.cx, y: oppHand.cy } : { x: fallbackX, y: h * 0.5 };
        effects[p].fireballStart = { x: pos.x, y: pos.y };
        effects[p].fireballEndTime = time + 1.2;
              }
              if (spell.id === "defense") {
                const origin = lastWandPos[p] || (lastOpenHand[p] ? { x: lastOpenHand[p].cx, y: lastOpenHand[p].cy } : null);
                if (origin) {
                  effects[p].iceCenter = { x: origin.x, y: origin.y };
                  effects[p].iceEndTime = time + 1.1;
                }
              }
              if (spell.id === "reflect") {
                const origin = lastWandPos[p] || (lastOpenHand[p] ? { x: lastOpenHand[p].cx, y: lastOpenHand[p].cy } : null);
                if (origin) {
                  effects[p].reflectCenter = { x: origin.x, y: origin.y };
                  effects[p].reflectEndTime = time + 1.1;
                }
              }
            } else if (spell && options.onPenalty) {
              options.onPenalty(p, "not_in_arsenal");
            }
          } else if (!gesture) {
            const len = traceLength(trace[p]);
            if (len > TRACE_MIN_LEN * 2.8 && options.onPenalty) {
              options.onPenalty(p, "wrong_pattern");
            }
          }
          trace[p].length = 0;
        }
      }
    }

    if (hatReady && hatImg) {
      for (let p = 0; p < PLAYER_COUNT; p++) {
        const landmarks = faceLandmarks[p];
        if (!landmarks) continue;
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
        const faceW = (maxX - minX) * w;
        const faceCX = (minX + maxX) * 0.5 * w;
        const hatW = faceW * 2.45;
        const hatH = hatW * (hatImg.height / hatImg.width);
        const hatX = faceCX - hatW / 2;
        const hatY = minY * h - hatH * 0.85;
        const targetBox = { x: hatX, y: hatY, w: hatW, h: hatH };
        lastHatBox[p] = smoothBox(lastHatBox[p], targetBox, HAT_SMOOTHING);
        const drawBox = lastHatBox[p] || targetBox;
        ctx.save();
        ctx.drawImage(hatImg, drawBox.x, drawBox.y, drawBox.w, drawBox.h);
        ctx.restore();
      }
    }

    for (let p = 0; p < PLAYER_COUNT; p++) {
      if (time <= effects[p].fireballEndTime) drawFireball(ctx, time, effects[p]);
      if (time <= effects[p].iceEndTime) drawIce(ctx, time, effects[p]);
      if (time <= effects[p].reflectEndTime) drawReflect(ctx, time, w, h, effects[p]);
      if (time <= effects[p].healEndTime) drawHeal(ctx, time, effects[p]);
    }
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
