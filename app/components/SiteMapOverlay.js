'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { sceneAdjacency } from '../data/scenes';
import { plots } from '../data/plots';
import { SITE_MAP } from '../data/geo';
import styles from '../styles/SiteMapOverlay.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const STATUS_CLASS = {
  available: 'pinAvailable',
  reserved: 'pinReserved',
  sold: 'pinSold',
};

// Distinct, high-contrast marker colours assigned per road/area (first-come
// order). Deliberately NO greens — the site plan is green, so greens vanish into
// it. Ordered so consecutively-discovered (usually adjacent) roads contrast hard.
const ROAD_PALETTE = [
  '#e6194b', '#3c5fe0', '#f58231', '#9b30c4', '#00a3cc', '#d0249e',
  '#c99000', '#2a2a8c', '#8d5a2b', '#d81b60', '#006d8f', '#b00020',
];

// A scene's road/area = its name with any trailing number stripped, so
// "Vitality Avenue 1/2/3" all collapse to "Vitality Avenue".
const roadGroup = (name) => name.replace(/\s*\d+\s*$/, '').trim();

/**
 * Full-screen site map (game-style): the georeferenced plan with every plot
 * pin and scene dot on it. Wheel/buttons zoom (toward the cursor), drag pans,
 * plot pins open the info panel, scene dots walk you there. Escape closes the
 * plot panel first, then the map — never the tour.
 */
