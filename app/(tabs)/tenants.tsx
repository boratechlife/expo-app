import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView, // Added for better input management
  Platform, // Added for KeyboardAvoidingView
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Define the Tenant interface matching your DB schema
interface Tenant {
  id: number;
  name: string;
  phone: string | null; // Nullable based on DB schema
  email: string | null; // Nullable based on DB schema
  created_at: string; // Add created_at
}

export default function TenantsScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false); // To disable buttons during submission

  // State for form inputs
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');

  // State for editing: null if not editing, otherwise the Tenant object being edited
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Regex for basic phone number validation (e.g., starts with +, or a digit, and has 7-15 digits)
  const phoneRegex = /^\+?[0-9]{7,15}$/;

  // Function to load tenants from the database
  const loadTenants = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // Use the correct database name 'rental_management'
      const db = await SQLite.openDatabaseAsync('rental_management');
      const allTenants = (await db.getAllAsync(
        'SELECT id, name, phone, email, created_at FROM tenants ORDER BY name'
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
  }, []);

  // Input validation function
  const validateInputs = (): boolean => {
    if (!tenantName.trim()) {
      Alert.alert('Validation Error', 'Tenant Name cannot be empty.');
      return false;
    }
    if (tenantPhone.trim() && !phoneRegex.test(tenantPhone.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return false;
    }
    if (tenantEmail.trim() && !emailRegex.test(tenantEmail.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    return true;
  };

  // Function to handle adding a new tenant
  const handleAddTenant = async () => {
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'INSERT INTO tenants (name, phone, email) VALUES (?, ?, ?)',
        tenantName.trim(),
        tenantPhone.trim() || null,
        tenantEmail.trim() || null
      );
      Alert.alert('Success', 'Tenant added successfully!');
      clearForm();
      loadTenants();
    } catch (err: any) {
      console.error('Error adding tenant:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        Alert.alert(
          'Error',
          'Phone number or email already exists. Please use unique values.'
        );
      } else {
        Alert.alert('Error', 'Failed to add tenant. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to set form for editing
  const handleEditPress = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTenantName(tenant.name);
    setTenantPhone(tenant.phone || '');
    setTenantEmail(tenant.email || '');
  };

  // Function to handle updating an existing tenant
  const handleUpdateTenant = async () => {
    if (!editingTenant) return;
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'UPDATE tenants SET name = ?, phone = ?, email = ? WHERE id = ?',
        tenantName.trim(),
        tenantPhone.trim() || null,
        tenantEmail.trim() || null,
        editingTenant.id
      );
      Alert.alert('Success', 'Tenant updated successfully!');
      clearForm();
      loadTenants();
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        Alert.alert(
          'Error',
          'Phone number or email already exists. Please use unique values.'
        );
      } else {
        Alert.alert('Error', 'Failed to update tenant. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to handle deleting a tenant
  const handleDeleteTenant = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this tenant? This action cannot be undone and will affect associated tenancies and payments due to CASCADE delete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive', // Makes the button red on iOS
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management');
              await db.runAsync('DELETE FROM tenants WHERE id = ?', id);
              Alert.alert('Success', 'Tenant deleted successfully!');
              loadTenants(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting tenant:', err);
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Deletion Restricted',
                  'Cannot delete tenant: This tenant is associated with active records (e.g., tenancies). Please ensure all related tenancies are ended before deletion.'
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

  // Render loading and error states
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
        <TouchableOpacity style={styles.retryButton} onPress={loadTenants}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <Text style={styles.title}>Manage Tenants</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Tenant Name (e.g., John Doe)"
          value={tenantName}
          onChangeText={setTenantName}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (e.g., +2547XXXXXXXX)"
          keyboardType="phone-pad"
          value={tenantPhone}
          onChangeText={setTenantPhone}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Email (Optional, e.g., john.doe@example.com)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={tenantEmail}
          onChangeText={setTenantEmail}
          placeholderTextColor="#888"
        />
        <View style={styles.buttonRow}>
          {editingTenant ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateTenant}
                disabled={isFormSubmitting}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {isFormSubmitting ? 'Updating...' : 'Update Tenant'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={clearForm}
                disabled={isFormSubmitting}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddTenant}
              disabled={isFormSubmitting}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isFormSubmitting ? 'Adding...' : 'Add New Tenant'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of Tenants */}
      <Text style={styles.listTitle}>Existing Tenants</Text>
      {tenants.length === 0 ? (
        <Text style={styles.noDataText}>
          No tenants found. Add some tenants to get started!
        </Text>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.tenantCard}>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{item.name}</Text>
                {item.phone ? (
                  <Text style={styles.tenantContact}>
                    <Ionicons name="call-outline" size={14} color="#666" />{' '}
                    {item.phone}
                  </Text>
                ) : null}
                {item.email ? (
                  <Text style={styles.tenantContact}>
                    <Ionicons name="mail-outline" size={14} color="#666" />{' '}
                    {item.email}
                  </Text>
                ) : null}
                <Text style={styles.tenantCreated}>
                  <Ionicons name="time-outline" size={14} color="#999" />{' '}
                  Joined: {new Date(item.created_at).toLocaleDateString()}
                </Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa', // Lighter background for a professional feel
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28, // Slightly larger title
    fontWeight: '700', // Bolder
    marginBottom: 25,
    textAlign: 'center',
    color: '#343a40', // Darker text for contrast
    textShadowColor: 'rgba(0, 0, 0, 0.1)', // Subtle shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 25, // More spacing
    marginBottom: 15,
    color: '#343a40',
    borderBottomWidth: 2, // Stronger separator
    borderBottomColor: '#e9ecef', // Lighter border color
    paddingBottom: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12, // More rounded corners
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Deeper shadow
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da', // Softer border color
    borderRadius: 8,
    padding: 14, // More padding
    marginBottom: 12,
    fontSize: 16,
    color: '#495057', // Darker text input color
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute space
    marginTop: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // More vertical padding
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5, // Keep some margin
    shadowColor: 'rgba(0,0,0,0.2)', // Button shadows
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
    paddingBottom: 30, // More padding at the bottom
  },
  tenantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5, // Highlight card with a border
    borderLeftColor: '#007bff', // Default blue border
  },
  tenantInfo: {
    flex: 1, // Allow info to take up available space
  },
  tenantName: {
    fontSize: 19, // Slightly larger name
    fontWeight: '700', // Bolder name
    color: '#343a40',
    marginBottom: 4,
  },
  tenantContact: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    flexDirection: 'row', // Align icon and text
    alignItems: 'center',
  },
  tenantCreated: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
    padding: 8, // More padding for touch area
    borderRadius: 5, // Slightly rounded action buttons
    backgroundColor: '#f8f9fa', // Light background for action buttons
  },
});
