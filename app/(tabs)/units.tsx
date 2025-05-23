import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Import Picker
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

// Ensure you have this installed: expo install @react-native-picker/picker

interface Block {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  unit_number: string;
  block_id: number;
  block_name: string; // To display block name
  monthly_rent: number;
  status: string; // Add status as it's in your DB schema
}

export default function UnitsScreen() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]); // New state for blocks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false); // To disable buttons during submission

  // State for form inputs
  const [unitNumber, setUnitNumber] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null); // For Picker
  const [monthlyRent, setMonthlyRent] = useState('');
  const [unitStatus, setUnitStatus] = useState('vacant'); // Default status

  // State for editing
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Function to load both units and blocks
  const loadData = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // Use the correct database name 'rental_management'
      const db = await SQLite.openDatabaseAsync('rental_management');

      // Fetch units with block names and created_at
      const allUnits = (await db.getAllAsync(`
        SELECT
          u.id,
          u.unit_number,
          u.block_id,
          u.monthly_rent,
          u.status,
          b.name AS block_name
        FROM
          units u
        JOIN
          blocks b ON u.block_id = b.id
        ORDER BY
          b.name, u.unit_number
      `)) as Unit[];
      setUnits(allUnits);

      // Fetch blocks for the picker
      const allBlocks = (await db.getAllAsync(
        'SELECT id, name FROM blocks ORDER BY name'
      )) as Block[];
      setBlocks(allBlocks);

      // Set default selected block if any exist and none is selected
      if (
        allBlocks.length > 0 &&
        selectedBlockId === null &&
        editingUnit === null
      ) {
        setSelectedBlockId(allBlocks[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Input validation function
  const validateInputs = (): boolean => {
    if (!unitNumber.trim()) {
      Alert.alert('Validation Error', 'Unit Number cannot be empty.');
      return false;
    }
    if (selectedBlockId === null) {
      Alert.alert('Validation Error', 'Please select a Block.');
      return false;
    }
    const parsedMonthlyRent = parseFloat(monthlyRent);
    if (isNaN(parsedMonthlyRent) || parsedMonthlyRent <= 0) {
      Alert.alert(
        'Validation Error',
        'Monthly Rent must be a positive number.'
      );
      return false;
    }
    return true;
  };

  // Function to handle adding a new unit
  const handleAddUnit = async () => {
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'INSERT INTO units (block_id, unit_number, monthly_rent, status) VALUES (?, ?, ?, ?)',
        selectedBlockId,
        unitNumber.trim(),
        parseFloat(monthlyRent),
        unitStatus
      );
      Alert.alert('Success', 'Unit added successfully!');
      clearForm();
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Error adding unit:', err);
      if (
        err.message.includes(
          'UNIQUE constraint failed: units.block_id, units.unit_number'
        )
      ) {
        Alert.alert(
          'Error',
          'A unit with this number already exists in the selected block.'
        );
      } else if (err.message.includes('FOREIGN KEY constraint failed')) {
        Alert.alert(
          'Error',
          'Invalid Block selected. Please ensure the block exists.'
        );
      } else {
        Alert.alert('Error', 'Failed to add unit. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to set form for editing
  const handleEditPress = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitNumber(unit.unit_number);
    setSelectedBlockId(unit.block_id);
    setMonthlyRent(unit.monthly_rent.toString());
    setUnitStatus(unit.status);
  };

  // Function to handle updating an existing unit
  const handleUpdateUnit = async () => {
    if (!editingUnit) return;
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'UPDATE units SET block_id = ?, unit_number = ?, monthly_rent = ?, status = ? WHERE id = ?',
        selectedBlockId,
        unitNumber.trim(),
        parseFloat(monthlyRent),
        unitStatus,
        editingUnit.id
      );
      Alert.alert('Success', 'Unit updated successfully!');
      clearForm();
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Error updating unit:', err);
      if (
        err.message.includes(
          'UNIQUE constraint failed: units.block_id, units.unit_number'
        )
      ) {
        Alert.alert(
          'Error',
          'A unit with this number already exists in the selected block.'
        );
      } else if (err.message.includes('FOREIGN KEY constraint failed')) {
        Alert.alert(
          'Error',
          'Invalid Block selected. Please ensure the block exists.'
        );
      } else {
        Alert.alert('Error', 'Failed to update unit. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to handle deleting a unit
  const handleDeleteUnit = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this unit? This will also delete all associated tenancies and payments due to cascading deletes.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management');
              await db.runAsync('DELETE FROM units WHERE id = ?', id);
              Alert.alert(
                'Success',
                'Unit and its associated tenancies/payments deleted successfully!'
              );
              loadData(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting unit:', err);
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Deletion Restricted',
                  'Cannot delete unit: This unit is still associated with active tenancies. Please end all related tenancies before deleting the unit.'
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to delete unit. Please try again.'
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
    setUnitNumber('');
    setMonthlyRent('');
    setUnitStatus('vacant');
    setEditingUnit(null);
    // Reset selectedBlockId to the first available block if any
    if (blocks.length > 0) {
      setSelectedBlockId(blocks[0].id);
    } else {
      setSelectedBlockId(null);
    }
  };

  // Render loading and error states
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading units...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
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
      <Text style={styles.title}>Manage Units</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Unit Number (e.g., A1, B10)"
          value={unitNumber}
          onChangeText={setUnitNumber}
          placeholderTextColor="#888"
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedBlockId}
            onValueChange={(itemValue: number | null) =>
              setSelectedBlockId(itemValue)
            }
            style={styles.picker}
            enabled={blocks.length > 0} // Disable if no blocks exist
          >
            {blocks.length === 0 ? (
              <Picker.Item label="No Blocks Available" value={null} />
            ) : (
              blocks.map((block) => (
                <Picker.Item
                  key={block.id}
                  label={block.name}
                  value={block.id}
                />
              ))
            )}
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Monthly Rent (e.g., 8000.00)"
          keyboardType="numeric"
          value={monthlyRent}
          onChangeText={setMonthlyRent}
          placeholderTextColor="#888"
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={unitStatus}
            onValueChange={(itemValue: string) => setUnitStatus(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Vacant" value="vacant" />
            <Picker.Item label="Occupied" value="occupied" />
            <Picker.Item label="Maintenance" value="maintenance" />
          </Picker>
        </View>

        <View style={styles.buttonRow}>
          {editingUnit ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateUnit}
                disabled={isFormSubmitting}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {isFormSubmitting ? 'Updating...' : 'Update Unit'}
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
              onPress={handleAddUnit}
              disabled={isFormSubmitting}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isFormSubmitting ? 'Adding...' : 'Add New Unit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of Units */}
      <Text style={styles.listTitle}>Existing Units</Text>
      {units.length === 0 ? (
        <Text style={styles.noDataText}>No units found. Add some units!</Text>
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.unitCard}>
              <View style={styles.unitInfo}>
                <Text style={styles.unitNumber}>{item.unit_number}</Text>
                <Text style={styles.unitDetails}>
                  <Ionicons name="cube-outline" size={14} color="#666" /> Block:{' '}
                  {item.block_name}
                </Text>
                <Text style={styles.unitDetails}>
                  <Ionicons name="cash-outline" size={14} color="#666" /> Rent:
                  KES {item.monthly_rent.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.unitStatus,
                    item.status === 'occupied' && { color: '#28a745' }, // Green for occupied
                    item.status === 'vacant' && { color: '#ffc107' }, // Orange for vacant
                    item.status === 'maintenance' && { color: '#17a2b8' }, // Blue for maintenance
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={
                      item.status === 'occupied'
                        ? '#28a745'
                        : item.status === 'vacant'
                        ? '#ffc107'
                        : '#17a2b8'
                    }
                  />{' '}
                  Status:{' '}
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
                  onPress={() => handleDeleteUnit(item.id)}
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
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
    color: '#343a40',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 15,
    color: '#343a40',
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
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
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#495057',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#495057', // Ensure picker text color is consistent
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  updateButton: {
    backgroundColor: '#007bff',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 30,
  },
  unitCard: {
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
    borderLeftWidth: 5,
    borderLeftColor: '#fd7e14', // Orange for units
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: 19,
    fontWeight: '700',
    color: '#343a40',
    marginBottom: 4,
  },
  unitDetails: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitStatus: {
    fontSize: 15,
    fontWeight: '600', // Bolder status
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitCreated: {
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
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#f8f9fa',
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});