export default function SiteMapOverlay({ open, onClose, scenePoints, currentSceneId, onSceneSelect, onPlotSelect, plotOpen }) {
  const [zoom, setZoom] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const viewportRef = useRef(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const suppressClickRef = useRef(false); // ignore the click synthesised after a pinch

  const aspect = SITE_MAP.imageWidth / SITE_MAP.imageHeight;

  const pins = useMemo(
    () =>
      plots
        .filter((p) => p.map)
        .map((p) => {
          const status = p.info?.status || 'Available';
          return {
            plot: p,
            u: p.map.u,
            v: p.map.v,
            // Plot number shown on the pin; falls back to digits in the name.
            num: p.info?.number ?? (p.name.match(/\d+/)?.[0] || ''),
            status,
            statusClass: STATUS_CLASS[status.toLowerCase()] || STATUS_CLASS.available,
          };
        }),
    []
  );

  // Map each scene to a colour by its road/area, and build the legend (one entry
  // per road, in the order roads first appear). Same road name → same colour.
  const { colorOf, roadLegend } = useMemo(() => {
    const colorByGroup = new Map();
    const roadLegend = [];
    for (const p of scenePoints) {
      const g = roadGroup(p.name);
      if (!colorByGroup.has(g)) {
        const color = ROAD_PALETTE[colorByGroup.size % ROAD_PALETTE.length];
        colorByGroup.set(g, color);
        roadLegend.push({ name: g, color });
      }
    }
    return { colorOf: (name) => colorByGroup.get(roadGroup(name)), roadLegend };
  }, [scenePoints]);

  // Walk-graph edges → line endpoints. Depends only on scene geometry, so it's
  // computed once instead of rebuilt on every pan/zoom render.
  const connectionLines = useMemo(() => {
    const byId = new Map(scenePoints.map((p) => [p.id, p]));
    const lines = [];
    for (const pos of scenePoints) {
      for (const a of sceneAdjacency[pos.id] || []) {
        const t = byId.get(a.id);
        if (t) lines.push({ key: `${pos.id}-${a.id}`, x1: pos.u * 100, y1: pos.v * 100, x2: t.u * 100, y2: t.v * 100 });
      }
    }
    return lines;
  }, [scenePoints]);

  // Fresh view every time the map opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      x.set(0);
      y.set(0);
    }
  }, [open, x, y]);

  // Escape to close map — but if a plot panel is layered on top, let it handle
  // Escape first (close the plot, keep the map open). We bail without stopping
  // propagation so PlotInfoPanel's own capture-phase handler still fires.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape' || plotOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onClose, plotOpen]);

  const zoomAround = (factor, clientX, clientY) => {
    const el = viewportRef.current;
    if (!el) return;
    const vp = el.getBoundingClientRect();
    const cx = vp.left + vp.width / 2;
    const cy = vp.top + vp.height / 2;
    const z = zoomRef.current;
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (nz === z) return;
    
    // Keep the point under (clientX, clientY) stationary while scaling.
    const ax = (clientX - cx - x.get()) / z;
    const ay = (clientY - cy - y.get()) / z;
    setZoom(nz);
    x.set(clientX - cx - ax * nz);
    y.set(clientY - cy - ay * nz);
  };

  // Native wheel listener: must be non-passive to preventDefault page scroll.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAround(Math.exp(-e.deltaY * 0.0014), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  // Touch pinch-to-zoom — the touch-screen equivalent of the wheel zoom. Built on
  // Pointer Events so it works uniformly across phones, tablets and touch laptops.
  // It uses the SAME centre-anchored transform as zoomAround, driven by the live
  // pinch midpoint, so the spot between your fingers stays put while you scale (and
  // the map follows your fingers, giving natural pan too). The transform is derived
  // from a snapshot taken when the second finger lands, so it's smooth and
  // drift-free regardless of React's commit timing. Browser pinch/scroll is held
  // off by `touch-action: none` on the map (see CSS). Mouse stays on the wheel zoom.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;

    const pointers = new Map(); // pointerId -> { x, y }
    let pinch = null; // { cx, cy, startDist, startZoom, px, py }

    const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

    const beginPinch = () => {
      const [a, b] = [...pointers.values()];
      const vp = el.getBoundingClientRect();
      const cx = vp.left + vp.width / 2;
      const cy = vp.top + vp.height / 2;
      const midX = (a.x + b.x) / 2 - cx;
      const midY = (a.y + b.y) / 2 - cy;
      const z = zoomRef.current;
      pinch = {
        cx,
        cy,
        startDist: gap(a, b),
        startZoom: z,
        // Stage-local point under the pinch centre — kept under the (moving)
        // midpoint for the whole gesture.
        px: (midX - x.get()) / z,
        py: (midY - y.get()) / z,
      };
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse') return; // mouse keeps the wheel zoom
      if (pointers.size === 0) suppressClickRef.current = false;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) beginPinch();
    };

    const onPointerMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pinch || pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const midX = (a.x + b.x) / 2 - pinch.cx;
      const midY = (a.y + b.y) / 2 - pinch.cy;
      const nz = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinch.startZoom * (gap(a, b) / pinch.startDist))
      );
      setZoom(nz);
      x.set(midX - nz * pinch.px);
      y.set(midY - nz * pinch.py);
      // A pinch happened — don't let the trailing click close the map.
      suppressClickRef.current = true;
    };

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
    };
  }, [open, x, y]);

  if (!open) return null;

  const counterScale = { transform: `translate(-50%, -50%) scale(${1 / zoom})` };

  return (
    <div
      ref={viewportRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Site map"
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onClose();
      }}
    >
      {/* The pannable/zoomable stage */}
      <motion.div
        className={styles.stage}
        style={{ x, y, scale: zoom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.mapBox}
          style={{ width: `min(92vw, calc(84vh * ${aspect}))`, aspectRatio: `${SITE_MAP.imageWidth} / ${SITE_MAP.imageHeight}` }}
        >
          <img src={SITE_MAP.url} alt="Township site plan" className={styles.mapImage} draggable={false} />

          {/* Walk connections between scenes */}
          <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none">
            {connectionLines.map((l) => (
              <line
                key={l.key}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(15,77,41,0.4)"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Plot pins — numbered markers */}
          {pins.map(({ plot, u, v, num, status, statusClass }) => (
            <button
              key={plot.id}
              className={`${styles.pin} ${styles[statusClass]}`}
              style={{ left: `${u * 100}%`, top: `${v * 100}%`, ...counterScale }}
              onClick={(e) => {
                e.stopPropagation();
                // Keep the map open underneath — the plot panel layers on top so
                // the visitor can close it and pick another plot from the map.
                onPlotSelect(plot);
              }}
              aria-label={`${plot.name} details`}
            >
              <span className={styles.pinDot}>{num}</span>
              <span className={styles.pinLabel}>{plot.name} · {status}</span>
            </button>
          ))}

          {/* Scene dots — click to walk there. Coloured by road/area (see legend);
              the full name shows on hover and for the active scene. */}
          {scenePoints.map((pos) => {
            const isActive = pos.id === currentSceneId;
            return (
              <button
                key={pos.id}
                className={`${styles.sceneDot} ${isActive ? styles.sceneDotActive : ''}`}
                style={{ left: `${pos.u * 100}%`, top: `${pos.v * 100}%`, ...counterScale }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isActive) onSceneSelect(pos.id);
                }}
                aria-label={isActive ? `${pos.name} (you are here)` : `Walk to ${pos.name}`}
              >
                <span className={styles.sceneDotInner} style={{ background: colorOf(pos.name) }}>
                  {isActive && <span className={styles.sceneDotPulse} />}
                </span>
                <span className={styles.sceneLabel}>
                  {isActive ? `${pos.name} — you are here` : pos.name}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Chrome — stop pointer/clicks from reaching the pan surface */}
      <header className={styles.topBar} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <span className={styles.title}>Site Map</span>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close site map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className={styles.zoomControls} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            const vp = viewportRef.current.getBoundingClientRect();
            zoomAround(1.4, vp.left + vp.width / 2, vp.top + vp.height / 2);
          }}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            const vp = viewportRef.current.getBoundingClientRect();
            zoomAround(1 / 1.4, vp.left + vp.width / 2, vp.top + vp.height / 2);
          }}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            x.set(0);
            y.set(0);
          }}
          aria-label="Reset view"
        >
          ⟳
        </button>
      </div>

      {/* Road / area colour key */}
      <footer className={styles.legend} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        {roadLegend.map((item) => (
          <span className={styles.legendItem} key={item.name}>
            <i className={styles.legendSwatch} style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </footer>
    </div>
  );
}
