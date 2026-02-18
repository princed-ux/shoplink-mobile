import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Image, Share, 
  RefreshControl, Platform, Modal, Animated, Easing, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Package, Share2, Eye, Plus, Copy, Clock, Zap, Star, 
  Check, Gift, ShoppingBag, Tag, ChevronRight, 
  TrendingUp, CreditCard, Crown, Settings, RotateCw, Globe, MessageCircle, X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import axios from 'axios';

// Only import WebView if NOT on web to avoid crash
let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// !!! API CONFIG !!!
const API_URL = 'http://localhost:5000'; 

const { width, height } = Dimensions.get('window');

// --- 1. AURORA BACKGROUND ---
const AuroraBackground = () => {
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (anim, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: duration, useNativeDriver: Platform.OS !== 'web', easing: Easing.inOut(Easing.ease) }),
          Animated.timing(anim, { toValue: 0, duration: duration, useNativeDriver: Platform.OS !== 'web', easing: Easing.inOut(Easing.ease) })
        ])
      );
    };
    createAnimation(blob1, 7000).start();
    createAnimation(blob2, 9000).start();
  }, []);

  const translate1 = blob1.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  const translate2 = blob2.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

  
  return (
    <View style={{ position: 'absolute', width: width, height: height, zIndex: -1, backgroundColor: '#f8fafc' }}>
      <Animated.View style={{ 
        position: 'absolute', top: -50, left: -50, width: 300, height: 300, 
        backgroundColor: '#e9d5ff', borderRadius: 150, opacity: 0.5,
        transform: [{ translateX: translate1 }, { scale: 1.2 }] 
      }} blurRadius={80} />
      <Animated.View style={{ 
        position: 'absolute', top: 50, right: -50, width: 280, height: 280, 
        backgroundColor: '#a7f3d0', borderRadius: 140, opacity: 0.5,
        transform: [{ translateY: translate2 }, { scale: 1.1 }] 
      }} blurRadius={80} />
    </View>
  );
};

