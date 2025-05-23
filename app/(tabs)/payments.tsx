import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Ensure you have these installed:
// expo install @react-native-picker/picker
// expo install @react-native-community/datetimepicker
// expo install expo-sqlite

interface Tenancy {
  id: number;
  tenant_id: number;
  tenant_name: string;
  unit_id: number;
  unit_number: string;
  block_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Payment {
  id: number;
  tenancy_id: number;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_for_month: string; // YYYY-MM
  tenant_name: string;
  unit_number: string;
  block_name: string;
}

const { height } = Dimensions.get('window');

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Form input states
  const [selectedTenancyId, setSelectedTenancyId] = useState<number | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentForMonthDate, setPaymentForMonthDate] = useState(new Date());
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showPaymentForMonthPicker, setShowPaymentForMonthPicker] =
    useState(false);

  // Editing state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);

  // Refs for input focus
  const amountInputRef = useRef<TextInput>(null);

  // --- Helper Functions ---
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatMonthYear = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    return `${year}-${month}`; // YYYY-MM
  };

  const getMonthName = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // --- Data Loading ---
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');

      const allPayments = (await db.getAllAsync(`
        SELECT
          p.id,
          p.tenancy_id,
          p.amount,
          p.payment_date,
          p.payment_for_month,
          t.name AS tenant_name,
          u.unit_number,
          b.name AS block_name
        FROM
          payments p
        JOIN
          tenancies ten ON p.tenancy_id = ten.id
        JOIN
          tenants t ON ten.tenant_id = t.id
        JOIN
          units u ON ten.unit_id = u.id
        JOIN
          blocks b ON u.block_id = b.id
        ORDER BY
          p.payment_date DESC, p.id DESC
      `)) as Payment[];
      setPayments(allPayments);
      setFilteredPayments(allPayments); // Initialize filtered payments

      const activeTenancies = (await db.getAllAsync(`
        SELECT
          ten.id,
          ten.tenant_id,
          ten.unit_id,
          ten.start_date,
          ten.end_date,
          ten.status,
          t.name AS tenant_name,
          u.unit_number,
          b.name AS block_name
        FROM
          tenancies ten
        JOIN
          tenants t ON ten.tenant_id = t.id
        JOIN
          units u ON ten.unit_id = u.id
        JOIN
          blocks b ON u.block_id = b.id
        WHERE
          ten.status = 'active'
        ORDER BY
          t.name, u.unit_number
      `)) as Tenancy[];
      setTenancies(activeTenancies);

      if (
        activeTenancies.length > 0 &&
        selectedTenancyId === null &&
        editingPayment === null
      ) {
        setSelectedTenancyId(activeTenancies[0].id);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(`Failed to load data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Apply search filter whenever payments or searchQuery changes
    const lowerCaseQuery = searchQuery.toLowerCase();
    const newFilteredPayments = payments.filter(
      (payment) =>
        payment.tenant_name.toLowerCase().includes(lowerCaseQuery) ||
        payment.unit_number.toLowerCase().includes(lowerCaseQuery) ||
        payment.block_name.toLowerCase().includes(lowerCaseQuery) ||
        payment.payment_date.includes(lowerCaseQuery) ||
        getMonthName(payment.payment_for_month)
          .toLowerCase()
          .includes(lowerCaseQuery) ||
        payment.amount.toString().includes(lowerCaseQuery)
    );
    setFilteredPayments(newFilteredPayments);
  }, [payments, searchQuery]);

  // --- Date Picker Handlers ---
  const onPaymentDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentDate;
    setShowPaymentDatePicker(Platform.OS === 'ios'); // Keep open on iOS for 'inline'
    setPaymentDate(currentDate);
    if (Platform.OS === 'android') {
      setShowPaymentDatePicker(false);
    }
  };

  const onPaymentForMonthChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentForMonthDate;
    setShowPaymentForMonthPicker(Platform.OS === 'ios'); // Keep open on iOS for 'inline'
    setPaymentForMonthDate(currentDate);
    if (Platform.OS === 'android') {
      setShowPaymentForMonthPicker(false);
    }
  };

  // --- Input Validation ---
  const validateInputs = (): boolean => {
    if (selectedTenancyId === null) {
      Alert.alert('Validation Error', 'Please select a Tenancy.', [
        { text: 'OK' },
      ]);
      return false;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        'Validation Error',
        'Payment Amount must be a positive number.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // --- CRUD Operations ---
  const handleAddPayment = async () => {
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      await db.runAsync(
        'INSERT INTO payments (tenancy_id, amount, payment_date, payment_for_month) VALUES (?, ?, ?, ?)',
        selectedTenancyId,
        parseFloat(paymentAmount),
        formatDate(paymentDate),
        formatMonthYear(paymentForMonthDate)
      );
      Alert.alert('Success', 'Payment added successfully!', [{ text: 'OK' }]);
      clearForm();
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      console.error('Error adding payment:', err);
      Alert.alert(
        'Error',
        `Failed to add payment: ${err.message || 'Please try again.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditPress = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedTenancyId(payment.tenancy_id);
    setPaymentAmount(payment.amount.toString());
    setPaymentDate(new Date(payment.payment_date + 'T00:00:00'));
    setPaymentForMonthDate(
      new Date(payment.payment_for_month + '-01T00:00:00')
    );
    setModalVisible(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    if (!validateInputs()) return;
    setIsFormSubmitting(true);

    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');
      await db.runAsync(
        'UPDATE payments SET tenancy_id = ?, amount = ?, payment_date = ?, payment_for_month = ? WHERE id = ?',
        selectedTenancyId,
        parseFloat(paymentAmount),
        formatDate(paymentDate),
        formatMonthYear(paymentForMonthDate),
        editingPayment.id
      );
      Alert.alert('Success', 'Payment updated successfully!', [{ text: 'OK' }]);
      clearForm();
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      console.error('Error updating payment:', err);
      Alert.alert(
        'Error',
        `Failed to update payment: ${err.message || 'Please try again.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this payment? This cannot be undone.',
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
              const db = await SQLite.openDatabaseAsync('rental_management_2');
              await db.runAsync('DELETE FROM payments WHERE id = ?', id);
              Alert.alert('Success', 'Payment deleted successfully!', [
                { text: 'OK' },
              ]);
              loadData();
            } catch (err: any) {
              console.error('Error deleting payment:', err);
              Alert.alert(
                'Error',
                `Failed to delete payment: ${
                  err.message || 'Please try again.'
                }`,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const clearForm = () => {
    setPaymentAmount('');
    setPaymentDate(new Date());
    setPaymentForMonthDate(new Date());
    setEditingPayment(null);
    if (tenancies.length > 0) {
      setSelectedTenancyId(tenancies[0].id);
    } else {
      setSelectedTenancyId(null);
    }
  };

  const handleAddNewPress = () => {
    clearForm();
    setModalVisible(true);
  };

  // --- Loading & Error States ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading payments...</Text>
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

  // --- Main UI ---
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <Text style={styles.title}>Manage Payments</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6c757d"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search payments by tenant, unit, or date..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#6c757d" />
          </TouchableOpacity>
        )}
      </View>

      {/* List of Payments */}
      <Text style={styles.listTitle}>Recorded Payments</Text>
      {filteredPayments.length === 0 && searchQuery === '' ? (
        <Text style={styles.noDataText}>
          No payments recorded yet. Add some using the '+' button!
        </Text>
      ) : filteredPayments.length === 0 && searchQuery !== '' ? (
        <Text style={styles.noDataText}>
          No payments found for "{searchQuery}".
        </Text>
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentAmount}>
                  KES {item.amount.toFixed(2)}
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="person-outline" size={14} color="#666" />{' '}
                  Tenant:{' '}
                  <Text style={styles.paymentDetailsBold}>
                    {item.tenant_name}
                  </Text>
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="business-outline" size={14} color="#666" />{' '}
                  Unit:{' '}
                  <Text style={styles.paymentDetailsBold}>
                    {item.block_name} - {item.unit_number}
                  </Text>
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />{' '}
                  Paid On:{' '}
                  <Text style={styles.paymentDetailsBold}>
                    {item.payment_date}
                  </Text>
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="cash-outline" size={14} color="#666" /> For
                  Month:{' '}
                  <Text style={styles.paymentDetailsBold}>
                    {getMonthName(item.payment_for_month)}
                  </Text>
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
                  onPress={() => handleDeletePayment(item.id)}
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

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddNewPress}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Payment Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          clearForm();
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            // Dismiss keyboard when clicking outside the form
            // but not the modal itself to allow scrolling
            if (Platform.OS !== 'ios') {
              // iOS handles this better with KeyboardAvoidingView
              // No specific dismiss for Android, but this handles tapping outside specific inputs
            }
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingPayment ? 'Edit Payment' : 'Add New Payment'}
              </Text>

              <Text style={styles.label}>Select Tenancy:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedTenancyId}
                  onValueChange={(itemValue: number | null) =>
                    setSelectedTenancyId(itemValue)
                  }
                  style={styles.picker}
                  enabled={tenancies.length > 0 && !isFormSubmitting}
                >
                  {tenancies.length === 0 ? (
                    <Picker.Item label="No Active Tenancies" value={null} />
                  ) : (
                    tenancies.map((tenancy) => (
                      <Picker.Item
                        key={tenancy.id}
                        label={`${tenancy.tenant_name} (${tenancy.block_name} - ${tenancy.unit_number})`}
                        value={tenancy.id}
                      />
                    ))
                  )}
                </Picker>
              </View>

              <Text style={styles.label}>Payment Amount:</Text>
              <TextInput
                ref={amountInputRef}
                style={styles.input}
                placeholder="e.g., 8000.00"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                editable={!isFormSubmitting}
                placeholderTextColor="#888"
              />

              {/* Payment Date Selector */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>
                  <Ionicons name="calendar-outline" size={18} color="#495057" />{' '}
                  Payment Date:{' '}
                  <Text style={styles.dateDisplay}>
                    {formatDate(paymentDate)}
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentDatePicker(true)}
                  style={styles.datePickerButton}
                  disabled={isFormSubmitting}
                >
                  <Text style={styles.datePickerButtonText}>Select</Text>
                </TouchableOpacity>
              </View>
              {showPaymentDatePicker && (
                <DateTimePicker
                  testID="paymentDatePicker"
                  value={paymentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Spinner for iOS to save space
                  onChange={onPaymentDateChange}
                />
              )}

              {/* Payment For Month Selector */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>
                  <Ionicons name="cash-outline" size={18} color="#495057" />{' '}
                  Payment For:{' '}
                  <Text style={styles.dateDisplay}>
                    {getMonthName(formatMonthYear(paymentForMonthDate))}
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentForMonthPicker(true)}
                  style={styles.datePickerButton}
                  disabled={isFormSubmitting}
                >
                  <Text style={styles.datePickerButtonText}>Select Month</Text>
                </TouchableOpacity>
              </View>
              {showPaymentForMonthPicker && (
                <DateTimePicker
                  testID="paymentForMonthPicker"
                  value={paymentForMonthDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Spinner for iOS to save space
                  onChange={onPaymentForMonthChange}
                />
              )}

              <View style={styles.buttonRow}>
                {editingPayment ? (
                  <>
                    <TouchableOpacity
                      style={[styles.button, styles.updateButton]}
                      onPress={handleUpdatePayment}
                      disabled={isFormSubmitting}
                    >
                      {isFormSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Ionicons name="save" size={20} color="#fff" />
                      )}
                      <Text style={styles.buttonText}>
                        {isFormSubmitting ? 'Updating...' : 'Update Payment'}
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
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.addButton]}
                    onPress={handleAddPayment}
                    disabled={isFormSubmitting}
                  >
                    {isFormSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons name="add-circle" size={20} color="#fff" />
                    )}
                    <Text style={styles.buttonText}>
                      {isFormSubmitting ? 'Adding...' : 'Add New Payment'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f2f5', // Light gray background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 32,
    fontWeight: '800', // Extra bold
    marginBottom: 25,
    textAlign: 'center',
    color: '#2c3e50', // Darker text for contrast
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '700', // Bold
    marginTop: 25,
    marginBottom: 15,
    color: '#34495e', // Slightly lighter dark
    borderBottomWidth: 2,
    borderBottomColor: '#e0e6ed',
    paddingBottom: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d', // Muted gray
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c', // Red error
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3498db', // Blue
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent overlay
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: height * 0.8, // Limit modal height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#34495e',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7', // Lighter gray border
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
    fontSize: 16,
    color: '#34495e',
    backgroundColor: '#ecf0f1', // Light input background
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#ecf0f1',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#34495e',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    backgroundColor: '#ecf0f1',
  },
  dateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 16,
    color: '#34495e',
  },
  dateDisplay: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#bdc3c7', // Muted background
    borderRadius: 8,
  },
  datePickerButtonText: {
    color: '#2c3e50',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  addButton: {
    backgroundColor: '#27ae60', // Emerald green
  },
  updateButton: {
    backgroundColor: '#2980b9', // Peter River blue
  },
  cancelButton: {
    backgroundColor: '#95a5a6', // Concrete gray
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 100, // Make space for FAB
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 6,
    borderLeftColor: '#8e44ad', // Amethyst purple
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#27ae60', // Emerald green
    marginBottom: 6,
  },
  paymentDetails: {
    fontSize: 15,
    color: '#555',
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDetailsBold: {
    fontWeight: '600',
    color: '#34495e',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15, // Space between info and actions
  },
  actionButton: {
    marginLeft: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 17,
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
    backgroundColor: '#3498db', // Blue for FAB
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10, // Ensure it's above other elements
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#34495e',
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 5,
  },
});
