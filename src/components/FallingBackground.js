import React, { useState, useEffect } from 'react';
import { View, Animated, Easing, Dimensions } from 'react-native';
import { ShoppingBag, Gift, Tag, Package, Star } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function FallingBackground() {
  const [icons] = useState(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      Icon: [ShoppingBag, Gift, Tag, Package, Star][Math.floor(Math.random() * 5)],
      anim: new Animated.Value(-50), 
      left: Math.random() * width,
      size: 15 + Math.random() * 20,
      duration: 6000 + Math.random() * 4000,
      delay: Math.random() * 2000
    }))
  );

  useEffect(() => {
    icons.forEach(icon => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(icon.delay),
          Animated.timing(icon.anim, {
            toValue: height + 50,
            duration: icon.duration,
            easing: Easing.linear,
            useNativeDriver: true
          })
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
      {icons.map((item) => (
        <Animated.View 
          key={item.id} 
          style={{ position: 'absolute', left: item.left, transform: [{ translateY: item.anim }], opacity: 0.05 }}
        >
          <item.Icon size={item.size} color="#059669" />
        </Animated.View>
      ))}
    </View>
  );
}