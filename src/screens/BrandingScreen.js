import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, 
  ActivityIndicator, Platform, Linking, Modal, Animated, StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { Camera, LogOut, Save, User, ShieldCheck, Lock, Globe, AlertCircle, Check, X } from 'lucide-react-native';

// Import our shared background!
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

export default function BrandingScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Branding State
  const [shopName, setShopName] = useState('');
  const [logo, setLogo] = useState(null);

  // Security State
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [secLoading, setSecLoading] = useState(false);

  // Logout State (NEW)
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Pulse Animation for the Red Dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  // Make the red dot breathe/pulse if security is missing
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  const loadUserData = async () => {
    try {
      let jsonValue = Platform.OS === 'web' 
        ? localStorage.getItem('quickshop_user') 
        : await SecureStore.getItemAsync('quickshop_user');

      if (jsonValue) {
        const userData = JSON.parse(jsonValue);
        setUser(userData);
        setShopName(userData.vendor?.shop_name || userData.vendor?.shopName || '');
        setLogo(userData.vendor?.logo_url || userData.vendor?.logo || null);
        if(userData.vendor?.security_question) setSecurityQuestion(userData.vendor.security_question);
      }
    } catch (e) {
      console.error("Failed to load user", e);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setLogo(result.assets[0].uri);
  };

  const handleUpdateProfile = async () => {
    if (!shopName) return Toast.show({ type: 'error', text1: 'Shop Name is required' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('shopName', shopName);

      if (logo && logo !== (user?.vendor?.logo_url || user?.vendor?.logo)) {
         if (Platform.OS === 'web') {
           const res = await fetch(logo);
           const blob = await res.blob();
           formData.append('logo', blob, 'logo.jpg');
         } else {
           formData.append('logo', { uri: logo, name: 'logo.jpg', type: 'image/jpeg' });
         }
      }

      const res = await axios.put(`${API_URL}/api/vendor/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': user.token }
      });

      const updatedUser = { ...user, vendor: res.data.vendor };
      
      if (Platform.OS === 'web') localStorage.setItem('quickshop_user', JSON.stringify(updatedUser));
      else await SecureStore.setItemAsync('quickshop_user', JSON.stringify(updatedUser));

      Toast.show({ type: 'success', text1: 'Profile Updated!' });
      setUser(updatedUser);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async () => {
    if (!securityAnswer.trim()) return Toast.show({ type: 'error', text1: 'Answer required' });
    setSecLoading(true);
    
    try {
      await axios.put(`${API_URL}/api/vendor/security`, 
        { question: securityQuestion, answer: securityAnswer }, 
        { headers: { 'Authorization': user.token } }
      );
      
      const updatedUser = { ...user, vendor: { ...user.vendor, security_question: securityQuestion } };
      setUser(updatedUser);
      
      if (Platform.OS === 'web') localStorage.setItem('quickshop_user', JSON.stringify(updatedUser));
      else await SecureStore.setItemAsync('quickshop_user', JSON.stringify(updatedUser));

      Toast.show({ type: 'success', text1: 'Account Protected! 🔐' });
      setSecurityModalVisible(false);
      setSecurityAnswer('');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update security' });
    } finally {
      setSecLoading(false);
    }
  };

  const openLiveStore = () => {
    if (user?.vendor?.slug) {
      const url = `https://shoplinkvi.com/shop.vi/${user.vendor.slug}`;
      Linking.openURL(url);
    } else {
      Toast.show({ type: 'error', text1: 'Shop not found' });
    }
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false); // Close the modal first
    if (Platform.OS === 'web') localStorage.removeItem('quickshop_user');
    else await SecureStore.deleteItemAsync('quickshop_user');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const hasSecurityQuestion = !!user?.vendor?.security_question;

  return (
    // 1. ADDED edges TO PREVENT THE BOTTOM BOUNCE BUG
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FallingBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.pageTitle}>Settings</Text>

        {/* --- SECTION 1: LIVE STORE PREVIEW --- */}
        <TouchableOpacity onPress={openLiveStore} style={styles.liveStoreCard}>
          <View>
             <Text style={styles.liveStoreLabel}>Public Storefront</Text>
             <Text style={styles.liveStoreTitle}>View Live Shop</Text>
          </View>
          <View style={styles.liveStoreIconBox}>
             <Globe size={24} color="white" />
          </View>
        </TouchableOpacity>

        {/* --- SECTION 2: BRANDING --- */}
        <View style={styles.brandingCard}>
          <View style={styles.cardHeader}>
            <User size={24} color="#3b82f6" style={{ marginRight: 12 }} />
            <Text style={styles.cardTitle}>Store Branding</Text>
          </View>

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                   <Camera size={32} color="#94a3b8" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                 <Camera size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Shop Name</Text>
          <TextInput 
            value={shopName}
            onChangeText={setShopName}
            style={Platform.OS === 'web' ? [styles.textInput, { outlineStyle: 'none' }] : styles.textInput}
            placeholder="Enter Shop Name"
            placeholderTextColor="#cbd5e1"

            // --- THE ARMOR ---
            autoComplete="off"
            importantForAutofill="no"
            textContentType="none"
          />

          <TouchableOpacity onPress={handleUpdateProfile} disabled={loading} style={styles.saveBtn}>
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Save size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Branding</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* --- SECTION 3: ACCOUNT & SECURITY --- */}
        <View style={[styles.securityCard, !hasSecurityQuestion ? styles.securityCardWarning : styles.securityCardSafe]}>
           <View style={styles.securityHeaderRow}>
              <View style={styles.rowCenter}>
                 <ShieldCheck size={24} color={!hasSecurityQuestion ? "#ef4444" : "#10b981"} style={{ marginRight: 12 }} />
                 <Text style={styles.cardTitle}>Account Security</Text>
              </View>
              
              {!hasSecurityQuestion ? (
                  <View style={styles.warningBadge}>
                      <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulseAnim }] }]} />
                      <Text style={styles.warningBadgeText}>Action Needed</Text>
                  </View>
              ) : (
                  <View style={styles.safeBadge}>
                      <Check size={12} color="#10b981" style={{ marginRight: 4 }}/>
                      <Text style={styles.safeBadgeText}>Secured</Text>
                  </View>
              )}
           </View>

           <View style={styles.phoneBox}>
               <Text style={styles.phoneLabel}>Phone Number</Text>
               <Text style={styles.phoneText}>{user?.vendor?.phone || "Loading..."}</Text>
           </View>

           {/* ONLY SHOW BUTTON IF THEY HAVEN'T SET IT UP */}
           {!hasSecurityQuestion && (
               <TouchableOpacity 
                 onPress={() => setSecurityModalVisible(true)}
                 style={styles.actionNeededBtn}
               >
                 <Lock size={18} color="#ef4444" style={{ marginRight: 8 }} />
                 <Text style={styles.actionNeededBtnText}>Protect Your Account Now</Text>
               </TouchableOpacity>
           )}
        </View>

        {/* --- LOGOUT BUTTON --- */}
        <TouchableOpacity onPress={() => setLogoutModalVisible(true)} style={styles.logoutBtn}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- SECURITY MODAL --- */}
      <Modal visible={securityModalVisible} animationType="slide" presentationStyle="pageSheet">
         <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
               <TouchableOpacity onPress={() => setSecurityModalVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Close</Text>
               </TouchableOpacity>
            </View>

            {/* 2. ADDED keyboardShouldPersistTaps TO THE MODAL SCROLLVIEW */}
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
               <Text style={styles.modalTitle}>Security Settings</Text>
               <Text style={styles.modalSubtitle}>Set a recovery question. This is the ONLY way to recover your account if you lose your password.</Text>
               
               <Text style={styles.inputLabel}>Select a Question</Text>
               <View style={styles.questionList}>
                  {SECURITY_QUESTIONS.map((q, i) => (
                      <TouchableOpacity 
                        key={i} 
                        onPress={() => setSecurityQuestion(q)} 
                        style={[styles.questionItem, securityQuestion === q && styles.questionItemActive]}
                      >
                          <Text style={[styles.questionText, securityQuestion === q && styles.questionTextActive]}>{q}</Text>
                          {securityQuestion === q && <Check size={16} color="#047857" />}
                      </TouchableOpacity>
                  ))}
               </View>

               <Text style={styles.inputLabel}>Your Answer</Text>
               <TextInput 
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                  style={Platform.OS === 'web' ? [styles.modalInput, { outlineStyle: 'none' }] : styles.modalInput}
                  placeholder="Type your secret answer..."
                  placeholderTextColor="#cbd5e1"

                  // --- THE ARMOR ---
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
               />

               <TouchableOpacity onPress={handleUpdateSecurity} disabled={secLoading} style={styles.modalSaveBtn}>
                  {secLoading ? <ActivityIndicator color="white" /> : <Text style={styles.modalSaveBtnText}>Save & Protect</Text>}
               </TouchableOpacity>
            </ScrollView>
         </View>
      </Modal>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      <Modal visible={logoutModalVisible} transparent={true} animationType="fade">
          <View style={styles.logoutOverlay}>
              <View style={styles.logoutModalContent}>
                  <View style={styles.logoutIconBox}>
                      <LogOut size={32} color="#ef4444" />
                  </View>
                  <Text style={styles.logoutModalTitle}>Sign Out</Text>
                  <Text style={styles.logoutModalText}>Are you sure you want to sign out of your account?</Text>

                  <View style={styles.logoutBtnRow}>
                      <TouchableOpacity onPress={() => setLogoutModalVisible(false)} style={styles.logoutCancelBtn}>
                          <Text style={styles.logoutCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleLogout} style={styles.logoutConfirmBtn}>
                          <Text style={styles.logoutConfirmBtnText}>Sign Out</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', position: 'relative' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }, // Added padding for floating tab bar
  pageTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a', marginBottom: 32 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  // Live Store Card
  liveStoreCard: { backgroundColor: '#059669', padding: 24, borderRadius: 24, marginBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  liveStoreLabel: { color: '#d1fae5', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  liveStoreTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  liveStoreIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 32 },

  // Generic Card Styles
  brandingCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },

  // Avatar
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#f8fafc' },
  avatarPlaceholder: { width: 96, height: 96, backgroundColor: '#f1f5f9', borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#ffffff' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0f172a', padding: 8, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff' },

  // Form Inputs
  inputLabel: { color: '#64748b', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 16, padding: 16, fontWeight: 'bold', color: '#0f172a', fontSize: 16, marginBottom: 24 },
  
  saveBtn: { backgroundColor: '#0f172a', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  saveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },

  // Security Card
  securityCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 32, borderWidth: 1, marginBottom: 32, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  securityCardWarning: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  securityCardSafe: { borderColor: '#f1f5f9' },
  securityHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  
  // Badges
  warningBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 6 },
  warningBadgeText: { color: '#ef4444', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  safeBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  safeBadgeText: { color: '#059669', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  phoneBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  phoneLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  phoneText: { color: '#0f172a', fontWeight: 'bold', fontSize: 18 },

  actionNeededBtn: { width: '100%', borderWidth: 2, borderColor: '#fecaca', backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionNeededBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 40 },
  logoutBtnText: { color: '#ef4444', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8 },

  // Settings Modal
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  closeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  closeBtnText: { fontWeight: 'bold', color: '#64748b' },
  modalScroll: { padding: 24, paddingBottom: 60 },
  modalTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  modalSubtitle: { color: '#64748b', fontWeight: '500', marginBottom: 32, lineHeight: 20 },
  
  questionList: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, marginBottom: 24, overflow: 'hidden' },
  questionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' },
  questionItemActive: { backgroundColor: '#ecfdf5' },
  questionText: { flex: 1, fontWeight: 'bold', color: '#64748b', fontSize: 14, marginRight: 8 },
  questionTextActive: { color: '#047857' },

  modalInput: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontWeight: 'bold', color: '#0f172a', fontSize: 18, marginBottom: 32 },
  modalSaveBtn: { backgroundColor: '#059669', height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  modalSaveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },

  // Logout Confirmation Modal
  logoutOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoutModalContent: { backgroundColor: '#ffffff', borderRadius: 32, padding: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  logoutIconBox: { width: 64, height: 64, backgroundColor: '#fef2f2', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoutModalTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  logoutModalText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 22, fontWeight: '500' },
  logoutBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutCancelBtn: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  logoutCancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  logoutConfirmBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#fca5a5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
  logoutConfirmBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});