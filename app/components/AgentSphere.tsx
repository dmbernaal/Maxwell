'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend, ReactThreeFiber } from '@react-three/fiber';
import { Sphere, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AgentState } from '../types';

// --- GLSL SHADERS ---

const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uNoiseStrength;
  uniform float uDisplacement;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDisplacement;
  varying vec3 vViewPosition;

  // Simplex 3D Noise 
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; 
    vec3 x3 = x0 - D.yyy;      

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857; 
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );   

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    float noise = snoise(position * uNoiseStrength + uTime * uSpeed);
    vDisplacement = noise;
    
    vec3 newPosition = position + normal * noise * uDisplacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDisplacement;
  varying vec3 vViewPosition;

  void main() {
    float mixFactor = smoothstep(-1.0, 1.0, vDisplacement);
    
    // Premium Lighting Model
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(-0.5, 1.0, 1.0)); 
    
    // Soft Diffuse
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    
    // Fresnel
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    
    vec3 baseColor = mix(uColorA, uColorB, mixFactor);
    vec3 finalColor = baseColor * (diffuse * 0.8 + 0.2); 
    
    finalColor += uColorB * specular * 0.4;
    finalColor += uColorB * fresnel * 0.5;
    
    // Soft edges alpha
    float alpha = smoothstep(0.0, 0.2, dot(viewDir, normal));
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Atmosphere Shader (Soft Glow)
const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  void main() {
    // Balanced glow: Power 2.0 for soft falloff, Intensity 0.7 for visibility
    float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(uColor, 1.0) * intensity * 0.7;
  }
`;

const AgentMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 0.1, // Match relaxed state
    uNoiseStrength: 0.2, // Match relaxed state
    uDisplacement: 0.1, // Match relaxed state
    uColorA: new THREE.Color('#7c3aed'), // Violet 600
    uColorB: new THREE.Color('#c4b5fd'), // Violet 300
  },
  vertexShader,
  fragmentShader
);

const AtmosphereMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#8b5cf6'), // Violet 500
  },
  atmosphereVertexShader,
  atmosphereFragmentShader
);

extend({ AgentMaterial, AtmosphereMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      agentMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof AgentMaterial>;
      atmosphereMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof AtmosphereMaterial>;
    }
  }
}

interface AgentSphereProps {
  state: AgentState;
  isActive?: boolean;
}

const AgentMesh = ({ state, isActive = false }: AgentSphereProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const atmosphereRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  const targetScale = isActive ? 0.6 : 1.5;
  
  const targets = useMemo(() => {
    switch (state) {
      case 'relaxed':
        return {
          speed: 0.1,
          noiseStrength: 0.2,
          displacement: 0.1,
          colorA: '#7c3aed', // Violet 600
          colorB: '#c4b5fd', // Violet 300
          intensity: 1.0
        };
      case 'thinking':
        return {
          speed: 0.3,
          noiseStrength: 0.8,
          displacement: 0.2,
          colorA: '#7c3aed', // Brighter violet
          colorB: '#c4b5fd', // Soft violet
          intensity: 1.5
        };
      case 'orchestrating':
        return {
          speed: 0.5,
          noiseStrength: 1.5,
          displacement: 0.5,
          colorA: '#0891b2', // Brighter cyan (was near-black slate)
          colorB: '#67e8f9', // Light cyan
          intensity: 2.0
        };
      case 'synthesizing':
        return {
          speed: 1.0,
          noiseStrength: 0.5,
          displacement: 0.1,
          colorA: '#0ea5e9', // Sky blue
          colorB: '#bae6fd', // Light sky
          intensity: 2.5
        };
      case 'complete':
        return {
          speed: 0.1,
          noiseStrength: 0.1,
          displacement: 0.05,
          colorA: '#4f46e5', // Indigo 600
          colorB: '#a5b4fc', // Indigo 300
          intensity: 1.2
        };
    }
  }, [state]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const currentScale = meshRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 3.0);
      meshRef.current.scale.setScalar(newScale);
    }
    
    // Animate Main Sphere
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      
      const lerpFactor = delta * 2.0;
      
      materialRef.current.uniforms.uSpeed.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uSpeed.value, targets.speed, lerpFactor);
      materialRef.current.uniforms.uNoiseStrength.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uNoiseStrength.value, targets.noiseStrength, lerpFactor);
      materialRef.current.uniforms.uDisplacement.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uDisplacement.value, targets.displacement, lerpFactor);
      
      if (materialRef.current.uniforms.uColorA.value instanceof THREE.Color) {
         materialRef.current.uniforms.uColorA.value.lerp(new THREE.Color(targets.colorA), lerpFactor);
      }
      if (materialRef.current.uniforms.uColorB.value instanceof THREE.Color) {
         materialRef.current.uniforms.uColorB.value.lerp(new THREE.Color(targets.colorB), lerpFactor);
      }
    }

    // Animate Atmosphere
    if (atmosphereRef.current) {
      if (atmosphereRef.current.uniforms.uColor.value instanceof THREE.Color) {
        atmosphereRef.current.uniforms.uColor.value.lerp(new THREE.Color(targets.colorB), delta * 2.0);
      }
    }
  });

  return (
    <group ref={meshRef} scale={1.2}>
      {/* Main Sphere */}
      <Sphere args={[1, 128, 128]}>
        {/* @ts-ignore */}
        <agentMaterial ref={materialRef} transparent side={THREE.DoubleSide} />
      </Sphere>

      {/* Atmosphere Glow (Backside for soft edge) */}
      <Sphere args={[1.2, 64, 64]}>
        {/* @ts-ignore */}
        <atmosphereMaterial 
          ref={atmosphereRef} 
          transparent 
          side={THREE.BackSide} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>
    </group>
  );
};

export default function AgentSphere({ state, isActive = false }: AgentSphereProps) {
  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 4.5] }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <AgentMesh state={state} isActive={isActive} />
      </Canvas>
    </div>
  );
}
