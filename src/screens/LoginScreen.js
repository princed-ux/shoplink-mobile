import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Phone, Lock, Eye, EyeOff } from "lucide-react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";
import FallingBackground from "../components/FallingBackground";

const API_URL = "https://api.shoplinkvi.com";

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const getContainerStyle = (fieldName) => [
    styles.inputContainer,
    activeInput === fieldName ? styles.inputActive : styles.inputInactive,
  ];

  const handleLogin = async () => {
    if (!phone || !password) {
      return Toast.show({ type: "error", text1: "Missing fields" });
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/login`, {
        phone,
        password,
      });

      if (Platform.OS === "web") {
        localStorage.setItem("quickshop_user", JSON.stringify(res.data));
      } else {
        await SecureStore.setItemAsync(
          "quickshop_user",
          JSON.stringify(res.data),
        );
      }

      Toast.show({
        type: "success",
        text1: `Welcome ${res.data.vendor.shop_name}!`,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "MainApp" }],
      });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Server Error. Check connection.";
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <FallingBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.centerContainer}>
          {/* HEADER */}
          <View style={styles.headerBox}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>ShopLink.vi</Text>
            <Text style={styles.subtitle}>Manager Portal</Text>
          </View>

          {/* FORM */}
          <View style={styles.formBox}>
            {/* PHONE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={getContainerStyle("loginPhone")}>
                <Phone
                  size={20}
                  color={activeInput === "loginPhone" ? "#10b981" : "#94a3b8"}
                  style={styles.icon}
                />
                <TextInput
                  placeholder="080 1234 5678"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setActiveInput("loginPhone")}
                  onBlur={() => setActiveInput(null)}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#cbd5e1"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  importantForAutofill="yes"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={getContainerStyle("loginPass")}>
                <Lock
                  size={20}
                  color={activeInput === "loginPass" ? "#10b981" : "#94a3b8"}
                  style={styles.icon}
                />
                <TextInput
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setActiveInput("loginPass")}
                  onBlur={() => setActiveInput(null)}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  placeholderTextColor="#cbd5e1"
                  autoComplete="password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#94a3b8" />
                  ) : (
                    <Eye size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.footerText}>
                Don't have a store?{" "}
                <Text style={styles.footerTextBold}>Create One</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  headerBox: {
    alignItems: "center",
    marginBottom: 40,
  },

  logo: {
    width: 90,
    height: 90,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#064e3b",
    marginTop: 16,
  },

  subtitle: {
    color: "#94a3b8",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: 4,
  },

  formBox: {
    gap: 20,
  },

  inputGroup: {
    width: "100%",
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  inputContainer: {
    borderWidth: 2,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 64,
  },

  inputActive: {
    backgroundColor: "#ffffff",
    borderColor: "#10b981",
  },

  inputInactive: {
    backgroundColor: "#f8fafc",
    borderColor: "#f1f5f9",
  },

  icon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontWeight: "bold",
    color: "#0f172a",
    fontSize: 18,
  },

  forgotBtn: {
    alignSelf: "flex-end",
  },

  forgotText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  submitBtn: {
    backgroundColor: "#047857",
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  submitText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
    textTransform: "uppercase",
  },

  footerRow: {
    marginTop: 40,
    alignItems: "center",
  },

  footerText: {
    color: "#64748b",
  },

  footerTextBold: {
    color: "#047857",
    fontWeight: "900",
  },
});
