// CVPetShop/frontend/src/Components/AdminScreen/suppliermanagement/UpdateSupplier.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const UpdateSupplierContent = React.memo(({
  formData,
  updateField,
  loading,
  handleSubmit,
  navigation
}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Supplier Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => updateField('name', text)}
          placeholder="Enter supplier name"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionTitle}>Address</Text>
        
        <Text style={styles.label}>Street *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.street}
          onChangeText={(text) => updateField('address.street', text)}
          placeholder="Enter street address"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.city}
          onChangeText={(text) => updateField('address.city', text)}
          placeholder="Enter city"
        />

        <Text style={styles.label}>State *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.state}
          onChangeText={(text) => updateField('address.state', text)}
          placeholder="Enter state"
        />

        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.country}
          onChangeText={(text) => updateField('address.country', text)}
          placeholder="Enter country"
        />

        <Text style={styles.label}>Zip Code *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.zipCode}
          onChangeText={(text) => updateField('address.zipCode', text)}
          placeholder="Enter zip code"
          keyboardType="numeric"
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Update Supplier</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
});

export default function UpdateSupplierScreen({ navigation, route }) {
  const { supplier } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: {
          street: supplier.address?.street || '',
          city: supplier.address?.city || '',
          state: supplier.address?.state || '',
          country: supplier.address?.country || '',
          zipCode: supplier.address?.zipCode || '',
        },
      });
    }
  }, [supplier]);

  const updateField = useCallback((field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Supplier name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      await axios.put(
        `${BACKEND_URL}/api/v1/admin/suppliers/${supplier._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      Alert.alert(
        'Success',
        'Supplier updated successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating supplier:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update supplier';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, supplier, validateForm, navigation]);

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
    handleSubmit,
    navigation
  }), [formData, updateField, loading, handleSubmit, navigation]);

  return (
    <AdminDrawer onLogout={handleLogout}>
      <UpdateSupplierContent {...contentProps} />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
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
    marginBottom: 15,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
    color: '#2c3e50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});