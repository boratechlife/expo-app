import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal, // Import Modal
  Platform,
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

// --- COLOR PALETTE ---
const Colors = {
  primary: '#007bff', // Vibrant Blue
  secondary: '#6c757d', // Muted Gray
  success: '#28a745', // Green
  warning: '#ffc107', // Amber/Yellow
  error: '#dc3545', // Red
  background: '#f8f9fa', // Light Gray
  cardBackground: '#ffffff', // Pure White
  textPrimary: '#212529', // Dark Charcoal
  textSecondary: '#343a40', // Dark Gray
  border: '#ced4da', // Light border gray
  focusBorder: '#007bff', // Primary for focus
  deleteRed: '#dc3545',
  editBlue: '#007bff',
  tenantBorder: '#fd7e14', // A warm orange for tenant cards
};

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
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility

  // Input Focus States for styling
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Input Validation States
  const [isTenantNameValid, setIsTenantNameValid] = useState(true);
  const [isTenantPhoneValid, setIsTenantPhoneValid] = useState(true);
  const [isTenantEmailValid, setIsTenantEmailValid] = useState(true);

  // Regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Regex for basic phone number validation (e.g., starts with +, or a digit, and has 7-15 digits)
  const phoneRegex = /^\+?[0-9]{7,15}$/;

  // Function to load tenants from the database
  const loadTenants = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
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
    let isValid = true;

    if (!tenantName.trim()) {
      setIsTenantNameValid(false);
      isValid = false;
    } else {
      setIsTenantNameValid(true);
    }

    if (tenantPhone.trim() && !phoneRegex.test(tenantPhone.trim())) {
      setIsTenantPhoneValid(false);
      isValid = false;
    } else {
      setIsTenantPhoneValid(true);
    }

    if (tenantEmail.trim() && !emailRegex.test(tenantEmail.trim())) {
      setIsTenantEmailValid(false);
      isValid = false;
    } else {
      setIsTenantEmailValid(true);
    }

    if (!isValid) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields.');
    }
    return isValid;
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
      setModalVisible(false); // Close modal
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
    setIsTenantNameValid(true); // Reset validation
    setIsTenantPhoneValid(true);
    setIsTenantEmailValid(true);
    setModalVisible(true); // Open modal for editing
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
      setModalVisible(false); // Close modal
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
    setIsTenantNameValid(true); // Reset validation states
    setIsTenantPhoneValid(true);
    setIsTenantEmailValid(true);
    setIsNameFocused(false); // Reset focus states
    setIsPhoneFocused(false);
    setIsEmailFocused(false);
  };

  // Render loading and error states
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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

      {/* List of Tenants */}
      <Text style={styles.listTitle}>Existing Tenants</Text>
      {tenants.length === 0 ? (
        <Text style={styles.noDataText}>
          No tenants found. Tap the '+' button to add one!
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
                    <Ionicons
                      name="call-outline"
                      size={16}
                      color={Colors.textSecondary}
                    />{' '}
                    {item.phone}
                  </Text>
                ) : null}
                {item.email ? (
                  <Text style={styles.tenantContact}>
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color={Colors.textSecondary}
                    />{' '}
                    {item.email}
                  </Text>
                ) : null}
                <Text style={styles.tenantCreated}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={Colors.secondary}
                  />{' '}
                  Joined: {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEditPress(item)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: Colors.cardBackground },
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={Colors.editBlue}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTenant(item.id)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: Colors.cardBackground },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={Colors.deleteRed}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Action Button for Add */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          clearForm(); // Ensure form is clear when opening for new entry
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color={Colors.cardBackground} />
      </TouchableOpacity>

      {/* Add/Edit Tenant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          clearForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setModalVisible(false);
                clearForm();
              }}
            >
              <Ionicons
                name="close-circle"
                size={30}
                color={Colors.secondary}
              />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Tenant Name <Text style={styles.requiredIndicator}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !isTenantNameValid && styles.inputError,
                  isNameFocused && styles.inputFocused,
                ]}
                placeholder="e.g., John Doe"
                value={tenantName}
                onChangeText={(text) => {
                  setTenantName(text);
                  setIsTenantNameValid(true); // Clear error on change
                }}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[
                  styles.input,
                  !isTenantPhoneValid && styles.inputError,
                  isPhoneFocused && styles.inputFocused,
                ]}
                placeholder="e.g., +2547XXXXXXXX"
                keyboardType="phone-pad"
                value={tenantPhone}
                onChangeText={(text) => {
                  setTenantPhone(text);
                  setIsTenantPhoneValid(true); // Clear error on change
                }}
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  !isTenantEmailValid && styles.inputError,
                  isEmailFocused && styles.inputFocused,
                ]}
                placeholder="e.g., john.doe@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={tenantEmail}
                onChangeText={(text) => {
                  setTenantEmail(text);
                  setIsTenantEmailValid(true); // Clear error on change
                }}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.buttonRow}>
              {editingTenant ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={handleUpdateTenant}
                    disabled={isFormSubmitting}
                  >
                    {isFormSubmitting ? (
                      <ActivityIndicator color={Colors.cardBackground} />
                    ) : (
                      <Ionicons
                        name="save"
                        size={20}
                        color={Colors.cardBackground}
                      />
                    )}
                    <Text style={styles.buttonText}>
                      {isFormSubmitting ? 'Updating...' : 'Update Tenant'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      clearForm();
                    }}
                    disabled={isFormSubmitting}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={Colors.cardBackground}
                    />
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.addButtonModal]}
                  onPress={handleAddTenant}
                  disabled={isFormSubmitting}
                >
                  {isFormSubmitting ? (
                    <ActivityIndicator color={Colors.cardBackground} />
                  ) : (
                    <Ionicons
                      name="person-add"
                      size={20}
                      color={Colors.cardBackground}
                    />
                  )}
                  <Text style={styles.buttonText}>
                    {isFormSubmitting ? 'Adding...' : 'Create Tenant'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 30,
    textAlign: 'center',
    color: Colors.textPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.5,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 25,
    marginBottom: 15,
    color: Colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.secondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minHeight: 44, // Ensure touch target
  },
  retryButtonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent dark background
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400, // Max width for larger screens
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    position: 'relative', // For close button positioning
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10, // Increased touch area
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  // --- Input Styles ---
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  requiredIndicator: {
    color: Colors.error,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    minHeight: 50, // Ensure touch target
  },
  inputFocused: {
    borderColor: Colors.focusBorder,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  // --- Button Styles (General) ---
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    minHeight: 50, // Ensure touch target
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addButtonModal: {
    backgroundColor: Colors.success, // Use success for modal add
    flex: 1,
  },
  updateButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.secondary,
  },
  // --- List/Card Styles ---
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  tenantCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.textPrimary, // Darker shadow for more depth
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: Colors.tenantBorder, // A warm orange for tenant cards
  },
  tenantInfo: {
    flex: 1,
    marginRight: 15, // Space between info and actions
  },
  tenantName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  tenantContact: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    lineHeight: 22, // Improve readability
  },
  tenantCreated: {
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
    padding: 10, // Generous padding for touch
    borderRadius: 50, // Circular shape
    backgroundColor: Colors.background, // Light background for action buttons
    minWidth: 44, // Minimum touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.secondary,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  // --- Floating Action Button (FAB) ---
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: Colors.primary,
    borderRadius: 30, // Make it circular
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10, // Ensure it's above other content
  },
});
