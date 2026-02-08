/**
 * CV: Hand detection (open hand = ready to cast, particles only when open),
 * wand detection (Expo marker in ROI to reduce background), move recording (L,R,U,P),
 * pattern matching, spell/penalty callbacks, attack/defense/reflect effects.
 * Open palm = confirmation (input enabled); wand = directional input only.
 */

import { MoveBuffer, matchSpell, evaluateMove, SPELL_PATTERNS } from "./gameState.js";

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
/** Dead zone: movement below this (in both axes) = no direction (ignore). */
const MIN_MOVE_PX = 40;
/** Minimum displacement on the dominant axis to register L/R/U/D (reduces accidental Down). */
const MIN_DIRECTION_PX = 60;
/** Hold time at edge to confirm input (ms). */
const HOLD_MS = 1000;
/** Region sensitivity (percent of frame). */
const EDGE_MARGIN = 0.2;
/** Max drift during hold (px). */
const HOLD_STABILITY_PX = 28;
/** Max contour area for wand (reject large blobs like hands). */
const WAND_MAX_AREA = 2500;
/** Min contour area for wand. */
const WAND_MIN_AREA = 80;
/** Minimum aspect ratio for a skinny wand-like shape. */
const WAND_MIN_ASPECT = 2.2;
/** Ignore detections too close to frame edges (percent). */
const WAND_EDGE_REJECT = 0.05;

/**
 * Quantize displacement to L, R, U, D. Returns null if in dead zone or movement too small.
 * Larger margin of error so small hand drift doesn't register as Down.
 */
function displacementToDirection(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < MIN_MOVE_PX && ay < MIN_MOVE_PX) return null;
  if (ax >= ay) {
    if (ax < MIN_DIRECTION_PX) return null;
    return dx > 0 ? "L" : "R";
  }
  if (ay < MIN_DIRECTION_PX) return null;
  return dy > 0 ? "D" : "U";
}

function getEdgeDirection(x, y, width, height) {
  const leftEdge = width * EDGE_MARGIN;
  const rightEdge = width * (1 - EDGE_MARGIN);
  const topEdge = height * EDGE_MARGIN;
  const bottomEdge = height * (1 - EDGE_MARGIN);
  if (x <= leftEdge && y > topEdge && y < bottomEdge) return "L";
  if (x >= rightEdge && y > topEdge && y < bottomEdge) return "R";
  if (y <= topEdge && x > leftEdge && x < rightEdge) return "U";
  if (y >= bottomEdge && x > leftEdge && x < rightEdge) return "D";
  return null;
}

function getRegionDirection(x, y, width, height) {
  const leftEdge = width * EDGE_MARGIN;
  const rightEdge = width * (1 - EDGE_MARGIN);
  const topEdge = height * EDGE_MARGIN;
  const bottomEdge = height * (1 - EDGE_MARGIN);
  if (x <= leftEdge) return "L";
  if (x >= rightEdge) return "R";
  if (y <= topEdge) return "U";
  if (y >= bottomEdge) return "D";
  return null;
}

/**
 * Detect wand (Expo marker) by color in frame; only accept if near an open hand (ROI logic).
 * Uses full-frame HSV mask + morph to reduce grain, then filters by distance to hand.
 */
