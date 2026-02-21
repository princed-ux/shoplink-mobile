import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, ShieldCheck, Check, Key, Eye, EyeOff } from 'lucide-react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import FallingBackground from '../components/FallingBackground'; 

const API_URL = 'https://api.shoplinkvi.com'; 

export default function ForgotPasswordScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [activeInput, setActiveInput] = useState(null);
  
  const [phone, setPhone] = useState('');
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);

  const getContainerStyle = (fieldName) => {
      return [styles.inputContainer, activeInput === fieldName ? styles.inputActive : styles.inputInactive];
  };

  const handleFetch = async () => {
      if (!phone) return Toast.show({ type: 'error', text1: 'Enter phone number' });
      setLoading(true);
      try {
          const res = await axios.get(`${API_URL}/api/forgot-password/question/${phone}`);
          setFetchedQuestion(res.data.question);
          setStep(2); 
          Toast.show({ type: 'success', text1: 'Account Found!', text2: 'Please answer the security question.' });
      } catch (err) {
          Toast.show({ type: 'error', text1: 'Account Not Found', text2: 'Check the number and try again.' });
      } finally {
          setLoading(false);
      }
  };

  const handleVerifyAnswer = async () => {
      if (!answer.trim()) return Toast.show({ type: 'error', text1: 'Enter an answer' });
      setLoading(true);
      try {
          await axios.post(`${API_URL}/api/verify-answer`, { phone, answer });
          Toast.show({ type: 'success', text1: 'Correct Answer!', text2: 'Proceeding to reset password...' });
          setTimeout(() => setStep(3), 1000);
      } catch (err) {
          // THIS IS THE ALERT FOR WRONG ANSWER
          Toast.show({ type: 'error', text1: 'Wrong Answer', text2: 'That is not the correct answer.' });
      } finally {
          setLoading(false);
      }
  };

  const handleReset = async () => {
      if (!newPassword || newPassword.length < 6) return Toast.show({ type: 'error', text1: 'Password too short (min 6)' });
      if (newPassword !== confirmPassword) return Toast.show({ type: 'error', text1: 'Passwords do not match' });

      setLoading(true);
      try {
          await axios.post(`${API_URL}/api/reset-password`, { phone, answer, newPassword });
          Toast.show({ type: 'success', text1: 'Password Reset Successful!', text2: 'Please login with your new password.' });
          setTimeout(() => navigation.navigate('Login'), 1500);
      } catch (err) {
          Toast.show({ type: 'error', text1: 'Reset Failed', text2: 'Server error. Try again.' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FallingBackground />
      <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
      </View>

      {/* KeyboardAvoidingView has been completely removed */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {step === 1 && (
              <View style={styles.stepBox}>
                  <View style={styles.iconCircle}><ShieldCheck size={32} color="#64748b" /></View>
                  <Text style={styles.title}>Recovery</Text>
                  <Text style={styles.subtitle}>Enter your registered WhatsApp number to find your account.</Text>
                  
                  <View style={getContainerStyle('recPhone')}>
                      <Phone size={20} color={activeInput === 'recPhone' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                      <TextInput 
                          placeholder="Phone Number" 
                          value={phone} 
                          onChangeText={setPhone}
                          onFocus={() => setActiveInput('recPhone')}
                          onBlur={() => setActiveInput(null)}
                          keyboardType="phone-pad" 
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          
                          // --- AUTOFILL ARMOR ---
                          autoComplete="off"
                          importantForAutofill="no"
                          textContentType="none"
                      />
                  </View>
                  <TouchableOpacity onPress={handleFetch} disabled={loading} style={styles.actionBtn}>
                      {loading ? <ActivityIndicator color="white"/> : <Text style={styles.actionBtnText}>Find Account</Text>}
                  </TouchableOpacity>
              </View>
          )}

          {step === 2 && (
              <View style={styles.stepBox}>
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                      <Text style={styles.backBtnText}>BACK</Text>
                  </TouchableOpacity>

                  <View style={styles.questionBox}>
                      <Text style={styles.questionLabel}>Security Question</Text>
                      <Text style={styles.questionText}>{fetchedQuestion}</Text>
                  </View>
                  
                  <Text style={styles.label}>Your Answer</Text>
                  <View style={getContainerStyle('recAns')}>
                      <TextInput 
                          placeholder="Type answer here..." 
                          value={answer} 
                          onChangeText={setAnswer} 
                          onFocus={() => setActiveInput('recAns')}
                          onBlur={() => setActiveInput(null)}
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          placeholderTextColor="#cbd5e1"
                          
                          // --- AUTOFILL ARMOR ---
                          autoComplete="off"
                          importantForAutofill="no"
                          textContentType="none"
                      />
                  </View>
                  
                  <TouchableOpacity onPress={handleVerifyAnswer} disabled={loading} style={styles.verifyBtn}>
                      {loading ? <ActivityIndicator color="white"/> : <Text style={styles.actionBtnText}>Verify Answer</Text>}
                  </TouchableOpacity>
              </View>
          )}

          {step === 3 && (
              <View style={styles.stepBox}>
                  <View style={styles.iconCircleGreen}><Check size={32} color="#059669" /></View>
                  <Text style={styles.title}>Create New Password</Text>

                  <Text style={[styles.label, { marginTop: 24 }]}>New Password</Text>
                  <View style={[getContainerStyle('recPass'), { marginBottom: 16 }]}>
                      <Key size={20} color={activeInput === 'recPass' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                      <TextInput 
                          placeholder="Min 6 characters" 
                          value={newPassword} 
                          onChangeText={setNewPassword} 
                          onFocus={() => setActiveInput('recPass')}
                          onBlur={() => setActiveInput(null)}
                          secureTextEntry={!showNewPass}
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          
                          // --- AUTOFILL ARMOR ---
                          autoComplete="off"
                          importantForAutofill="no"
                          textContentType="none"
                      />
                      <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                          {showNewPass ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={getContainerStyle('recConfPass')}>
                      <Key size={20} color={activeInput === 'recConfPass' ? "#10b981" : "#94a3b8"} style={styles.icon}/>
                      <TextInput 
                          placeholder="Re-enter password" 
                          value={confirmPassword} 
                          onChangeText={setConfirmPassword} 
                          onFocus={() => setActiveInput('recConfPass')}
                          onBlur={() => setActiveInput(null)}
                          secureTextEntry={!showConfPass}
                          style={Platform.OS === 'web' ? [styles.input, { outlineStyle: 'none' }] : styles.input}
                          
                          // --- AUTOFILL ARMOR ---
                          autoComplete="off"
                          importantForAutofill="no"
                          textContentType="none"
                      />
                      <TouchableOpacity onPress={() => setShowConfPass(!showConfPass)}>
                          {showConfPass ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                      </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={handleReset} disabled={loading} style={styles.actionBtn}>
                      {loading ? <ActivityIndicator color="white"/> : <Text style={styles.actionBtnText}>Reset Password</Text>}
                  </TouchableOpacity>
              </View>
          )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex1: { flex: 1 },
  headerRow: { paddingHorizontal: 24, paddingVertical: 16, alignItems: 'flex-end', zIndex: 10 },
  closeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  closeBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  stepBox: { width: '100%' },
  iconCircle: { width: 64, height: 64, backgroundColor: '#f8fafc', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center' },
  iconCircleGreen: { width: 64, height: 64, backgroundColor: '#d1fae5', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#64748b', textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 },
  label: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputContainer: { borderWidth: 2, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64, marginBottom: 16 },
  inputActive: { backgroundColor: '#ffffff', borderColor: '#10b981', shadowColor: '#d1fae5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  inputInactive: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
  icon: { marginRight: 12 },
  input: { flex: 1, fontWeight: 'bold', color: '#0f172a', fontSize: 18 },
  actionBtn: { backgroundColor: '#0f172a', height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  actionBtnText: { color: '#ffffff', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  verifyBtn: { backgroundColor: '#059669', height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 24 },
  backBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  questionBox: { backgroundColor: '#ecfdf5', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#d1fae5', marginBottom: 32 },
  questionLabel: { fontSize: 12, color: '#059669', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  questionText: { fontSize: 20, fontWeight: '900', color: '#064e3b', lineHeight: 28 }
});