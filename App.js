import './global.css'; 
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { LayoutDashboard, ShoppingBag, Settings } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Import the Animation
import AnimatedSplash from './src/screens/AnimatedSplash';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductManager from './src/screens/ProductManager';
import BrandingScreen from './src/screens/BrandingScreen'; 

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// --- MAIN APP TABS ---
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' }
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} /> }} />
      <Tab.Screen name="Inventory" component={ProductManager} options={{ tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} /> }} />
      <Tab.Screen name="Settings" component={BrandingScreen} options={{ tabBarIcon: ({ color }) => <Settings size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}

// --- ROOT APP COMPONENT ---
export default function App() {
  const [isShowSplash, setIsShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Login");

  // --- CHECK LOGIN STATUS WHILE SPLASH PLAYS ---
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        let user;
        if (Platform.OS === 'web') {
          user = localStorage.getItem('quickshop_user');
        } else {
          user = await SecureStore.getItemAsync('quickshop_user');
        }

        if (user) {
          console.log("User found, auto-login...");
          setInitialRoute("MainApp"); // Go straight to Dashboard
        } else {
          console.log("No user found, go to Login.");
          setInitialRoute("Login");
        }
      } catch (e) {
        console.error("Auth Check Failed", e);
      }
    };

    checkLoginStatus();
  }, []);

  // 1. Show Animated Splash First
  if (isShowSplash) {
    return (
      <AnimatedSplash onFinish={() => setIsShowSplash(false)} />
    );
  }

  // 2. Once Splash finishes, show the App (starting at the correct screen)
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator 
            initialRouteName={initialRoute} // <--- MAGIC HAPPENS HERE
            screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainApp" component={AppTabs} />
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}