// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/CreateUser.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CreateUserContent = React.memo(({
  formData,
  updateField,
  loading,
  errors,
  handleSubmit,
  navigation,
  nameInputRef,
  emailInputRef,
  passwordInputRef,
  confirmPasswordInputRef
}) => {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create New User</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Enter full name"
              placeholderTextColor="#999"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              ref={emailInputRef}
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>Password *</Text>
            <TextInput
              ref={passwordInputRef}
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Enter password (min. 6 characters)"
              placeholderTextColor="#999"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              ref={confirmPasswordInputRef}
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              placeholder="Confirm password"
              placeholderTextColor="#999"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Select Role</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'user' && styles.roleButtonActive,
                  ]}
                  onPress={() => updateField('role', 'user')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'user' && styles.roleButtonTextActive,
                  ]}>
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'admin' && styles.roleButtonActive,
                  ]}
                  onPress={() => updateField('role', 'admin')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'admin' && styles.roleButtonTextActive,
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Icon name="info" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                New users will be automatically verified upon creation.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Create User</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
});

const CreateUserScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        `${BACKEND_URL}/api/v1/users`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Success',
        'User created successfully and automatically verified!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.status === 400) {
        Alert.alert('Error', error.response.data.message || 'Email already exists');
      } else {
        Alert.alert('Error', 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, navigation]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            const { logout } = await import('../../../utils/helper');
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  }, []);

  const contentProps = useMemo(() => ({
    formData,
    updateField,
    loading,
    errors,
    handleSubmit,
    navigation,
    nameInputRef,
    emailInputRef,
    passwordInputRef,
    confirmPasswordInputRef
  }), [formData, updateField, loading, errors, handleSubmit, navigation]);

  return (
    <AdminDrawer onLogout={handleLogout}>
      <CreateUserContent {...contentProps} />
    </AdminDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 5,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 10,
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 12,
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    backgroundColor: '#6200ee',
  },
  roleButtonText: {
    color: '#6200ee',
    fontWeight: '500',
    fontSize: 16,
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2196F3',
  },
  submitButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9e9e9e',
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateUserScreen;
