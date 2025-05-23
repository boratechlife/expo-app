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

// Define the Block interface matching your DB schema
interface Block {
  id: number;
  name: string;
  address: string | null; // Nullable based on DB schema
  total_units: number;
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
  blockBorder: '#20c997', // A fresh green-blue for block cards
};

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
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility

  // Input Focus States for styling
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [isUnitsFocused, setIsUnitsFocused] = useState(false);

  // Input Validation States
  const [isBlockNameValid, setIsBlockNameValid] = useState(true);
  const [isTotalUnitsValid, setIsTotalUnitsValid] = useState(true);

  // Function to load blocks from the database
  const loadBlocks = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
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
    let isValid = true;

    if (!blockName.trim()) {
      setIsBlockNameValid(false);
      isValid = false;
    } else {
      setIsBlockNameValid(true);
    }

    const parsedTotalUnits = parseInt(totalUnits);
    if (isNaN(parsedTotalUnits) || parsedTotalUnits <= 0) {
      setIsTotalUnitsValid(false);
      isValid = false;
    } else {
      setIsTotalUnitsValid(true);
    }

    if (!isValid) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields.');
    }
    return isValid;
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
      setModalVisible(false); // Close modal
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
    setIsBlockNameValid(true); // Reset validation on edit
    setIsTotalUnitsValid(true);
    setModalVisible(true); // Open modal for editing
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
      setModalVisible(false); // Close modal
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
    setIsBlockNameValid(true); // Reset validation states
    setIsTotalUnitsValid(true);
    setIsNameFocused(false); // Reset focus states
    setIsAddressFocused(false);
    setIsUnitsFocused(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      <Text style={styles.title}>Manage Property Blocks</Text>

      {/* List of Blocks */}
      <Text style={styles.listTitle}>Existing Blocks</Text>
      {blocks.length === 0 ? (
        <Text style={styles.noDataText}>
          No blocks found. Tap the '+' button to add one!
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
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={Colors.textSecondary}
                    />{' '}
                    {item.address}
                  </Text>
                ) : null}
                <Text style={styles.blockDetails}>
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={Colors.textSecondary}
                  />{' '}
                  Units:{' '}
                  <Text style={styles.blockUnitsCount}>{item.total_units}</Text>
                </Text>
                <Text style={styles.blockCreated}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={Colors.secondary}
                  />{' '}
                  Created: {new Date(item.created_at).toLocaleDateString()}
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
                  onPress={() => handleDeleteBlock(item.id)}
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

      {/* Add/Edit Block Modal */}
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
              {editingBlock ? 'Edit Block' : 'Create New Block'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Block Name <Text style={styles.requiredIndicator}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !isBlockNameValid && styles.inputError,
                  isNameFocused && styles.inputFocused,
                ]}
                placeholder="e.g., A Block"
                value={blockName}
                onChangeText={(text) => {
                  setBlockName(text);
                  setIsBlockNameValid(true); // Clear error on change
                }}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address (Optional)</Text>
              <TextInput
                style={[styles.input, isAddressFocused && styles.inputFocused]}
                placeholder="e.g., 123 Main St"
                value={blockAddress}
                onChangeText={setBlockAddress}
                onFocus={() => setIsAddressFocused(true)}
                onBlur={() => setIsAddressFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Total Units <Text style={styles.requiredIndicator}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  !isTotalUnitsValid && styles.inputError,
                  isUnitsFocused && styles.inputFocused,
                ]}
                placeholder="e.g., 10"
                keyboardType="numeric"
                value={totalUnits}
                onChangeText={(text) => {
                  setTotalUnits(text);
                  setIsTotalUnitsValid(true); // Clear error on change
                }}
                onFocus={() => setIsUnitsFocused(true)}
                onBlur={() => setIsUnitsFocused(false)}
                placeholderTextColor={Colors.secondary}
              />
            </View>

            <View style={styles.buttonRow}>
              {editingBlock ? (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={handleUpdateBlock}
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
                      {isFormSubmitting ? 'Updating...' : 'Update Block'}
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
                  onPress={handleAddBlock}
                  disabled={isFormSubmitting}
                >
                  {isFormSubmitting ? (
                    <ActivityIndicator color={Colors.cardBackground} />
                  ) : (
                    <Ionicons
                      name="add-circle"
                      size={20}
                      color={Colors.cardBackground}
                    />
                  )}
                  <Text style={styles.buttonText}>
                    {isFormSubmitting ? 'Adding...' : 'Create Block'}
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
  blockCard: {
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
    borderLeftColor: Colors.blockBorder, // A fresh green-blue for blocks
  },
  blockInfo: {
    flex: 1,
    marginRight: 15, // Space between info and actions
  },
  blockName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  blockDetails: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    lineHeight: 22, // Improve readability
  },
  blockUnitsCount: {
    fontWeight: 'bold', // Highlight unit count
    color: Colors.textPrimary,
  },
  blockCreated: {
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
