'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPlotsForScene } from '../data/plots';

// Tags sit at their TRUE distance from the camera (app units = meters), so
// perspective renders them exactly like real signboards standing on the plots:
// near ones large and low, far ones small near the horizon. Clamps keep a tag
// inside the panorama sphere (500) and out of the camera's face.
const MIN_TAG_DISTANCE = 4;
const MAX_TAG_DISTANCE = 350;
const FALLBACK_DISTANCE = 20; // mark-only tags with no known world position

// The pin is modelled at "design units" and scaled to real meters: factor 0.2
// makes the ring ≈0.5 m across and the name chip ≈1 m above the ground — a
// believable signboard. Beyond LEVEL_DISTANCE the tag grows gently with
// distance so it stays readable/clickable instead of vanishing to a speck.
const METERS_PER_DESIGN_UNIT = 0.2;
const LEVEL_DISTANCE = 30;

const STATUS_COLORS = {
  available: '#84c341',
  reserved: '#d8a93c',
  sold: '#d05050',
};

/**
 * Draw the plot's name chip into a canvas → texture. Rendering the label inside
 * WebGL (instead of an HTML overlay) is what keeps tags pixel-locked to the
 * panorama: DOM overlays are repositioned after the 3D frame and visibly swim
 * during drags and the arrival glide.
 */
function makeLabelTexture(text, accent) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 44;
  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  const padX = 34;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const h = 76;
  canvas.width = w;
  canvas.height = h;

  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(10, 16, 10, 0.82)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return { texture, aspect: w / h };
}

function PlotTag({ entry, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef();
  const pulseRef = useRef();
  const appearRef = useRef(0); // 0→1 scale-in after the tag (re)mounts
  const { plot, yaw, pitch, distance } = entry;

  const status = plot.info?.status?.toLowerCase() || 'available';
  const accent = STATUS_COLORS[status] || STATUS_COLORS.available;

  // True-depth placement: direction from the projected yaw/pitch, radius from
  // the real camera→plot distance. This is what makes a pin in the centre of a
  // plot LOOK like it stands in the centre of that plot.
  const { position, baseScale } = useMemo(() => {
    const r = THREE.MathUtils.clamp(distance ?? FALLBACK_DISTANCE, MIN_TAG_DISTANCE, MAX_TAG_DISTANCE);
    const cp = Math.cos(pitch);
    const leveling = Math.max(1, (distance ?? FALLBACK_DISTANCE) / LEVEL_DISTANCE);
    return {
      position: [-Math.sin(yaw) * cp * r, Math.sin(pitch) * r, -Math.cos(yaw) * cp * r],
      baseScale: METERS_PER_DESIGN_UNIT * leveling,
    };
  }, [yaw, pitch, distance]);

  const label = useMemo(() => makeLabelTexture(plot.name, accent), [plot.name, accent]);
  useEffect(() => () => label.texture.dispose(), [label]);

  useFrame((state) => {
    // Scale-in on appear + hover growth, applied imperatively so the breathing
    // pulse and grow never re-render React.
    appearRef.current += (1 - appearRef.current) * 0.16;
    if (groupRef.current) {
      const target = baseScale * (hovered || isActive ? 1.18 : 1) * appearRef.current;
      groupRef.current.scale.setScalar(target);
    }
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const s = 1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
      pulseRef.current.scale.setScalar(s);
      pulseRef.current.material.opacity = 0.34 - 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[0.001, 0.001, 0.001]}
      onUpdate={(g) => g.lookAt(0, 0, 0)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isActive ? null : plot);
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'grab';
      }}
    >
      {/* Pulsing halo */}
      <mesh ref={pulseRef}>
        <circleGeometry args={[3.6, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Ring */}
      <mesh position={[0, 0, 0.05]}>
        <ringGeometry args={[2.1, 2.7, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Core disc */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[2.1, 32]} />
        <meshBasicMaterial
          color={isActive ? accent : '#ffffff'}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Plus / close glyph */}
      <group position={[0, 0, 0.15]} rotation={[0, 0, isActive ? Math.PI / 4 : 0]}>
        <mesh>
          <planeGeometry args={[0.5, 2.2]} />
          <meshBasicMaterial color={isActive ? '#ffffff' : '#1f7a3c'} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[2.2, 0.5]} />
          <meshBasicMaterial color={isActive ? '#ffffff' : '#1f7a3c'} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {/* Name chip above the pin — always for nearby plots, on hover for far
          ones so a street lined with pins doesn't become a wall of labels */}
      {((distance ?? 0) < 60 || hovered || isActive) && (
        <mesh position={[0, 5.4, 0.1]}>
          <planeGeometry args={[3.4 * label.aspect, 3.4]} />
          <meshBasicMaterial map={label.texture} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

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
