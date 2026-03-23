import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import UserDrawer from './UserDrawer';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getToken, logout, notifyAuthChange } from '../../utils/helper';
import { authColors, authFonts } from '../../theme/authTheme';
import { listProducts } from '../../redux/actions/productActions';
import { listMyOrders } from '../../redux/actions/orderActions';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const Profile = ({ navigation }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bottomNavScrollY, setBottomNavScrollY] = useState(0);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [zipcode, setZipcode] = useState('');
  const { products = [] } = useSelector((state) => state.productList || {});
  const { orders: myOrders = [] } = useSelector((state) => state.orderListMy || {});

  useEffect(() => {
    fetchProfile();
    dispatch(listProducts());
    dispatch(listMyOrders());

    const unsubscribe = navigation.addListener('focus', fetchProfile);
    return unsubscribe;
  }, [dispatch, navigation]);

  const syncStoredUser = async (userData) => {
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    const shellUser = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      id: userData._id || userData.id,
      avatar: userData.avatar || null,
    };

    await AsyncStorage.setItem('user', JSON.stringify(shellUser));
    notifyAuthChange(userData);
  };

  const hydrateForm = (userData) => {
    setUser(userData);
    setName(userData?.name || '');
    setContact(userData?.contact || '');
    setCity(userData?.address?.city || '');
    setBarangay(userData?.address?.barangay || '');
    setStreet(userData?.address?.street || '');
    setZipcode(userData?.address?.zipcode || '');
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data.user || response.data;
      hydrateForm(userData);
      await syncStoredUser(userData);
    } catch (error) {
      console.error('Fetch profile error:', error.response?.data || error.message);

      try {
        if (error.response?.status === 401) {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          hydrateForm(JSON.parse(storedUser));
        } else {
          Alert.alert('Error', 'Failed to load profile from server');
        }
      } catch (storageError) {
        console.error('Error reading from storage:', storageError);
        Alert.alert('Error', 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const openPhotoOptions = () => {
    if (uploadingImage) {
      return;
    }
    setPhotoOptionsVisible(true);
  };

  const closePhotoOptions = () => {
    if (!uploadingImage) {
      setPhotoOptionsVisible(false);
    }
  };

  const pickImage = async () => {
    try {
      closePhotoOptions();
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to change your avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      closePhotoOptions();
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take a profile photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const uploadAvatar = async (imageUri) => {
    setUploadingImage(true);

    try {
      const manipulatedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 500 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const token = await getToken();
      if (!token) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri: manipulatedImage.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const response = await axios.put(`${BACKEND_URL}/api/v1/users/me/update`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedUser = response.data.user || response.data;
      hydrateForm(updatedUser);
      await syncStoredUser(updatedUser);
      Alert.alert('Success', 'Avatar updated successfully');
    } catch (error) {
      console.error('Upload avatar error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setUpdating(true);

    try {
      const token = await getToken();
      if (!token) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const updatedData = { name: name.trim() };

      if (contact.trim()) updatedData.contact = contact.trim();
      if (city.trim()) updatedData.city = city.trim();
      if (barangay.trim()) updatedData.barangay = barangay.trim();
      if (street.trim()) updatedData.street = street.trim();

      if (zipcode.trim()) {
        if (!/^\d{4}$/.test(zipcode.trim())) {
          Alert.alert('Error', 'Please enter a valid 4-digit zipcode');
          setUpdating(false);
          return;
        }
        updatedData.zipcode = zipcode.trim();
      }

      const response = await axios.put(`${BACKEND_URL}/api/v1/users/me/update`, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const updatedUser = response.data.user || response.data;
      hydrateForm(updatedUser);
      await syncStoredUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.trim().split(' ');
    return names.length >= 2 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  const getProviderMeta = () => {
    switch (user?.authProvider) {
      case 'google':
        return { icon: 'logo-google', color: '#DB4437', label: 'Google Login' };
      case 'facebook':
        return { icon: 'logo-facebook', color: '#4267B2', label: 'Facebook Login' };
      default:
        return { icon: 'mail', color: authColors.sparkle, label: 'Email Login' };
    }
  };

  const providerMeta = getProviderMeta();
  const profileCompletion = [name, contact, city, barangay, street, zipcode].filter(Boolean).length;
  const completionPercent = Math.round((profileCompletion / 6) * 100);
  const collectionCount = [...new Set(products.map((product) => product.category).filter(Boolean))].length;
  const totalOrders = myOrders.length;
  const addressParts = [user?.address?.street, user?.address?.barangay, user?.address?.city, user?.address?.zipcode].filter(Boolean);
  const formattedAddress = addressParts.length ? addressParts.join(', ') : 'Add your address details to complete your collector profile.';

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={authColors.accent} />
          <Text style={styles.loadingText}>Loading player profile...</Text>
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer bottomNavScrollY={bottomNavScrollY}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setBottomNavScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroGlow, styles.heroGlowOne]} />
          <View style={[styles.heroGlow, styles.heroGlowTwo]} />
          <Text style={styles.heroEyebrow}>Collector Profile</Text>

          <TouchableOpacity style={styles.avatarContainer} onPress={openPhotoOptions} disabled={uploadingImage} activeOpacity={0.9}>
            {uploadingImage ? (
              <View style={[styles.avatar, styles.avatarUploading]}>
                <ActivityIndicator size="large" color={authColors.textPrimary} />
              </View>
            ) : user?.avatar?.url ? (
              <Image source={{ uri: user.avatar.url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{getUserInitials()}</Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={16} color={authColors.textPrimary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.playerName}>{user?.name || 'Collector'}</Text>
          <Text style={styles.playerEmail}>{user?.email || 'No email found'}</Text>

          <View style={styles.identityRow}>
            <View style={styles.metaChip}>
              <Ionicons name={providerMeta.icon} size={15} color={providerMeta.color} />
              <Text style={styles.metaChipText}>{providerMeta.label}</Text>
            </View>
            <View style={[styles.verifiedBadge, user?.isVerified ? styles.verifiedBadgeSuccess : styles.verifiedBadgeDanger]}>
              <Ionicons
                name={user?.isVerified ? 'checkmark-circle' : 'alert-circle'}
                size={15}
                color={user?.isVerified ? authColors.success : authColors.danger}
              />
              <Text style={styles.verifiedBadgeText}>{user?.isVerified ? 'Verified Collector' : 'Needs Verification'}</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{collectionCount}</Text>
              <Text style={styles.heroStatLabel}>Collections</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{totalOrders}</Text>
              <Text style={styles.heroStatLabel}>Total Ordered</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{completionPercent}%</Text>
              <Text style={styles.heroStatLabel}>Profile Power</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryAction} onPress={() => setEditModalVisible(true)} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={authColors.textPrimary} />
            <Text style={styles.primaryActionText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Card</Text>
          <View style={styles.infoPanel}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="mail-outline" size={18} color={authColors.accentSoft} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="call-outline" size={18} color={authColors.sparkle} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>{user?.contact || 'No contact yet'}</Text>
              </View>
            </View>

            <View style={styles.infoFooterRow}>
              <View style={styles.subtlePill}>
                <Ionicons name="albums-outline" size={14} color={authColors.sparkle} />
                <Text style={styles.subtlePillText}>{collectionCount} collections in store</Text>
              </View>
              <View style={styles.subtlePill}>
                <Ionicons name="receipt-outline" size={14} color={authColors.accentSoft} />
                <Text style={styles.subtlePillText}>{totalOrders} orders placed</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Card</Text>
          <View style={styles.addressCardFeature}>
            <View style={styles.addressCardHeader}>
              <View style={styles.addressIconBadge}>
                <Ionicons name="location-outline" size={18} color={authColors.sparkle} />
              </View>
              <View style={styles.addressCardTextWrap}>
                <Text style={styles.addressCardTitle}>Delivery Address</Text>
                <Text style={styles.addressCardSubtitle}>Used for shipping and order updates</Text>
              </View>
            </View>

            <Text style={styles.addressFeatureValue}>{formattedAddress}</Text>

            <View style={styles.addressMiniGrid}>
              <View style={styles.addressMiniItem}>
                <Text style={styles.addressMiniLabel}>City</Text>
                <Text style={styles.addressMiniValue}>{user?.address?.city || 'Not set'}</Text>
              </View>
              <View style={styles.addressMiniItem}>
                <Text style={styles.addressMiniLabel}>Barangay</Text>
                <Text style={styles.addressMiniValue}>{user?.address?.barangay || 'Not set'}</Text>
              </View>
              <View style={styles.addressMiniItem}>
                <Text style={styles.addressMiniLabel}>Street</Text>
                <Text style={styles.addressMiniValue}>{user?.address?.street || 'Not set'}</Text>
              </View>
              <View style={styles.addressMiniItem}>
                <Text style={styles.addressMiniLabel}>Zip</Text>
                <Text style={styles.addressMiniValue}>{user?.address?.zipcode || 'Not set'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.85}>
            <Ionicons name="key-outline" size={20} color={authColors.textPrimary} />
            <View style={styles.secondaryActionTextWrap}>
              <Text style={styles.secondaryActionTitle}>Security Controls</Text>
              <Text style={styles.secondaryActionSubtitle}>Change password and protect your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={authColors.textMuted} />
          </TouchableOpacity>
        </View>

        <Modal visible={photoOptionsVisible} animationType="fade" transparent onRequestClose={closePhotoOptions}>
          <View style={styles.photoModalBackdrop}>
            <TouchableOpacity style={styles.photoModalDismissArea} activeOpacity={1} onPress={closePhotoOptions} />
            <View style={styles.photoSheet}>
              <View style={styles.photoSheetHandle} />
              <Text style={styles.photoSheetTitle}>Update Collector Photo</Text>
              <Text style={styles.photoSheetSubtitle}>Choose how you want to set your profile image.</Text>

              <TouchableOpacity style={styles.photoOptionCard} onPress={takePhoto} activeOpacity={0.88}>
                <View style={styles.photoOptionIconWrap}>
                  <Ionicons name="camera-outline" size={20} color={authColors.textPrimary} />
                </View>
                <View style={styles.photoOptionTextWrap}>
                  <Text style={styles.photoOptionTitle}>Take Photo</Text>
                  <Text style={styles.photoOptionSubtitle}>Use your camera for a fresh profile shot.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={authColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoOptionCard} onPress={pickImage} activeOpacity={0.88}>
                <View style={[styles.photoOptionIconWrap, styles.photoOptionIconAlt]}>
                  <Ionicons name="images-outline" size={20} color={authColors.textPrimary} />
                </View>
                <View style={styles.photoOptionTextWrap}>
                  <Text style={styles.photoOptionTitle}>Upload Photo</Text>
                  <Text style={styles.photoOptionSubtitle}>Pick an image from your gallery.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={authColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoCancelButton} onPress={closePhotoOptions} activeOpacity={0.88}>
                <Text style={styles.photoCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={authColors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  <Text style={styles.modalSectionTitle}>Identity</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      placeholderTextColor={authColors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={user?.email}
                      editable={false}
                      placeholderTextColor={authColors.textMuted}
                    />
                    <Text style={styles.inputHint}>Email cannot be changed</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      value={contact}
                      onChangeText={setContact}
                      placeholder="Enter your contact number"
                      placeholderTextColor={authColors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <Text style={styles.modalSectionTitle}>Address Card</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Enter your city"
                      placeholderTextColor={authColors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Barangay</Text>
                    <TextInput
                      style={styles.input}
                      value={barangay}
                      onChangeText={setBarangay}
                      placeholder="Enter your barangay"
                      placeholderTextColor={authColors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Street</Text>
                    <TextInput
                      style={styles.input}
                      value={street}
                      onChangeText={setStreet}
                      placeholder="Enter your street"
                      placeholderTextColor={authColors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Zip Code</Text>
                    <TextInput
                      style={styles.input}
                      value={zipcode}
                      onChangeText={setZipcode}
                      placeholder="Enter your zip code"
                      placeholderTextColor={authColors.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.inputHint}>4-digit zip code</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateProfile} disabled={updating}>
                  {updating ? (
                    <ActivityIndicator size="small" color={authColors.textPrimary} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </UserDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.background,
  },
  loadingText: {
    marginTop: 12,
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
  },
  heroGlowOne: {
    top: -60,
    right: -50,
  },
  heroGlowTwo: {
    bottom: -80,
    left: -60,
  },
  heroEyebrow: {
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: authColors.accentSoft,
  },
  avatarUploading: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.panelSoft,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: authColors.accentSoft,
    backgroundColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: authColors.textPrimary,
    fontSize: 42,
    fontFamily: authFonts.bold,
  },
  editAvatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.accent,
    borderWidth: 2,
    borderColor: authColors.background,
  },
  playerName: {
    color: authColors.accentSoft,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: authFonts.brand,
    textAlign: 'center',
    marginBottom: 6,
  },
  playerEmail: {
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  metaChipSuccess: {
    backgroundColor: 'rgba(143, 191, 122, 0.12)',
  },
  metaChipDanger: {
    backgroundColor: 'rgba(224, 122, 106, 0.12)',
  },
  metaChipText: {
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifiedBadgeSuccess: {
    backgroundColor: 'rgba(143, 191, 122, 0.12)',
    borderColor: 'rgba(143, 191, 122, 0.28)',
  },
  verifiedBadgeDanger: {
    backgroundColor: 'rgba(224, 122, 106, 0.12)',
    borderColor: 'rgba(224, 122, 106, 0.24)',
  },
  verifiedBadgeText: {
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(58, 43, 40, 0.82)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    alignItems: 'center',
  },
  heroStatValue: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  heroStatLabel: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.regular,
    textAlign: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: authColors.accent,
  },
  primaryActionText: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginBottom: 10,
  },
  infoPanel: {
    backgroundColor: authColors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    marginRight: 12,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
    marginBottom: 3,
  },
  infoValue: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
  infoFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  subtlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  subtlePillText: {
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  addressCardFeature: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  addressIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 226, 168, 0.12)',
    marginRight: 12,
  },
  addressCardTextWrap: {
    flex: 1,
  },
  addressCardTitle: {
    color: authColors.textPrimary,
    fontSize: 16,
    fontFamily: authFonts.bold,
    marginBottom: 3,
  },
  addressCardSubtitle: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  addressFeatureValue: {
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: authFonts.semibold,
    marginBottom: 14,
  },
  addressMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  addressMiniItem: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(58, 43, 40, 0.82)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  addressMiniLabel: {
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  addressMiniValue: {
    color: authColors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: authFonts.semibold,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 30,
  },
  secondaryActionTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  secondaryActionTitle: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  secondaryActionSubtitle: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
    lineHeight: 18,
  },
  photoModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 11, 10, 0.58)',
  },
  photoModalDismissArea: {
    flex: 1,
  },
  photoSheet: {
    backgroundColor: authColors.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: authColors.surfaceBorder,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  photoSheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: authColors.surfaceBorder,
    marginBottom: 16,
  },
  photoSheetTitle: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.bold,
    textAlign: 'center',
  },
  photoSheetSubtitle: {
    color: authColors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: authFonts.regular,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  photoOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  photoOptionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(199, 104, 91, 0.18)',
  },
  photoOptionIconAlt: {
    backgroundColor: 'rgba(244, 226, 168, 0.16)',
  },
  photoOptionTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  photoOptionTitle: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  photoOptionSubtitle: {
    color: authColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: authFonts.regular,
  },
  photoCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(247, 232, 213, 0.08)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  photoCancelText: {
    color: authColors.textMuted,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 11, 10, 0.64)',
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: authColors.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: authColors.surfaceBorder,
  },
  modalTitle: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.bold,
  },
  modalBody: {
    padding: 20,
  },
  modalSectionTitle: {
    color: authColors.accentSoft,
    fontSize: 15,
    fontFamily: authFonts.semibold,
    marginTop: 8,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.semibold,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.regular,
    backgroundColor: authColors.surfaceStrong,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  disabledInput: {
    backgroundColor: 'rgba(247, 232, 213, 0.12)',
    color: authColors.textMuted,
  },
  inputHint: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
    marginTop: 4,
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: authColors.surfaceBorder,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButton: {
    backgroundColor: 'rgba(247, 232, 213, 0.08)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  cancelButtonText: {
    color: authColors.textMuted,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
  saveButton: {
    backgroundColor: authColors.accent,
  },
  saveButtonText: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
  },
});

export default Profile;
