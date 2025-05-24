import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Tenant {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface Unit {
  id: number;
  unit_number: string;
  block_name: string;
  monthly_rent: number; // For display, derived from block
  status: string; // 'vacant', 'occupied', 'maintenance'
}

interface Tenancy {
  id: number;
  tenant_id: number;
  unit_id: number;
  unit_number: string; // For display
  block_name: string; // For display
  monthly_rent: number; // For display
  start_date: string;
  end_date?: string; // Optional, if tenancy is ongoing
  status: 'active' | 'ended'; // 'active' or 'ended'
}

export default function TenantsScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]); // All units
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]); // Units not currently active in a tenancy
  const [tenancies, setTenancies] = useState<Tenancy[]>([]); // Tenancies for the selected tenant

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for tenant form inputs
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // State for tenancy modal
  const [isTenancyModalVisible, setIsTenancyModalVisible] = useState(false);
  const [selectedTenantForTenancy, setSelectedTenantForTenancy] =
    useState<Tenant | null>(null);
  const [selectedUnitForTenancy, setSelectedUnitForTenancy] = useState<
    number | null
  >(null);
  const [tenancyStartDate, setTenancyStartDate] = useState(
    new Date().toISOString().split('T')[0]
  ); // YYYY-MM-DD
  const [tenancyEndDate, setTenancyEndDate] = useState('');

  // --- Database Operations ---

  const loadTenants = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
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

  const loadUnitsAndTenancies = async () => {
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');

      // Fetch all units with their block names and monthly rent
      const allUnits = (await db.getAllAsync(`
        SELECT
          u.id,
          u.unit_number,
          b.name AS block_name,
          b.monthly_rent AS monthly_rent,
          u.status
        FROM
          units u
        JOIN
          blocks b ON u.block_id = b.id
        ORDER BY
          b.name, u.unit_number
      `)) as Unit[];
      setUnits(allUnits);

      // Fetch all active tenancies to determine occupied units
      const activeTenancies = (await db.getAllAsync(
        'SELECT unit_id FROM tenancies WHERE status = "active"'
      )) as Array<{ unit_id: number }>;

      const occupiedUnitIds = new Set(activeTenancies.map((t) => t.unit_id));

      // Filter for truly available units (vacant AND not in an active tenancy)
      const trulyAvailableUnits = allUnits.filter(
        (unit) => unit.status === 'vacant' && !occupiedUnitIds.has(unit.id)
      );
      setAvailableUnits(trulyAvailableUnits);

      // Set default selected unit for tenancy if available
      if (trulyAvailableUnits.length > 0 && selectedUnitForTenancy === null) {
        setSelectedUnitForTenancy(trulyAvailableUnits[0].id);
      }
    } catch (err) {
      console.error('Error loading units or tenancies:', err);
      // Don't set global error here, just log, as this is for modal data
    }
  };

  const loadTenanciesForTenant = async (tenantId: number) => {
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      const tenanciesForSelectedTenant = (await db.getAllAsync(
        `
        SELECT
          t.id,
          t.tenant_id,
          t.unit_id,
          t.start_date,
          t.end_date,
          t.status,
          u.unit_number,
          b.name AS block_name,
          b.monthly_rent AS monthly_rent
        FROM
          tenancies t
        JOIN
          units u ON t.unit_id = u.id
        JOIN
          blocks b ON u.block_id = b.id
        WHERE
          t.tenant_id = ?
        ORDER BY
          t.start_date DESC
      `,
        tenantId
      )) as Tenancy[];
      setTenancies(tenanciesForSelectedTenant);
    } catch (err) {
      console.error('Error loading tenancies for tenant:', err);
      Alert.alert('Error', 'Failed to load tenancies for this tenant.');
    }
  };

  useEffect(() => {
    loadTenants();
    loadUnitsAndTenancies(); // Load units initially for the tenancy modal
  }, []);

  // --- Tenant Management Functions ---

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
        tenantPhone.trim() || null,
        tenantEmail.trim() || null
      );
      Alert.alert('Success', 'Tenant added successfully!');
      clearForm();
      loadTenants();
    } catch (err) {
      console.error('Error adding tenant:', err);
      Alert.alert('Error', 'Failed to add tenant. Please try again.');
    }
  };

  const handleEditPress = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTenantName(tenant.name);
    setTenantPhone(tenant.phone || '');
    setTenantEmail(tenant.email || '');
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant) return;
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
      clearForm();
      loadTenants();
    } catch (err) {
      console.error('Error updating tenant:', err);
      Alert.alert('Error', 'Failed to update tenant. Please try again.');
    }
  };

  const handleDeleteTenant = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this tenant? This will also delete all associated tenancies and payments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management_2');
              await db.runAsync('DELETE FROM tenants WHERE id = ?', id);
              Alert.alert('Success', 'Tenant and related data deleted!');
              loadTenants();
              // Also reload units as some might become available
              loadUnitsAndTenancies();
            } catch (err: any) {
              console.error('Error deleting tenant:', err);
              Alert.alert(
                'Error',
                'Failed to delete tenant. Please try again.'
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const clearForm = () => {
    setTenantName('');
    setTenantPhone('');
    setTenantEmail('');
    setEditingTenant(null);
  };

  // --- Tenancy Management Functions ---

  const openTenancyModal = async (tenant: Tenant) => {
    setSelectedTenantForTenancy(tenant);
    await loadTenanciesForTenant(tenant.id);
    await loadUnitsAndTenancies(); // Refresh available units list
    setIsTenancyModalVisible(true);
  };

  const closeTenancyModal = () => {
    setIsTenancyModalVisible(false);
    setSelectedTenantForTenancy(null);
    setTenancyStartDate(new Date().toISOString().split('T')[0]);
    setTenancyEndDate('');
    setSelectedUnitForTenancy(null);
  };

  const handleAddTenancy = async () => {
    if (
      !selectedTenantForTenancy ||
      selectedUnitForTenancy === null ||
      !tenancyStartDate
    ) {
      Alert.alert('Error', 'Please select a unit and a start date.');
      return;
    }

    // Check if the selected unit is already actively rented by someone else
    const selectedUnit = units.find(
      (unit) => unit.id === selectedUnitForTenancy
    );
    if (selectedUnit && selectedUnit.status === 'occupied') {
      Alert.alert(
        'Error',
        'This unit is already occupied. Please select an available unit.'
      );
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      await db.runAsync(
        'INSERT INTO tenancies (tenant_id, unit_id, start_date, status) VALUES (?, ?, ?, "active")',
        selectedTenantForTenancy.id,
        selectedUnitForTenancy,
        tenancyStartDate
      );
      // Update unit status to 'occupied'
      await db.runAsync(
        'UPDATE units SET status = "occupied" WHERE id = ?',
        selectedUnitForTenancy
      );
      Alert.alert('Success', 'Tenancy added successfully!');
      setTenancyStartDate(new Date().toISOString().split('T')[0]); // Reset date
      setSelectedUnitForTenancy(null); // Reset selected unit
      await loadTenanciesForTenant(selectedTenantForTenancy.id); // Reload tenancies for this tenant
      await loadUnitsAndTenancies(); // Refresh available units for next selection
    } catch (err) {
      console.error('Error adding tenancy:', err);
      Alert.alert('Error', 'Failed to add tenancy. Please try again.');
    }
  };

  const handleEndTenancy = async (tenancyId: number, unitId: number) => {
    Alert.alert(
      'End Tenancy',
      'Are you sure you want to end this tenancy? This will mark the unit as vacant.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management_2');
              const endDate = new Date().toISOString().split('T')[0]; // Current date

              await db.runAsync(
                'UPDATE tenancies SET end_date = ?, status = "ended" WHERE id = ?',
                endDate,
                tenancyId
              );
              // Update unit status to 'vacant'
              await db.runAsync(
                'UPDATE units SET status = "vacant" WHERE id = ?',
                unitId
              );
              Alert.alert('Success', 'Tenancy ended successfully!');
              if (selectedTenantForTenancy) {
                await loadTenanciesForTenant(selectedTenantForTenancy.id);
              }
              await loadUnitsAndTenancies(); // Refresh available units
            } catch (err) {
              console.error('Error ending tenancy:', err);
              Alert.alert('Error', 'Failed to end tenancy. Please try again.');
            }
          },
        },
      ]
    );
  };

  // --- Render Logic ---

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

      {/* Input Form for Add/Edit Tenant */}
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
                  onPress={() => openTenancyModal(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="home-outline" size={24} color="#28a745" />
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

      {/* Tenancy Management Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTenancyModalVisible}
        onRequestClose={closeTenancyModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tenancies for {selectedTenantForTenancy?.name}
            </Text>

            {/* Add New Tenancy Section */}
            <View style={styles.tenancyFormContainer}>
              <Text style={styles.subHeading}>Assign New Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedUnitForTenancy}
                  onValueChange={(itemValue: number | null) =>
                    setSelectedUnitForTenancy(itemValue)
                  }
                  style={styles.picker}
                  enabled={availableUnits.length > 0}
                >
                  {availableUnits.length === 0 ? (
                    <Picker.Item label="No Available Units" value={null} />
                  ) : (
                    availableUnits.map((unit) => (
                      <Picker.Item
                        key={unit.id}
                        label={`${unit.block_name} - ${
                          unit.unit_number
                        } (KES${unit.monthly_rent.toFixed(2)})`}
                        value={unit.id}
                      />
                    ))
                  )}
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Start Date (YYYY-MM-DD)"
                value={tenancyStartDate}
                onChangeText={setTenancyStartDate}
                keyboardType="numbers-and-punctuation" // For date format
              />
              <TouchableOpacity
                style={[
                  styles.actionButton, // Use styles.actionButton for consistent padding/alignment
                  styles.addButton,
                  styles.button,
                  { marginBottom: 15, width: '100%' }, // Ensure full width
                ]}
                onPress={handleAddTenancy}
                disabled={
                  availableUnits.length === 0 || selectedUnitForTenancy === null
                }
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Assign Unit</Text>
              </TouchableOpacity>
            </View>

            {/* Current/Past Tenancies List */}
            <Text style={styles.subHeading}>Current & Past Tenancies</Text>
            {tenancies.length === 0 ? (
              <Text style={styles.noDataText}>
                No tenancies for this tenant yet.
              </Text>
            ) : (
              <FlatList
                data={tenancies}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.tenancyCard}>
                    <View style={styles.tenancyCardDetails}>
                      <Text style={styles.tenancyUnitText}>
                        {item.block_name} - {item.unit_number} (KES
                        {item.monthly_rent.toFixed(2)})
                      </Text>
                      <Text style={styles.tenancyDateText}>
                        From: {item.start_date}{' '}
                        {item.end_date ? `To: ${item.end_date}` : ''}
                      </Text>
                      <Text
                        style={[
                          styles.tenancyStatusText,
                          item.status === 'active'
                            ? styles.statusActive
                            : styles.statusEnded,
                        ]}
                      >
                        Status: {item.status.toUpperCase()}
                      </Text>
                    </View>
                    {item.status === 'active' && (
                      <TouchableOpacity
                        onPress={() => handleEndTenancy(item.id, item.unit_id)}
                        style={styles.endTenancyButton} // Apply specific end button style
                      >
                        <Ionicons name="exit-outline" size={20} color="#fff" />
                        <Text style={styles.endTenancyButtonText}>End</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 10 }}
              />
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.button,
                styles.cancelButton,
                { marginTop: 20, width: '100%' },
              ]}
              onPress={closeTenancyModal}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
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
    flex: 1, // Allows buttons in a row to share space
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

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%', // Limit height to prevent modal from going off-screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  tenancyFormContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  tenancyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenancyCardDetails: {
    flex: 1, // Allow details to take available space
    marginRight: 10, // Add some space between details and button
  },
  tenancyUnitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tenancyDateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tenancyStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statusActive: {
    color: '#28a745', // Green
  },
  statusEnded: {
    color: '#6c757d', // Gray
  },
  endTenancyButton: {
    backgroundColor: '#dc3545', // Red
    paddingVertical: 8, // Increased vertical padding
    paddingHorizontal: 12, // Increased horizontal padding
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80, // Ensure a minimum width to accommodate text
  },
  endTenancyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold', // Added bold for better visibility
    marginLeft: 5,
  },
});