// --- PLAN DATA ---
const PLANS = [
  { name: "Basic", price: "₦800", amount: 80000, features: ["7 Products", "WhatsApp Checkout"] },
  { name: "Growth", price: "₦1,500", amount: 150000, features: ["13 Products", "Standard Link"] },
  { name: "Pro", price: "₦3,000", amount: 300000, features: ["25 Products", "Verified Badge"] },
  { name: "Business", price: "₦6,000", amount: 600000, features: ["60 Products", "Priority Support"] },
  { name: "Unlimited", price: "₦12,000", amount: 1200000, features: ["Unlimited Products", "VIP Support"], isBest: true }
];

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Welcome back');
  const [loadingViews, setLoadingViews] = useState(false);
  
  // Logic State
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // --- PAYSTACK STATE ---
  const [paystackUrl, setPaystackUrl] = useState(null); 
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Computed Variables
  const currentPlan = user?.planType || 'Starter';
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const isTrialDateValid = trialEndsAt && trialEndsAt > new Date();
  
  const activeAccessLevel = currentPlan === 'Unlimited' ? 'Unlimited' : (isTrialDateValid ? 'Trial' : currentPlan);
  const queuedPlan = (isTrialDateValid && currentPlan !== 'Trial' && currentPlan !== 'Starter' && currentPlan !== 'Unlimited') ? currentPlan : null;
  const isElitePlan = activeAccessLevel === 'Unlimited' || activeAccessLevel === 'Trial';

  // --- LIMITS LOGIC ---
  const getPlanLimit = (p) => { if(p==='Trial'||p==='Unlimited')return 999999; if(p==='Business')return 60; if(p==='Pro')return 25; if(p==='Growth')return 13; if(p==='Basic')return 7; return 3; };
  const planLimit = getPlanLimit(currentPlan);
  const usageCount = user?.uploaded_count || user?.products?.length || 0;

  // --- DATA LOADING ---
  const loadData = async () => {
    try {
      let jsonValue = Platform.OS === 'web' ? localStorage.getItem('quickshop_user') : await SecureStore.getItemAsync('quickshop_user');
      if (!jsonValue) return;
      const localData = JSON.parse(jsonValue);
      const res = await axios.get(`${API_URL}/api/vendor/me`, { headers: { Authorization: localData.token } });
      setUser({ ...res.data, token: localData.token });
    } catch (e) {
      console.error("Load Error", e);
      Toast.show({ type: 'error', text1: 'Offline Mode' });
    }
  };

  const refreshViewsOnly = async () => {
      setLoadingViews(true);
      try {
          const res = await axios.get(`${API_URL}/api/vendor/me`, { headers: { Authorization: user.token } });
          setUser(prev => ({ ...prev, views: res.data.views }));
          Toast.show({ type: 'success', text1: 'Views updated!' });
      } catch(e) { console.error(e); }
      finally { setLoadingViews(false); }
  }

  // --- TIMER ---
  useEffect(() => {
    if (isTrialDateValid && currentPlan !== 'Unlimited') {
      const timer = setInterval(() => {
        const distance = trialEndsAt.getTime() - new Date().getTime();
        if (distance < 0) loadData();
        else setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [user, isTrialDateValid]);

  useFocusEffect(useCallback(() => { 
    loadData(); 
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []));

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setTimeout(() => setRefreshing(false), 1000); }, []);

  // --- ACTIONS ---
  

  // --- WEB ONLY: Handle Redirect Back from Paystack ---
  useEffect(() => {
    if (Platform.OS === 'web') {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference');
        
        if (reference) {
            // Clean the URL so we don't verify twice if you refresh
            window.history.replaceState({}, document.title, window.location.pathname);
            // Verify the payment immediately
            verifyPayment(reference);
        }
    }
  }, []);
  // --- ACTIONS ---
  
  // 1. Initialize Paystack (Fixed Redirects)
  const handleUpgrade = async (plan) => {
    try {
       // A. Determine Redirect URL
       let callbackUrl = "https://standard.paystack.co/close"; // Default for Mobile WebView detection
       if (Platform.OS === 'web') {
           callbackUrl = window.location.href; // Web: Come back to this exact page
       }

       const res = await axios.post(`${API_URL}/api/paystack/initialize`, {
         email: `${user.phone}@shoplink.vi`,
         amount: plan.amount,
         callback_url: callbackUrl, // <--- SENDING THE LINK
         metadata: { vendorId: user.id, phone: user.phone, plan: plan.name }
       }, { headers: { Authorization: user.token } });

       if (res.data.status && res.data.data.authorization_url) {
           if (Platform.OS === 'web') {
               // WEB: Go to Paystack (It will auto-redirect back now!)
               window.location.href = res.data.data.authorization_url;
           } else {
               // MOBILE: Open In-App WebView
               setPaystackUrl(res.data.data.authorization_url);
               setShowUpgradeModal(false);
           }
       } else {
           Toast.show({type: 'error', text1: 'Payment Init Failed'});
       }
    } catch (err) { 
        console.error(err);
        Toast.show({ type: 'error', text1: 'Connection Error' }); 
    }
  };

  // 2. Mobile WebView Handler (Watches for Success)
  const handleWebViewNavigation = (navState) => {
      const { url } = navState;
      
      // Paystack redirects to the callback_url with "?reference=..." or "&reference=..."
      // We watch for that reference code.
      if ((url.includes('reference=') || url.includes('close')) && !verifyingPayment) {
          
          // Try to get reference from URL
          const match = url.match(/reference=([^&]*)/);
          const reference = match ? match[1] : null;

          if (reference) {
              setPaystackUrl(null); // Close the Modal immediately
              verifyPayment(reference); // Check with backend
          } else {
              // If we hit the close URL but no reference found yet (rare), just close
              setPaystackUrl(null);
          }
      }
  };

  // 3. Verify Payment
  const verifyPayment = async (reference) => {
      setVerifyingPayment(true);
      try {
          const res = await axios.post(`${API_URL}/api/paystack/verify`, 
              { reference }, 
              { headers: { Authorization: user.token } }
          );
          
          if (res.data.vendor) {
              Toast.show({ type: 'success', text1: 'Upgrade Successful!', text2: res.data.message });
              setUser(prev => ({...prev, ...res.data.vendor}));
          } else {
              Toast.show({ type: 'error', text1: 'Verification Failed' });
          }
      } catch (e) {
          Toast.show({ type: 'error', text1: 'Verification Error', text2: 'Contact support if charged.' });
      } finally {
          setVerifyingPayment(false);
      }
  };

  const handleShare = async () => {
    try { await Share.share({ message: `Check out my store! https://shoplinkvi.com/shop.vi/${user.slug}` }); } catch (e) {}
  };

  const copySlug = () => {
     if (Platform.OS === 'web') navigator.clipboard.writeText(`https://shoplinkvi.com/shop.vi/${user?.slug}`);
     Toast.show({ type: 'success', text1: 'Link Copied!' });
  };

  if (!user) return <SafeAreaView className="flex-1 justify-center items-center bg-white"><Text className="text-slate-400 font-bold">Loading Store...</Text></SafeAreaView>;

  return (
    <View className="flex-1 bg-slate-50 relative">
      <StatusBar barStyle="dark-content" />
      
      {isElitePlan && <AuroraBackground />}

      <SafeAreaView className="flex-1">
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
          
          {/* HEADER */}
          <View className="px-6 pt-2 pb-6 flex-row justify-between items-center">
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">{greeting}</Text>
              <View className="flex-row items-center">
                <Text className="text-2xl font-black text-slate-900 capitalize mr-1 tracking-tight">{user.shopName}</Text>
                {user.is_pro && <Check size={16} color="#3b82f6" fill="#3b82f6" />}
              </View>
            </View>
            
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                {user.logo ? (
                    <Image source={{ uri: user.logo }} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                ) : (
                    <View className="w-12 h-12 bg-slate-900 rounded-full items-center justify-center border-2 border-white shadow-sm">
                        <Text className="text-white font-black text-lg">{user.shopName?.charAt(0)}</Text>
                    </View>
                )}
            </TouchableOpacity>
          </View>

          <View className="px-6 pb-20 gap-y-6">

              {/* CARD 1: SHOP LINK */}
              <View className="rounded-[32px] overflow-hidden shadow-xl shadow-slate-300">
                <LinearGradient colors={['#0f172a', '#334155']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-6 h-48 justify-between">
                   <View className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl" />
                   <View>
                      <View className="flex-row items-center gap-2 mb-2">
                         <View className="w-2 h-2 rounded-full bg-emerald-400" />
                         <Text className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Live Store</Text>
                      </View>
                      <Text className="text-white text-3xl font-black tracking-tighter">Your Shop Link</Text>
                   </View>
                   <View className="flex-row items-center bg-white/10 p-1.5 pl-4 rounded-xl border border-white/10 backdrop-blur-md">
                      <Text className="text-emerald-300 font-mono text-xs flex-1 truncate mr-2">shop.vi/{user.slug}</Text>
                      <TouchableOpacity onPress={copySlug} className="bg-white px-4 py-2 rounded-lg active:bg-emerald-50">
                          <Text className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Copy</Text>
                      </TouchableOpacity>
                   </View>
                </LinearGradient>
              </View>

              {/* CARD 2: STATUS */}
              <TouchableOpacity onPress={() => setShowUpgradeModal(true)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-row justify-between items-center relative overflow-hidden">
                 <View className="z-10 flex-1">
                    <View className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center mb-3 shadow-md">
                        <Zap size={20} color="white" fill="white" />
                    </View>
                    <Text className="text-xl font-black text-slate-900 capitalize">{activeAccessLevel} Plan</Text>
                    {isTrialDateValid && activeAccessLevel !== 'Unlimited' ? (
                        <View className="mt-2 bg-amber-50 px-3 py-1 rounded-lg w-fit self-start border border-amber-100">
                           <Text className="text-amber-700 text-[10px] font-bold uppercase">{timeLeft.d} Days Left in Trial</Text>
                        </View>
                    ) : (
                        <View className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                           <View className="h-full bg-slate-900" style={{ width: currentPlan === 'Unlimited' ? '100%' : `${(usageCount/planLimit)*100}%` }} />
                        </View>
                    )}
                    {!isTrialDateValid && <Text className="text-slate-400 text-[10px] font-bold mt-2">{usageCount} / {planLimit} Items Used</Text>}
                 </View>
                 {isTrialDateValid && (
                    <View className="items-center justify-center">
                       <View className="w-20 h-20 border-4 border-slate-100 rounded-full items-center justify-center">
                          <Text className="text-2xl font-black text-slate-900">{timeLeft.d}</Text>
                          <Text className="text-[8px] font-bold uppercase text-slate-400">Days</Text>
                       </View>
                    </View>
                 )}
              </TouchableOpacity>

              {/* CARD 3: TOTAL VIEWS */}
              <View className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                  <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Total Store Views</Text>
                      <TouchableOpacity onPress={refreshViewsOnly} disabled={loadingViews} className="bg-blue-50 px-2 py-1 rounded-md flex-row items-center gap-1">
                         <RotateCw size={10} color="#2563eb" className={loadingViews ? "animate-spin" : ""} />
                         <Text className="text-blue-600 text-[9px] font-bold">{loadingViews ? "Updating" : "Refresh"}</Text>
                      </TouchableOpacity>
                  </View>
                  <Text className="text-5xl font-black text-slate-900 tracking-tighter mb-6">{user.views?.toLocaleString() || 0}</Text>
                  <View className="flex-row items-end h-16 gap-1.5 opacity-80">
                      <View className="flex-1 bg-blue-100 rounded-t-sm h-[30%]" />
                      <View className="flex-1 bg-blue-200 rounded-t-sm h-[50%]" />
                      <View className="flex-1 bg-blue-300 rounded-t-sm h-[40%]" />
                      <View className="flex-1 bg-blue-400 rounded-t-sm h-[70%]" />
                      <View className="flex-1 bg-blue-500 rounded-t-sm h-[55%]" />
                      <View className="flex-1 bg-blue-600 rounded-t-sm h-[100%] shadow-lg shadow-blue-200" />
                  </View>
              </View>

              {/* CARD 4 & 5: SPLIT ROW */}
              <View className="flex-row gap-4">
                  <TouchableOpacity onPress={() => navigation.navigate('Inventory')} className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm justify-between min-h-[160px]">
                     <View className="items-end opacity-10"><ShoppingBag size={40} color="black" /></View>
                     <View>
                        <Text className="text-4xl font-black text-slate-900">{usageCount}</Text>
                        <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Inventory</Text>
                     </View>
                     <View className="flex-row items-center mt-2">
                        <Text className="text-emerald-600 text-[10px] font-black uppercase">Manage</Text>
                        <ChevronRight size={12} color="#059669" />
                     </View>
                  </TouchableOpacity>

                  <View className="flex-1 bg-emerald-600 p-6 rounded-[32px] shadow-lg shadow-emerald-200 justify-between min-h-[160px] relative overflow-hidden">
                     <View className="bg-white/20 w-8 h-8 rounded-lg items-center justify-center backdrop-blur-sm"><MessageCircle size={16} color="white" /></View>
                     <View className="z-10">
                        <Text className="text-white font-black text-lg leading-5 mb-1">WhatsApp Checkout</Text>
                        <View className="bg-black/10 px-2 py-1 rounded-md self-start"><Text className="text-white/80 text-[8px] font-bold uppercase">Active</Text></View>
                     </View>
                     <Globe size={80} color="white" className="absolute -bottom-6 -right-6 opacity-10" />
                  </View>
              </View>

              {/* ACTION: SHARE BUTTON */}
              <TouchableOpacity onPress={handleShare} className="bg-slate-900 p-4 rounded-2xl flex-row items-center justify-center shadow-lg mb-4">
                  <Share2 size={18} color="white" className="mr-2"/>
                  <Text className="text-white font-bold uppercase tracking-widest">Share My Store</Text>
              </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- UPGRADE MODAL --- */}
      <Modal visible={showUpgradeModal} animationType="slide" presentationStyle="pageSheet">
         <View className="flex-1 bg-white">
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-white z-10">
               <Text className="font-black text-lg text-slate-900">Manage Plan</Text>
               <TouchableOpacity onPress={() => setShowUpgradeModal(false)} className="bg-slate-100 p-2 rounded-full"><Text className="font-bold text-slate-500 text-xs">CLOSE</Text></TouchableOpacity>
            </View>
            <ScrollView className="px-6 pb-20 pt-6">
               <View className="items-center mb-8">
                  <View className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100 shadow-sm"><Crown size={40} color={isElitePlan ? "#f59e0b" : "#cbd5e1"} fill={isElitePlan ? "#f59e0b" : "none"} /></View>
                  <Text className="text-3xl font-black text-slate-900 text-center capitalize mb-1">{activeAccessLevel} Plan</Text>
                  {isTrialDateValid && activeAccessLevel !== 'Unlimited' && (<View className="bg-emerald-100 px-4 py-1 rounded-full mt-2"><Text className="text-emerald-800 font-bold text-xs">{timeLeft.d} days remaining in trial</Text></View>)}
               </View>
               <View className="gap-y-6">
                 {PLANS.map((plan, i) => {
                   const isActive = user.planType === plan.name;
                   const isQueued = queuedPlan === plan.name;
                   return (
                     <TouchableOpacity key={i} onPress={() => handleUpgrade(plan)} disabled={isActive} className={`border-2 rounded-3xl p-5 relative ${isActive || isQueued ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100'}`}>
                        {plan.isBest && <View className="absolute -top-3 right-6 bg-emerald-500 px-3 py-1 rounded-full"><Text className="text-white text-[10px] font-black uppercase">Most Popular</Text></View>}
                        <View className="flex-row justify-between items-center mb-4">
                           <View><Text className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">{plan.name}</Text><Text className="text-3xl font-black text-slate-900">{plan.price}</Text></View>
                           <View className={`w-12 h-12 rounded-full items-center justify-center ${isActive ? 'bg-emerald-100' : 'bg-slate-50'}`}>{isActive ? <Check size={24} color="#059669" /> : <CreditCard size={24} color="#94a3b8" />}</View>
                        </View>
                        {(!isActive && !isQueued) && <View className="bg-slate-900 py-4 rounded-xl items-center"><Text className="text-white font-black text-xs uppercase tracking-widest">Select Plan</Text></View>}
                        {(isActive || isQueued) && <View className="items-center py-2"><Text className="text-emerald-600 font-black text-xs uppercase tracking-widest">{isActive ? 'Current Active Plan' : 'Queued for Activation'}</Text></View>}
                     </TouchableOpacity>
                   );
                 })}
               </View>
            </ScrollView>
         </View>
      </Modal>

      {/* --- PAYSTACK WEBVIEW MODAL (MOBILE ONLY) --- */}
      {Platform.OS !== 'web' && (
        <Modal visible={!!paystackUrl} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                <View className="px-4 py-2 border-b border-slate-100 flex-row justify-between items-center">
                    <Text className="font-bold text-slate-900">Secure Payment</Text>
                    <TouchableOpacity onPress={() => setPaystackUrl(null)} className="bg-slate-100 p-2 rounded-full"><X size={20} color="#000" /></TouchableOpacity>
                </View>
                {paystackUrl && WebView && (
                    <WebView 
                        source={{ uri: paystackUrl }}
                        style={{ flex: 1 }}
                        onNavigationStateChange={handleWebViewNavigation}
                        startInLoadingState={true}
                        renderLoading={() => <View className="absolute inset-0 flex items-center justify-center bg-white"><ActivityIndicator size="large" color="#059669" /></View>}
                    />
                )}
            </SafeAreaView>
        </Modal>
      )}

      {/* --- PAYMENT VERIFICATION OVERLAY --- */}
      {verifyingPayment && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
              <View className="bg-white p-6 rounded-2xl items-center shadow-xl">
                  <ActivityIndicator size="large" color="#059669" className="mb-4" />
                  <Text className="font-bold text-slate-900">Verifying Payment...</Text>
              </View>
          </View>
      )}

    </View>
  );
}