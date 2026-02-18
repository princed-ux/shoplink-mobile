import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, 
  ActivityIndicator, Platform, Linking, Modal, Animated, Easing, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { Camera, LogOut, Save, User, ShieldCheck, Lock, Globe, ShoppingBag, Gift, Tag, Package, Star, AlertCircle, Check } from 'lucide-react-native';

// !!! MATCH THIS WITH YOUR BACKEND !!!
const API_URL = 'https://api.shoplinkvi.com'; 

const { width, height } = Dimensions.get('window');

const SECURITY_QUESTIONS = [
  "What was the very first item you sold?",
  "What is the street name of your first store?",
  "What is the name of your favorite supplier?",
  "What year did you start your business?",
  "What is your mother's maiden name?", 
  "What is the name of your first pet?"
];

// --- 1. FALLING ICONS (Reused) ---
const FallingBackground = () => {
  const [icons] = useState(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      Icon: [ShoppingBag, Gift, Tag, Package, Star][Math.floor(Math.random() * 5)],
      anim: new Animated.Value(-50), 
      left: Math.random() * width,
      size: 15 + Math.random() * 20,
      duration: 5000 + Math.random() * 5000,
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
          style={{ 
            position: 'absolute', 
            left: item.left, 
            transform: [{ translateY: item.anim }],
            opacity: 0.05 
          }}
        >
          <item.Icon size={item.size} color="#059669" />
        </Animated.View>
      ))}
    </View>
  );
};

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

  useEffect(() => {
    loadUserData();
  }, []);

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

  // --- 1. BRANDING LOGIC ---
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

  // --- 2. SECURITY LOGIC ---
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

  // --- 3. STOREFRONT LOGIC ---
  const openLiveStore = () => {
    if (user?.vendor?.slug) {
      const url = `https://shoplinkvi.com/shop.vi/${user.vendor.slug}`;
      Linking.openURL(url);
    } else {
      Toast.show({ type: 'error', text1: 'Shop not found' });
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') localStorage.removeItem('quickshop_user');
    else await SecureStore.deleteItemAsync('quickshop_user');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const hasSecurityQuestion = !!user?.vendor?.security_question;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 relative">
      <FallingBackground />

      <ScrollView className="px-6 pt-6">
        
        <Text className="text-3xl font-black text-slate-900 mb-8">Settings</Text>

        {/* --- SECTION 1: LIVE STORE PREVIEW --- */}
        <TouchableOpacity 
          onPress={openLiveStore}
          className="bg-emerald-600 p-6 rounded-[24px] shadow-lg shadow-emerald-200 mb-8 flex-row items-center justify-between active:bg-emerald-700"
        >
          <View>
             <Text className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Public Storefront</Text>
             <Text className="text-white text-xl font-black">View Live Shop</Text>
          </View>
          <View className="bg-white/20 p-3 rounded-full backdrop-blur-md">
             <Globe size={24} color="white" />
          </View>
        </TouchableOpacity>

        {/* --- SECTION 2: BRANDING --- */}
        <View className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-6">
            <User size={24} color="#3b82f6" className="mr-3" />
            <Text className="text-lg font-bold text-slate-900">Store Branding</Text>
          </View>

          <View className="items-center mb-6">
            <TouchableOpacity onPress={pickImage} className="relative active:scale-95 transition-transform">
              {logo ? (
                <Image source={{ uri: logo }} className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-sm" />
              ) : (
                <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center border-4 border-white shadow-sm">
                   <Camera size={32} color="#94a3b8" />
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-slate-900 p-2 rounded-full border-2 border-white">
                 <Camera size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <Text className="text-slate-500 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">Shop Name</Text>
          <TextInput 
            value={shopName}
            onChangeText={setShopName}
            className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 mb-6 focus:border-slate-300"
            placeholder="Enter Shop Name"
          />

          <TouchableOpacity 
            onPress={handleUpdateProfile} 
            disabled={loading}
            className="bg-slate-900 h-14 rounded-xl flex-row items-center justify-center shadow-lg active:scale-95"
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Save size={20} color="white" className="mr-2" />
                <Text className="text-white font-black text-base">Save Branding</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* --- SECTION 3: ACCOUNT & SECURITY --- */}
        <View className={`bg-white p-6 rounded-[32px] shadow-sm border mb-8 ${!hasSecurityQuestion ? 'border-red-200 bg-red-50/10' : 'border-slate-100'}`}>
           <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                 <ShieldCheck size={24} color={!hasSecurityQuestion ? "#ef4444" : "#f59e0b"} className="mr-3" />
                 <Text className="text-lg font-bold text-slate-900">Account Security</Text>
              </View>
              {!hasSecurityQuestion && (
                  <View className="bg-red-100 px-2 py-1 rounded-md flex-row items-center">
                      <AlertCircle size={12} color="#ef4444" className="mr-1"/>
                      <Text className="text-red-500 text-[10px] font-black uppercase tracking-wide">Action Needed</Text>
                  </View>
              )}
           </View>

           <View className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
               <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Phone Number</Text>
               <Text className="text-slate-900 font-bold text-lg">{user?.vendor?.phone}</Text>
           </View>

           <TouchableOpacity 
              onPress={() => setSecurityModalVisible(true)}
              className={`w-full border-2 py-4 rounded-xl flex-row items-center justify-center active:bg-slate-50 ${!hasSecurityQuestion ? 'border-red-100 bg-red-50' : 'border-slate-100'}`}
           >
              <Lock size={18} color={!hasSecurityQuestion ? "#ef4444" : "#64748b"} className="mr-2" />
              <Text className={`${!hasSecurityQuestion ? 'text-red-500' : 'text-slate-600'} font-bold text-sm uppercase`}>
                  {hasSecurityQuestion ? "Update Security Question" : "Protect Your Account Now"}
              </Text>
           </TouchableOpacity>
        </View>

        {/* --- LOGOUT --- */}
        <TouchableOpacity 
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 p-4 mb-10 active:opacity-50"
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-500 font-black uppercase tracking-widest text-sm">Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- SECURITY MODAL --- */}
      <Modal visible={securityModalVisible} animationType="slide" presentationStyle="pageSheet">
         <View className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-end bg-white border-b border-slate-100">
               <TouchableOpacity onPress={() => setSecurityModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                  <Text className="font-bold text-slate-500">Close</Text>
               </TouchableOpacity>
            </View>

            <ScrollView className="p-6">
               <Text className="text-3xl font-black text-slate-900 mb-2">Security Settings</Text>
               <Text className="text-slate-500 font-medium mb-8">Set a recovery question. This is the ONLY way to recover your account if you lose your password.</Text>
               
               <Text className="text-slate-500 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">Select a Question</Text>
               <View className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden">
                  {SECURITY_QUESTIONS.map((q, i) => (
                      <TouchableOpacity 
                        key={i} 
                        onPress={() => setSecurityQuestion(q)} 
                        className={`p-4 border-b border-slate-100 flex-row items-center justify-between ${securityQuestion === q ? 'bg-emerald-50' : 'bg-white'}`}
                      >
                          <Text className={`font-bold flex-1 ${securityQuestion === q ? "text-emerald-700" : "text-slate-600"}`}>{q}</Text>
                          {securityQuestion === q && <Check size={16} color="#047857" />}
                      </TouchableOpacity>
                  ))}
               </View>

               <Text className="text-slate-500 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">Your Answer</Text>
               <TextInput 
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                  className="bg-white border-2 border-slate-200 rounded-xl p-4 font-bold text-slate-900 mb-8 text-lg focus:border-slate-400"
                  placeholder="Type your secret answer..."
                  secureTextEntry={false} 
               />

               <TouchableOpacity 
                  onPress={handleUpdateSecurity} 
                  disabled={secLoading}
                  className="bg-emerald-600 h-16 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-emerald-200 active:scale-95"
               >
                  {secLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg uppercase tracking-widest">Save & Protect</Text>}
               </TouchableOpacity>

            </ScrollView>
         </View>
      </Modal>

    </SafeAreaView>
  );
}