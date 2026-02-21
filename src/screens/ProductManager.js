import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Image, Modal, 
  TextInput, ActivityIndicator, Platform, ScrollView, Animated, Easing, Dimensions, StyleSheet, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, X, Upload, Tag, FileText, Edit2, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://api.shoplinkvi.com'; 

const { width, height } = Dimensions.get('window');

const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

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

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);

  // NUCLEAR FIX 1: activeInput state completely removed to stop re-render bouncing!
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);

  const insets = useSafeAreaInsets();


  const loadData = async () => {
    setLoading(true);
    try {
      let jsonValue = Platform.OS === 'web' 
        ? localStorage.getItem('quickshop_user') 
        : await SecureStore.getItemAsync('quickshop_user');

      if (!jsonValue) return;
      const userData = JSON.parse(jsonValue);
      setUser(userData);

      const res = await axios.get(`${API_URL}/api/vendor/me`, {
          headers: { Authorization: userData.token }
      });
      
      setProducts(res.data.products || []);
      
    } catch (error) {
      console.error("Load Error:", error);
      Toast.show({ type: 'error', text1: 'Error loading products' });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!name || !price) return Toast.show({ type: 'error', text1: 'Name and Price are required' });
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('description', description);

      if (image && !image.startsWith('http')) { 
        if (Platform.OS === 'web') {
           const res = await fetch(image);
           const blob = await res.blob();
           formData.append('image', blob, 'upload.jpg');
        } else {
           formData.append('image', { uri: image, name: 'upload.jpg', type: 'image/jpeg' });
        }
      }

      let token = Platform.OS === 'web' ? JSON.parse(localStorage.getItem('quickshop_user')).token : (JSON.parse(await SecureStore.getItemAsync('quickshop_user'))).token;

      if (isEditing) {
          await axios.put(`${API_URL}/api/products/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': token } });
          Toast.show({ type: 'success', text1: 'Product Updated!' });
      } else {
          await axios.post(`${API_URL}/api/products`, formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': token } });
          Toast.show({ type: 'success', text1: 'Product Added!' });
      }
      setModalVisible(false);
      resetForm();
      loadData(); 
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: error.response?.data?.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (Platform.OS === 'web' && !confirm("Delete this product?")) return;
    try {
      let token = Platform.OS === 'web' ? JSON.parse(localStorage.getItem('quickshop_user')).token : (JSON.parse(await SecureStore.getItemAsync('quickshop_user'))).token;
      await axios.delete(`${API_URL}/api/products/${id}`, { headers: { Authorization: token } });
      Toast.show({ type: 'success', text1: 'Deleted successfully' });
      loadData(); 
    } catch (error) { Toast.show({ type: 'error', text1: 'Delete failed' }); }
  };

  const openEditModal = (item) => {
      setIsEditing(true); setEditId(item.id); setName(item.name); setPrice(item.price.toString()); setDescription(item.description || ''); setImage(item.image_url); setModalVisible(true);
  };

  const resetForm = () => { setName(''); setPrice(''); setDescription(''); setImage(null); setIsEditing(false); setEditId(null); };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={styles.productImage} resizeMode="cover" />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{item.description || "No description provided."}</Text>
        <View style={styles.productPriceBadge}>
            <Text style={styles.productPriceText}>₦{parseInt(item.price).toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.productActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtnEdit}><Edit2 size={18} color="#334155" /></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtnDelete}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
  <SafeAreaView style={{ flex: 1 }}>
    <AuroraBackground />
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.headerSubText}>Management</Text>
              <Text style={styles.headerTitle}>Inventory</Text>
            </View>
            <View style={styles.headerBadge}>
               <Text style={styles.headerBadgeText}>{products.length} Items</Text>
            </View>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            refreshing={loading && products.length > 0} 
            onRefresh={loadData}
            ListEmptyComponent={
                loading ? (
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color="#059669" style={{ marginBottom: 24, transform: [{ scale: 1.5 }] }} />
                        <Text style={styles.emptyTitle}>Loading Inventory...</Text>
                        <Text style={styles.emptyDesc}>Please wait while we arrange your shelf.</Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}><Package size={50} color="#cbd5e1" /></View>
                        <Text style={styles.emptyTitle}>Shelf is Empty</Text>
                        <Text style={styles.emptyDesc}>Add your first product to start sharing your store link.</Text>
                    </View>
                )
            }
          />

          <TouchableOpacity
  onPress={() => { resetForm(); setModalVisible(true); }}
  style={[styles.fab, { bottom: insets.bottom + 110 }]}
>
            <Plus size={32} color="white" />
          </TouchableOpacity>
      </SafeAreaView>

      <Modal
  visible={modalVisible}
  animationType="slide"
  presentationStyle="pageSheet"
  statusBarTranslucent
>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>{isEditing ? 'Edit Item' : 'New Item'}</Text>
             <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}><X size={20} color="#64748b" /></TouchableOpacity>
          </View>

          <KeyboardWrapper 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* NUCLEAR FIX 2: Bounces disabled, persistent taps handled natively */}
            <ScrollView 
              style={styles.flex1} 
              contentContainerStyle={styles.modalScroll} 
              keyboardShouldPersistTaps="handled"
              bounces={false}
              overScrollMode="never"
            >
               <TouchableOpacity onPress={pickImage} style={styles.imagePickerBox}>
                  {image ? <Image source={{ uri: image }} style={styles.imageFull} resizeMode="cover" /> : (
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.imageIconBox}><Upload size={24} color="#059669"/></View>
                      <Text style={styles.imagePickerTitle}>Upload Image</Text>
                      <Text style={styles.imagePickerSub}>Tap to select</Text>
                    </View>
                  )}
               </TouchableOpacity>

               <View style={styles.formGroup}>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Product Name</Text>
                      <View style={[styles.inputContainer, styles.inputInactive]}>
                          <Tag size={20} color="#94a3b8" style={styles.inputIcon} />
                          <TextInput 
                            placeholder="e.g. Nike Air Max" 
                            value={name} 
                            onChangeText={setName} 
                            style={styles.input}
                            placeholderTextColor="#cbd5e1"
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="none"
                            returnKeyType="next"
                          />
                      </View>
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price (₦)</Text>
                      <View style={[styles.inputContainer, styles.inputInactive]}>
                          <Text style={[styles.priceSymbol, styles.priceSymbolInactive]}>₦</Text>
                          <TextInput 
                            placeholder="0.00" 
                            value={price} 
                            onChangeText={setPrice} 
                            keyboardType="numeric"
                            style={styles.input}
                            placeholderTextColor="#cbd5e1"
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="none"
                            returnKeyType="next"
                          />
                      </View>
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Details</Text>
                      <View style={[styles.inputContainer, styles.textAreaContainer, styles.inputInactive]}>
                          <FileText size={20} color="#94a3b8" style={styles.textAreaIcon} />
                          <TextInput 
                            placeholder="Describe your product..." 
                            value={description} 
                            onChangeText={setDescription} 
                            multiline
                            textAlignVertical="top"
                            style={styles.textAreaInput}
                            placeholderTextColor="#cbd5e1"
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="none"
                            returnKeyType="done"
                          />
                      </View>
                   </View>
               </View>

               <TouchableOpacity onPress={handleSubmit} disabled={uploading} style={styles.submitBtn}>
                 {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{isEditing ? 'Save Changes' : 'Add to Inventory'}</Text>}
               </TouchableOpacity>

            </ScrollView>
          </KeyboardWrapper>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    mainContainer: { flex: 1, backgroundColor: '#f8fafc', position: 'relative' },
    auroraContainer: {
  ...StyleSheet.absoluteFillObject,
},
    blob1: { position: 'absolute', top: 100, left: -50, width: 300, height: 300, backgroundColor: '#e9d5ff', borderRadius: 150, opacity: 0.5 },
    blob2: { position: 'absolute', bottom: 100, right: -50, width: 280, height: 280, backgroundColor: '#a7f3d0', borderRadius: 140, opacity: 0.5 },
    headerContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerSubText: { color: '#64748b', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    headerTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
    headerBadge: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, marginBottom: 4 },
    headerBadgeText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
    listContent: { padding: 24, paddingBottom: 180 }, 
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.8 },
    emptyIconBox: { backgroundColor: '#ffffff', width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    emptyTitle: { color: '#0f172a', fontWeight: '900', fontSize: 20, marginBottom: 8 },
    emptyDesc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 24, fontWeight: '500' },
    productCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
    productImage: { width: 96, height: 96, borderRadius: 16, backgroundColor: '#f8fafc', marginRight: 16 },
    productInfo: { flex: 1, paddingVertical: 4 },
    productName: { fontWeight: '900', color: '#0f172a', fontSize: 18, marginBottom: 4 },
    productDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: '500' },
    productPriceBadge: { backgroundColor: '#ecfdf5', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    productPriceText: { color: '#047857', fontWeight: '900', fontSize: 14 },
    productActions: { flexDirection: 'column', gap: 12, marginLeft: 8 },
    actionBtnEdit: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    actionBtnDelete: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
    fab: {
  position: 'absolute',
  right: 24,
  backgroundColor: '#0f172a',
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 10,
  zIndex: 50,
},
    modalContainer: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    modalCloseBtn: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 20 },
    
    // NUCLEAR FIX 3: Massive paddingBottom for Android so the scroll engine never constraints the keyboard pop
    modalScroll: { padding: 24, paddingBottom: Platform.OS === 'android' ? 400 : 100 },
    
    imagePickerBox: { height: 256, backgroundColor: '#f8fafc', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', overflow: 'hidden' },
    imageFull: { width: '100%', height: '100%' },
    imageIconBox: { backgroundColor: '#ffffff', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    imagePickerTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18 },
    imagePickerSub: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    formGroup: { marginBottom: 40, gap: 20 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    inputContainer: { borderWidth: 2, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64 },
    textAreaContainer: { height: 128, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 },
    inputInactive: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
    inputIcon: { marginRight: 12 },
    textAreaIcon: { marginRight: 12, marginTop: 4 },
    input: { flex: 1, fontWeight: 'bold', color: '#0f172a', fontSize: 18, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
    textAreaInput: { flex: 1, fontWeight: 'bold', color: '#0f172a', fontSize: 16, lineHeight: 24, minHeight: 96, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
    priceSymbol: { fontSize: 18, fontWeight: 'bold', marginRight: 12 },
    priceSymbolInactive: { color: '#94a3b8' },
    submitBtn: { backgroundColor: '#059669', height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#a7f3d0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10, marginBottom: 40 },
    submitBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 18, letterSpacing: 1, textTransform: 'uppercase' }
});