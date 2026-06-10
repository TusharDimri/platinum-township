'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPlotsForScene } from '../data/plots';

// Tags sit a bit further out than navigation hotspots (80) so the two never overlap.
const TAG_RADIUS = 90;

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
  const { plot, yaw, pitch, distance } = entry;

  const status = plot.info?.status?.toLowerCase() || 'available';
  const accent = STATUS_COLORS[status] || STATUS_COLORS.available;

  const position = useMemo(() => {
    const cp = Math.cos(pitch);
    return [
      -Math.sin(yaw) * cp * TAG_RADIUS,
      Math.sin(pitch) * TAG_RADIUS,
      -Math.cos(yaw) * cp * TAG_RADIUS,
    ];
  }, [yaw, pitch]);

  // Gentle depth cue: nearer plots get slightly bigger tags. Direction is exact
  // regardless; this only affects size.
  const depthScale = THREE.MathUtils.clamp(1.45 - (distance ?? 30) / 140, 0.6, 1.45);

  const label = useMemo(() => makeLabelTexture(plot.name, accent), [plot.name, accent]);
  useEffect(() => () => label.texture.dispose(), [label]);

  // Soft breathing pulse on the halo ring
  useFrame((state) => {
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const s = 1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
      pulseRef.current.scale.setScalar(s);
      pulseRef.current.material.opacity = 0.34 - 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
    }
  });

  const scale = depthScale * (hovered || isActive ? 1.18 : 1);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[scale, scale, scale]}
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
      {/* Name chip above the pin */}
      <mesh position={[0, 5.4, 0.1]}>
        <planeGeometry args={[3.4 * label.aspect, 3.4]} />
        <meshBasicMaterial map={label.texture} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
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
