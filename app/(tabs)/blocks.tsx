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

interface Block {
  id: number;
  name: string;
  address?: string; // Add address as it's in your DB schema
  total_units: number;
}

export default function BlocksScreen() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for form inputs
  const [blockName, setBlockName] = useState('');
  const [blockAddress, setBlockAddress] = useState('');
  const [totalUnits, setTotalUnits] = useState('');

  // State for editing: null if not editing, otherwise the Block object being edited
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  // Function to load blocks from the database
  const loadBlocks = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      const allBlocks = (await db.getAllAsync(
        'SELECT id, name, address, total_units FROM blocks ORDER BY name'
      )) as Block[];
      setBlocks(allBlocks);
    } catch (err) {
      console.error('Error loading blocks:', err);
      setError('Failed to load blocks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, []); // Load blocks on initial component mount

  // Function to handle adding a new block
  const handleAddBlock = async () => {
    if (!blockName.trim() || !totalUnits.trim()) {
      Alert.alert('Error', 'Block Name and Total Units are required.');
      return;
    }
    if (isNaN(parseInt(totalUnits))) {
      Alert.alert('Error', 'Total Units must be a number.');
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'INSERT INTO blocks (name, address, total_units) VALUES (?, ?, ?)',
        blockName.trim(),
        blockAddress.trim(),
        parseInt(totalUnits)
      );
      Alert.alert('Success', 'Block added successfully!');
      clearForm(); // Clear input fields
      loadBlocks(); // Refresh the list
    } catch (err) {
      console.error('Error adding block:', err);
      Alert.alert('Error', 'Failed to add block. Please try again.');
    }
  };

  // Function to set form for editing
  const handleEditPress = (block: Block) => {
    setEditingBlock(block);
    setBlockName(block.name);
    setBlockAddress(block.address || ''); // Handle undefined address
    setTotalUnits(block.total_units.toString());
  };

  // Function to handle updating an existing block
  const handleUpdateBlock = async () => {
    if (!editingBlock) return; // Should not happen if edit button is pressed
    if (!blockName.trim() || !totalUnits.trim()) {
      Alert.alert('Error', 'Block Name and Total Units are required.');
      return;
    }
    if (isNaN(parseInt(totalUnits))) {
      Alert.alert('Error', 'Total Units must be a number.');
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'UPDATE blocks SET name = ?, address = ?, total_units = ? WHERE id = ?',
        blockName.trim(),
        blockAddress.trim(),
        parseInt(totalUnits),
        editingBlock.id
      );
      Alert.alert('Success', 'Block updated successfully!');
      clearForm(); // Clear input fields and exit editing mode
      loadBlocks(); // Refresh the list
    } catch (err) {
      console.error('Error updating block:', err);
      Alert.alert('Error', 'Failed to update block. Please try again.');
    }
  };

  // Function to handle deleting a block
  const handleDeleteBlock = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this block? This cannot be undone.',
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
              await db.runAsync('DELETE FROM blocks WHERE id = ?', id);
              Alert.alert('Success', 'Block deleted successfully!');
              loadBlocks(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting block:', err);
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Error',
                  'Cannot delete block: There are units or tenancies associated with this block. Please delete them first.'
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to delete block. Please try again.'
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
    setBlockName('');
    setBlockAddress('');
    setTotalUnits('');
    setEditingBlock(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading blocks...</Text>
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
      <Text style={styles.title}>Manage Blocks</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Block Name"
          value={blockName}
          onChangeText={setBlockName}
        />
        <TextInput
          style={styles.input}
          placeholder="Address (Optional)"
          value={blockAddress}
          onChangeText={setBlockAddress}
        />
        <TextInput
          style={styles.input}
          placeholder="Total Units"
          keyboardType="numeric"
          value={totalUnits}
          onChangeText={setTotalUnits}
        />
        <View style={styles.buttonRow}>
          {editingBlock ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateBlock}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Block</Text>
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
              onPress={handleAddBlock}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Add New Block</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of Blocks */}
      <Text style={styles.listTitle}>Existing Blocks</Text>
      {blocks.length === 0 ? (
        <Text style={styles.noDataText}>
          No blocks found. Start by adding one!
        </Text>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.blockCard}>
              <View>
                <Text style={styles.blockName}>{item.name}</Text>
                {item.address ? (
                  <Text style={styles.blockDetails}>
                    Address: {item.address}
                  </Text>
                ) : null}
                <Text style={styles.blockDetails}>
                  Total Units: {item.total_units}
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
                  onPress={() => handleDeleteBlock(item.id)}
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
  blockCard: {
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
  blockName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  blockDetails: {
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