function detectWandInROI(cv, srcMat, handX, handY, handRadius) {
  try {
    const h = srcMat.rows;
    const w = srcMat.cols;
    const rgb = new cv.Mat(h, w, cv.CV_8UC3);
    const hsv = new cv.Mat();
    cv.cvtColor(srcMat, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    const mask = new cv.Mat();
    const low = new cv.Mat(1, 3, cv.CV_8UC1);
    const high = new cv.Mat(1, 3, cv.CV_8UC1);
    low.data.set([0, 60, 60]);
    high.data.set([40, 255, 255]);
    cv.inRange(hsv, low, high, mask);
    const low2 = new cv.Mat(1, 3, cv.CV_8UC1);
    const high2 = new cv.Mat(1, 3, cv.CV_8UC1);
    low2.data.set([160, 80, 80]);
    high2.data.set([180, 255, 255]);
    const mask2 = new cv.Mat();
    cv.inRange(hsv, low2, high2, mask2);
    cv.bitwise_or(mask, mask2, mask);
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    rgb.delete();
    hsv.delete();
    mask.delete();
    mask2.delete();
    low.delete();
    high.delete();
    low2.delete();
    high2.delete();
    kernel.delete();
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < WAND_MIN_AREA || area > WAND_MAX_AREA) {
        cnt.delete();
        continue;
      }
      const rect = cv.boundingRect(cnt);
      const ratio = Math.max(rect.width, rect.height) / Math.max(1, Math.min(rect.width, rect.height));
      if (ratio < WAND_MIN_ASPECT) {
        cnt.delete();
        continue;
      }
      const m = cv.moments(cnt);
      if (m.m00 > 0) {
        const score = area * ratio;
        if (score > bestScore) {
          const cx = m.m10 / m.m00;
          const cy = m.m01 / m.m00;
          if (
            cx > w * WAND_EDGE_REJECT &&
            cx < w * (1 - WAND_EDGE_REJECT) &&
            cy > h * WAND_EDGE_REJECT &&
            cy < h * (1 - WAND_EDGE_REJECT)
          ) {
            bestScore = score;
            best = { x: cx, y: cy };
          }
        }
      }
      cnt.delete();
    }
    contours.delete();
    hierarchy.delete();
    if (!best) return null;
    const dist = Math.hypot(best.x - handX, best.y - handY);
    if (dist > handRadius * 3) return null;
    return best;
  } catch (_) {
    return null;
  }
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
 * Initialize hand + wand detection, move recording, and spell/penalty callbacks.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   cv?: object;
 *   onSpellCast?: (spell: { id: string, name: string }) => void;
 *   onPenalty?: (reason: 'wrong_pattern'|'not_in_arsenal') => void;
 *   getPlayerArsenal?: () => Set<string>;
 *   hatImageUrl?: string;
 * }} options
 * @returns {{ cleanup: () => void; getMoveBuffer: () => MoveBuffer; clearMoveBuffer: () => void; setPlayerArsenal: (s: Set<string>) => void }}
 */
