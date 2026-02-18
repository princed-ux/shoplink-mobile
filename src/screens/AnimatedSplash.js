import React, { useEffect, useState } from 'react';
import { View, Dimensions, StyleSheet, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing,
  withDelay,
  FadeOut
} from 'react-native-reanimated';
import { ShoppingBag, Tag, CreditCard, Package, Star } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// --- 1. THE FLOATING ICON COMPONENT ---
// Replaces generic bubbles with branded icons that drift, float, and rotate
const FloatingIcon = ({ Icon, color, size, startX, startY, duration, delay }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Vertical Float (Up and Down)
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-50, { duration: duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(50, { duration: duration, easing: Easing.inOut(Easing.quad) })
      ), -1, true
    ));

    // Horizontal Drift (Left and Right - slower to feel like air)
    translateX.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(30, { duration: duration * 1.5, easing: Easing.linear }),
        withTiming(-30, { duration: duration * 1.5, easing: Easing.linear })
      ), -1, true
    ));

    // Slow Rotation
    rotate.value = withRepeat(
        withTiming(360, { duration: duration * 2, easing: Easing.linear }), 
        -1, 
        false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` } // Adds the rotation
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble, // Keep the absolute positioning
        animatedStyle,
        {
          left: startX,
          top: startY,
          opacity: 0.15, // Very subtle watermark effect
        },
      ]}
    >
      {/* Render the Lucide Icon instead of a View */}
      <Icon size={size} color={color} />
    </Animated.View>
  );
};

// --- 2. MAIN SPLASH SCREEN ---
export default function AnimatedSplash({ onFinish }) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate Logo: Pop In -> Pulse
    logoScale.value = withSequence(
        withTiming(1, { duration: 1200, easing: Easing.elastic(1.2) }), // Elastic Pop
        withRepeat(
            withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }), // Slow Breath
            -1, 
            true
        )
    );
    logoOpacity.value = withTiming(1, { duration: 800 });

    // Finish Timer
    const timer = setTimeout(() => {
       if (onFinish) onFinish();
    }, 4500); // Increased slightly to enjoy the animation

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
      opacity: logoOpacity.value,
    };
  });

  return (
    <Animated.View exiting={FadeOut.duration(800)} style={styles.container}>
      
      {/* --- BACKGROUND FLOATING ICONS --- */}
      {/* We use specific icons to reinforce "Shopping" */}
      <FloatingIcon Icon={ShoppingBag} color="#059669" size={80} startX={40} startY={height * 0.2} duration={4000} delay={0} />
      <FloatingIcon Icon={Tag} color="#34d399" size={60} startX={width - 80} startY={height * 0.4} duration={5000} delay={1000} />
      <FloatingIcon Icon={CreditCard} color="#10b981" size={90} startX={width * 0.2} startY={height * 0.7} duration={6000} delay={500} />
      <FloatingIcon Icon={Package} color="#047857" size={50} startX={width * 0.8} startY={height * 0.8} duration={4500} delay={2000} />
      <FloatingIcon Icon={ShoppingBag} color="#6ee7b7" size={120} startX={-20} startY={height * 0.5} duration={7000} delay={1500} />
      
      {/* --- MAIN LOGO --- */}
      <View style={styles.logoContainer}>
         <Animated.Image 
            source={require('../../assets/logo.png')} 
            style={[styles.logo, logoStyle]}
            resizeMode="contain"
         />
         <Animated.Text style={[styles.brandText, logoStyle]}>
            ShopLink.vi
         </Animated.Text>
         <Animated.Text style={[styles.tagline, logoStyle]}>
            Your Store. Everywhere.
         </Animated.Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 10,
    // Deeper shadow for 3D effect
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  brandText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#022c22', 
    letterSpacing: -1, // Tight tracking looks more modern
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669', // Emerald accent
    marginTop: 5,
    letterSpacing: 2, // Wide spacing for tagline
    textTransform: 'uppercase',
  },
  bubble: {
    position: 'absolute',
  }
});