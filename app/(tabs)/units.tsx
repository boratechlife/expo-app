import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Import Picker
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
    try {
      const db = await SQLite.openDatabaseAsync('rental_management');

      // Fetch units with block names
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

      // Set default selected block if any exist
      if (allBlocks.length > 0 && selectedBlockId === null) {
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

  // Function to handle adding a new unit
  const handleAddUnit = async () => {
    if (!unitNumber.trim() || !monthlyRent.trim() || selectedBlockId === null) {
      Alert.alert(
        'Error',
        'Unit Number, Monthly Rent, and Block are required.'
      );
      return;
    }
    if (isNaN(parseFloat(monthlyRent))) {
      Alert.alert('Error', 'Monthly Rent must be a number.');
      return;
    }

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
    } catch (err) {
      console.error('Error adding unit:', err);
      Alert.alert('Error', 'Failed to add unit. Please try again.');
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
    if (!unitNumber.trim() || !monthlyRent.trim() || selectedBlockId === null) {
      Alert.alert(
        'Error',
        'Unit Number, Monthly Rent, and Block are required.'
      );
      return;
    }
    if (isNaN(parseFloat(monthlyRent))) {
      Alert.alert('Error', 'Monthly Rent must be a number.');
      return;
    }

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
    } catch (err) {
      console.error('Error updating unit:', err);
      Alert.alert('Error', 'Failed to update unit. Please try again.');
    }
  };

  // Function to handle deleting a unit
  const handleDeleteUnit = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this unit? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const db = await SQLite.openDatabaseAsync('rental_management');
              await db.runAsync('DELETE FROM units WHERE id = ?', id);
              Alert.alert('Success', 'Unit deleted successfully!');
              loadData(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting unit:', err);
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Error',
                  'Cannot delete unit: There are tenancies associated with this unit. Please delete them first.'
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Units</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Unit Number (e.g., A1, B10)"
          value={unitNumber}
          onChangeText={setUnitNumber}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedBlockId}
            onValueChange={(itemValue: number) => setSelectedBlockId(itemValue)}
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
          placeholder="Monthly Rent"
          keyboardType="numeric"
          value={monthlyRent}
          onChangeText={setMonthlyRent}
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
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Unit</Text>
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
              onPress={handleAddUnit}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Add New Unit</Text>
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
              <View>
                <Text style={styles.unitNumber}>{item.unit_number}</Text>
                <Text style={styles.unitDetails}>Block: {item.block_name}</Text>
                <Text style={styles.unitDetails}>
                  Rent: KES{item.monthly_rent.toFixed(2)}
                </Text>
                <Text style={styles.unitStatus}>Status: {item.status}</Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden', // Ensures the picker doesn't bleed outside the border radius
  },
  picker: {
    height: 50,
    width: '100%',
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
  unitCard: {
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
  unitNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  unitDetails: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  unitStatus: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#007bff', // Example color for status
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