export function initHandDetection(video, canvas, options = {}) {
  const Hands = typeof window !== "undefined" ? window.Hands : null;
  const Camera = typeof window !== "undefined" ? window.Camera : null;
  const FaceMesh = typeof window !== "undefined" ? window.FaceMesh : null;
  if (!Hands || !Camera) {
    throw new Error("MediaPipe Hands and Camera must be loaded before initHandDetection (e.g. from CDN).");
  }

  const ctx = canvas.getContext("2d");
  const cv = options.cv || (typeof window !== "undefined" ? window.cv : null);
  const w = canvas.width;
  const h = canvas.height;
  let startTime = Date.now();
  let srcMat = null;

  const moveBuffer = new MoveBuffer();
  let playerArsenal = new Set(["attack", "defense", "reflect"]);
  const wandHistory = [];
  let lastWandPos = null;
  let lastOpenHand = null;
  let lastDirection = null;
  let holdDirection = null;
  let holdStart = 0;
  let holdPos = null;
  let lastEvalTime = 0;
  let faceLandmarks = null;
  let hatImg = null;
  let hatReady = false;

  if (cv) {
    try {
      srcMat = new cv.Mat(h, w, cv.CV_8UC4);
    } catch (_) {}
  }

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 4,
    modelComplexity: 1,
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

    // Target zones (bold semi-circular purple + gold)
    const leftEdge = w * EDGE_MARGIN;
    const rightEdge = w * (1 - EDGE_MARGIN);
    const topEdge = h * EDGE_MARGIN;
    const bottomEdge = h * (1 - EDGE_MARGIN);
    const arcRSide = Math.min(w, h) * 0.25;
    const arcRVert = Math.min(w, h) * 0.18;
    ctx.save();
    ctx.strokeStyle = "rgba(106, 44, 255, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, h * 0.5, arcRSide, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w, h * 0.5, arcRSide, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, 0, arcRVert, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h, arcRVert, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    let roiCenter = null;
    let anyOpenHand = false;
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
          anyOpenHand = true;
          openHandCenters.push({ cx, cy, radius });
          drawParticlesAroundHand(ctx, cx, cy, radius, time);
        }
        if (!singleFingerPos && singleFinger) {
          singleFingerPos = { x: landmarks[8].x * w, y: landmarks[8].y * h };
        }
        if (!roiCenter && open) roiCenter = { x: cx, y: cy, radius };
      }
    }
    lastOpenHand = openHandCenters.length > 0 ? openHandCenters[0] : null;

    if (singleFingerPos) {
      if (!lastWandPos) lastWandPos = { x: singleFingerPos.x, y: singleFingerPos.y };
      else {
        const smooth = 0.35;
        lastWandPos = {
          x: lastWandPos.x + (singleFingerPos.x - lastWandPos.x) * smooth,
          y: lastWandPos.y + (singleFingerPos.y - lastWandPos.y) * smooth,
        };
      }
      wandHistory.push({ x: lastWandPos.x, y: lastWandPos.y, t: Date.now() });
      if (wandHistory.length > WAND_HISTORY_LEN) wandHistory.shift();
      ctx.save();
      ctx.strokeStyle = "rgba(255, 210, 120, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lastWandPos.x, lastWandPos.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      lastWandPos = null;
      holdDirection = null;
      holdStart = 0;
      holdPos = null;
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

    if (anyOpenHand && lastWandPos) {
      const mirroredX = w - lastWandPos.x;
      const regionDir = getRegionDirection(mirroredX, lastWandPos.y, w, h);
      if (!regionDir) {
        holdDirection = null;
        holdStart = 0;
        holdPos = null;
        lastDirection = null;
      } else {
        if (regionDir !== holdDirection) {
          holdDirection = regionDir;
          holdStart = Date.now();
          holdPos = { x: mirroredX, y: lastWandPos.y };
        } else if (holdPos) {
          const drift = Math.hypot(mirroredX - holdPos.x, lastWandPos.y - holdPos.y);
          if (drift > HOLD_STABILITY_PX) {
            holdStart = Date.now();
            holdPos = { x: mirroredX, y: lastWandPos.y };
          }
        }
        if (holdDirection && holdStart && Date.now() - holdStart >= HOLD_MS && holdDirection !== lastDirection) {
          lastDirection = holdDirection;
          moveBuffer.push(holdDirection);
          holdDirection = null;
          holdStart = 0;
          holdPos = null;
        }
      }
    } else {
      holdDirection = null;
      holdStart = 0;
      holdPos = null;
      lastDirection = null;
    }

    if (moveBuffer.hasStarted() && moveBuffer.isStale()) {
      const now = Date.now();
      if (now - lastEvalTime > 500) {
        lastEvalTime = now;
        const arsenal = options.getPlayerArsenal ? options.getPlayerArsenal() : playerArsenal;
        const result = evaluateMove(moveBuffer, arsenal, SPELL_PATTERNS);
        if (result) {
          if (result.type === "spell") {
            if (options.onSpellCast) options.onSpellCast(result.spell);
            if (result.spell.id === "attack" && wandHistory.length > 0) {
              const last = wandHistory[wandHistory.length - 1];
              fireballStart = { x: last.x, y: last.y };
              fireballEndTime = time + 1.2;
            }
            if (result.spell.id === "defense") {
              const origin = lastWandPos || (lastOpenHand ? { x: lastOpenHand.cx, y: lastOpenHand.cy } : null);
              if (origin) {
                iceCenter = { x: origin.x, y: origin.y };
                iceEndTime = time + 1.1;
              }
            }
            if (result.spell.id === "reflect") {
              const origin = lastWandPos || (lastOpenHand ? { x: lastOpenHand.cx, y: lastOpenHand.cy } : null);
              if (origin) {
                reflectCenter = { x: origin.x, y: origin.y };
                reflectEndTime = time + 1.1;
              }
            }
          } else if (result.type === "penalty" && options.onPenalty) {
            options.onPenalty(result.reason);
          }
          moveBuffer.clear();
        }
      }
    }

    if (holdDirection && holdStart && lastWandPos) {
      const elapsed = Date.now() - holdStart;
      const progress = 1 - Math.min(1, elapsed / HOLD_MS);
      ctx.save();
      ctx.fillStyle = "rgba(30, 10, 55, 0.7)";
      ctx.beginPath();
      ctx.arc(lastWandPos.x, lastWandPos.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(247, 195, 92, 0.95)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(lastWandPos.x, lastWandPos.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
      ctx.strokeStyle = "rgba(166, 90, 255, 0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lastWandPos.x, lastWandPos.y, 28, 0, Math.PI * 2);
      ctx.stroke();
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
    if (srcMat) try { srcMat.delete(); } catch (_) {}
  }

  return {
    cleanup,
    getMoveBuffer: () => moveBuffer,
    clearMoveBuffer: () => moveBuffer.clear(),
    setPlayerArsenal: (s) => { playerArsenal = s; },
  };
}

export { MoveBuffer, matchSpell, evaluateMove, SPELL_PATTERNS };
