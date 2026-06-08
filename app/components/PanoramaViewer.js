'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import BuilderMode from './BuilderMode';
import BrandMark from './BrandMark';
import { getArrivalYaw } from '../data/scenes';
import styles from '../styles/PanoramaViewer.module.css';

// Cache decoded textures so the scene handoff at the end of a transition is instant
// (the incoming sphere has already fetched the destination image).
THREE.Cache.enabled = true;

/* -------------------------------------------------------
   Panorama Sphere — renders equirectangular image inside
   ------------------------------------------------------- */
function PanoramaSphere({ imageUrl, onLoaded, baseRadius = 500 }) {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.mapping = THREE.EquirectangularReflectionMapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
        if (onLoaded) onLoaded();
      },
      undefined,
      (err) => console.error('Failed to load panorama:', err)
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [imageUrl]);

  if (!texture) return null;

  // A single static sphere. Scene changes are hidden behind the transition fade
  // (see the dim overlay in the main component), so there's no crossfade, dolly, or
  // rotation here — the angle change to the next scene happens while the screen is
  // covered, which is what makes the jump look like a straight step forward.
  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[baseRadius, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/* -------------------------------------------------------
   Panorama Camera Controls — drag to look around
   ------------------------------------------------------- */
function PanoramaControls({ initialYaw = 0, isWarping = false, warpTargetYaw = null, sceneId, cameraYawRef }) {
  const { camera, gl } = useThree();
  const isPointerDown = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, initialYaw, 0, 'YXZ'));
  const targetEuler = useRef(new THREE.Euler(0, initialYaw, 0, 'YXZ'));
  const targetFov = useRef(75);
  const warpTargetYawRef = useRef(warpTargetYaw);
  const initialYawRef = useRef(initialYaw);
  const hasMounted = useRef(false);

  // Keep latest props in refs so useFrame / the snap effect read current values.
  warpTargetYawRef.current = warpTargetYaw;
  initialYawRef.current = initialYaw;

  // Snap orientation ONLY when the scene actually changes (mount + arrival cut),
  // not on every initialYaw change. Setting targetYaw at click time also changes
  // initialYaw while the scene is unchanged — snapping there would teleport the
  // camera to the hotspot instead of letting the warp pan walk toward it.
  // Hard-reset FOV only on first mount; afterwards let it ease back naturally.
  useEffect(() => {
    euler.current.y = initialYawRef.current;
    targetEuler.current.y = initialYawRef.current;
    euler.current.x = 0;
    targetEuler.current.x = 0;
    if (!hasMounted.current) {
      hasMounted.current = true;
      camera.fov = 75;
      camera.updateProjectionMatrix();
    }
  }, [sceneId, camera]);

  // FOV: narrow on warp-out, ease back to normal on arrival (no hard snap)
  useEffect(() => {
    targetFov.current = isWarping ? 48 : 75;
  }, [isWarping]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      if (isWarping) return;
      isPointerDown.current = true;
      previousPointer.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
      canvas.style.cursor = 'grab';
    };

    const onPointerMove = (e) => {
      if (!isPointerDown.current || isWarping) return;

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
      if (isWarping) return;
      targetFov.current = Math.max(30, Math.min(90, targetFov.current + e.deltaY * 0.05));
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1 && !isWarping) {
        isPointerDown.current = true;
        previousPointer.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const onTouchMove = (e) => {
      if (!isPointerDown.current || e.touches.length !== 1 || isWarping) return;
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

    const onTouchEnd = () => {
      isPointerDown.current = false;
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
  }, [gl, isWarping]);

  useFrame(() => {
    // During warp: pan camera toward the hotspot direction so it feels like
    // leaning forward into the destination before the scene cuts.
    if (isWarping && warpTargetYawRef.current !== null) {
      // Always take the shortest angular path (avoid spinning 300° the wrong way)
      let diff = warpTargetYawRef.current - targetEuler.current.y;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      targetEuler.current.y += diff * 0.07;
      targetEuler.current.x += (0 - targetEuler.current.x) * 0.07; // level pitch while walking
    }

    euler.current.x += (targetEuler.current.x - euler.current.x) * 0.15;
    euler.current.y += (targetEuler.current.y - euler.current.y) * 0.15;
    camera.rotation.set(euler.current.x, euler.current.y, 0, 'YXZ');

    // Publish live yaw for the minimap facing cone (no React re-render)
    if (cameraYawRef) cameraYawRef.current = euler.current.y;

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
            <meshBasicMaterial color={'#8b8d57'} opacity={0.8} transparent />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4, 6, 32]} />
            <meshBasicMaterial color={'#8b8d57'} opacity={0.4} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : explicitPitch !== undefined ? (
        // Manual hotspot (Billboard facing camera)
        <group rotation={[0, 0, 0]} scale={[0.5, 0.5, 0.5]} ref={(ref) => {
          if (ref) ref.lookAt(0, 0, 0); // Camera is at origin
        }}>
          <mesh>
            <circleGeometry args={[4, 32]} />
            <meshBasicMaterial color={'#8b8d57'} transparent opacity={hovered ? 0.8 : 0.5} side={THREE.DoubleSide} />
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
            <meshBasicMaterial color={'#8b8d57'} transparent opacity={hovered ? 0.6 : 0.3} side={THREE.DoubleSide} />
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
  cameraYawRef
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);

  const handleLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      setIsLoaded(false);
      setShowDragHint(false);
    }
  }, [currentScene.id, isTransitioning]);

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
  // getArrivalYaw at click time). The camera is held still during the transition and
  // only snaps to this angle at the cut — and the cut happens while the dim fade
  // covers the screen, so the angle change is never visible. The view simply fades
  // out facing forward and fades back in facing the same way in the next scene.
  const initialYaw = targetYaw !== null ? targetYaw : (currentScene.yawOffset || 0);
  const warpYaw = null; // never pan during a transition — hold the view perfectly still

  return (
    <div className={styles.container}>
      {/* Transition fade: a quick dark dip that hides the scene swap + camera snap */}
      <div className={`${styles.walkVignette} ${isTransitioning ? styles.walkVignetteActive : ''}`} />

      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0.1] }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        dpr={[1, 1.5]}
      >
        {/* The current scene — a single sphere; scene swaps happen behind the fade */}
        <PanoramaSphere
          imageUrl={currentScene.panoramaUrl}
          onLoaded={handleLoaded}
          baseRadius={500}
        />

        <PanoramaControls
          initialYaw={initialYaw}
          isWarping={isTransitioning}
          warpTargetYaw={warpYaw}
          sceneId={currentScene.id}
          cameraYawRef={cameraYawRef}
        />
        {process.env.NODE_ENV !== 'production' && <BuilderMode currentScene={currentScene} />}

        {/* Only show hotspots when not transitioning */}
        {!isTransitioning && adjacentScenes.map((adj) => (
          <PanoramaHotspot
            key={adj.targetScene.id}
            targetScene={adj.targetScene}
            currentScene={currentScene}
            explicitYaw={adj.yaw}
            explicitPitch={adj.pitch}
            onClick={(id) => onNavigate(id, getArrivalYaw(currentScene.id, id, cameraYawRef.current))}
            baseYawOffset={currentScene.yawOffset}
          />
        ))}
      </Canvas>

      {!isLoaded && !isTransitioning && (
        <div className={styles.panoLoading}>
          <div className={styles.panoLoadingSpinner} />
          <p>Loading panorama...</p>
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
