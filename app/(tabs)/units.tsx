import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, // Import Modal
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Block {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  unit_number: string;
  block_id: number;
  block_name: string;
  monthly_rent: number;
  status: string;
}

export default function UnitsScreen() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // State for form inputs
  const [unitNumber, setUnitNumber] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [unitStatus, setUnitStatus] = useState('vacant');

  // State for editing
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false); // New state for modal visibility

  // State for input validation styling
  const [unitNumberTouched, setUnitNumberTouched] = useState(false);
  const [monthlyRentTouched, setMonthlyRentTouched] = useState(false);

  // Focus states
  const [unitNumberFocused, setUnitNumberFocused] = useState(false);
  const [monthlyRentFocused, setMonthlyRentFocused] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management');

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

      const allBlocks = (await db.getAllAsync(
        'SELECT id, name FROM blocks ORDER BY name'
      )) as Block[];
      setBlocks(allBlocks);

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

  const validateInputs = (): boolean => {
    let isValid = true;
    if (!unitNumber.trim()) {
      Alert.alert('Validation Error', 'Unit Number cannot be empty.');
      isValid = false;
    }
    if (selectedBlockId === null) {
      Alert.alert('Validation Error', 'Please select a Block.');
      isValid = false;
    }
    const parsedMonthlyRent = parseFloat(monthlyRent);
    if (isNaN(parsedMonthlyRent) || parsedMonthlyRent <= 0) {
      Alert.alert(
        'Validation Error',
        'Monthly Rent must be a positive number.'
      );
      isValid = false;
    }
    return isValid;
  };

  const handleAddUnit = async () => {
    setUnitNumberTouched(true);
    setMonthlyRentTouched(true);
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
      loadData();
      setIsModalVisible(false); // Close modal on success
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

  const handleEditPress = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitNumber(unit.unit_number);
    setSelectedBlockId(unit.block_id);
    setMonthlyRent(unit.monthly_rent.toString());
    setUnitStatus(unit.status);
    setIsModalVisible(true); // Open modal for editing
    setUnitNumberTouched(false); // Reset touched state for editing
    setMonthlyRentTouched(false);
  };

  const handleUpdateUnit = async () => {
    if (!editingUnit) return;
    setUnitNumberTouched(true);
    setMonthlyRentTouched(true);
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
      loadData();
      setIsModalVisible(false); // Close modal on success
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
              loadData();
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

  const clearForm = () => {
    setUnitNumber('');
    setMonthlyRent('');
    setUnitStatus('vacant');
    setEditingUnit(null);
    setUnitNumberTouched(false);
    setMonthlyRentTouched(false);
    if (blocks.length > 0) {
      setSelectedBlockId(blocks[0].id);
    } else {
      setSelectedBlockId(null);
    }
  };

  // Determine validation status for styling
  const isUnitNumberInvalid = unitNumberTouched && !unitNumber.trim();
  const isMonthlyRentInvalid =
    monthlyRentTouched &&
    (isNaN(parseFloat(monthlyRent)) || parseFloat(monthlyRent) <= 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
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

      {/* List of Units */}
      {units.length === 0 ? (
        <Text style={styles.noDataText}>
          No units found. Tap the '+' button to add a new unit!
        </Text>
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
                  <Text style={styles.unitDetailHighlight}>
                    {item.block_name}
                  </Text>
                </Text>
                <Text style={styles.unitDetails}>
                  <Ionicons name="cash-outline" size={14} color="#666" /> Rent:
                  <Text style={styles.unitDetailHighlight}>
                    {' '}
                    KES {item.monthly_rent.toFixed(2)}
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.unitStatus,
                    item.status === 'occupied' && styles.statusOccupied,
                    item.status === 'vacant' && styles.statusVacant,
                    item.status === 'maintenance' && styles.statusMaintenance,
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
                  <Ionicons name="create-outline" size={24} color="#4285F4" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteUnit(item.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={24} color="#EA4335" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          clearForm();
          setIsModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal for Add/Edit Unit Form */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(!isModalVisible);
          clearForm(); // Clear form if modal is dismissed
        }}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit Number</Text>
                  <TextInput
                    style={[
                      styles.input,
                      unitNumberFocused && styles.inputFocused,
                      isUnitNumberInvalid && styles.inputInvalid,
                    ]}
                    placeholder="e.g., A1, B10"
                    value={unitNumber}
                    onChangeText={setUnitNumber}
                    onFocus={() => setUnitNumberFocused(true)}
                    onBlur={() => {
                      setUnitNumberFocused(false);
                      setUnitNumberTouched(true);
                    }}
                    placeholderTextColor="#888"
                  />
                  {isUnitNumberInvalid && (
                    <Text style={styles.validationText}>
                      Unit number is required.
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Block</Text>
                  <View
                    style={[
                      styles.pickerContainer,
                      blocks.length === 0 && styles.pickerDisabled,
                    ]}
                  >
                    <Picker
                      selectedValue={selectedBlockId}
                      onValueChange={(itemValue: number | null) =>
                        setSelectedBlockId(itemValue)
                      }
                      style={styles.picker}
                      enabled={blocks.length > 0 && !isFormSubmitting}
                      itemStyle={styles.pickerItem}
                    >
                      {blocks.length === 0 ? (
                        <Picker.Item
                          label="No Blocks Available"
                          value={null}
                          color="#888"
                        />
                      ) : (
                        blocks.map((block) => (
                          <Picker.Item
                            key={block.id}
                            label={block.name}
                            value={block.id}
                            color="#495057"
                          />
                        ))
                      )}
                    </Picker>
                  </View>
                  {blocks.length === 0 && (
                    <Text style={styles.validationText}>
                      Please add blocks first.
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monthly Rent (KES)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      monthlyRentFocused && styles.inputFocused,
                      isMonthlyRentInvalid && styles.inputInvalid,
                    ]}
                    placeholder="e.g., 8000.00"
                    keyboardType="numeric"
                    value={monthlyRent}
                    onChangeText={setMonthlyRent}
                    onFocus={() => setMonthlyRentFocused(true)}
                    onBlur={() => {
                      setMonthlyRentFocused(false);
                      setMonthlyRentTouched(true);
                    }}
                    placeholderTextColor="#888"
                  />
                  {isMonthlyRentInvalid && (
                    <Text style={styles.validationText}>
                      Monthly rent must be a positive number.
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={unitStatus}
                      onValueChange={(itemValue: string) =>
                        setUnitStatus(itemValue)
                      }
                      style={styles.picker}
                      enabled={!isFormSubmitting}
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item
                        label="Vacant"
                        value="vacant"
                        color="#495057"
                      />
                      <Picker.Item
                        label="Occupied"
                        value="occupied"
                        color="#495057"
                      />
                      <Picker.Item
                        label="Maintenance"
                        value="maintenance"
                        color="#495057"
                      />
                    </Picker>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  {editingUnit ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.updateButton,
                          isFormSubmitting && styles.buttonDisabled,
                        ]}
                        onPress={handleUpdateUnit}
                        disabled={isFormSubmitting}
                      >
                        {isFormSubmitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Ionicons name="save" size={20} color="#fff" />
                        )}
                        <Text style={styles.buttonText}>
                          {isFormSubmitting ? 'Updating...' : 'Update Unit'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.cancelButton,
                          isFormSubmitting && styles.buttonDisabled,
                        ]}
                        onPress={() => {
                          setIsModalVisible(false);
                          clearForm();
                        }}
                        disabled={isFormSubmitting}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.addButton,
                        isFormSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={handleAddUnit}
                      disabled={isFormSubmitting}
                    >
                      {isFormSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="add-circle" size={20} color="#fff" />
                      )}
                      <Text style={styles.buttonText}>
                        {isFormSubmitting ? 'Adding...' : 'Add New Unit'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F0F2F5', // Light gray background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
    color: '#2C3E50', // Darker text for titles
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 15,
    color: '#2C3E50',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B', // Muted gray
  },
  errorText: {
    fontSize: 16,
    color: '#EA4335', // Google Red
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#4285F4', // Google Blue
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%', // Limit modal height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2C3E50',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    color: '#34495E', // Darker label
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DCDCDC', // Light gray border
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#34495E',
    backgroundColor: '#FAFAFA', // Slightly off-white input background
  },
  inputFocused: {
    borderColor: '#4285F4', // Google Blue on focus
    shadowColor: 'rgba(66, 133, 244, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  inputInvalid: {
    borderColor: '#EA4335', // Google Red for validation error
    backgroundColor: '#FFEBEE', // Light red background for invalid input
  },
  validationText: {
    color: '#EA4335',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DCDCDC',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  pickerDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.7,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
    color: '#34495E',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  addButton: {
    backgroundColor: '#34A853', // Google Green
  },
  updateButton: {
    backgroundColor: '#4285F4', // Google Blue
  },
  cancelButton: {
    backgroundColor: '#607D8B', // Muted Gray
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 100, // Space for FAB
  },
  unitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 6,
    borderLeftColor: '#F7C500', // Gold-ish for units
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  unitDetails: {
    fontSize: 15,
    color: '#525252', // Slightly lighter gray
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitDetailHighlight: {
    fontWeight: '600',
    color: '#333',
  },
  unitStatus: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusOccupied: {
    color: '#34A853', // Google Green
  },
  statusVacant: {
    color: '#FBBC04', // Google Yellow
  },
  statusMaintenance: {
    color: '#4285F4', // Google Blue
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 18,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8F0FE', // Light blue background for actions
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
    backgroundColor: '#4285F4', // Google Blue
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
