import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Store,
  Link as LinkIcon,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  AlertCircle,
  ChevronDown,
  X,
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

  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState('idle');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  const getContainerStyle = (field) => [
    styles.inputContainer,
    activeInput === field ? styles.inputActive : styles.inputInactive,
  ];

  useEffect(() => {
    if (shopName) {
      const generated = shopName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setSlug(generated);
    } else {
      setSlug('');
      setSlugStatus('idle');
    }
  }, [shopName]);

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
      } catch {
        setSlugStatus('taken');
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [slug]);

  const handleNextStep = async () => {
    if (!shopName || !slug || !phone || !password)
      return Toast.show({ type: 'error', text1: 'Please fill all fields' });

    if (slugStatus === 'taken')
      return Toast.show({
        type: 'error',
        text1: 'Store Link Taken',
        text2: 'Please modify your shop name slightly.',
      });

    if (password.length < 6)
      return Toast.show({
        type: 'error',
        text1: 'Password too short (min 6 chars)',
      });

    setLoading(true);
    try {
      await axios.get(`${API_URL}/api/check-phone/${phone}`);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 409) {
        Toast.show({
          type: 'error',
          text1: 'Phone Number Taken',
          text2: 'This number is already registered.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (isSkipping = false) => {
    if (!isSkipping && !securityAnswer.trim())
      return Toast.show({
        type: 'error',
        text1: 'Security answer required',
      });

    setLoading(true);

    const payload = {
      shopName,
      slug,
      phone,
      password,
      securityQuestion: isSkipping ? '' : securityQuestion,
      securityAnswer: isSkipping ? '' : securityAnswer,
    };

    try {
      const res = await axios.post(`${API_URL}/api/register`, payload);

      if (Platform.OS === 'web') {
        localStorage.setItem('quickshop_user', JSON.stringify(res.data));
      } else {
        await SecureStore.setItemAsync(
          'quickshop_user',
          JSON.stringify(res.data)
        );
      }

      Toast.show({
        type: 'success',
        text1: `Welcome ${res.data.vendor.shop_name}!`,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <FallingBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.centerContainer}>
          <View style={styles.headerBox}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>ShopLink.vi</Text>
            <Text style={styles.subtitle}>Start Your Business</Text>
          </View>

          <View style={styles.formBox}>
            {step === 1 && (
              <>
                {/* SHOP NAME */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Shop Name</Text>
                  <View style={getContainerStyle('shopName')}>
                    <Store size={20} color="#94a3b8" style={styles.icon} />
                    <TextInput
                      placeholder="My Awesome Store"
                      value={shopName}
                      onChangeText={setShopName}
                      onFocus={() => setActiveInput('shopName')}
                      onBlur={() => setActiveInput(null)}
                      style={styles.input}
                      autoComplete="organization"
                      textContentType="organizationName"
                    />
                  </View>
                </View>

                {/* PHONE */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>WhatsApp Number</Text>
                  <View style={getContainerStyle('phone')}>
                    <Phone size={20} color="#94a3b8" style={styles.icon} />
                    <TextInput
                      placeholder="080 1234 5678"
                      value={phone}
                      onChangeText={setPhone}
                      onFocus={() => setActiveInput('phone')}
                      onBlur={() => setActiveInput(null)}
                      keyboardType="phone-pad"
                      style={styles.input}
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                    />
                  </View>
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={getContainerStyle('password')}>
                    <Lock size={20} color="#94a3b8" style={styles.icon} />
                    <TextInput
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setActiveInput('password')}
                      onBlur={() => setActiveInput(null)}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      autoComplete="password"
                      textContentType="password"
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
                  onPress={handleNextStep}
                  disabled={loading}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>BACK</Text>
                </TouchableOpacity>

                <View style={styles.securityHeader}>
                  <View style={styles.iconCircle}>
                    <ShieldCheck size={32} color="#059669" />
                  </View>
                  <Text style={styles.securityTitle}>
                    Secure Your Account
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Answer</Text>
                  <View style={getContainerStyle('secAnswer')}>
                    <TextInput
                      placeholder="Type your answer..."
                      value={securityAnswer}
                      onChangeText={setSecurityAnswer}
                      onFocus={() => setActiveInput('secAnswer')}
                      onBlur={() => setActiveInput(null)}
                      style={styles.input}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleRegister(false)}
                  disabled={loading}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitText}>
                      Complete Registration
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL */}
      <Modal visible={showQuestionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {SECURITY_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.modalItem}
                  onPress={() => {
                    setSecurityQuestion(q);
                    setShowQuestionModal(false);
                  }}
                >
                  <Text>{q}</Text>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerBox: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80 },
  title: { fontSize: 28, fontWeight: '900', color: '#064e3b' },
  subtitle: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },
  formBox: { gap: 20 },
  inputGroup: { width: '100%' },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  inputActive: { borderColor: '#10b981' },
  inputInactive: { borderColor: '#f1f5f9' },
  icon: { marginRight: 12 },
  input: { flex: 1, fontWeight: 'bold', fontSize: 16 },
  submitBtn: {
    backgroundColor: '#047857',
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backBtnText: { fontWeight: 'bold' },
  securityHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 64,
    height: 64,
    backgroundColor: '#ecfdf5',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  securityTitle: { fontSize: 22, fontWeight: '900' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});