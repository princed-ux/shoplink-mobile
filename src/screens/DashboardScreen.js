import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Image, Share, 
  RefreshControl, Platform, Modal, Animated, Easing, Dimensions, StatusBar, ActivityIndicator, StyleSheet
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
const API_URL = 'https://api.shoplinkvi.com'; 

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
    <View style={styles.auroraContainer}>
      <Animated.View style={[
        styles.blob1,
        { transform: [{ translateX: translate1 }, { scale: 1.2 }] }
      ]} blurRadius={80} />
      <Animated.View style={[
        styles.blob2,
        { transform: [{ translateY: translate2 }, { scale: 1.1 }] }
      ]} blurRadius={80} />
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

  // --- WEB ONLY: Handle Redirect Back from Paystack ---
  useEffect(() => {
    if (Platform.OS === 'web') {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference');
        
        if (reference) {
            window.history.replaceState({}, document.title, window.location.pathname);
            verifyPayment(reference);
        }
    }
  }, []);

  // --- ACTIONS ---
  const handleUpgrade = async (plan) => {
    try {
       let callbackUrl = "https://standard.paystack.co/close"; 
       if (Platform.OS === 'web') {
           callbackUrl = window.location.href; 
       }

       const res = await axios.post(`${API_URL}/api/paystack/initialize`, {
         email: `${user.phone}@shoplink.vi`,
         amount: plan.amount,
         callback_url: callbackUrl,
         metadata: { vendorId: user.id, phone: user.phone, plan: plan.name }
       }, { headers: { Authorization: user.token } });

       if (res.data.status && res.data.data.authorization_url) {
           if (Platform.OS === 'web') {
               window.location.href = res.data.data.authorization_url;
           } else {
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

  const handleWebViewNavigation = (navState) => {
      const { url } = navState;
      if ((url.includes('reference=') || url.includes('close')) && !verifyingPayment) {
          const match = url.match(/reference=([^&]*)/);
          const reference = match ? match[1] : null;

          if (reference) {
              setPaystackUrl(null); 
              verifyPayment(reference); 
          } else {
              setPaystackUrl(null);
          }
      }
  };

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

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Store...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      {isElitePlan && <AuroraBackground />}

      <SafeAreaView style={styles.flex1}>
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
          showsVerticalScrollIndicator={false}
        >
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingText}>{greeting}</Text>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopNameText}>{user.shopName}</Text>
                {user.is_pro && <Check size={16} color="#3b82f6" />}
              </View>
            </View>
            
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                {user.logo ? (
                    <Image source={{ uri: user.logo }} style={styles.avatarImage} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{user.shopName?.charAt(0)}</Text>
                    </View>
                )}
            </TouchableOpacity>
          </View>

          <View style={styles.contentPadding}>

              {/* CARD 1: SHOP LINK */}
              <View style={[styles.cardOuter, styles.shadowLg]}>
                <LinearGradient colors={['#0f172a', '#334155']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
                   <View style={styles.gradientGlow} />
                   <View>
                      <View style={styles.liveBadgeRow}>
                         <View style={styles.liveDot} />
                         <Text style={styles.liveText}>Live Store</Text>
                      </View>
                      <Text style={styles.linkTitle}>Your Shop Link</Text>
                   </View>
                   <View style={styles.linkUrlBox}>
                      <Text style={styles.linkUrlText} numberOfLines={1}>shop.vi/{user.slug}</Text>
                      <TouchableOpacity onPress={copySlug} style={styles.copyButton}>
                          <Text style={styles.copyButtonText}>Copy</Text>
                      </TouchableOpacity>
                   </View>
                </LinearGradient>
              </View>

              {/* CARD 2: STATUS */}
              <TouchableOpacity onPress={() => setShowUpgradeModal(true)} style={[styles.card, styles.shadowSm, styles.flexRowBetween]}>
                 <View style={styles.flex1}>
                    <View style={styles.iconBoxDark}>
                        <Zap size={20} color="white" />
                    </View>
                    <Text style={styles.planTitleText}>{activeAccessLevel} Plan</Text>
                    
                    {isTrialDateValid && activeAccessLevel !== 'Unlimited' ? (
                        <View style={styles.trialPill}>
                           <Text style={styles.trialPillText}>{timeLeft.d} Days Left in Trial</Text>
                        </View>
                    ) : (
                        <View style={styles.progressBarBg}>
                           <View style={[styles.progressBarFill, { width: currentPlan === 'Unlimited' ? '100%' : `${(usageCount/planLimit)*100}%` }]} />
                        </View>
                    )}
                    {!isTrialDateValid && <Text style={styles.usageText}>{usageCount} / {planLimit} Items Used</Text>}
                 </View>
                 
                 {isTrialDateValid && (
                    <View style={styles.timerCircleOuter}>
                       <View style={styles.timerCircleInner}>
                          <Text style={styles.timerNumber}>{timeLeft.d}</Text>
                          <Text style={styles.timerLabel}>Days</Text>
                       </View>
                    </View>
                 )}
              </TouchableOpacity>

              {/* CARD 3: TOTAL VIEWS */}
              <View style={[styles.cardLarge, styles.shadowSm]}>
                  <View style={styles.viewsHeaderRow}>
                      <Text style={styles.viewsHeaderLabel}>Total Store Views</Text>
                      <TouchableOpacity onPress={refreshViewsOnly} disabled={loadingViews} style={styles.refreshBtn}>
                         <Animated.View style={loadingViews ? styles.spinAnimation : {}}>
                            <RotateCw size={10} color="#2563eb" />
                         </Animated.View>
                         <Text style={styles.refreshBtnText}>{loadingViews ? "Updating" : "Refresh"}</Text>
                      </TouchableOpacity>
                  </View>
                  <Text style={styles.viewsNumberText}>{user.views?.toLocaleString() || 0}</Text>
                  
                  <View style={styles.chartRow}>
                      <View style={[styles.chartBar, styles.chartBar1]} />
                      <View style={[styles.chartBar, styles.chartBar2]} />
                      <View style={[styles.chartBar, styles.chartBar3]} />
                      <View style={[styles.chartBar, styles.chartBar4]} />
                      <View style={[styles.chartBar, styles.chartBar5]} />
                      <View style={[styles.chartBar, styles.chartBar6, styles.chartBarShadow]} />
                  </View>
              </View>

              {/* CARD 4 & 5: SPLIT ROW */}
              <View style={styles.splitRow}>
                  <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={[styles.splitCard, styles.shadowSm]}>
                     <View style={styles.bgIconBox}><ShoppingBag size={40} color="black" /></View>
                     <View>
                        <Text style={styles.splitCardNumber}>{usageCount}</Text>
                        <Text style={styles.splitCardLabel}>Inventory</Text>
                     </View>
                     <View style={styles.manageRow}>
                        <Text style={styles.manageText}>Manage</Text>
                        <ChevronRight size={12} color="#059669" />
                     </View>
                  </TouchableOpacity>

                  <View style={[styles.splitCardGreen, styles.shadowGreen]}>
                     <View style={styles.glassIconBox}><MessageCircle size={16} color="white" /></View>
                     <View style={styles.z10}>
                        <Text style={styles.whatsappCardTitle}>WhatsApp Checkout</Text>
                        <View style={styles.activePill}><Text style={styles.activePillText}>Active</Text></View>
                     </View>
                     <Globe size={80} color="white" style={styles.bgGlobeIcon} />
                  </View>
              </View>

              {/* ACTION: SHARE BUTTON */}
              <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                  <Share2 size={18} color="white" style={{ marginRight: 8 }}/>
                  <Text style={styles.shareBtnText}>Share My Store</Text>
              </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- UPGRADE MODAL --- */}
      <Modal visible={showUpgradeModal} animationType="slide" presentationStyle="pageSheet">
         <View style={styles.flex1BgWhite}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Manage Plan</Text>
               <TouchableOpacity onPress={() => setShowUpgradeModal(false)} style={styles.closeBtn}>
                   <Text style={styles.closeBtnText}>CLOSE</Text>
               </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
               <View style={styles.modalHero}>
                  <View style={[styles.modalCrownBox, styles.shadowSm]}>
                      <Crown size={40} color={isElitePlan ? "#f59e0b" : "#cbd5e1"} />
                  </View>
                  <Text style={styles.modalHeroTitle}>{activeAccessLevel} Plan</Text>
                  {isTrialDateValid && activeAccessLevel !== 'Unlimited' && (
                      <View style={styles.modalTrialPill}>
                          <Text style={styles.modalTrialText}>{timeLeft.d} days remaining in trial</Text>
                      </View>
                  )}
               </View>
               
               <View style={styles.planList}>
                 {PLANS.map((plan, i) => {
                   const isActive = user.planType === plan.name;
                   const isQueued = queuedPlan === plan.name;
                   const cardActiveStyle = isActive || isQueued ? styles.planCardActive : styles.planCardInactive;
                   
                   return (
                     <TouchableOpacity key={i} onPress={() => handleUpgrade(plan)} disabled={isActive} style={[styles.planCard, cardActiveStyle]}>
                        {plan.isBest && (
                            <View style={styles.bestPill}><Text style={styles.bestPillText}>Most Popular</Text></View>
                        )}
                        <View style={styles.planCardHeaderRow}>
                           <View>
                               <Text style={styles.planName}>{plan.name}</Text>
                               <Text style={styles.planPrice}>{plan.price}</Text>
                           </View>
                           <View style={[styles.planIconCircle, isActive ? styles.planIconCircleActive : {}]}>
                               {isActive ? <Check size={24} color="#059669" /> : <CreditCard size={24} color="#94a3b8" />}
                           </View>
                        </View>
                        {(!isActive && !isQueued) && (
                            <View style={styles.selectPlanBtn}><Text style={styles.selectPlanBtnText}>Select Plan</Text></View>
                        )}
                        {(isActive || isQueued) && (
                            <View style={styles.currentPlanBtn}>
                                <Text style={styles.currentPlanText}>{isActive ? 'Current Active Plan' : 'Queued for Activation'}</Text>
                            </View>
                        )}
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
            <SafeAreaView style={styles.flex1BgWhite}>
                <View style={styles.modalHeader}>
                    <Text style={styles.webviewTitle}>Secure Payment</Text>
                    <TouchableOpacity onPress={() => setPaystackUrl(null)} style={styles.closeBtn}>
                        <X size={20} color="#000" />
                    </TouchableOpacity>
                </View>
                {paystackUrl && WebView && (
                    <WebView 
                        source={{ uri: paystackUrl }}
                        style={styles.flex1}
                        onNavigationStateChange={handleWebViewNavigation}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator size="large" color="#059669" />
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>
        </Modal>
      )}

      {/* --- PAYMENT VERIFICATION OVERLAY --- */}
      {verifyingPayment && (
          <View style={styles.verifyOverlay}>
              <View style={styles.verifyBox}>
                  <ActivityIndicator size="large" color="#059669" style={{ marginBottom: 16 }} />
                  <Text style={styles.verifyText}>Verifying Payment...</Text>
              </View>
          </View>
      )}

    </View>
  );
}

// ==========================================
// STANDARD STYLES (NO TAILWIND NEEDED)
// ==========================================
const styles = StyleSheet.create({
    // Globals
    flex1: { flex: 1 },
    flex1BgWhite: { flex: 1, backgroundColor: '#ffffff' },
    mainContainer: { flex: 1, backgroundColor: '#f8fafc', position: 'relative' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
    loadingText: { color: '#94a3b8', fontWeight: 'bold' },
    contentPadding: { paddingHorizontal: 24, paddingBottom: 80, gap: 24 },
    z10: { zIndex: 10 },
    
    // Aurora Background
    auroraContainer: { position: 'absolute', width: width, height: height, zIndex: -1, backgroundColor: '#f8fafc' },
    blob1: { position: 'absolute', top: -50, left: -50, width: 300, height: 300, backgroundColor: '#e9d5ff', borderRadius: 150, opacity: 0.5 },
    blob2: { position: 'absolute', top: 50, right: -50, width: 280, height: 280, backgroundColor: '#a7f3d0', borderRadius: 140, opacity: 0.5 },

    // Shadows
    shadowSm: { shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    shadowLg: { shadowColor: '#cbd5e1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
    shadowGreen: { shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },

    // Header
    headerRow: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greetingText: { color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    shopNameRow: { flexDirection: 'row', alignItems: 'center' },
    shopNameText: { fontSize: 24, fontWeight: '900', color: '#0f172a', textTransform: 'capitalize', marginRight: 4, letterSpacing: -0.5 },
    avatarImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#ffffff' },
    avatarFallback: { width: 48, height: 48, backgroundColor: '#0f172a', borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
    avatarFallbackText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },

    // Card 1: Shop Link
    cardOuter: { borderRadius: 32, overflow: 'hidden' },
    gradientCard: { padding: 24, height: 192, justifyContent: 'space-between' },
    gradientGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 80 },
    liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
    liveText: { color: '#6ee7b7', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    linkTitle: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: -1 },
    linkUrlBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, paddingLeft: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    linkUrlText: { color: '#6ee7b7', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, flex: 1, marginRight: 8 },
    copyButton: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    copyButtonText: { color: '#0f172a', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

    // Card 2: Status
    card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
    flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconBoxDark: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    planTitleText: { fontSize: 20, fontWeight: '900', color: '#0f172a', textTransform: 'capitalize' },
    trialPill: { marginTop: 8, backgroundColor: '#fffbeb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fef3c7' },
    trialPillText: { color: '#b45309', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    progressBarBg: { marginTop: 16, width: '100%', backgroundColor: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#0f172a' },
    usageText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginTop: 8 },
    timerCircleOuter: { alignItems: 'center', justifyContent: 'center' },
    timerCircleInner: { width: 80, height: 80, borderWidth: 4, borderColor: '#f1f5f9', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    timerNumber: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    timerLabel: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' },

    // Card 3: Views
    cardLarge: { backgroundColor: '#ffffff', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', position: 'relative', overflow: 'hidden' },
    viewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    viewsHeaderLabel: { color: '#94a3b8', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    refreshBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
    refreshBtnText: { color: '#2563eb', fontSize: 9, fontWeight: 'bold' },
    viewsNumberText: { fontSize: 48, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginBottom: 24 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 6, opacity: 0.8 },
    chartBar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
    chartBar1: { backgroundColor: '#dbeafe', height: '30%' },
    chartBar2: { backgroundColor: '#bfdbfe', height: '50%' },
    chartBar3: { backgroundColor: '#93c5fd', height: '40%' },
    chartBar4: { backgroundColor: '#60a5fa', height: '70%' },
    chartBar5: { backgroundColor: '#3b82f6', height: '55%' },
    chartBar6: { backgroundColor: '#2563eb', height: '100%' },
    chartBarShadow: { shadowColor: '#bfdbfe', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },

    // Split Row
    splitRow: { flexDirection: 'row', gap: 16 },
    splitCard: { flex: 1, backgroundColor: '#ffffff', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', justifyContent: 'space-between', minHeight: 160 },
    bgIconBox: { alignItems: 'flex-end', opacity: 0.1 },
    splitCardNumber: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
    splitCardLabel: { color: '#94a3b8', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    manageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    manageText: { color: '#059669', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

    splitCardGreen: { flex: 1, backgroundColor: '#059669', padding: 24, borderRadius: 32, justifyContent: 'space-between', minHeight: 160, position: 'relative', overflow: 'hidden' },
    glassIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    whatsappCardTitle: { color: '#ffffff', fontWeight: '900', fontSize: 18, lineHeight: 20, marginBottom: 4 },
    activePill: { backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    activePillText: { color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
    bgGlobeIcon: { position: 'absolute', bottom: -24, right: -24, opacity: 0.1 },

    // Share Button
    shareBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, marginBottom: 16 },
    shareBtnText: { color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },

    // Modals & Upgrade
    modalHeader: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', zIndex: 10 },
    modalTitle: { fontWeight: '900', fontSize: 18, color: '#0f172a' },
    closeBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 16 },
    closeBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
    modalScrollContent: { paddingHorizontal: 24, paddingBottom: 80, paddingTop: 24 },
    modalHero: { alignItems: 'center', marginBottom: 32 },
    modalCrownBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 40, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    modalHeroTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a', textAlign: 'center', textTransform: 'capitalize', marginBottom: 4 },
    modalTrialPill: { backgroundColor: '#d1fae5', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 16, marginTop: 8 },
    modalTrialText: { color: '#065f46', fontWeight: 'bold', fontSize: 12 },
    
    planList: { gap: 24 },
    planCard: { borderWidth: 2, borderRadius: 24, padding: 20, position: 'relative' },
    planCardInactive: { backgroundColor: '#ffffff', borderColor: '#f1f5f9' },
    planCardActive: { backgroundColor: '#ffffff', borderColor: '#10b981', shadowColor: '#d1fae5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 10, elevation: 8 },
    bestPill: { position: 'absolute', top: -12, right: 24, backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    bestPillText: { color: '#ffffff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    planCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    planName: { color: '#94a3b8', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    planPrice: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
    planIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    planIconCircleActive: { backgroundColor: '#d1fae5' },
    selectPlanBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    selectPlanBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    currentPlanBtn: { alignItems: 'center', paddingVertical: 8 },
    currentPlanText: { color: '#059669', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

    // Webview & Overlay
    webviewTitle: { fontWeight: 'bold', color: '#0f172a' },
    webviewLoading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    verifyOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    verifyBox: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
    verifyText: { fontWeight: 'bold', color: '#0f172a' }
});