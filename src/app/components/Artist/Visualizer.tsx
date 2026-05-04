"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Visualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.05);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(10, 5, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffff, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 2, 50);
    magentaLight.position.set(-5, 5, 5);
    scene.add(magentaLight);

    const gridHelper = new THREE.GridHelper(40, 40, 0x00ffff, 0x222222);
    scene.add(gridHelper);

    const cubes: THREE.Mesh[] = [];
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    for (let i = 0; i < 60; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
        emissive: Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 8,
        (Math.random() - 0.5) * 20,
      );
      scene.add(cube);
      cubes.push(cube);
    }

    let frame = 0;
    let frameId = 0;
    const animate = () => {
      frame += 0.01;
      frameId = requestAnimationFrame(animate);

      camera.position.x = Math.cos(frame * 0.2) * 15;
      camera.position.z = Math.sin(frame * 0.2) * 15;
      camera.lookAt(0, 0, 0);

      cubes.forEach((cube, i) => {
        cube.position.y += Math.sin(frame + i) * 0.02;
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        const scale = 1 + Math.sin(frame * 3 + i) * 0.6;
        cube.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      cubes.forEach((cube) => {
        cube.geometry.dispose();
        (cube.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[350px] rounded-xl overflow-hidden border border-cyan-500/50 relative shadow-[0_0_40px_rgba(6,182,212,0.3)] bg-black"
    >
      <div className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400 z-10 pointer-events-none drop-shadow-[0_0_5px_rgba(6,182,212,1)]">
        RENDER_ENGINE_ACTIVE // SECTOR_3D
      </div>
      <div className="absolute bottom-3 right-3 text-[8px] font-bold uppercase tracking-widest text-fuchsia-500 z-10 pointer-events-none opacity-50">
        AUTO_ORBIT_ENABLED
      </div>
    </div>
  );
}
