"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box, Environment } from "@react-three/drei";
import * as THREE from "three";

function AnimatedBox() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the box
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.01;
      // Float effect
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <Box ref={meshRef} args={[2, 2, 2]} castShadow receiveShadow>
      <meshStandardMaterial
        color="#E99500"
        metalness={0.8}
        roughness={0.2}
        emissive="#E99500"
        emissiveIntensity={0.3}
      />
    </Box>
  );
}

export default function FloatingBox() {
  return (
    <div className="w-full h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333]">
      <Canvas
        shadows
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          castShadow
          color="#E99500"
        />
        <spotLight
          position={[-10, -10, -10]}
          angle={0.15}
          penumbra={1}
          intensity={0.5}
          color="#ffffff"
        />
        <pointLight position={[0, 0, 5]} intensity={0.5} color="#E99500" />

        <AnimatedBox />

        <Environment preset="city" />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
