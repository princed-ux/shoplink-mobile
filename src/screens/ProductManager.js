import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Image, Modal, 
  TextInput, ActivityIndicator, Platform, ScrollView, Animated, Easing, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, X, Upload, Tag, FileText, Edit2, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

// !!! MATCH THIS WITH YOUR BACKEND !!!
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
    <View style={{ position: 'absolute', width: width, height: height, zIndex: -1, backgroundColor: '#f8fafc' }}>
      <Animated.View style={{ 
        position: 'absolute', top: 100, left: -50, width: 300, height: 300, 
        backgroundColor: '#e9d5ff', borderRadius: 150, opacity: 0.5,
        transform: [{ translateX: translate1 }, { scale: 1.2 }] 
      }} blurRadius={80} />
      <Animated.View style={{ 
        position: 'absolute', bottom: 100, right: -50, width: 280, height: 280, 
        backgroundColor: '#a7f3d0', borderRadius: 140, opacity: 0.5,
        transform: [{ translateY: translate2 }, { scale: 1.1 }] 
      }} blurRadius={80} />
    </View>
  );
};

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Focus State for Custom Borders
  const [activeInput, setActiveInput] = useState(null); 

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);

  // --- HELPER FOR BORDER COLOR ---
  const getContainerStyle = (fieldName) => {
      const isActive = activeInput === fieldName;
      // If active: White bg + Emerald Border. If inactive: Slate bg + Slate Border
      return isActive 
        ? "bg-white border-emerald-500 shadow-sm" 
        : "bg-slate-50 border-slate-100";
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let jsonValue = Platform.OS === 'web' 
        ? localStorage.getItem('quickshop_user') 
        : await SecureStore.getItemAsync('quickshop_user');

      if (!jsonValue) return;
      const userData = JSON.parse(jsonValue);
      setUser(userData);

      if (userData.vendor?.slug) {
         const res = await axios.get(`${API_URL}/api/shop/${userData.vendor.slug}`);
         setProducts(res.data.products || []);
      }
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

  const resetForm = () => { setName(''); setPrice(''); setDescription(''); setImage(null); setIsEditing(false); setEditId(null); setActiveInput(null); };

  const renderProduct = ({ item }) => (
    <View className="bg-white p-4 rounded-3xl mb-4 flex-row items-center shadow-sm border border-slate-100 relative overflow-hidden">
      <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} className="w-24 h-24 rounded-2xl bg-slate-50 mr-4" resizeMode="cover" />
      <View className="flex-1 py-1">
        <Text className="font-black text-slate-900 text-lg mb-1 line-clamp-1">{item.name}</Text>
        <Text className="text-slate-400 text-xs line-clamp-2 mb-2 font-medium">{item.description || "No description provided."}</Text>
        <View className="bg-emerald-50 self-start px-3 py-1 rounded-lg">
            <Text className="text-emerald-700 font-black text-sm">₦{parseInt(item.price).toLocaleString()}</Text>
        </View>
      </View>
      <View className="flex-col gap-3 ml-2">
          <TouchableOpacity onPress={() => openEditModal(item)} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Edit2 size={18} color="#334155" /></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} className="bg-red-50 p-2.5 rounded-xl border border-red-100"><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 relative">
      <AuroraBackground />
      <SafeAreaView className="flex-1">
          <View className="px-6 pt-4 pb-2 flex-row justify-between items-end">
            <View>
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Management</Text>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">Inventory</Text>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm mb-1">
               <Text className="text-slate-900 font-bold text-xs">{products.length} Items</Text>
            </View>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            refreshing={loading}
            onRefresh={loadData}
            ListEmptyComponent={!loading && (
                <View className="items-center justify-center mt-20 opacity-80">
                  <View className="bg-white w-32 h-32 rounded-full items-center justify-center mb-6 shadow-sm border border-slate-100"><Package size={50} color="#cbd5e1" /></View>
                  <Text className="text-slate-900 font-black text-xl mb-2">Shelf is Empty</Text>
                  <Text className="text-slate-400 text-sm text-center px-10 leading-6 font-medium">Add your first product to start sharing your store link.</Text>
                </View>
            )}
          />

          <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }} className="absolute bottom-8 right-6 bg-slate-900 w-16 h-16 rounded-full items-center justify-center shadow-2xl shadow-slate-400 z-50 active:scale-95">
            <Plus size={32} color="white" />
          </TouchableOpacity>
      </SafeAreaView>

      {/* --- ADD/EDIT PRODUCT MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="px-6 py-4 flex-row justify-between items-center bg-white border-b border-slate-100">
             <Text className="text-xl font-black text-slate-900">{isEditing ? 'Edit Item' : 'New Item'}</Text>
             <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-50 p-2 rounded-full"><X size={20} color="#64748b" /></TouchableOpacity>
          </View>

          <ScrollView className="p-6">
             <TouchableOpacity onPress={pickImage} className="h-64 bg-slate-50 rounded-[32px] items-center justify-center mb-8 border-2 border-dashed border-slate-200 overflow-hidden active:bg-slate-100">
                {image ? <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" /> : (
                  <View className="items-center">
                    <View className="bg-white w-16 h-16 rounded-full items-center justify-center mb-3 shadow-sm border border-slate-100"><Upload size={24} color="#059669"/></View>
                    <Text className="text-slate-900 font-black text-lg">Upload Image</Text>
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Tap to select</Text>
                  </View>
                )}
             </TouchableOpacity>

             <View className="space-y-5 mb-10">
                 
                 {/* NAME INPUT */}
                 <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Product Name</Text>
                    <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 transition-all ${getContainerStyle('name')}`}>
                        <Tag size={20} color={activeInput === 'name' ? "#10b981" : "#94a3b8"} className="mr-3" />
                        <TextInput 
                          placeholder="e.g. Nike Air Max" 
                          value={name} 
                          onChangeText={setName} 
                          onFocus={() => setActiveInput('name')}
                          onBlur={() => setActiveInput(null)}
                          className="flex-1 font-bold text-slate-900 text-lg"
                          placeholderTextColor="#cbd5e1"
                          style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined} // <--- FIX FOR ORANGE BORDER
                        />
                    </View>
                 </View>

                 {/* PRICE INPUT */}
                 <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Price (₦)</Text>
                    <View className={`border-2 rounded-2xl flex-row items-center h-16 px-4 transition-all ${getContainerStyle('price')}`}>
                        <Text className={`text-lg font-bold mr-3 ${activeInput === 'price' ? "text-emerald-500" : "text-slate-400"}`}>₦</Text>
                        <TextInput 
                          placeholder="0.00" 
                          value={price} 
                          onChangeText={setPrice} 
                          onFocus={() => setActiveInput('price')}
                          onBlur={() => setActiveInput(null)}
                          keyboardType="numeric"
                          className="flex-1 font-bold text-slate-900 text-lg"
                          placeholderTextColor="#cbd5e1"
                          style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined} // <--- FIX FOR ORANGE BORDER
                        />
                    </View>
                 </View>

                 {/* DESCRIPTION INPUT */}
                 <View>
                    <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Details</Text>
                    <View className={`border-2 rounded-2xl flex-row items-start p-4 h-32 transition-all ${getContainerStyle('desc')}`}>
                        <FileText size={20} color={activeInput === 'desc' ? "#10b981" : "#94a3b8"} className="mr-3 mt-1" />
                        <TextInput 
                          placeholder="Describe your product..." 
                          value={description} 
                          onChangeText={setDescription} 
                          onFocus={() => setActiveInput('desc')}
                          onBlur={() => setActiveInput(null)}
                          multiline
                          className="flex-1 font-bold text-slate-900 text-base leading-6"
                          textAlignVertical="top"
                          placeholderTextColor="#cbd5e1"
                          style={Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined} // <--- FIX FOR ORANGE BORDER
                        />
                    </View>
                 </View>
             </View>

             <TouchableOpacity onPress={handleSubmit} disabled={uploading} className="bg-emerald-600 h-16 rounded-2xl items-center justify-center shadow-lg shadow-emerald-200 mb-10 active:scale-[0.98]">
               {uploading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg tracking-widest uppercase">{isEditing ? 'Save Changes' : 'Add to Inventory'}</Text>}
             </TouchableOpacity>

          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}