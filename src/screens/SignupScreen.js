import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Platform, Image, KeyboardAvoidingView, ScrollView, Modal, StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Store, Link as LinkIcon, Phone, Lock, Eye, EyeOff, 
  ShieldCheck, Check, AlertCircle, ChevronDown, X, ArrowRight
} from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import FallingBackground from '../components/FallingBackground'; 

const API_URL = 'https://api.shoplinkvi.com'; 

const SECURITY_QUESTIONS = [
  "What was the very first item you sold?",
  "What is the street name of your first store?",
  "What is the name of your favorite supplier?",
  "What year did you start your business?",
  "What is your mother's maiden name?", 
  "What is the name of your first pet?"
];

export default function SignupScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [activeInput, setActiveInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Form State
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState('idle'); // idle, checking, available, taken
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  const getContainerStyle = (fieldName) => {
      return [styles.inputContainer, activeInput === fieldName ? styles.inputActive : styles.inputInactive];
  };

  // --- AUTO SLUG GENERATOR ---
  useEffect(() => {
    if (shopName) {
      const generated = shopName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setSlug(generated);
    } else {
      setSlug('');
      setSlugStatus('idle');
    }
  }, [shopName]);

  // --- SLUG AVAILABILITY CHECKER ---
  useEffect(() => {
    if (!slug) {
        setSlugStatus('idle');
        return;
    }
    setSlugStatus('checking');
    const delay = setTimeout(async () => {
        try {
            await axios.get(`${API_URL}/api/check-slug/${slug}`);
            setSlugStatus('available');
        } catch (err) {
            setSlugStatus('taken');
        }
    }, 500); // 500ms debounce
    return () => clearTimeout(delay);
  }, [slug]);

  // --- HANDLERS ---
  const handleNextStep = async () => {
    if (!shopName || !slug || !phone || !password) return Toast.show({ type: 'error', text1: 'Please fill all fields' });
    if (slugStatus === 'taken') return Toast.show({ type: 'error', text1: 'Store Link Taken', text2: 'Please modify your shop name slightly.' });
    if (slugStatus === 'checking') return Toast.show({ type: 'info', text1: 'Checking Link Availability...' });
    if (password.length < 6) return Toast.show({ type: 'error', text1: 'Password too short (min 6 chars)' });

    setLoading(true);
    try {
        // --- PHONE NUMBER CHECK ---
        await axios.get(`${API_URL}/api/check-phone/${phone}`);
        
        // If successful, proceed to step 2
        setStep(2);
    } catch (err) {
        if (err.response && err.response.status === 409) {
            Toast.show({ type: 'error', text1: 'Phone Number Taken', text2: 'This number is already registered. Please Sign In.' });
        } else {
            Toast.show({ type: 'error', text1: 'Connection Error', text2: 'Unable to verify phone number.' });
        }
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (isSkipping = false) => {
    if (!isSkipping && !securityAnswer.trim()) return Toast.show({ type: 'error', text1: 'Security answer required' });
    
    setLoading(true);
    
    // If skipping, send empty security fields to backend
    const payload = { 
        shopName, 
        slug, 
        phone, 
        password, 
        securityQuestion: isSkipping ? "" : securityQuestion, 
        securityAnswer: isSkipping ? "" : securityAnswer 
    };

    try {
      const res = await axios.post(`${API_URL}/api/register`, payload);
      
      if (Platform.OS === 'web') localStorage.setItem('quickshop_user', JSON.stringify(res.data));
      else await SecureStore.setItemAsync('quickshop_user', JSON.stringify(res.data));
      
      Toast.show({ type: 'success', text1: `Welcome ${res.data.vendor.shop_name}!` });
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (err) {
      const msg = err.response?.data?.message || "Server Error. Check connection.";
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. ADDED edges={['top', 'left', 'right']} TO STOP THE BOTTOM INSET JUMPING
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FallingBackground />
      
      {/* 2. KEYBOARD AVOIDING VIEW IS COMPLETELY DELETED HERE */}

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        
        <View style={styles.headerBox}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>ShopLink.vi</Text>
          <Text style={styles.subtitle}>Start Your Business</Text>
        </View>

        <View style={styles.formBox}>
            
            {/* STEP 1: BASIC INFO */}
            {step === 1 && (
                <View style={styles.stepContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Shop Name</Text>
                        <View style={getContainerStyle('shopName')}>
                            <Store size={20} color={activeInput === 'shopName' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                            <TextInput 
                                placeholder="e.g. My Awesome Store" 
                                value={shopName} 
                                onChangeText={setShopName} 
                                onFocus={() => setActiveInput('shopName')}
                                onBlur={() => setActiveInput(null)}
                                style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                                placeholderTextColor="#cbd5e1"
                                
                                // --- AUTOFILL ARMOR ---
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Your Unique Link</Text>
                        <View style={getContainerStyle('slug')}>
                            <LinkIcon size={20} color={activeInput === 'slug' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                            <Text style={styles.prefixText}>shop.vi/</Text>
                            <TextInput 
                                placeholder="my-store" 
                                value={slug} 
                                onChangeText={(text) => setSlug(text.toLowerCase().replace(/[^a-z0-9]/g, ''))} 
                                onFocus={() => setActiveInput('slug')}
                                onBlur={() => setActiveInput(null)}
                                autoCapitalize="none"
                                style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                                placeholderTextColor="#cbd5e1"
                                
                                // --- AUTOFILL ARMOR ---
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                            {slugStatus === 'checking' && <ActivityIndicator size="small" color="#94a3b8" />}
                            {slugStatus === 'available' && <Check size={20} color="#10b981" />}
                            {slugStatus === 'taken' && <AlertCircle size={20} color="#ef4444" />}
                        </View>
                        {slugStatus === 'taken' && <Text style={styles.errorText}>This link is already taken.</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>WhatsApp Number</Text>
                        <View style={getContainerStyle('phone')}>
                            <Phone size={20} color={activeInput === 'phone' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                            <TextInput 
                                placeholder="080 1234 5678" 
                                value={phone} 
                                onChangeText={setPhone} 
                                onFocus={() => setActiveInput('phone')}
                                onBlur={() => setActiveInput(null)}
                                keyboardType="phone-pad"
                                style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                                placeholderTextColor="#cbd5e1"
                                
                                // --- AUTOFILL ARMOR ---
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={getContainerStyle('password')}>
                            <Lock size={20} color={activeInput === 'password' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                            <TextInput 
                                placeholder="••••••••" 
                                value={password} 
                                onChangeText={setPassword}
                                onFocus={() => setActiveInput('password')}
                                onBlur={() => setActiveInput(null)}
                                secureTextEntry={!showPassword}
                                style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                                placeholderTextColor="#cbd5e1"
                                
                                // --- AUTOFILL ARMOR ---
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity onPress={handleNextStep} disabled={loading} style={styles.submitBtn}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Continue</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* STEP 2: SECURITY QUESTION */}
            {step === 2 && (
                <View style={styles.stepContainer}>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>BACK</Text>
                    </TouchableOpacity>

                    <View style={styles.securityHeader}>
                        <View style={styles.iconCircle}><ShieldCheck size={32} color="#059669" /></View>
                        <Text style={styles.securityTitle}>Secure Your Account</Text>
                        <Text style={styles.securitySub}>This helps you recover your password if you ever forget it.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Select a Question</Text>
                        <TouchableOpacity onPress={() => setShowQuestionModal(true)} style={styles.questionSelector}>
                            <Text style={styles.questionSelectorText} numberOfLines={1}>{securityQuestion}</Text>
                            <ChevronDown size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Your Answer</Text>
                        <View style={getContainerStyle('secAnswer')}>
                            <TextInput 
                                placeholder="Type your answer here..." 
                                value={securityAnswer} 
                                onChangeText={setSecurityAnswer} 
                                onFocus={() => setActiveInput('secAnswer')}
                                onBlur={() => setActiveInput(null)}
                                style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                                placeholderTextColor="#cbd5e1"
                                
                                // --- AUTOFILL ARMOR ---
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => handleRegister(false)} disabled={loading} style={styles.submitBtn}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Complete Registration</Text>}
                    </TouchableOpacity>

                    {/* --- SKIP BUTTON --- */}
                    <TouchableOpacity onPress={() => handleRegister(true)} disabled={loading} style={styles.skipBtn}>
                        <Text style={styles.skipBtnText}>Skip for now</Text>
                    </TouchableOpacity>
                </View>
            )}

        </View>

        {step === 1 && (
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerText}>Already have a store? <Text style={styles.footerTextBold}>Sign In</Text></Text>
              </TouchableOpacity>
            </View>
        )}

      </ScrollView>

      {/* --- QUESTION PICKER MODAL --- */}
      <Modal visible={showQuestionModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Question</Text>
                      <TouchableOpacity onPress={() => setShowQuestionModal(false)} style={styles.closeBtn}>
                          <X size={20} color="#64748b" />
                      </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.modalList}>
                      {SECURITY_QUESTIONS.map((q, i) => (
                          <TouchableOpacity 
                              key={i} 
                              style={[styles.modalItem, securityQuestion === q && styles.modalItemActive]}
                              onPress={() => { setSecurityQuestion(q); setShowQuestionModal(false); }}
                          >
                              <Text style={[styles.modalItemText, securityQuestion === q && styles.modalItemTextActive]}>{q}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', position: 'relative' },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 100, paddingBottom: 40 },
  headerBox: { alignItems: 'center', marginBottom: 32, marginTop: 24 },
  logo: { width: 80, height: 80 },
  title: { fontSize: 28, fontWeight: '900', color: '#064e3b', marginTop: 12, letterSpacing: -0.5 },
  subtitle: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  
  formBox: { width: '100%' },
  stepContainer: { gap: 20 },
  inputGroup: { width: '100%' },
  label: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  
  inputContainer: { borderWidth: 2, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64 },
  inputActive: { backgroundColor: '#ffffff', borderColor: '#10b981', shadowColor: '#d1fae5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  inputInactive: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
  
  icon: { marginRight: 12 },
  input: { flex: 1, fontWeight: 'bold', color: '#0f172a', fontSize: 16 },
  prefixText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 16, marginRight: 2 },
  errorText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold', marginTop: 4, marginLeft: 4 },
  
  submitBtn: { backgroundColor: '#047857', height: 64, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  submitText: { color: '#ffffff', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  
  skipBtn: { alignItems: 'center', paddingVertical: 16 },
  skipBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  footerRow: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  footerText: { color: '#64748b', fontWeight: '500' },
  footerTextBold: { color: '#047857', fontWeight: '900' },

  // Step 2 Specifics
  backBtn: { alignSelf: 'flex-start', marginBottom: 8, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backBtnText: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  securityHeader: { alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 64, height: 64, backgroundColor: '#ecfdf5', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  securityTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  securitySub: { color: '#64748b', textAlign: 'center', paddingHorizontal: 16 },
  
  questionSelector: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 16, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  questionSelectorText: { flex: 1, color: '#0f172a', fontWeight: 'bold', fontSize: 14, marginRight: 8 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 },
  modalList: { padding: 16 },
  modalItem: { padding: 16, borderRadius: 16, marginBottom: 8, backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#10b981' },
  modalItemText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  modalItemTextActive: { color: '#047857', fontWeight: '900' }
});