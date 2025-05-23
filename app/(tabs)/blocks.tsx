import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Define the Block interface matching your DB schema
interface Block {
  id: number;
  name: string;
  address: string | null; // Nullable based on DB schema
  total_units: number;
  created_at: string; // Add created_at
}

export default function BlocksScreen() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false); // To disable buttons during submission

  // State for form inputs
  const [blockName, setBlockName] = useState('');
  const [blockAddress, setBlockAddress] = useState('');
  const [totalUnits, setTotalUnits] = useState('');

  // State for editing: null if not editing, otherwise the Block object being edited
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);

  // Function to load blocks from the database
  const loadBlocks = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // Use the correct database name 'rental_management'
      const db = await SQLite.openDatabaseAsync('rental_management');
      const allBlocks = (await db.getAllAsync(
        'SELECT id, name, address, total_units, created_at FROM blocks ORDER BY name'
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

  // Input validation function
  const validateInputs = (): boolean => {
    if (!blockName.trim()) {
      Alert.alert('Validation Error', 'Block Name is required.');
      return false;
    }
    const parsedTotalUnits = parseInt(totalUnits);
    if (isNaN(parsedTotalUnits) || parsedTotalUnits <= 0) {
      Alert.alert('Validation Error', 'Total Units must be a positive number.');
      return false;
    }
    return true;
  };

  // Function to handle adding a new block
  const handleAddBlock = async () => {
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'INSERT INTO blocks (name, address, total_units) VALUES (?, ?, ?)',
        blockName.trim(),
        blockAddress.trim() || null, // Insert null if empty
        parseInt(totalUnits)
      );
      Alert.alert('Success', 'Block added successfully!');
      clearForm(); // Clear input fields
      loadBlocks(); // Refresh the list
    } catch (err: any) {
      console.error('Error adding block:', err);
      if (err.message.includes('UNIQUE constraint failed: blocks.name')) {
        Alert.alert(
          'Error',
          'A block with this name already exists. Please choose a unique name.'
        );
      } else {
        Alert.alert('Error', 'Failed to add block. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to set form for editing
  const handleEditPress = (block: Block) => {
    setEditingBlock(block);
    setBlockName(block.name);
    setBlockAddress(block.address || ''); // Handle undefined/null address
    setTotalUnits(block.total_units.toString());
  };

  // Function to handle updating an existing block
  const handleUpdateBlock = async () => {
    if (!editingBlock) return; // Should not happen if edit button is pressed
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management');
      await db.runAsync(
        'UPDATE blocks SET name = ?, address = ?, total_units = ? WHERE id = ?',
        blockName.trim(),
        blockAddress.trim() || null,
        parseInt(totalUnits),
        editingBlock.id
      );
      Alert.alert('Success', 'Block updated successfully!');
      clearForm(); // Clear input fields and exit editing mode
      loadBlocks(); // Refresh the list
    } catch (err: any) {
      console.error('Error updating block:', err);
      if (err.message.includes('UNIQUE constraint failed: blocks.name')) {
        Alert.alert(
          'Error',
          'A block with this name already exists. Please choose a unique name.'
        );
      } else {
        Alert.alert('Error', 'Failed to update block. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Function to handle deleting a block
  const handleDeleteBlock = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this block? This will also delete all associated units and tenancies within this block due to cascading deletes.',
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
              await db.runAsync('DELETE FROM blocks WHERE id = ?', id);
              Alert.alert(
                'Success',
                'Block and its associated units/tenancies deleted successfully!'
              );
              loadBlocks(); // Refresh the list
            } catch (err: any) {
              console.error('Error deleting block:', err);
              // Foreign key constraint failures on blocks usually means units are attached.
              // Given your schema for units: FOREIGN KEY(block_id) REFERENCES blocks(id) ON DELETE CASCADE
              // this specific error handling is for cases where 'ON DELETE NO ACTION' or 'RESTRICT' might be implicitly set or if something else is wrong.
              // However, the Alert message is good for clarity.
              if (err.message.includes('FOREIGN KEY constraint failed')) {
                Alert.alert(
                  'Deletion Restricted',
                  'Cannot delete block: There are still units associated with this block. Please ensure all units linked to this block are removed first, or check your database schema for cascading delete behavior.'
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
        <TouchableOpacity style={styles.retryButton} onPress={loadBlocks}>
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
      <Text style={styles.title}>Manage Blocks</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Block Name (e.g., A Block)"
          value={blockName}
          onChangeText={setBlockName}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Address (Optional, e.g., 123 Main St)"
          value={blockAddress}
          onChangeText={setBlockAddress}
          placeholderTextColor="#888"
        />
        <TextInput
          style={styles.input}
          placeholder="Total Units (e.g., 10)"
          keyboardType="numeric"
          value={totalUnits}
          onChangeText={setTotalUnits}
          placeholderTextColor="#888"
        />
        <View style={styles.buttonRow}>
          {editingBlock ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdateBlock}
                disabled={isFormSubmitting}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {isFormSubmitting ? 'Updating...' : 'Update Block'}
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
              onPress={handleAddBlock}
              disabled={isFormSubmitting}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isFormSubmitting ? 'Adding...' : 'Add New Block'}
              </Text>
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
              <View style={styles.blockInfo}>
                <Text style={styles.blockName}>{item.name}</Text>
                {item.address ? (
                  <Text style={styles.blockDetails}>
                    <Ionicons name="location-outline" size={14} color="#666" />{' '}
                    {item.address}
                  </Text>
                ) : null}
                <Text style={styles.blockDetails}>
                  <Ionicons name="cube-outline" size={14} color="#666" /> Units:{' '}
                  {item.total_units}
                </Text>
                <Text style={styles.blockCreated}>
                  <Ionicons name="time-outline" size={14} color="#999" />{' '}
                  Created: {new Date(item.created_at).toLocaleDateString()}
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
  blockCard: {
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
    borderLeftColor: '#20c997', // A fresh green-blue for blocks
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#343a40',
    marginBottom: 4,
  },
  blockDetails: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    flexDirection: 'row', // Align icon and text
    alignItems: 'center',
  },
  blockCreated: {
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
