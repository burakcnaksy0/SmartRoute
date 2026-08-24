import React, { useRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';

// INFO: In Expo SDK 53+, Expo Go no longer supports ExpoGL natively.
// @react-three/fiber requires ExpoGL. To use the 3D Canvas, you must use a development build (npx expo run:android or run:ios).
// For Expo Go compatibility, we use the custom branding logo as a fallback icon.

/*
import { Canvas, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

const SpinningCompass = () => {
  const outerRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.8;
      outerRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 1.2;
      innerRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={outerRef}>
        <torusGeometry args={[1.5, 0.15, 16, 100]} />
        <meshStandardMaterial color="#06B6D4" wireframe />
      </mesh>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#3B82F6" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};
*/

export const ThreeDCompass = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40, 
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  }
});
