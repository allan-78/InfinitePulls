// CVPetShop/frontend/src/Components/AdminScreen/suppliermanagement/ViewSupplier.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AdminDrawer from '../AdminDrawer'; // Import AdminDrawer

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ViewSupplierScreen({ navigation, route }) {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [supplierId]);

  const fetchSupplierDetails = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSupplier(res.data.supplier);
      setProducts(res.data.supplier.products || []);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      Alert.alert('Error', 'Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
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
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={styles.centered}>
        <Text>Supplier not found</Text>
      </View>
    );
  }

  // Main content of ViewSupplier screen
  const ViewSupplierContent = () => (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{supplier.name}</Text>
        
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#666" />
          <Text style={styles.infoText}>{supplier.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoText}>{supplier.phone}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.text}>{supplier.address?.street}</Text>
          <Text style={styles.text}>{supplier.address?.city}, {supplier.address?.state}</Text>
          <Text style={styles.text}>{supplier.address?.country} - {supplier.address?.zipCode}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Associated Products ({products.length})</Text>
        {products.length === 0 ? (
          <Text style={styles.emptyText}>No products associated</Text>
        ) : (
          products.map((product) => (
            <View key={product._id} style={styles.productItem}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>${product.price}</Text>
              <Text style={styles.productCategory}>{product.category}</Text>
              <Text style={styles.productStock}>Stock: {product.stock}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('UpdateSupplier', { supplier })}
        >
          <Icon name="edit" size={20} color="white" />
          <Text style={styles.buttonText}>Edit Supplier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color="white" />
          <Text style={styles.buttonText}>Back to List</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ViewSupplierContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#34495e',
  },
  section: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  text: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  productItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#e67e22',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  editButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  backButton: {
    backgroundColor: '#95a5a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});
