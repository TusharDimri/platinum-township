'use client';

import { useState, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * BuilderMode — Enterprise-grade developer tool for placing hotspots
 * and setting yaw offsets in the panorama viewer.
 * 
 * Controls:
 *   Shift+A  → Toggle Hotspot Builder
 *   Shift+B  → Toggle Angle Builder
 *   Shift+P  → Toggle Plot Builder (marks for app/data/plots.js)
 *   Shift+Click → Capture coordinates & copy code to clipboard
 *   ESC → Exit builder mode
 * 
 * Architecture: Uses imperative DOM for the UI overlay (bypasses R3F's
 * reconciler entirely) and R3F only for 3D crosshair elements.
 */
export default function BuilderMode({ currentScene }) {
  const { camera, gl } = useThree();
  const activeModeRef = useRef(null);
  const containerRef = useRef(null);
  const bannerRef = useRef(null);
  const tooltipRef = useRef(null);
  const yawElRef = useRef(null);
  const pitchElRef = useRef(null);
  const statusElRef = useRef(null);
  const currentYawRef = useRef(0);
  const currentPitchRef = useRef(0);
  const ghostRef = useRef(null);
  const ringRef = useRef(null);
  const [activeMode, setActiveMode] = useState(null);

  // Keep refs in sync for use in DOM event handlers
  const currentSceneRef = useRef(currentScene);
  currentSceneRef.current = currentScene;
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  // ── Create the DOM overlay imperatively (survives R3F reconciler) ──
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'builder-mode-overlay';
    container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 9999;
      font-family: 'Inter', 'Outfit', sans-serif;
    `;

    // ── Top Status Banner ──
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      display: none; align-items: center; gap: 10px;
      background: rgba(10, 10, 15, 0.88);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px; padding: 10px 20px;
      color: #f0f0f5;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
      animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      white-space: nowrap;
    `;
    banner.id = 'builder-banner';

    // ── Cursor Tooltip ──
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute; top: 0; left: 0;
      transform: translate3d(-2000px, -2000px, 0);
      background: rgba(10, 10, 15, 0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px; padding: 12px 16px;
      color: #f0f0f5; pointer-events: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      will-change: transform; min-width: 180px;
      display: none; overflow: hidden;
    `;
    tooltip.id = 'builder-tooltip';
    tooltip.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:2px;border-radius:12px 12px 0 0;" id="builder-accent"></div>
      <div style="display:grid;gap:12px;margin-top:2px;" id="builder-coords">
        <div>
          <div style="font-size:9px;color:rgba(240,240,245,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;font-weight:600;">YAW</div>
          <div style="font-family:'SF Mono','Cascadia Code','Fira Code',monospace;font-size:15px;color:rgba(240,240,245,0.8);font-weight:500;font-variant-numeric:tabular-nums;" id="builder-yaw">0.0000</div>
        </div>
        <div id="builder-pitch-block">
          <div style="font-size:9px;color:rgba(240,240,245,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;font-weight:600;">PITCH</div>
          <div style="font-family:'SF Mono','Cascadia Code','Fira Code',monospace;font-size:15px;color:rgba(240,240,245,0.8);font-weight:500;font-variant-numeric:tabular-nums;" id="builder-pitch">0.0000</div>
        </div>
      </div>
      <div id="builder-status" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;"></div>
    `;

    container.appendChild(banner);
    container.appendChild(tooltip);
    document.body.appendChild(container);

    containerRef.current = container;
    bannerRef.current = banner;
    tooltipRef.current = tooltip;
    yawElRef.current = tooltip.querySelector('#builder-yaw');
    pitchElRef.current = tooltip.querySelector('#builder-pitch');
    statusElRef.current = tooltip.querySelector('#builder-status');

    return () => {
      container.remove();
    };
  }, []);

  // ── Update overlay visibility & content when mode changes ──
  useEffect(() => {
    const banner = bannerRef.current;
    const tooltip = tooltipRef.current;
    if (!banner || !tooltip) return;

    if (activeMode) {
      const MODE_CONFIG = {
        hotspot: { accent: '#c8a44e', gradient: 'linear-gradient(135deg, #c8a44e, #e8c65e)', name: 'Hotspot Builder', instruction: 'Shift+Click to place hotspot', hasPitch: true },
        yawOffset: { accent: '#38bdf8', gradient: 'linear-gradient(135deg, #38bdf8, #818cf8)', name: 'Angle Builder', instruction: 'Shift+Click to set angle', hasPitch: false },
        plot: { accent: '#84c341', gradient: 'linear-gradient(135deg, #1f7a3c, #84c341)', name: 'Plot Builder', instruction: 'Shift+Click the plot — mark it from 2+ scenes', hasPitch: true },
      };
      const { accent: accentColor, gradient, name: modeName, instruction, hasPitch } = MODE_CONFIG[activeMode];

      // Show & populate banner
      banner.style.display = 'flex';
      banner.innerHTML = `
        <div style="width:8px;height:8px;border-radius:50%;background:${accentColor};box-shadow:0 0 12px ${accentColor};animation:pulse 2s infinite;"></div>
        <span style="font-weight:600;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">${modeName}</span>
        <span style="font-size:11px;color:rgba(240,240,245,0.5);margin-left:4px;">— ${instruction}</span>
        <div style="margin-left:12px;display:flex;gap:6px;align-items:center;padding-left:12px;border-left:1px solid rgba(255,255,255,0.1);">
          <kbd style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600;color:rgba(240,240,245,0.6);">ESC</kbd>
          <span style="font-size:10px;color:rgba(240,240,245,0.4);">to exit</span>
        </div>
      `;

      // Show tooltip & configure grid
      tooltip.style.display = 'block';
      const accentEl = tooltip.querySelector('#builder-accent');
      const coordsEl = tooltip.querySelector('#builder-coords');
      const pitchBlock = tooltip.querySelector('#builder-pitch-block');

      if (accentEl) {
        accentEl.style.background = gradient;
      }
      if (coordsEl) {
        coordsEl.style.gridTemplateColumns = hasPitch ? '1fr 1fr' : '1fr';
      }
      if (pitchBlock) {
        pitchBlock.style.display = hasPitch ? 'block' : 'none';
      }

      // Reset status
      const statusEl = statusElRef.current;
      if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.innerHTML = '';
      }
    } else {
      // Hide everything
      banner.style.display = 'none';
      tooltip.style.display = 'none';
      tooltip.style.transform = 'translate3d(-2000px, -2000px, 0)';
    }
  }, [activeMode]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeModeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setActiveMode(null);
        }
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveMode(prev => prev === 'hotspot' ? null : 'hotspot');
      } else if (e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveMode(prev => prev === 'yawOffset' ? null : 'yawOffset');
      } else if (e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveMode(prev => prev === 'plot' ? null : 'plot');
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // ── Mouse tracking & click capture (DOM events on canvas) ──
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMove = (e) => {
      if (!activeModeRef.current) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const dir = raycaster.ray.direction.clone().normalize();

      const yaw = Math.atan2(-dir.x, -dir.z);
      const pitch = Math.asin(dir.y);

      currentYawRef.current = yaw;
      currentPitchRef.current = pitch;

      // Update tooltip position (offset to lower-right of cursor)
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${e.clientX + 20}px, ${e.clientY - 80}px, 0)`;
      }

      // Update coordinate values
      if (yawElRef.current) yawElRef.current.textContent = yaw.toFixed(4);
      if (pitchElRef.current) pitchElRef.current.textContent = pitch.toFixed(4);

      // Update 3D crosshair
      if (ghostRef.current) {
        const distance = 80;
        ghostRef.current.position.set(dir.x * distance, dir.y * distance, dir.z * distance);
        ghostRef.current.lookAt(0, 0, 0);
      }
    };

    const handleClick = (e) => {
      if (!activeModeRef.current || !e.shiftKey) return;

      const yaw = currentYawRef.current;
      const pitch = currentPitchRef.current;

      let code = '';
      if (activeModeRef.current === 'hotspot') {
        code = `{ targetId: 'TODO_SCENE_ID', yaw: ${yaw.toFixed(4)}, pitch: ${pitch.toFixed(4)} },`;
      } else if (activeModeRef.current === 'yawOffset') {
        code = `yawOffset: ${yaw.toFixed(4)},`;
      } else if (activeModeRef.current === 'plot') {
        // Paste into a plot's `marks` in app/data/plots.js; mark the same plot
        // from a second scene to triangulate its world position.
        code = `'${currentSceneRef.current.id}': { yaw: ${yaw.toFixed(4)}, pitch: ${pitch.toFixed(4)} },`;
      }

      // Show copied status
      const statusEl = statusElRef.current;
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;color:#4ade80;font-weight:500;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Copied to clipboard
          </div>
          <div style="margin-top:6px;font-family:monospace;font-size:10px;color:rgba(240,240,245,0.5);background:rgba(0,0,0,0.3);padding:4px 6px;border-radius:4px;white-space:nowrap;overflow-x:auto;">${code}</div>
        `;

        setTimeout(() => {
          if (statusEl) {
            statusEl.style.display = 'none';
            statusEl.innerHTML = '';
          }
        }, 3000);
      }

      navigator.clipboard.writeText(code).catch(() => {});
      console.log('[BUILDER] Generated:', code);
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handleClick);
    };
  }, [camera, gl.domElement]);

  // ── Animate 3D crosshair ring ──
  useFrame((state) => {
    if ((activeMode === 'hotspot' || activeMode === 'plot') && ringRef.current) {
      const time = state.clock.getElapsedTime();
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
    }
  });

  // ── Only return R3F elements (3D crosshair) ──
  if (activeMode !== 'hotspot' && activeMode !== 'plot') return null;

  const ringColor = activeMode === 'plot' ? '#84c341' : '#c8a44e';

  return (
    <group ref={ghostRef} scale={[0.8, 0.8, 0.8]} position={[0, -1000, 0]}>
      {/* Outer rotating ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[4.5, 5, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner ring */}
      <mesh>
        <ringGeometry args={[2, 2.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color={ringColor} transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Crosshair lines */}
      <mesh position={[0, 3.5, 0]}>
        <planeGeometry args={[0.4, 2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -3.5, 0]}>
        <planeGeometry args={[0.4, 2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3.5, 0, 0]}>
        <planeGeometry args={[2, 0.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-3.5, 0, 0]}>
        <planeGeometry args={[2, 0.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
