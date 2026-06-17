'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import BuilderMode from './BuilderMode';
import BrandMark from './BrandMark';
import PlotMarkers from './PlotMarkers';
import { TRANSITION_MS } from '../hooks/useSceneNavigation';
import styles from '../styles/PanoramaViewer.module.css';

// Google-Street-View-style forward travel. During a jump the camera glides FORWARD
// along the view axis into the scene you're leaving (DOLLY_PUSH); on arrival it starts
// slightly back and glides forward into the new scene (DOLLY_BACK). Pure translation
// along the direction you're already looking, so it reads as moving forward — never as
// turning. (Sphere radius is 500, so these are gentle, ~16% off-centre offsets.)
const DOLLY_PUSH = 82;
const DOLLY_BACK = 82;

// How long the incoming panorama takes to fade in over the outgoing one (seconds).
// Must finish before TRANSITION_MS so the swap at the cut is invisible.
const CROSSFADE_S = 0.75;

/* -------------------------------------------------------
   Depth / parallax (the "Matterport" feel)

   A plain panorama sphere has every pixel at the same radius, so dollying the
   camera forward scales the whole image uniformly — your eye reads that as a
   ZOOM, not as walking. Real depth needs near pixels to sweep past faster than
   far ones (parallax). We get that by displacing the sphere's vertices along
   their own ray — direction is untouched, only the distance changes.

   IMPORTANT: because only the radius changes (never the ray direction), the view
   from the camera CENTRE (origin) is pixel-identical to the old plain sphere.
   Calibration (yawOffset, hotspots, plot triangulation) is angle-based and stays
   exactly valid. Parallax only appears once the camera leaves the origin, i.e.
   during the navigation dolly — which is precisely when you want it.

   Two tiers, same shader:
   • Tier A (always on): GROUND-PLANE projection. The lower hemisphere is bent
     onto a flat floor EYE_HEIGHT below the camera, so the ground flows past your
     feet as you step forward. No extra assets, no per-pixel data, ~zero cost.
   • Tier B (opt-in): per-pixel DEPTH MAP. Supply a grayscale depth image per
     panorama and every object gets true parallax. Inert until DEPTH_ENABLED and
     a scene actually has a depthUrl. See scripts/depth_infer.py.
   ------------------------------------------------------- */

// Denser than the old 64×32 so the floor bend reads smooth, not faceted. ~12k
// verts — trivial for the GPU; the vertex displacement itself is a few maths ops.
const PANO_SEGMENTS_W = 128;
const PANO_SEGMENTS_H = 96;

// Camera height above the virtual floor, in sphere-radius units (radius is 500,
// a forward step is ~82). SMALLER = stronger ground parallax (more "walking");
// LARGER = flatter, back toward a plain sphere. Pure feel knob — safe to tune.
const EYE_HEIGHT = 150;

// Tier B master switch. Leave false until you've generated depth maps into
// public/panoramas/depth/ (see scripts/depth_infer.py). When false the depth
// branch is dormant and you get pure ground-plane projection.
const DEPTH_ENABLED = true;
const DEPTH_STRENGTH = 1.0; // 0 = ignore depth map, 1 = full displacement

/* Build a meshBasicMaterial whose vertices are displaced for depth. We patch the
   stock material via onBeforeCompile (rather than a from-scratch ShaderMaterial)
   so three's colour management, sRGB, UV transform and BackSide handling stay
   byte-for-byte identical to before — we ONLY add a vertex displacement. */
