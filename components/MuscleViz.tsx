import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Procedural Texture Generator for Muscle Tissue
const createMuscleTexture = () => {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Base Tissue (Deep Red Gradient)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#450a0a');   // Dark Red
  gradient.addColorStop(0.5, '#7f1d1d'); // Mid Red
  gradient.addColorStop(1, '#450a0a');   // Dark Red
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // 2. Myofibril Strands (Longitudinal noise)
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < size; i += 2) {
      if (Math.random() > 0.6) {
        ctx.fillStyle = `rgba(255, 100, 100, ${Math.random() * 0.15})`;
        ctx.fillRect(i, 0, 1, size);
      }
  }

  // 3. Sarcomere Striations (Transverse Bands)
  ctx.globalCompositeOperation = 'source-over';
  const sarcomereCount = 12; // Number of sarcomere units visible
  const bandHeight = size / sarcomereCount;
  
  for (let i = 0; i < sarcomereCount; i++) {
    const y = i * bandHeight;
    
    // Z-Disc (The dark boundary line)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'black';
    ctx.fillRect(0, y, size, 6);
    ctx.shadowBlur = 0;

    // M-Line (The middle dark line)
    ctx.fillStyle = 'rgba(40, 0, 0, 0.3)';
    ctx.fillRect(0, y + bandHeight/2, size, 4);

    // I-Band (Light region near Z-Disc)
    ctx.fillStyle = 'rgba(255, 200, 200, 0.08)';
    ctx.fillRect(0, y + 6, size, bandHeight * 0.15);
    ctx.fillRect(0, y + bandHeight - (bandHeight * 0.15), size, bandHeight * 0.15);
  }

  // 4. Add some organic noise/imperfections
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1); // Repeat horizontally to cover cylinder
  texture.anisotropy = 16;
  return texture;
};

const MuscleViz: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const container = containerRef.current;
    const scene = new THREE.Scene();
    
    // Camera setup for a dramatic angle
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Tone mapping for better light handling
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Key Light (Warm)
    const keyLight = new THREE.SpotLight(0xffaaee, 20);
    keyLight.position.set(5, 5, 5);
    keyLight.angle = Math.PI / 6;
    keyLight.penumbra = 0.5;
    scene.add(keyLight);

    // Fill Light (Cool)
    const fillLight = new THREE.PointLight(0x6D00FF, 5, 20);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    // Rim Light (Bright Cyan for outline definition)
    const rimLight = new THREE.SpotLight(0x00ffff, 15);
    rimLight.position.set(0, 5, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // --- MUSCLE FIBER ---
    const texture = createMuscleTexture();
    
    // Create a detailed cylinder
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 6.5, 64, 24, true);
    
    // PBR Material for realistic tissue look
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.08,
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.6,
      clearcoat: 0.4,       // Makes it look slightly "wet"
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide
    });

    const muscleFiber = new THREE.Mesh(geometry, material);
    muscleFiber.rotation.z = Math.PI / 2; // Horizontal orientation
    scene.add(muscleFiber);

    // Internal Glow (The core energy)
    const coreGeometry = new THREE.CylinderGeometry(1.1, 1.1, 6.4, 32, 1, true);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x5B0000,
      side: THREE.BackSide // Render inside
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.rotation.z = Math.PI / 2;
    scene.add(core);

    // --- MYOKINES (PARTICLES) ---
    const particleCount = 60;
    const particles: THREE.Mesh[] = [];
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // Myokine Colors: BDNF (Blue), Irisin (Purple), IL-6 (Pink/Red)
    const myokineColors = [0x00d9ff, 0xbd00ff, 0xff0055];
    
    for (let i = 0; i < particleCount; i++) {
      // Use Icosahedron for a "molecular" look
      const pGeo = new THREE.IcosahedronGeometry(0.06, 0);
      const color = myokineColors[Math.floor(Math.random() * myokineColors.length)];
      
      const pMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2, // Glowing
        roughness: 0.2,
        metalness: 0.8
      });
      
      const particle = new THREE.Mesh(pGeo, pMat);
      
      // Initialize random positions around the cylinder
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.4 + Math.random() * 1.5; // Orbiting outside
      const x = (Math.random() - 0.5) * 6; // Along the length
      
      particle.position.set(x, Math.cos(angle) * radius, Math.sin(angle) * radius);
      
      // Store dynamic data
      particle.userData = {
        angle: angle,
        radius: radius,
        speed: 0.01 + Math.random() * 0.02,
        drift: (Math.random() - 0.5) * 0.02,
        bobOffset: Math.random() * Math.PI * 2
      };
      
      particleGroup.add(particle);
      particles.push(particle);
    }

    // --- INTERACTION ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0;
    let targetRotationX = Math.PI / 2;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      
      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.005;
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => isDragging = false;

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // --- ANIMATION ---
    let time = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.015;

      // 1. Muscle "Breathing" (Contraction simulation)
      // Subtle scale change to simulate metabolic activity
      const contraction = Math.sin(time * 2) * 0.02;
      muscleFiber.scale.set(1 + contraction, 1 - contraction, 1 + contraction);

      // 2. Smooth Rotation Damping
      // Interpolate current rotation towards target
      muscleFiber.rotation.y += (targetRotationY - muscleFiber.rotation.y) * 0.1;
      muscleFiber.rotation.x += (targetRotationX - muscleFiber.rotation.x) * 0.1;
      
      // Also rotate the core
      core.rotation.y = muscleFiber.rotation.y;
      core.rotation.x = muscleFiber.rotation.x;

      // Auto-rotate if not interacting
      if (!isDragging) {
        targetRotationY += 0.002;
      }

      // 3. Particle Dynamics
      particles.forEach((p) => {
        const ud = p.userData;
        
        // Spiral motion along the fiber
        ud.angle += ud.speed;
        p.position.x += ud.drift;
        
        // Bobbing motion (in/out breathing)
        const breathingRadius = ud.radius + Math.sin(time * 3 + ud.bobOffset) * 0.1;
        
        // Update position
        p.position.y = Math.cos(ud.angle) * breathingRadius;
        p.position.z = Math.sin(ud.angle) * breathingRadius;
        
        // Reset if out of bounds (recycle particles)
        if (p.position.x > 3.5) p.position.x = -3.5;
        if (p.position.x < -3.5) p.position.x = 3.5;
        
        // Subtle rotation of the molecule itself
        p.rotation.x += 0.02;
        p.rotation.y += 0.02;
      });

      // 4. Group Rotation (Particles follow orbit slightly)
      particleGroup.rotation.x = muscleFiber.rotation.x * 0.5; // Follow somewhat
      
      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      if (texture) texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#111111] border border-white/5 cursor-grab active:cursor-grabbing shadow-inner"
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Live Simulation</span>
         </div>
      </div>
    </div>
  );
};

export default MuscleViz;