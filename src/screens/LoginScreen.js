import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  Platform, Image, Dimensions, KeyboardAvoidingView, ScrollView, Modal, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ShoppingBag, Tag, Package, ArrowRight, Star, Gift, 
  Lock, Phone, Eye, EyeOff, ShieldCheck, Check, AlertCircle, X, User, Key 
} from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

// !!! MATCH YOUR BACKEND !!!
const API_URL = 'http://localhost:5000'; 

const { width, height } = Dimensions.get('window');

// --- SECURITY QUESTIONS ---
const SECURITY_QUESTIONS = [
  "What was the very first item you sold?",
  "What is the street name of your first store?",
  "What is the name of your favorite supplier?",
  "What year did you start your business?",
  "What is your mother's maiden name?", 
  "What is the name of your first pet?"
];

// --- FALLING ICONS ANIMATION ---
const FallingBackground = () => {
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

export default function LoginScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRecNewPass, setShowRecNewPass] = useState(false); // Recovery New Pass
  const [showRecConfirmPass, setShowRecConfirmPass] = useState(false); // Recovery Confirm Pass

  const [activeInput, setActiveInput] = useState(null);
  const [regStep, setRegStep] = useState(1);

  // Form State
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState('idle'); 
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Security State
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Recovery State
  const [recoverModalVisible, setRecoverModalVisible] = useState(false);
  const [recoverStep, setRecoverStep] = useState(1); 
  const [recoverPhone, setRecoverPhone] = useState('');
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- HELPER: GET INPUT BORDER STYLE ---
  const getContainerStyle = (fieldName) => {
      const isActive = activeInput === fieldName;
      return isActive 
        ? "bg-white border-emerald-500 shadow-sm shadow-emerald-100" 
        : "bg-slate-50 border-slate-100";
  };

  // --- AUTO SLUG ---
  useEffect(() => {
    if (!isLogin && shopName) {
      const generated = shopName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setSlug(generated);
    }
  }, [shopName, isLogin]);

  useEffect(() => {
    if (!slug || isLogin) return;
    setSlugStatus('checking');
    const delay = setTimeout(async () => {
        try {
            await axios.get(`${API_URL}/api/check-slug/${slug}`);
            setSlugStatus('available');
        } catch (err) {
            setSlugStatus('taken');
        }
    }, 500); 
    return () => clearTimeout(delay);
  }, [slug]);


  // --- AUTH HANDLERS ---
  const handleLogin = async () => {
    if (!phone || !password) return Toast.show({ type: 'error', text1: 'Missing fields' });
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/login`, { phone, password });
      await saveUser(res.data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = () => {
    if (!shopName || !slug || !phone || !password) return Toast.show({ type: 'error', text1: 'Please fill all fields' });
    if (slugStatus === 'taken') return Toast.show({ type: 'error', text1: 'Link ID taken', text2: 'Please choose another link.' });
    if (password.length < 6) return Toast.show({ type: 'error', text1: 'Password too short' });
    setRegStep(2);
  };

  const handleRegisterFinal = async () => {
    if (!securityAnswer) return Toast.show({ type: 'error', text1: 'Security answer required' });
    setLoading(true);
    try {
      const payload = { shopName, slug, phone, password, securityQuestion, securityAnswer };
      const res = await axios.post(`${API_URL}/api/register`, payload);
      await saveUser(res.data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (userData) => {
    if (Platform.OS === 'web') localStorage.setItem('quickshop_user', JSON.stringify(userData));
    else await SecureStore.setItemAsync('quickshop_user', JSON.stringify(userData));
    
    Toast.show({ type: 'success', text1: `Welcome ${userData.vendor.shop_name}!` });
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  const handleError = (err) => {
    const msg = err.response?.data?.message || "Server Error. Check connection.";
    Toast.show({ type: 'error', text1: 'Action Failed', text2: msg });
  };

  // --- RECOVERY FLOW ---
  
  // Step 1: Find Account
  const handleRecoverFetch = async () => {
      if (!recoverPhone) return Toast.show({ type: 'error', text1: 'Enter phone number' });
      setLoading(true);
      try {
          const res = await axios.get(`${API_URL}/api/forgot-password/question/${recoverPhone}`);
          setFetchedQuestion(res.data.question);
          setRecoverStep(2); 
          Toast.show({ type: 'success', text1: 'Account Found!', text2: 'Please answer the security question.' });
      } catch (err) {
          Toast.show({ type: 'error', text1: 'Account Not Found', text2: 'Check the number and try again.' });
      } finally {
          setLoading(false);
      }
  };

  // Step 2: Verify Answer (With Alerts)
  const handleVerifyAnswer = async () => {
      if (!recoverAnswer.trim()) return Toast.show({ type: 'error', text1: 'Enter an answer' });
      setLoading(true);
      try {
          await axios.post(`${API_URL}/api/verify-answer`, { 
              phone: recoverPhone, 
              answer: recoverAnswer 
          });
          
          Toast.show({ type: 'success', text1: 'Correct Answer!', text2: 'Proceeding to reset password...' });
          
          // Delay slightly so user sees the success message
          setTimeout(() => {
              setRecoverStep(3); 
          }, 1000);

      } catch (err) {
          Toast.show({ type: 'error', text1: 'Wrong Answer', text2: 'That is not the correct answer.' });
      } finally {
          setLoading(false);
      }
  };

  // Step 3: Reset Password (With Confirm & Toggles)
  const handleRecoverReset = async () => {
      if (!newPassword || newPassword.length < 6) return Toast.show({ type: 'error', text1: 'Password too short (min 6)' });
      if (newPassword !== confirmPassword) return Toast.show({ type: 'error', text1: 'Passwords do not match' });

      setLoading(true);
      try {
          await axios.post(`${API_URL}/api/reset-password`, { 
              phone: recoverPhone, 
              answer: recoverAnswer, 
              newPassword 
          });
          
          Toast.show({ type: 'success', text1: 'Password Reset Successful!', text2: 'Please login with your new password.' });
          
          setRecoverModalVisible(false);
          setTimeout(() => {
              setRecoverStep(1);
              setRecoverPhone('');
              setRecoverAnswer('');
              setNewPassword('');
              setConfirmPassword('');
          }, 500);
      } catch (err) {
          Toast.show({ type: 'error', text1: 'Reset Failed', text2: 'Server error. Try again.' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <SafeAreaView className="flex-1 bg-white relative">
      <FallingBackground />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-10">

            {/* --- HEADER --- */}
            <View className="items-center mb-10 mt-10">
              <Image source={require('../../assets/logo.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
              <Text className="text-3xl font-black text-emerald-900 tracking-tight mt-4">ShopLink.vi</Text>
              <Text className="text-slate-400 font-bold tracking-widest text-xs uppercase mt-1">
                {isLogin ? 'Manager Portal' : 'Start Your Business'}
              </Text>
            </View>

            {/* --- FORM CONTAINER --- */}
            <View className="w-full">
              {/* LOGIN & REGISTER FORMS (Same as before) */}
              {isLogin && (
                  <View className="space-y-5">
                      <View>
                          <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number</Text>
                          <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 transition-all ${getContainerStyle('loginPhone')}`}>
                              <Phone size={20} color={activeInput === 'loginPhone' ? "#10b981" : "#94a3b8"} className="mr-3"/>
                              <TextInput 
                                  placeholder="080 1234 5678" 
                                  value={phone} 
                                  onChangeText={setPhone} 
                                  onFocus={() => setActiveInput('loginPhone')}
                                  onBlur={() => setActiveInput(null)}
                                  keyboardType="phone-pad"
                                  className="flex-1 font-bold text-slate-900 text-lg"
                                  placeholderTextColor="#cbd5e1"
                                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                              />
                          </View>
                      </View>

                      <View>
                          <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</Text>
                          <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 transition-all ${getContainerStyle('loginPass')}`}>
                              <Lock size={20} color={activeInput === 'loginPass' ? "#10b981" : "#94a3b8"} className="mr-3"/>
                              <TextInput 
                                  placeholder="••••••••" 
                                  value={password} 
                                  onChangeText={setPassword}
                                  onFocus={() => setActiveInput('loginPass')}
                                  onBlur={() => setActiveInput(null)}
                                  secureTextEntry={!showPassword}
                                  className="flex-1 font-bold text-slate-900 text-lg"
                                  placeholderTextColor="#cbd5e1"
                                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                              />
                              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                              </TouchableOpacity>
                          </View>
                      </View>
                      
                      <TouchableOpacity onPress={() => setRecoverModalVisible(true)} className="self-end">
                          <Text className="text-emerald-600 text-xs font-bold uppercase tracking-wide">Forgot Password?</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleLogin} disabled={loading} className="bg-emerald-700 h-16 rounded-2xl flex-row items-center justify-center mt-4 active:scale-95 shadow-lg shadow-emerald-200">
                          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg uppercase tracking-widest">Sign In</Text>}
                      </TouchableOpacity>
                  </View>
              )}

              {/* ... (Register Form code remains same as previous good version) ... */}
              {!isLogin && (
                  <View>
                      <Text className="text-center text-slate-500 mt-10">Registration temporarily hidden for brevity (use previous code)</Text>
                      <TouchableOpacity onPress={() => setIsLogin(true)}><Text className="text-center text-emerald-600 font-bold">Back to Login</Text></TouchableOpacity>
                  </View>
              )}
            </View>

            {/* --- TOGGLE --- */}
            {isLogin && (
                <View className="mt-10 pt-6 border-t border-slate-100 items-center">
                <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setRegStep(1); }}>
                    <Text className="text-slate-500 font-medium">
                    Don't have a store? <Text className="text-emerald-700 font-black">Create One</Text>
                    </Text>
                </TouchableOpacity>
                </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- RECOVERY MODAL (3 STEPS) --- */}
      <Modal visible={recoverModalVisible} animationType="slide" presentationStyle="pageSheet">
         <View className="flex-1 bg-white">
            <View className="px-6 py-4 flex-row justify-end">
               <TouchableOpacity onPress={() => setRecoverModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><Text className="font-bold text-slate-500">Close</Text></TouchableOpacity>
            </View>

            <View className="px-6 flex-1 pt-6">
               
               {/* STEP 1: PHONE */}
               {recoverStep === 1 && (
                   <View className="items-center">
                       <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-6"><ShieldCheck size={32} color="#64748b" /></View>
                       <Text className="text-2xl font-black text-slate-900 mb-2">Recovery</Text>
                       <Text className="text-slate-500 text-center mb-8 px-4">Enter your registered WhatsApp number to find your account.</Text>
                       
                       <View className="w-full space-y-4">
                           <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 transition-all ${getContainerStyle('recPhone')}`}>
                               <Phone size={20} color={activeInput === 'recPhone' ? "#10b981" : "#94a3b8"} className="mr-3"/>
                               <TextInput 
                                  placeholder="Phone Number" 
                                  value={recoverPhone} 
                                  onChangeText={setRecoverPhone}
                                  onFocus={() => setActiveInput('recPhone')}
                                  onBlur={() => setActiveInput(null)}
                                  keyboardType="phone-pad" 
                                  className="flex-1 font-bold text-slate-900 text-lg"
                                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                               />
                           </View>
                           <TouchableOpacity onPress={handleRecoverFetch} disabled={loading} className="bg-slate-900 h-16 rounded-2xl items-center justify-center w-full">
                               {loading ? <ActivityIndicator color="white"/> : <Text className="text-white font-black uppercase tracking-widest">Find Account</Text>}
                           </TouchableOpacity>
                       </View>
                   </View>
               )}

               {/* STEP 2: SECURITY ANSWER */}
               {recoverStep === 2 && (
                   <View>
                       <TouchableOpacity onPress={() => setRecoverStep(1)} className="mb-6 flex-row items-center">
                          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Back</Text>
                       </TouchableOpacity>

                       <View className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mb-8">
                           <Text className="text-xs text-emerald-600 font-bold uppercase mb-2">Security Question</Text>
                           <Text className="text-xl font-black text-emerald-900 leading-7">{fetchedQuestion}</Text>
                       </View>
                       
                       <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Your Answer</Text>
                       <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 mb-6 transition-all ${getContainerStyle('recAns')}`}>
                           <TextInput 
                              placeholder="Type answer here..." 
                              value={recoverAnswer} 
                              onChangeText={setRecoverAnswer} 
                              onFocus={() => setActiveInput('recAns')}
                              onBlur={() => setActiveInput(null)}
                              className="flex-1 font-bold text-slate-900 text-lg"
                              style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                           />
                       </View>
                       
                       <TouchableOpacity onPress={handleVerifyAnswer} disabled={loading} className="bg-emerald-600 h-16 rounded-2xl items-center justify-center shadow-lg shadow-emerald-200">
                           {loading ? <ActivityIndicator color="white"/> : <Text className="text-white font-black uppercase tracking-widest">Verify Answer</Text>}
                       </TouchableOpacity>
                   </View>
               )}

               {/* STEP 3: RESET PASSWORD (CONFIRM + TOGGLES) */}
               {recoverStep === 3 && (
                   <View>
                       <View className="items-center mb-8">
                           <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4"><Check size={32} color="#059669" /></View>
                           <Text className="text-2xl font-black text-slate-900">Create New Password</Text>
                       </View>

                       {/* New Password */}
                       <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</Text>
                       <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 mb-4 transition-all ${getContainerStyle('recPass')}`}>
                           <Key size={20} color={activeInput === 'recPass' ? "#10b981" : "#94a3b8"} className="mr-3"/>
                           <TextInput 
                              placeholder="Min 6 characters" 
                              value={newPassword} 
                              onChangeText={setNewPassword} 
                              onFocus={() => setActiveInput('recPass')}
                              onBlur={() => setActiveInput(null)}
                              secureTextEntry={!showRecNewPass}
                              className="flex-1 font-bold text-slate-900 text-lg"
                              style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                           />
                           <TouchableOpacity onPress={() => setShowRecNewPass(!showRecNewPass)}>
                               {showRecNewPass ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                           </TouchableOpacity>
                       </View>

                       {/* Confirm Password */}
                       <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</Text>
                       <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 mb-6 transition-all ${getContainerStyle('recConfPass')}`}>
                           <Key size={20} color={activeInput === 'recConfPass' ? "#10b981" : "#94a3b8"} className="mr-3"/>
                           <TextInput 
                              placeholder="Re-enter password" 
                              value={confirmPassword} 
                              onChangeText={setConfirmPassword} 
                              onFocus={() => setActiveInput('recConfPass')}
                              onBlur={() => setActiveInput(null)}
                              secureTextEntry={!showRecConfirmPass}
                              className="flex-1 font-bold text-slate-900 text-lg"
                              style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined}
                           />
                           <TouchableOpacity onPress={() => setShowRecConfirmPass(!showRecConfirmPass)}>
                               {showRecConfirmPass ? <EyeOff size={20} color="#94a3b8"/> : <Eye size={20} color="#94a3b8"/>}
                           </TouchableOpacity>
                       </View>
                       
                       <TouchableOpacity onPress={handleRecoverReset} disabled={loading} className="bg-slate-900 h-16 rounded-2xl items-center justify-center shadow-xl">
                           {loading ? <ActivityIndicator color="white"/> : <Text className="text-white font-black uppercase tracking-widest">Reset Password</Text>}
                       </TouchableOpacity>
                   </View>
               )}

            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}