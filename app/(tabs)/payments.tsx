import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; // For date input
import { Picker } from '@react-native-picker/picker'; // For tenancy selection
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  block_name: string;
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
}

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]); // To select a tenancy for payment
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const date = new Date(parseInt(year), parseInt(month) - 1, 1); // Month is 0-indexed for Date object
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // --- Data Loading ---
  const loadData = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('rental_management_2');

      // Fetch all payments with tenant, unit details, and payment_for_month
      const allPayments = (await db.getAllAsync(`
        SELECT
          p.id,
          p.tenancy_id,
          p.amount,
          p.payment_date,
          p.payment_for_month,
          t.name AS tenant_name,
          u.unit_number AS unit_number
        FROM
          payments p
        JOIN
          tenancies ten ON p.tenancy_id = ten.id
        JOIN
          tenants t ON ten.tenant_id = t.id
        JOIN
          units u ON ten.unit_id = u.id
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
          u.unit_number AS unit_number,
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
    setShowPaymentDatePicker(Platform.OS === 'ios');
    setPaymentDate(currentDate);
  };

  const onPaymentForMonthChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentForMonthDate;
    setShowPaymentForMonthPicker(Platform.OS === 'ios');
    // Even though we pick a date, we only care about the month and year
    setPaymentForMonthDate(currentDate);
  };

  // --- CRUD Operations ---
  const handleAddPayment = async () => {
    if (selectedTenancyId === null || !paymentAmount.trim()) {
      Alert.alert('Error', 'Please select a Tenancy and enter an Amount.');
      return;
    }
    if (isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Error', 'Amount must be a number.');
      return;
    }

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
    } catch (err) {
      console.error('Error adding payment:', err);
      Alert.alert('Error', 'Failed to add payment. Please try again.');
    }
  };

  const handleEditPress = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedTenancyId(payment.tenancy_id);
    setPaymentAmount(payment.amount.toString());
    setPaymentDate(new Date(payment.payment_date + 'T00:00:00'));
    // Recreate Date object for payment_for_month
    // Assume payment_for_month is YYYY-MM, so add -01 to make it a valid date string for Date object
    setPaymentForMonthDate(
      new Date(payment.payment_for_month + '-01T00:00:00')
    );
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    if (selectedTenancyId === null || !paymentAmount.trim()) {
      Alert.alert('Error', 'Please select a Tenancy and enter an Amount.');
      return;
    }
    if (isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Error', 'Amount must be a number.');
      return;
    }

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
    } catch (err) {
      console.error('Error updating payment:', err);
      Alert.alert('Error', 'Failed to update payment. Please try again.');
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
      </View>
    );
  }

  // --- Main UI ---
  return (
    <View style={styles.container}>
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
            enabled={tenancies.length > 0}
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
          placeholder="Payment Amount"
          keyboardType="numeric"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
        />

        {/* Payment Date Selector */}
        <View style={styles.datePickerRow}>
          <Text style={styles.label}>
            Payment Date: {formatDate(paymentDate)}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPaymentDatePicker(true)}
            style={styles.datePickerButton}
          >
            <Ionicons name="calendar" size={24} color="#007bff" />
            <Text style={styles.datePickerButtonText}>Select Date</Text>
          </TouchableOpacity>
        </View>
        {showPaymentDatePicker && (
          <DateTimePicker
            testID="paymentDatePicker"
            value={paymentDate}
            mode="date"
            display="default"
            onChange={onPaymentDateChange}
          />
        )}

        {/* Payment For Month Selector - Uses DatePicker, but only month/year matters */}
        <View style={styles.datePickerRow}>
          <Text style={styles.label}>
            Payment For: {getMonthName(formatMonthYear(paymentForMonthDate))}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPaymentForMonthPicker(true)}
            style={styles.datePickerButton}
          >
            <Ionicons name="calendar-outline" size={24} color="#007bff" />
            <Text style={styles.datePickerButtonText}>Select Month/Year</Text>
          </TouchableOpacity>
        </View>
        {showPaymentForMonthPicker && (
          <DateTimePicker
            testID="paymentForMonthPicker"
            value={paymentForMonthDate}
            mode="date" // We use 'date' mode and then format to 'YYYY-MM'
            display="default"
            onChange={onPaymentForMonthChange}
          />
        )}

        <View style={styles.buttonRow}>
          {editingPayment ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdatePayment}
              >
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Payment</Text>
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
              onPress={handleAddPayment}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Add New Payment</Text>
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
              <View>
                <Text style={styles.paymentAmount}>
                  Amount: ${item.amount.toFixed(2)}
                </Text>
                <Text style={styles.paymentDetails}>
                  Payment Date: {item.payment_date}
                </Text>
                <Text style={styles.paymentDetails}>
                  For Month: {getMonthName(item.payment_for_month)}{' '}
                  {/* Display full month name */}
                </Text>
                <Text style={styles.paymentDetails}>
                  Tenant: {item.tenant_name}
                </Text>
                <Text style={styles.paymentDetails}>
                  Unit: {item.unit_number}
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
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
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  datePickerButtonText: {
    marginLeft: 8,
    color: '#007bff',
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
  paymentCard: {
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
  paymentAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  paymentDetails: {
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
