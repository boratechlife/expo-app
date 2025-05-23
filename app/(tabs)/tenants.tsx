import { Ionicons } from '@expo/vector-icons'; // For icons in buttons
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Tenant {
  id: number;
  name: string;
  phone?: string; // Make optional as per your DB schema and common usage
  email?: string; // Make optional
}

export default function TenantsScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for form inputs
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');

  // State for editing: null if not editing, otherwise the Tenant object being edited
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Function to load tenants from the database
  const loadTenants = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      // Fetch phone and email as well
      const allTenants = (await db.getAllAsync(
        'SELECT id, name, phone, email FROM tenants ORDER BY name'
      )) as Tenant[];
      setTenants(allTenants);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError('Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []); // Load tenants on initial component mount

  // Function to handle adding a new tenant
  const handleAddTenant = async () => {
    if (!tenantName.trim()) {
      Alert.alert('Error', 'Tenant Name is required.');
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      await db.runAsync(
        'INSERT INTO tenants (name, phone, email) VALUES (?, ?, ?)',
        tenantName.trim(),
        tenantPhone.trim() || null, // Insert null if empty
        tenantEmail.trim() || null // Insert null if empty
      );
      Alert.alert('Success', 'Tenant added successfully!');
      clearForm(); // Clear input fields
      loadTenants(); // Refresh the list
    } catch (err) {
      console.error('Error adding tenant:', err);
      Alert.alert('Error', 'Failed to add tenant. Please try again.');
    }
  };

  // Function to set form for editing
  const handleEditPress = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTenantName(tenant.name);
    setTenantPhone(tenant.phone || ''); // Handle undefined/null phone
    setTenantEmail(tenant.email || ''); // Handle undefined/null email
  };

  // Function to handle updating an existing tenant
  const handleUpdateTenant = async () => {
    if (!editingTenant) return; // Should not happen if edit button is pressed
    if (!tenantName.trim()) {
      Alert.alert('Error', 'Tenant Name is required.');
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      await db.runAsync(
        'UPDATE tenants SET name = ?, phone = ?, email = ? WHERE id = ?',
        tenantName.trim(),
        tenantPhone.trim() || null,
        tenantEmail.trim() || null,
        editingTenant.id
      );
      Alert.alert('Success', 'Tenant updated successfully!');
      clearForm(); // Clear input fields and exit editing mode
      loadTenants(); // Refresh the list
    } catch (err) {
      console.error('Error updating tenant:', err);
      Alert.alert('Error', 'Failed to update tenant. Please try again.');
    }
  };

  // Function to handle deleting a tenant
  const handleDeleteTenant = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this tenant? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management_2');
              await db.runAsync('DELETE FROM tenants WHERE id = ?', id);
              Alert.alert('Success', 'Tenant deleted successfully!');
              loadTenants(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting tenant:', err);
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Error',
                  'Cannot delete tenant: There are active tenancies or payments associated with this tenant. Please end their tenancy or delete related payments first.'
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to delete tenant. Please try again.'
                );
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Helper to clear form inputs and exit editing mode
  const clearForm = () => {
    setTenantName('');
    setTenantPhone('');
    setTenantEmail('');
    setEditingTenant(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading tenants...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Tenants</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Tenant Name (Required)"
          value={tenantName}
          onChangeText={setTenantName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={tenantPhone}
          onChangeText={setTenantPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Email (Optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={tenantEmail}
          onChangeText={setTenantEmail}
        />
        <View style={styles.buttonRow}>
          {editingTenant ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateTenant}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Tenant</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={clearForm}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddTenant}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.buttonText}>Add New Tenant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of Tenants */}
      <Text style={styles.listTitle}>Existing Tenants</Text>
      {tenants.length === 0 ? (
        <Text style={styles.noDataText}>
          No tenants found. Add some tenants!
        </Text>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.tenantCard}>
              <View>
                <Text style={styles.tenantName}>{item.name}</Text>
                {item.phone ? (
                  <Text style={styles.tenantContact}>Phone: {item.phone}</Text>
                ) : null}
                {item.email ? (
                  <Text style={styles.tenantContact}>Email: {item.email}</Text>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEditPress(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={24} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTenant(item.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={24} color="#dc3545" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  addButton: {
    backgroundColor: '#28a745', // Green for Add
  },
  updateButton: {
    backgroundColor: '#007bff', // Blue for Update
  },
  cancelButton: {
    backgroundColor: '#6c757d', // Gray for Cancel
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  tenantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tenantContact: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});
