import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; // For date input
import { Picker } from '@react-native-picker/picker'; // For tenancy selection
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

// Ensure you have these installed:
// expo install @react-native-picker/picker
// expo install @react-native-community/datetimepicker

interface Tenancy {
  id: number;
  tenant_id: number;
  tenant_name: string;
  unit_id: number;
  unit_number: string;
  block_name: string; // Including block_name for clearer picker display
  start_date: string;
  end_date: string; // Could be null if active
  status: string; // 'active', 'ended'
}

interface Payment {
  id: number;
  tenancy_id: number;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_for_month: string; // YYYY-MM
  tenant_name: string;
  unit_number: string; // Display for context
  block_name: string; // Added this as it's fetched for display
}

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]); // To select a tenancy for payment
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false); // To disable buttons during submission

  // Form input states
  const [selectedTenancyId, setSelectedTenancyId] = useState<number | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date()); // For actual payment date
  const [paymentForMonthDate, setPaymentForMonthDate] = useState(new Date()); // For the 'payment_for_month' field (Month/Year)
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showPaymentForMonthPicker, setShowPaymentForMonthPicker] =
    useState(false);

  // Editing state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

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
    // Expects YYYY-MM format
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    // Date object needs a day, so add -01 for consistency. Month is 0-indexed.
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // --- Data Loading ---
  const loadData = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');

      // Fetch all payments with tenant, unit, and block details for display
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

      // Fetch active tenancies for the picker
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

      // Set default selected tenancy if any active tenancies exist and none is selected
      if (
        activeTenancies.length > 0 &&
        selectedTenancyId === null &&
        editingPayment === null
      ) {
        setSelectedTenancyId(activeTenancies[0].id);
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

  // --- Date Picker Handlers ---
  const onPaymentDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentDate;
    setShowPaymentDatePicker(false); // Close picker after selection
    setPaymentDate(currentDate);
  };

  const onPaymentForMonthChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentForMonthDate;
    setShowPaymentForMonthPicker(false); // Close picker after selection
    setPaymentForMonthDate(currentDate);
  };

  // --- Input Validation ---
  const validateInputs = (): boolean => {
    if (selectedTenancyId === null) {
      Alert.alert('Validation Error', 'Please select a Tenancy.');
      return false;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        'Validation Error',
        'Payment Amount must be a positive number.'
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
        formatMonthYear(paymentForMonthDate) // Insert YYYY-MM
      );
      Alert.alert('Success', 'Payment added successfully!');
      clearForm();
      loadData();
    } catch (err: any) {
      console.error('Error adding payment:', err);
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        Alert.alert(
          'Error',
          'Invalid Tenancy selected. Please ensure it exists.'
        );
      } else {
        Alert.alert('Error', 'Failed to add payment. Please try again.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditPress = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedTenancyId(payment.tenancy_id);
    setPaymentAmount(payment.amount.toString());
    // Convert YYYY-MM-DD string to Date object
    setPaymentDate(new Date(payment.payment_date + 'T00:00:00'));
    // Recreate Date object for payment_for_month (YYYY-MM to Date object for picker)
    setPaymentForMonthDate(
      new Date(payment.payment_for_month + '-01T00:00:00')
    );
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
        formatMonthYear(paymentForMonthDate), // Update YYYY-MM
        editingPayment.id
      );
      Alert.alert('Success', 'Payment updated successfully!');
      clearForm();
      loadData();
    } catch (err: any) {
      console.error('Error updating payment:', err);
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        Alert.alert(
          'Error',
          'Invalid Tenancy selected. Please ensure it exists.'
        );
      } else {
        Alert.alert('Error', 'Failed to update payment. Please try again.');
      }
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
              Alert.alert('Success', 'Payment deleted successfully!');
              loadData();
            } catch (err) {
              console.error('Error deleting payment:', err);
              Alert.alert(
                'Error',
                'Failed to delete payment. Please try again.'
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
    setPaymentForMonthDate(new Date()); // Reset to current date
    setEditingPayment(null);
    if (tenancies.length > 0) {
      setSelectedTenancyId(tenancies[0].id);
    } else {
      setSelectedTenancyId(null);
    }
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20} // Adjust offset as needed
    >
      <Text style={styles.title}>Manage Payments</Text>

      {/* Input Form for Add/Edit */}
      <View style={styles.formContainer}>
        <Text style={styles.label}>Select Tenancy:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedTenancyId}
            onValueChange={(itemValue: number | null) =>
              setSelectedTenancyId(itemValue)
            }
            style={styles.picker}
            enabled={tenancies.length > 0 && !isFormSubmitting} // Disable picker during submission
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

        <TextInput
          style={styles.input}
          placeholder="Payment Amount (e.g., 8000.00)"
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
            Payment Date: {formatDate(paymentDate)}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPaymentDatePicker(true)}
            style={styles.datePickerButton}
            disabled={isFormSubmitting}
          >
            <Text style={styles.datePickerButtonText}>Select Date</Text>
          </TouchableOpacity>
        </View>
        {showPaymentDatePicker && (
          <DateTimePicker
            testID="paymentDatePicker"
            value={paymentDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'} // Inline for iOS, modal for Android
            onChange={onPaymentDateChange}
          />
        )}

        {/* Payment For Month Selector */}
        <View style={styles.datePickerRow}>
          <Text style={styles.dateLabel}>
            <Ionicons name="cash-outline" size={18} color="#495057" /> Payment
            For: {getMonthName(formatMonthYear(paymentForMonthDate))}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPaymentForMonthPicker(true)}
            style={styles.datePickerButton}
            disabled={isFormSubmitting}
          >
            <Text style={styles.datePickerButtonText}>Select Month/Year</Text>
          </TouchableOpacity>
        </View>
        {showPaymentForMonthPicker && (
          <DateTimePicker
            testID="paymentForMonthPicker"
            value={paymentForMonthDate}
            mode="date" // We use 'date' mode and then format to 'YYYY-MM'
            display={Platform.OS === 'ios' ? 'inline' : 'default'} // Inline for iOS, modal for Android
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
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {isFormSubmitting ? 'Updating...' : 'Update Payment'}
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
              onPress={handleAddPayment}
              disabled={isFormSubmitting}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isFormSubmitting ? 'Adding...' : 'Add New Payment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List of Payments */}
      <Text style={styles.listTitle}>Recorded Payments</Text>
      {payments.length === 0 ? (
        <Text style={styles.noDataText}>
          No payments recorded yet. Add some!
        </Text>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentAmount}>
                  KES {item.amount.toFixed(2)}
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="person-outline" size={14} color="#666" />{' '}
                  Tenant: {item.tenant_name}
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="business-outline" size={14} color="#666" />{' '}
                  Unit: {item.block_name} - {item.unit_number}
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />{' '}
                  Paid On: {item.payment_date}
                </Text>
                <Text style={styles.paymentDetails}>
                  <Ionicons name="cash-outline" size={14} color="#666" /> For
                  Month: {getMonthName(item.payment_for_month)}
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
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
    backgroundColor: '#f1f3f5',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#495057',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
  },
  dateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 16,
    color: '#495057',
  },
  datePickerButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
  },
  datePickerButtonText: {
    color: '#007bff',
    fontSize: 15,
    fontWeight: 'bold',
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
  paymentCard: {
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
    borderLeftColor: '#6f42c1', // Distinct color for payments
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#28a745', // Highlight amount in green
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    flexDirection: 'row', // For inline icon and text
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
