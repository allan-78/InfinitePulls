// CVPetShop/frontend/src/Components/UserScreen/ChangePassword.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import UserDrawer from './UserDrawer';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const PasswordInput = React.memo(({ 
  field,
  placeholder, 
  value, 
  onInputChange,
  showPassword,
  onToggleVisibility,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  loading
}) => {
  const handleChangeText = useCallback((text) => {
    onInputChange(field, text);
  }, [field, onInputChange]);

  return (
    <View style={styles.inputWrapper}>
      <View style={[
        styles.inputContainer,
        value ? styles.inputContainerActive : null
      ]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={!showPassword}
          editable={!loading}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          importantForAutofill="yes"
          textContentType="password"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => onToggleVisibility(field)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#666"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ChangePasswordContent = React.memo(({
  formData,
  onInputChange,
  showPasswords,
  onToggleVisibility,
  loading,
  onSubmit,
  onCancel,
  inputRefs
}) => {
  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return regex.test(password);
  };

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color="#FF6B6B" />
        <Text style={styles.infoText}>
          Choose a strong password that you don't use elsewhere
        </Text>
      </View>

      {/* Password Requirements */}
      <View style={styles.requirementsCard}>
        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={formData.newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
            size={18} 
            color={formData.newPassword.length >= 8 ? "#4CAF50" : "#999"} 
          />
          <Text style={styles.requirementText}>At least 8 characters</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/[A-Z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={18} 
            color={/[A-Z]/.test(formData.newPassword) ? "#4CAF50" : "#999"} 
          />
          <Text style={styles.requirementText}>At least one uppercase letter</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/[a-z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={18} 
            color={/[a-z]/.test(formData.newPassword) ? "#4CAF50" : "#999"} 
          />
          <Text style={styles.requirementText}>At least one lowercase letter</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons 
            name={/\d/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={18} 
            color={/\d/.test(formData.newPassword) ? "#4CAF50" : "#999"} 
          />
          <Text style={styles.requirementText}>At least one number</Text>
        </View>
      </View>

      {/* Password Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Enter your new password</Text>

        <PasswordInput
          field="currentPassword"
          placeholder="Current Password"
          value={formData.currentPassword}
          onInputChange={onInputChange}
          showPassword={showPasswords.current}
          onToggleVisibility={onToggleVisibility}
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.new.current?.focus()}
          inputRef={inputRefs.current}
          loading={loading}
        />

        <PasswordInput
          field="newPassword"
          placeholder="New Password"
          value={formData.newPassword}
          onInputChange={onInputChange}
          showPassword={showPasswords.new}
          onToggleVisibility={onToggleVisibility}
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.confirm.current?.focus()}
          inputRef={inputRefs.new}
          loading={loading}
        />

        <PasswordInput
          field="confirmPassword"
          placeholder="Confirm New Password"
          value={formData.confirmPassword}
          onInputChange={onInputChange}
          showPassword={showPasswords.confirm}
          onToggleVisibility={onToggleVisibility}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          inputRef={inputRefs.confirm}
          loading={loading}
        />

        {/* Password Match Indicator */}
        {formData.newPassword && formData.confirmPassword && (
          <View style={styles.matchIndicator}>
            <Ionicons 
              name={formData.newPassword === formData.confirmPassword ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={formData.newPassword === formData.confirmPassword ? "#4CAF50" : "#FF6B6B"} 
            />
            <Text style={[
              styles.matchText,
              { color: formData.newPassword === formData.confirmPassword ? "#4CAF50" : "#FF6B6B" }
            ]}>
              {formData.newPassword === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.changeButton]}
          onPress={onSubmit}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="key-outline" size={20} color="#fff" />
              <Text style={styles.changeButtonText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#999" />
        <Text style={styles.noteText}>
          Your password is encrypted and secure
        </Text>
      </View>
    </ScrollView>
  );
});

export default function ChangePassword({ navigation }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [loading, setLoading] = useState(false);
  
  // Create refs for each input
  const inputRefs = {
    current: useRef(null),
    new: useRef(null),
    confirm: useRef(null)
  };

  const onInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const onToggleVisibility = useCallback((field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    const { currentPassword, newPassword, confirmPassword } = formData;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Error',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'You must be logged in');
        navigation.navigate('Login');
        return;
      }

      const response = await axios.put(
        `${BACKEND_URL}/api/v1/users/change-password`,
        { 
          currentPassword, 
          newPassword 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success || response.status === 200) {
        Alert.alert(
          'Success', 
          response.data.message || 'Password changed successfully',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
        
        // Clear form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      console.error('Change password error:', err.response?.data || err.message);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to change password. Please try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <UserDrawer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ChangePasswordContent
          formData={formData}
          onInputChange={onInputChange}
          showPasswords={showPasswords}
          onToggleVisibility={onToggleVisibility}
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          inputRefs={inputRefs}
        />
      </KeyboardAvoidingView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    margin: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requirementsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputContainerActive: {
    borderColor: '#FF6B6B',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#FF6B6B',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#999',
  },
});