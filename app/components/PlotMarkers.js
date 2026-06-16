'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPlotsForScene } from '../data/plots';

// Tags sit at their TRUE distance from the camera (app units = meters), so
// perspective renders them exactly like real signboards standing on the plots.
const MIN_TAG_DISTANCE = 4;
const MAX_TAG_DISTANCE = 350;
const FALLBACK_DISTANCE = 20;

// Physical pin size in world-meters. Beyond LEVEL_DISTANCE the pin grows
// slightly so it stays clickable instead of vanishing to a speck.
const METERS_PER_DESIGN_UNIT = 0.22;
const LEVEL_DISTANCE = 30;

const STATUS_COLORS = {
  available: '#22c55e',
  reserved: '#f59e0b',
  sold:      '#ef4444',
};

// ─── Pin canvas ───────────────────────────────────────────────────────────────
// 128 × 196 px. The spike TIP sits at canvas bottom-centre (the ground anchor).
// The balloon head + spike body fills the rest of the canvas upward.
function makePinTexture(accent) {
  const W = 128, H = 196;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const cx = W / 2;
  const r  = 46;           // balloon radius
  const cy = r + 10;       // balloon centre y
  const tipY = H - 6;      // spike tip y

  // Soft drop-shadow drawn with the fill passes (not a CSS shadow)
  ctx.shadowColor    = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur     = 16;
  ctx.shadowOffsetY  = 6;

  // Balloon
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();

  // Spike — smooth quadratic curves on each side meeting at the tip
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.36, cy + r * 0.72);
  ctx.quadraticCurveTo(cx - 5, tipY - 22, cx, tipY);
  ctx.quadraticCurveTo(cx + 5, tipY - 22, cx + r * 0.36, cy + r * 0.72);
  ctx.fillStyle = accent;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // White inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Accent centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace  = THREE.SRGBColorSpace;
  t.minFilter   = THREE.LinearFilter;
  return t;
}

// ─── Label chip canvas ────────────────────────────────────────────────────────
function makeLabelTexture(text, accent) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const fontSize = 44;
  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  const padX = 34;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const h = 76;
  canvas.width = w; canvas.height = h;

  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
  ctx.fillStyle = 'rgba(10,16,10,0.85)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = accent; ctx.stroke();

  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter  = THREE.LinearFilter;
  return { texture: t, aspect: w / h };
}

// Pin mesh dimensions in design units (proportional to the 128×196 canvas)
const PIN_W      = 5;
const PIN_H      = PIN_W * (196 / 128); // ≈ 7.66
const PIN_HALF_H = PIN_H / 2;           // ≈ 3.83

// The canvas tip is drawn at H - 6, meaning the bottom 6 pixels are shadow.
// To align the exact visual tip with the ground (y=0), we shift the plane
// up by slightly less than half its height.
const TIP_OFFSET = (6 / 196) * PIN_H;
const PIN_Y_POS  = PIN_HALF_H - TIP_OFFSET;

// ─── Individual pin ───────────────────────────────────────────────────────────
function PlotTag({ entry, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const groupRef  = useRef();
  const appearRef = useRef(0); // 0→1 scale-in on mount

  const { plot, yaw, pitch, distance } = entry;
  const status = plot.info?.status?.toLowerCase() || 'available';
  const accent = STATUS_COLORS[status] || STATUS_COLORS.available;

  // True-depth placement: radius = real camera-to-plot distance so perspective
  // makes near pins large and low, far pins small near the horizon — exactly
  // like real signboards standing on each plot.
  const { position, baseScale } = useMemo(() => {
    const r       = THREE.MathUtils.clamp(distance ?? FALLBACK_DISTANCE, MIN_TAG_DISTANCE, MAX_TAG_DISTANCE);
    const cp      = Math.cos(pitch);
    const leveling = Math.max(1, (distance ?? FALLBACK_DISTANCE) / LEVEL_DISTANCE);
    return {
      position:  [-Math.sin(yaw) * cp * r, Math.sin(pitch) * r, -Math.cos(yaw) * cp * r],
      baseScale: METERS_PER_DESIGN_UNIT * leveling,
    };
  }, [yaw, pitch, distance]);

  const pinTexture = useMemo(() => makePinTexture(accent), [accent]);
  useEffect(() => () => pinTexture.dispose(), [pinTexture]);

  const label = useMemo(() => makeLabelTexture(plot.name, accent), [plot.name, accent]);
  useEffect(() => () => label.texture.dispose(), [label]);

  useFrame(() => {
    appearRef.current += (1 - appearRef.current) * 0.16;
    if (groupRef.current) {
      const s = baseScale * (hovered || isActive ? 1.28 : 1) * appearRef.current;
      groupRef.current.scale.setScalar(s);
    }
  });

  const showLabel = (distance ?? 0) < 60 || hovered || isActive;

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[0.001, 0.001, 0.001]}
      onUpdate={(g) => g.lookAt(0, 0, 0)}
      onClick={(e) => { e.stopPropagation(); onSelect(isActive ? null : plot); }}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'grab';    }}
    >
      {/* Elliptical shadow at y=0 (the pin tip / plot ground level).
          A flattened circle suggests the pin is physically resting on the ground. */}
      <mesh position={[0, 0, -0.05]} scale={[1.1, 0.42, 1]}>
        <circleGeometry args={[1.0, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.30} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Pin body. The mesh is centred at y = PIN_Y_POS so the visual spike tip
          sits exactly at y = 0 — the plot's actual world position.
          The head rises above into the scene, visually "planted" at that spot. */}
      <mesh position={[0, PIN_Y_POS, 0]}>
        <planeGeometry args={[PIN_W, PIN_H]} />
        <meshBasicMaterial map={pinTexture} transparent alphaTest={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Name chip floats just above the pin head */}
      {showLabel && (
        <mesh position={[0, PIN_H + 2.6, 0.1]}>
          <planeGeometry args={[3.4 * label.aspect, 3.4]} />
          <meshBasicMaterial map={label.texture} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Scene-level container ────────────────────────────────────────────────────
export default function PlotMarkers({ sceneId, activePlotId, onSelect }) {
  const entries = useMemo(() => getPlotsForScene(sceneId), [sceneId]);
  return (
    <>
      {entries.map((entry) => (
        <PlotTag
          key={entry.plot.id}
          entry={entry}
          isActive={entry.plot.id === activePlotId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
