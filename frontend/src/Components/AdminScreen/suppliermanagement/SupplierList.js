// C&V PetShop/frontend/src/Components/AdminScreen/suppliermanagement/SupplierList.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AdminDrawer from '../AdminDrawer'; // Import AdminDrawer

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SupplierListScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(res.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      Alert.alert('Error', 'Failed to load suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const handleDelete = (supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete ${supplier.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${BACKEND_URL}/api/v1/admin/suppliers/${supplier._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Supplier deleted successfully');
              fetchSuppliers();
            } catch (error) {
              console.error('Error deleting supplier:', error);
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (supplier) => {
    navigation.navigate('UpdateSupplier', { supplier });
  };

  const handleView = (supplier) => {
    navigation.navigate('ViewSupplier', { supplierId: supplier._id });
  };

  const handleGoToTrash = () => {
    navigation.navigate('TrashSupplier');
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

  const renderRightActions = (supplier) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => handleEdit(supplier)}
      >
        <Icon name="edit" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(supplier)}
      >
        <Icon name="delete" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.supplierCard}
        onPress={() => handleView(item)}
      >
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{item.name}</Text>
          <Text style={styles.supplierEmail}>{item.email}</Text>
          <Text style={styles.supplierPhone}>📞 {item.phone}</Text>
          <Text style={styles.supplierAddress}>
            {item.address?.city}, {item.address?.state}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
    </Swipeable>
  );

  // Main content of SupplierList screen
  const SupplierListContent = () => (
    <View style={styles.container}>
      <FlatList
        data={suppliers}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="local-shipping" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No suppliers found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateSupplier')}
            >
              <Text style={styles.emptyButtonText}>Add Supplier</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.trashButton]}
          onPress={handleGoToTrash}
        >
          <Icon name="delete" size={24} color="white" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Trash</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, styles.addButton]}
          onPress={() => navigation.navigate('CreateSupplier')}
        >
          <Icon name="add" size={24} color="white" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Create</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <SupplierListContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  supplierCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  supplierEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  supplierPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  supplierAddress: {
    fontSize: 14,
    color: '#666',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginLeft: 5,
    height: '100%',
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
  },
  addButton: {
    backgroundColor: '#2ecc71',
  },
  trashButton: {
    backgroundColor: '#e74c3c',
  },
  fabLabel: {
    marginLeft: 8,
  },
  fabLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