function buildPanoramaMaterial(extra = {}) {
  const mat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    ...extra,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEyeHeight = { value: EYE_HEIGHT };
    shader.uniforms.uDepthMap = { value: null };
    shader.uniforms.uHasDepth = { value: 0 };
    shader.uniforms.uDepthStrength = { value: DEPTH_STRENGTH };
    shader.vertexShader =
      'uniform float uEyeHeight;\n' +
      'uniform sampler2D uDepthMap;\n' +
      'uniform float uHasDepth;\n' +
      'uniform float uDepthStrength;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float r0 = length(position);     // original sphere radius (500 or 490)
          vec3 dir = position / r0;        // unchanged ray direction
          float r = r0;
          // --- Tier A: ground-plane projection ---
          // Below the horizon, place the pixel on a flat floor uEyeHeight down.
          // At the horizon (dir.y→0) this stays ~r0 (identical to a plain sphere);
          // looking straight down it tightens to uEyeHeight. A forward dolly then
          // makes the near floor slide past fast and the far floor slowly = depth.
          if (dir.y < -0.001) {
            r = min(r, uEyeHeight / (-dir.y));
          }
          // --- Tier B: per-pixel depth map (dormant unless supplied) ---
          if (uHasDepth > 0.5) {
            float d = clamp(texture2D(uDepthMap, uv).r, 0.0, 1.0); // 1=near, 0=far
            float depthRadius = mix(r0, uEyeHeight, d);
            r = mix(r, depthRadius, uDepthStrength);
          }
          transformed = dir * r;
        }`
      );
    mat.userData.shader = shader; // keep a handle so depth maps can stream in later
  };
  return mat;
}

/* Depth maps are plain grayscale data, not colour — no sRGB, linear sampling. */
const depthCache = new Map();
function loadDepthTexture(url) {
  if (depthCache.has(url)) return depthCache.get(url);
  const p = new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        resolve(t);
      },
      undefined,
      reject
    );
  });
  depthCache.set(url, p);
  return p;
}

/* -------------------------------------------------------
   Shared panorama texture cache (GPU-side LRU)

   Both the current sphere and the incoming transition sphere read through this
   cache, so when a transition ends and `currentScene` flips to the destination,
   the texture is already decoded and uploaded — the swap renders the very same
   frame with zero flash. Small LRU keeps GPU memory bounded (8K panos are big).
   ------------------------------------------------------- */
const MAX_CACHED_TEXTURES = 4;
const textureCache = new Map(); // url -> { texture, promise }

function loadPanoramaTexture(url) {
  const hit = textureCache.get(url);
  if (hit) {
    // Refresh LRU position
    textureCache.delete(url);
    textureCache.set(url, hit);
    return hit.promise;
  }

  const entry = {};
  entry.promise = new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        entry.texture = texture;
        resolve(texture);
      },
      undefined,
      (err) => {
        textureCache.delete(url);
        reject(err);
      }
    );
  });
  textureCache.set(url, entry);

  while (textureCache.size > MAX_CACHED_TEXTURES) {
    const [oldestUrl, oldest] = textureCache.entries().next().value;
    textureCache.delete(oldestUrl);
    if (oldest.texture) oldest.texture.dispose();
  }

  return entry.promise;
}

function peekPanoramaTexture(url) {
  const hit = textureCache.get(url);
  if (hit?.texture) {
    textureCache.delete(url);
    textureCache.set(url, hit);
    return hit.texture;
  }
  return null;
}

/* -------------------------------------------------------
   Panorama Sphere — renders equirectangular image inside
   ------------------------------------------------------- */
function PanoramaSphere({ imageUrl, depthUrl, onLoaded, baseRadius = 500 }) {
  // Pick up an already-cached texture synchronously so the scene swap at the end
  // of a transition renders the new panorama on the very same frame as the cut.
  const cachedTexture = useMemo(() => peekPanoramaTexture(imageUrl), [imageUrl]);
  const [loaded, setLoaded] = useState(null); // { url, texture } once async load lands
  const texture = cachedTexture || (loaded?.url === imageUrl ? loaded.texture : null);
  const [depthTexture, setDepthTexture] = useState(null);

  // Build the displacement material WITH its map already set, so it compiles with
  // USE_MAP/USE_UV defined (the depth branch samples `uv`). Rebuilt per texture.
  const material = useMemo(
    () => (texture ? buildPanoramaMaterial({ map: texture }) : null),
    [texture]
  );
  useEffect(() => () => material?.dispose(), [material]);

  useEffect(() => {
    let alive = true;
    loadPanoramaTexture(imageUrl)
      .then((tex) => {
        if (!alive) return;
        setLoaded({ url: imageUrl, texture: tex });
        if (onLoaded) onLoaded(imageUrl);
      })
      .catch((err) => console.error('Failed to load panorama:', err));
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  // Tier B: stream in the depth map when one exists, else stay on ground-plane only.
  useEffect(() => {
    if (!DEPTH_ENABLED || !depthUrl) {
      setDepthTexture(null);
      return;
    }
    let alive = true;
    loadDepthTexture(depthUrl)
      .then((t) => alive && setDepthTexture(t))
      .catch(() => { }); // missing depth map → silently keep ground-plane depth
    return () => {
      alive = false;
    };
  }, [depthUrl]);

  // Feed the depth map into the (already compiled) shader uniforms.
  useEffect(() => {
    const sh = material?.userData.shader;
    if (!sh) return;
    sh.uniforms.uDepthMap.value = depthTexture || null;
    sh.uniforms.uHasDepth.value = depthTexture ? 1 : 0;
  }, [depthTexture, material]);

  if (!texture || !material) return null;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[baseRadius, PANO_SEGMENTS_W, PANO_SEGMENTS_H]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/* -------------------------------------------------------
   Incoming Sphere — the Matterport-style walk transition

   While a jump is in flight the destination panorama fades IN over the current
   one as the camera glides forward, instead of dipping to black. Two tricks make
   the eventual hard cut (scene swap + camera angle snap) invisible:

   1. The sphere is pre-rotated about Y by (departureYaw − arrivalYaw), so what
      you see through the departing camera is pixel-identical to what the new
      scene will show once the camera snaps to its arrival angle.
   2. The sphere is pushed forward to where the camera's travel ENDS, offset by
      DOLLY_PUSH + DOLLY_BACK along the travel axis. At the cut the camera sits
      DOLLY_PUSH ahead of origin, i.e. DOLLY_BACK behind the incoming sphere's
      centre — exactly where the arrival glide resumes from. Travelling toward an
      off-centre sphere also adds genuine parallax: the destination grows as you
      walk into it, which is what sells the movement.
   ------------------------------------------------------- */
function IncomingSphere({ imageUrl, depthUrl, departureYaw, arrivalYaw, baseRadius = 490 }) {
  const fadeStart = useRef(null);
  const [texture, setTexture] = useState(() => peekPanoramaTexture(imageUrl));
  const [depthTexture, setDepthTexture] = useState(null);

  // Same depth displacement as the resting sphere, so the floor keeps flowing
  // through the cut instead of popping flat. Opacity is animated by mutating the
  // material directly (it's transparent + depthTest off, drawn over the current scene).
  const material = useMemo(
    () =>
      texture
        ? buildPanoramaMaterial({ map: texture, transparent: true, opacity: 0, depthTest: false })
        : null,
    [texture]
  );
  useEffect(() => () => material?.dispose(), [material]);

  useEffect(() => {
    let alive = true;
    loadPanoramaTexture(imageUrl)
      .then((tex) => alive && setTexture(tex))
      .catch((err) => console.error('Failed to load panorama:', err));
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!DEPTH_ENABLED || !depthUrl) {
      setDepthTexture(null);
      return;
    }
    let alive = true;
    loadDepthTexture(depthUrl)
      .then((t) => alive && setDepthTexture(t))
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [depthUrl]);

  useEffect(() => {
    const sh = material?.userData.shader;
    if (!sh) return;
    sh.uniforms.uDepthMap.value = depthTexture || null;
    sh.uniforms.uHasDepth.value = depthTexture ? 1 : 0;
  }, [depthTexture, material]);

  // Departure/arrival yaws are fixed for the lifetime of one transition.
  const { rotationY, offset } = useMemo(() => {
    const travel = DOLLY_PUSH + DOLLY_BACK;
    return {
      rotationY: departureYaw - arrivalYaw,
      offset: [-Math.sin(departureYaw) * travel, 0, -Math.cos(departureYaw) * travel],
    };
  }, [departureYaw, arrivalYaw]);

  useFrame(({ clock }) => {
    if (!material) return;
    if (fadeStart.current === null) fadeStart.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - fadeStart.current) / CROSSFADE_S);
    // easeInOutCubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    material.opacity = eased;
  });

  if (!texture || !material) return null;

  return (
    <group position={offset} rotation={[0, rotationY, 0]}>
      <mesh scale={[-1, 1, 1]} renderOrder={1}>
        <sphereGeometry args={[baseRadius, PANO_SEGMENTS_W, PANO_SEGMENTS_H]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

function easeInQuad(t) {
  return t * t;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* -------------------------------------------------------
   Panorama Camera Controls — drag to look around
   ------------------------------------------------------- */
function PanoramaControls({ initialYaw = 0, isWarping = false, lockInput = false, panToYaw = null, sceneId, cameraYawRef }) {
  const { camera, gl } = useThree();
  const isPointerDown = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, initialYaw, 0, 'YXZ'));
  const targetEuler = useRef(new THREE.Euler(0, initialYaw, 0, 'YXZ'));
  const targetFov = useRef(75);
  const initialYawRef = useRef(initialYaw);
  const hasMounted = useRef(false);
  const dollyRef = useRef(0); // signed forward offset along the view axis (travel)
  const warpStartRef = useRef(null); // clock time the outgoing push began
  const settleStartRef = useRef(null); // clock time the arrival glide began
  const pinchRef = useRef(null); // active two-finger pinch-zoom snapshot

  initialYawRef.current = initialYaw;

  // Auto-pan: the walk orchestrator asks the camera to face the travel direction
  // before a hop. Just move the drag target — the smoothing lerp does the turn.
  useEffect(() => {
    if (panToYaw !== null) {
      targetEuler.current.y = panToYaw;
      targetEuler.current.x = 0; // level out for the walk
    }
  }, [panToYaw]);

  // Snap orientation ONLY when the scene actually changes (mount + arrival cut),
  // not on every initialYaw change. Setting targetYaw at click time also changes
  // initialYaw while the scene is unchanged — snapping there would teleport the
  // camera mid-walk. The cut itself is invisible because the incoming sphere was
  // rendered pre-rotated to match exactly this snapped angle (see IncomingSphere).
  useEffect(() => {
    euler.current.y = initialYawRef.current;
    targetEuler.current.y = initialYawRef.current;
    euler.current.x = 0;
    targetEuler.current.x = 0;
    // Resume the arrival half of the travel: pulled slightly BACK, gliding forward.
    // Continuous with the outgoing push because the incoming sphere is offset by
    // the full travel distance.
    dollyRef.current = -DOLLY_BACK;
    if (!hasMounted.current) {
      hasMounted.current = true;
      camera.fov = 75;
      camera.updateProjectionMatrix();
    }
  }, [sceneId, camera]);

  // During a jump: narrow FOV slightly (sense of rushing forward), level the
  // pitch so the pitch reset at the cut has already happened on screen, and
  // freeze any residual auto-pan so the heading captured for the incoming
  // sphere stays exact through the cut.
  useEffect(() => {
    targetFov.current = isWarping ? 64 : 75;
    if (isWarping) {
      targetEuler.current.x = 0;
      targetEuler.current.y = euler.current.y;
    }
  }, [isWarping]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      if (lockInput) return;
      isPointerDown.current = true;
      previousPointer.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
      canvas.style.cursor = 'grab';
    };

    const onPointerMove = (e) => {
      if (!isPointerDown.current || lockInput) return;

      const dx = e.clientX - previousPointer.current.x;
      const dy = e.clientY - previousPointer.current.y;

      targetEuler.current.y -= dx * 0.003;
      targetEuler.current.x -= dy * 0.003;

      targetEuler.current.x = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, targetEuler.current.x)
      );

      previousPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onWheel = (e) => {
      if (lockInput) return;
      targetFov.current = Math.max(30, Math.min(90, targetFov.current + e.deltaY * 0.05));
    };

    const touchGap = (touches) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      ) || 1;

    const onTouchStart = (e) => {
      if (lockInput) return;
      if (e.touches.length === 1) {
        isPointerDown.current = true;
        previousPointer.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        // Two fingers → pinch-zoom (FOV). Suspend look-drag for the gesture.
        isPointerDown.current = false;
        pinchRef.current = { startGap: touchGap(e.touches), startFov: targetFov.current };
      }
    };

    const onTouchMove = (e) => {
      if (lockInput) return;

      // Pinch-to-zoom: fingers apart → zoom in (narrow FOV), together → zoom out.
      // Same 30–90° FOV range as the desktop wheel zoom.
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const ratio = pinchRef.current.startGap / touchGap(e.touches);
        targetFov.current = Math.max(30, Math.min(90, pinchRef.current.startFov * ratio));
        return;
      }

      if (!isPointerDown.current || e.touches.length !== 1) return;
      e.preventDefault();

      const dx = e.touches[0].clientX - previousPointer.current.x;
      const dy = e.touches[0].clientY - previousPointer.current.y;

      targetEuler.current.y -= dx * 0.003;
      targetEuler.current.x -= dy * 0.003;
      targetEuler.current.x = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, targetEuler.current.x)
      );

      previousPointer.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const onTouchEnd = (e) => {
      // End the pinch once fewer than two fingers remain.
      if (e.touches.length < 2) pinchRef.current = null;
      // If one finger is still down (lifted one of a pinch), resume look-drag from
      // its current spot so the view doesn't jump; otherwise stop dragging.
      if (e.touches.length === 1 && !lockInput) {
        isPointerDown.current = true;
        previousPointer.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 0) {
        isPointerDown.current = false;
      }
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, lockInput]);

  useFrame((state) => {
    // Yaw is never changed mid-jump — only smoothed toward the drag/auto-pan
    // target (and snapped to the arrival angle at the invisible cut). Pitch eases
    // level during a jump so the post-cut reset is seamless.
    euler.current.x += (targetEuler.current.x - euler.current.x) * 0.15;
    euler.current.y += (targetEuler.current.y - euler.current.y) * 0.15;
    camera.rotation.set(euler.current.x, euler.current.y, 0, 'YXZ');

    // Publish live yaw for the minimap facing cone (no React re-render)
    if (cameraYawRef) cameraYawRef.current = euler.current.y;

    // Forward travel dolly, time-based so the cut is exactly continuous:
    // accelerate out of the old scene (easeIn, reaching DOLLY_PUSH precisely when
    // the cut fires) and decelerate into the new one (easeOut from -DOLLY_BACK) —
    // one smooth accelerate→decelerate stride across the cut. Movement is along
    // the level view axis, so it always reads as walking forward, never turning.
    const now = state.clock.elapsedTime;
    if (isWarping) {
      if (warpStartRef.current === null) {
        warpStartRef.current = now;
        settleStartRef.current = null;
      }
      const p = Math.min(1, (now - warpStartRef.current) / (TRANSITION_MS / 1000));
      dollyRef.current = DOLLY_PUSH * easeInQuad(p);
    } else {
      warpStartRef.current = null;
      if (dollyRef.current < -0.5) {
        if (settleStartRef.current === null) settleStartRef.current = now;
        const q = Math.min(1, (now - settleStartRef.current) / 0.7);
        dollyRef.current = -DOLLY_BACK * (1 - easeOutCubic(q));
      } else {
        dollyRef.current = 0;
        settleStartRef.current = null;
      }
    }
    const fy = euler.current.y;
    camera.position.set(-Math.sin(fy) * dollyRef.current, 0, -Math.cos(fy) * dollyRef.current);

    if (Math.abs(camera.fov - targetFov.current) > 0.1) {
      // Narrow faster (snap into walk), ease out slower (settling into new scene)
      camera.fov += (targetFov.current - camera.fov) * (isWarping ? 0.1 : 0.06);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* -------------------------------------------------------
   Navigation Hotspot in Panorama
   ------------------------------------------------------- */
function PanoramaHotspot({ targetScene, currentScene, onClick, baseYawOffset, explicitYaw, explicitPitch }) {
  const [hovered, setHovered] = useState(false);

  let position;
  let visualAngle;
  const isDive = currentScene.type === 'aerial' && targetScene.type === 'ground';

  if (explicitYaw !== undefined && explicitPitch !== undefined) {
    // Manual hotspot placement
    const distance = 80;

    // In Three.js, camera looks down -Z. With euler rotation Y,
    // X = -sin(Y), Z = -cos(Y). Since our sphere is scaled [-1, 1, 1], X is flipped visually.
    // However, if we just place the object in the same parent coordinate space, we use standard math.
    // We will place it at the exact spherical coordinates.
    position = [
      -Math.sin(explicitYaw) * distance * Math.cos(explicitPitch),
      Math.sin(explicitPitch) * distance,
      -Math.cos(explicitYaw) * distance * Math.cos(explicitPitch)
    ];
    visualAngle = explicitYaw;
  } else {
    // Automatic math fallback
    let dx = targetScene.position[0] - currentScene.position[0];
    let dz = targetScene.position[2] - currentScene.position[2];

    let angle = Math.atan2(dx, dz);
    visualAngle = angle - baseYawOffset;

    const distance = isDive ? 150 : 80;
    position = [
      Math.sin(visualAngle) * distance,
      isDive ? -80 : -20,
      Math.cos(visualAngle) * distance
    ];
  }

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(targetScene.id);
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
      {isDive ? (
        // Dive marker (vertical pin)
        <group>
          <mesh position={[0, 10, 0]}>
            <coneGeometry args={[3, 6, 4]} />
            <meshBasicMaterial color={'#84c341'} opacity={0.8} transparent />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4, 6, 32]} />
            <meshBasicMaterial color={'#84c341'} opacity={0.4} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : explicitPitch !== undefined ? (
        // Manual hotspot (Billboard facing camera)
        <group rotation={[0, 0, 0]} scale={[0.5, 0.5, 0.5]} ref={(ref) => {
          if (ref) ref.lookAt(0, 0, 0); // Camera is at origin
        }}>
          <mesh>
            <circleGeometry args={[4, 32]} />
            <meshBasicMaterial color={'#84c341'} transparent opacity={hovered ? 0.8 : 0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1, 0.1]}>
            <shapeGeometry args={[
              new THREE.Shape()
                .moveTo(-2, -1)
                .lineTo(0, 2)
                .lineTo(2, -1)
                .lineTo(0, 0)
            ]} />
            <meshBasicMaterial color={hovered ? '#fff' : '#eee'} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : (
        // Google Street View style Chevron (flat on ground for automatic hotspots)
        <group rotation={[-Math.PI / 2, 0, -visualAngle + Math.PI]} scale={[0.5, 0.5, 0.5]}>
          <mesh>
            <circleGeometry args={[4, 32]} />
            <meshBasicMaterial color={'#84c341'} transparent opacity={hovered ? 0.6 : 0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1, 0.1]}>
            <shapeGeometry args={[
              new THREE.Shape()
                .moveTo(-2, -1)
                .lineTo(0, 2)
                .lineTo(2, -1)
                .lineTo(0, 0)
            ]} />
            <meshBasicMaterial color={hovered ? '#fff' : '#eee'} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* -------------------------------------------------------
   Main PanoramaViewer Component
   ------------------------------------------------------- */
export default function PanoramaViewer({
  currentScene,
  incomingScene,
  adjacentScenes,
  onNavigate,
  onBack,
  targetYaw,
  isTransitioning,
  isWalking = false,
  panYaw = null,
  cameraYawRef,
  activePlot,
  onPlotSelect
}) {
  // Which panorama URL has finished loading. Deriving isLoaded from this (instead
  // of a boolean that one effect sets and another resets) makes it immune to
  // effect/microtask ordering — production React interleaves them differently
  // than dev, and a reset racing the texture callback left the loader stuck.
  const [loadedUrl, setLoadedUrl] = useState(null);
  const isLoaded = loadedUrl === currentScene.panoramaUrl;
  const [showDragHint, setShowDragHint] = useState(false);

  // Plot tags sit at their TRUE distance from the camera, so the arrival glide
  // (camera travelling forward while settling) would visibly sweep them around.
  // Mount them only after the glide has finished — they scale in Matterport-style.
  const [showPlotTags, setShowPlotTags] = useState(false);
  useEffect(() => {
    if (isTransitioning || isWalking) {
      setShowPlotTags(false);
      return;
    }
    const timer = setTimeout(() => setShowPlotTags(true), 850);
    return () => clearTimeout(timer);
  }, [isTransitioning, isWalking, currentScene.id]);

  // Freeze the camera yaw at the moment a transition begins — the incoming sphere
  // needs the DEPARTURE yaw, and cameraYawRef keeps updating after the cut.
  const departureYawRef = useRef(null);
  if (isTransitioning && incomingScene && departureYawRef.current === null) {
    departureYawRef.current = cameraYawRef.current;
  }
  useEffect(() => {
    if (!isTransitioning) departureYawRef.current = null;
  }, [isTransitioning]);

  const handleLoaded = useCallback((url) => {
    setLoadedUrl(url);
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      setShowDragHint(false);
    }
  }, [currentScene.id, isTransitioning]);

  // Close any open plot panel when walking to another scene is already handled by WalkthroughPage
  // However, we don't have to duplicate it here if handled there.

  useEffect(() => {
    if (isLoaded && !isTransitioning) {
      setShowDragHint(true);
      const timer = setTimeout(() => setShowDragHint(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isTransitioning]);

  // Preload adjacent panoramas while idle so transitions pull from browser cache
  useEffect(() => {
    if (isTransitioning) return;
    for (const adj of adjacentScenes) {
      if (adj.targetScene?.panoramaUrl) {
        const img = new Image();
        img.src = adj.targetScene.panoramaUrl;
      }
    }
  }, [currentScene.id, isTransitioning, adjacentScenes]);

  // targetYaw carries the ARRIVAL camera euler.y for the destination scene (from
  // getArrivalYaw at click time). The camera holds its heading during the walk and
  // snaps to this angle at the cut — invisible, because the incoming sphere faded
  // in pre-rotated to make both framings pixel-identical.
  const initialYaw = targetYaw !== null ? targetYaw : (currentScene.yawOffset || 0);
  const arrivalYaw = targetYaw !== null ? targetYaw : (incomingScene?.yawOffset || 0);

  return (
    <div className={styles.container}>
      {/* Soft edge vignette during travel — adds speed, never blacks out the view */}
      <div className={`${styles.walkVignette} ${isTransitioning ? styles.walkVignetteActive : ''}`} />

      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0.1] }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        dpr={[1, 1.5]}
      >
        {/* The current scene sphere */}
        <PanoramaSphere
          imageUrl={currentScene.panoramaUrl}
          depthUrl={currentScene.depthUrl}
          onLoaded={handleLoaded}
          baseRadius={500}
        />

        {/* The destination sphere — fades in over the current one during a walk */}
        {isTransitioning && incomingScene && (
          <IncomingSphere
            key={incomingScene.id}
            imageUrl={incomingScene.panoramaUrl}
            depthUrl={incomingScene.depthUrl}
            departureYaw={departureYawRef.current ?? cameraYawRef.current}
            arrivalYaw={arrivalYaw}
          />
        )}

        <PanoramaControls
          initialYaw={initialYaw}
          isWarping={isTransitioning}
          lockInput={isWalking || isTransitioning}
          panToYaw={panYaw}
          sceneId={currentScene.id}
          cameraYawRef={cameraYawRef}
        />
        {process.env.NODE_ENV !== 'production' && <BuilderMode currentScene={currentScene} />}

        {/* Hide hotspots for the whole walk (all hops), not just per-transition */}
        {!isWalking && !isTransitioning && adjacentScenes.map((adj) => (
          <PanoramaHotspot
            key={adj.targetScene.id}
            targetScene={adj.targetScene}
            currentScene={currentScene}
            explicitYaw={adj.yaw}
            explicitPitch={adj.pitch}
            onClick={(id) => onNavigate(id)}
            baseYawOffset={currentScene.yawOffset}
          />
        ))}

        {/* Plot tags — same plots resolve to the right angle in every scene */}
        {showPlotTags && (
          <PlotMarkers
            sceneId={currentScene.id}
            activePlotId={activePlot?.id}
            onSelect={onPlotSelect}
          />
        )}
      </Canvas>

      {!isLoaded && !isTransitioning && (
        <div className={styles.panoLoading}>
          <div className={styles.panoLoadingSpinner} />
          <p>Loading...</p>
        </div>
      )}

      <div className={styles.brandLock}>
        <BrandMark size="sm" />
      </div>

      <div className={styles.sceneInfo}>
        <div className={styles.sceneInfoBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{currentScene.name}</span>
        </div>
      </div>

      <button className={styles.backButton} onClick={onBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        <span>Home</span>
      </button>

      {showDragHint && (
        <div className={styles.dragHint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 9l-3 3 3 3" />
            <path d="M19 9l3 3-3 3" />
            <path d="M9 5l3-3 3 3" />
            <path d="M9 19l3 3 3-3" />
          </svg>
          <span>Drag to look around</span>
        </div>
      )}
    </div>
  );
}
