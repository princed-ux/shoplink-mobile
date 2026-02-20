import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, Image, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import FallingBackground from '../components/FallingBackground'; // Adjust path if needed

const API_URL = 'https://api.shoplinkvi.com'; 

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const getContainerStyle = (fieldName) => {
      return [styles.inputContainer, activeInput === fieldName ? styles.inputActive : styles.inputInactive];
  };

  const handleLogin = async () => {
    if (!phone || !password) return Toast.show({ type: 'error', text1: 'Missing fields' });
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/login`, { phone, password });
      if (Platform.OS === 'web') localStorage.setItem('quickshop_user', JSON.stringify(res.data));
      else await SecureStore.setItemAsync('quickshop_user', JSON.stringify(res.data));
      
      Toast.show({ type: 'success', text1: `Welcome ${res.data.vendor.shop_name}!` });
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] }); // Adjust route name if needed
    } catch (err) {
      const msg = err.response?.data?.message || "Server Error. Check connection.";
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FallingBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex1}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerBox}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>ShopLink.vi</Text>
            <Text style={styles.subtitle}>Manager Portal</Text>
          </View>

          <View style={styles.formBox}>
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={getContainerStyle('loginPhone')}>
                      <Phone size={20} color={activeInput === 'loginPhone' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                      <TextInput 
                          placeholder="080 1234 5678" 
                          value={phone} 
                          onChangeText={setPhone} 
                          onFocus={() => setActiveInput('loginPhone')}
                          onBlur={() => setActiveInput(null)}
                          keyboardType="phone-pad"
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          placeholderTextColor="#cbd5e1"
                      />
                  </View>
              </View>

              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={getContainerStyle('loginPass')}>
                      <Lock size={20} color={activeInput === 'loginPass' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                      <TextInput 
                          placeholder="••••••••" 
                          value={password} 
                          onChangeText={setPassword}
                          onFocus={() => setActiveInput('loginPass')}
                          onBlur={() => setActiveInput(null)}
                          secureTextEntry={!showPassword}
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          placeholderTextColor="#cbd5e1"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                      </TouchableOpacity>
                  </View>
              </View>
              
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.submitBtn}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Sign In</Text>}
              </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.footerText}>Don't have a store? <Text style={styles.footerTextBold}>Create One</Text></Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', position: 'relative' },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  headerBox: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logo: { width: 90, height: 90 },
  title: { fontSize: 30, fontWeight: '900', color: '#064e3b', marginTop: 16, letterSpacing: -0.5 },
  subtitle: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  formBox: { width: '100%', gap: 20 },
  inputGroup: { width: '100%' },
  label: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputContainer: { borderWidth: 2, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64 },
  inputActive: { backgroundColor: '#ffffff', borderColor: '#10b981', shadowColor: '#d1fae5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  inputInactive: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
  icon: { marginRight: 12 },
  input: { flex: 1, fontWeight: 'bold', color: '#0f172a', fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: '#059669', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  submitBtn: { backgroundColor: '#047857', height: 64, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  submitText: { color: '#ffffff', fontWeight: '900', fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 },
  footerRow: { marginTop: 40, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  footerText: { color: '#64748b', fontWeight: '500' },
  footerTextBold: { color: '#047857', fontWeight: '900' }
});