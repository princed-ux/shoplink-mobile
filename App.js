import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createStackNavigator,
  CardStyleInterpolators,
} from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { LayoutDashboard, ShoppingBag, Settings } from "lucide-react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";

// Import the Animation
import AnimatedSplash from "./src/screens/AnimatedSplash";

// --- AUTH SCREENS ---
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";

// --- MAIN SCREENS ---
import DashboardScreen from "./src/screens/DashboardScreen";
import ProductManager from "./src/screens/ProductManager";
import BrandingScreen from "./src/screens/BrandingScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// --- MAIN APP TABS ---
function AppTabs() {
  const [needsSecurityUpdate, setNeedsSecurityUpdate] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkSecurityStatus = async () => {
      try {
        let userStr =
          Platform.OS === "web"
            ? localStorage.getItem("quickshop_user")
            : await SecureStore.getItemAsync("quickshop_user");

        if (userStr) {
          const userData = JSON.parse(userStr);
          setNeedsSecurityUpdate(!userData.vendor?.security_question);
        }
      } catch (e) {
        console.error("Tab Check Error:", e);
      }
    };

    checkSecurityStatus();
    const intervalId = setInterval(checkSecurityStatus, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // THE FIX: We dynamically grab the system button height (insets.bottom) and add 16px so it floats!
  const floatingBottomMargin = insets.bottom > 0 ? insets.bottom + 16 : 24;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        safeAreaInsets: { bottom: 0 }, // <--- DO NOT SKIP THIS! Keeps icons perfectly centered inside the 78px bar
        tabBarStyle: {
          position: "absolute",
          bottom: floatingBottomMargin,
          left: 20,
          right: 20,
          backgroundColor: "#ffffff",
          borderRadius: 32,
          height: 78,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 8, // <--- Your clean optimization!
        },
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "900",
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={ProductManager}
        options={{
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={BrandingScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              <Settings size={24} color={color} />

              {needsSecurityUpdate && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    backgroundColor: "#ef4444",
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: "#ffffff",
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- ROOT APP COMPONENT ---
export default function App() {
  const [isShowSplash, setIsShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Login");

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        let user;
        if (Platform.OS === "web")
          user = localStorage.getItem("quickshop_user");
        else user = await SecureStore.getItemAsync("quickshop_user");

        if (user) setInitialRoute("MainApp");
        else setInitialRoute("Login");
      } catch (e) {
        console.error("Auth Check Failed", e);
      }
    };
    checkLoginStatus();
  }, []);

  if (isShowSplash)
    return <AnimatedSplash onFinish={() => setIsShowSplash(false)} />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen name="MainApp" component={AppTabs} />
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
