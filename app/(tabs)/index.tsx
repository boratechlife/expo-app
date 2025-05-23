import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Define the structure for your stats state
interface DashboardStats {
  totalTenants: number;
  totalBlocks: number;
  totalUnits: number; // Added total units to stats
  totalOccupiedUnits: number;
  totalVacantUnits: number;
  totalMaintenanceUnits: number; // New: Units under maintenance
  totalActiveTenancies: number;
  totalEndedTenancies: number;
  totalNoticeTenancies: number; // New: Tenancies in notice period
  totalCollectedThisMonth: number; // New: Payments collected this month
  totalExpectedThisMonth: number; // New: Expected rent for the current month
  totalOutstandingAcrossAllMonths: number; // Total rent due from all past and current months
  totalCollectedAcrossAllMonths: number; // Total payments ever collected
}

const initialStats: DashboardStats = {
  totalTenants: 0,
  totalBlocks: 0,
  totalUnits: 0,
  totalOccupiedUnits: 0,
  totalVacantUnits: 0,
  totalMaintenanceUnits: 0,
  totalActiveTenancies: 0,
  totalEndedTenancies: 0,
  totalNoticeTenancies: 0,
  totalCollectedThisMonth: 0,
  totalExpectedThisMonth: 0,
  totalOutstandingAcrossAllMonths: 0,
  totalCollectedAcrossAllMonths: 0,
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    const db = await SQLite.openDatabaseAsync('rental_management_2');

    try {
      // 1. Total Tenants
      interface CountResult {
        count: number;
      }
      const totalTenantsResult = (await db.getFirstAsync(
        'SELECT COUNT(id) as count FROM tenants;'
      )) as CountResult;
      const totalTenants = totalTenantsResult?.count || 0;

      // 2. Total Blocks
      const totalBlocksResult = (await db.getFirstAsync(
        'SELECT COUNT(id) as count FROM blocks;'
      )) as CountResult;
      const totalBlocks = totalBlocksResult?.count || 0;

      // 3. Unit Status Counts
      const unitStatuses = await db.getAllAsync(`
        SELECT status, COUNT(id) as count FROM units GROUP BY status;
      `);
      let totalUnits = 0;
      let totalOccupiedUnits = 0;
      let totalVacantUnits = 0;
      let totalMaintenanceUnits = 0;

      unitStatuses.forEach((row: any) => {
        totalUnits += row.count;
        if (row.status === 'occupied') {
          totalOccupiedUnits = row.count;
        } else if (row.status === 'vacant') {
          totalVacantUnits = row.count;
        } else if (row.status === 'maintenance') {
          totalMaintenanceUnits = row.count;
        }
      });

      // 4. Tenancy Status Counts
      const tenancyStatuses = await db.getAllAsync(`
        SELECT status, COUNT(id) as count FROM tenancies GROUP BY status;
      `);
      let totalActiveTenancies = 0;
      let totalEndedTenancies = 0;
      let totalNoticeTenancies = 0;

      tenancyStatuses.forEach((row: any) => {
        if (row.status === 'active') {
          totalActiveTenancies = row.count;
        } else if (row.status === 'ended') {
          totalEndedTenancies = row.count;
        } else if (row.status === 'notice') {
          totalNoticeTenancies = row.count;
        }
      });

      // 5. Total Collected Across All Months
      const totalCollectedResult = (await db.getFirstAsync(
        'SELECT SUM(amount) as total FROM payments;'
      )) as { total: number | null };
      const totalCollectedAcrossAllMonths = totalCollectedResult?.total || 0;

      // 6. Current Month Calculations (e.g., May 2024 for rent due in May 2024)
      const currentMonthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const nextMonthFirstDay = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      );
      const startOfCurrentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      // Total collected for the current month
      const collectedThisMonthResult = (await db.getFirstAsync(
        `SELECT SUM(amount) as total FROM payments WHERE payment_for_month = ?;`,
        [currentMonthYear]
      )) as { total: number | null };
      const totalCollectedThisMonth = collectedThisMonthResult?.total || 0;

      // Total expected for the current month (from active tenancies)
      const expectedThisMonthResult = (await db.getFirstAsync(`
        SELECT SUM(u.monthly_rent) as total_expected
        FROM tenancies t
        JOIN units u ON t.unit_id = u.id
        WHERE t.status = 'active';
      `)) as { total_expected: number | null };
      const totalExpectedThisMonth =
        expectedThisMonthResult?.total_expected || 0;

      // 7. Total Outstanding Across All Months (more complex, actual rent due vs. paid)
      // This query attempts to calculate outstanding balance for each active tenancy
      // based on the total rent due since start_date up to the current month,
      // minus total payments made. This is an approximation; a full accounting
      // system would track per-month rent charges and payments.

      // Calculate number of full months passed since tenancy start for each active tenancy
      // and sum up the theoretical rent due up to the current month.
      const outstandingBalances = await db.getAllAsync(`
        SELECT
            ten.id AS tenancy_id,
            u.monthly_rent,
            ten.start_date,
            COALESCE(SUM(p.amount), 0) AS total_paid
        FROM
            tenancies ten
        JOIN
            units u ON ten.unit_id = u.id
        LEFT JOIN
            payments p ON ten.id = p.tenancy_id
        WHERE
            ten.status = 'active'
        GROUP BY
            ten.id, u.monthly_rent, ten.start_date;
      `);

      let totalOutstandingAcrossAllMonths = 0;

      outstandingBalances.forEach((tenancy: any) => {
        const startDate = new Date(tenancy.start_date);
        const currentDate = new Date(); // Today's date

        // Calculate months between start_date and current month
        // This is a simplified calculation and might need refinement for exact days/prorated rent
        let monthsDue =
          (currentDate.getFullYear() - startDate.getFullYear()) * 12;
        monthsDue -= startDate.getMonth(); // Subtract months from start year
        monthsDue += currentDate.getMonth(); // Add months from current year

        // If the tenancy started in the current month, count it as 1 month.
        // If the tenancy started before the current month, and the current month is complete, count it.
        // For simplicity, we'll just assume full months from start_date to current month.
        // A more complex system would handle pro-rating for partial months.
        if (startDate.getDate() <= currentDate.getDate()) {
          monthsDue += 1; // Count the current month if the start date has passed in the current month
        }

        // Ensure monthsDue is at least 0
        monthsDue = Math.max(0, monthsDue);

        const theoreticalRentDue = tenancy.monthly_rent * monthsDue;
        const currentBalance = theoreticalRentDue - tenancy.total_paid;

        if (currentBalance > 0) {
          totalOutstandingAcrossAllMonths += currentBalance;
        }
      });

      setStats({
        totalTenants: totalTenants,
        totalBlocks: totalBlocks,
        totalUnits: totalUnits,
        totalOccupiedUnits: totalOccupiedUnits,
        totalVacantUnits: totalVacantUnits,
        totalMaintenanceUnits: totalMaintenanceUnits,
        totalActiveTenancies: totalActiveTenancies,
        totalEndedTenancies: totalEndedTenancies,
        totalNoticeTenancies: totalNoticeTenancies,
        totalCollectedThisMonth: totalCollectedThisMonth,
        totalExpectedThisMonth: totalExpectedThisMonth,
        totalOutstandingAcrossAllMonths: totalOutstandingAcrossAllMonths,
        totalCollectedAcrossAllMonths: totalCollectedAcrossAllMonths,
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading dashboard stats...</Text>
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard Overview</Text>

      {/* General Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Statistics</Text>
        <StatCard
          icon="people"
          label="Total Tenants"
          value={stats.totalTenants}
        />
        <StatCard icon="grid" label="Total Blocks" value={stats.totalBlocks} />
        <StatCard icon="home" label="Total Units" value={stats.totalUnits} />
      </View>

      {/* Unit Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unit Status</Text>
        <StatCard
          icon="home"
          label="Occupied Units"
          value={stats.totalOccupiedUnits}
          color="#28a745"
        />
        <StatCard
          icon="bed"
          label="Vacant Units"
          value={stats.totalVacantUnits}
          color="#ffc107"
        />
        <StatCard
          icon="build"
          label="Units in Maintenance"
          value={stats.totalMaintenanceUnits}
          color="#17a2b8"
        />
      </View>

      {/* Tenancy Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenancy Status</Text>
        <StatCard
          icon="person-add"
          label="Active Tenancies"
          value={stats.totalActiveTenancies}
          color="#28a745"
        />
        <StatCard
          icon="person-remove"
          label="Ended Tenancies"
          value={stats.totalEndedTenancies}
          color="#dc3545"
        />
        <StatCard
          icon="information-circle"
          label="Tenancies in Notice"
          value={stats.totalNoticeTenancies}
          color="#6c757d"
        />
      </View>

      {/* Financial Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <StatCard
          icon="cash"
          label="Total Collected (All Time)"
          value={`$${stats.totalCollectedAcrossAllMonths.toFixed(2)}`}
          color="#007bff"
        />
        <StatCard
          icon="wallet"
          label="Total Outstanding (All Time)"
          value={`$${stats.totalOutstandingAcrossAllMonths.toFixed(2)}`}
          color="#dc3545"
        />
        <StatCard
          icon="calendar-number"
          label="Collected This Month"
          value={`$${stats.totalCollectedThisMonth.toFixed(2)}`}
          color="#28a745"
        />
        <StatCard
          icon="analytics"
          label="Expected This Month"
          value={`$${stats.totalExpectedThisMonth.toFixed(2)}`}
          color="#007bff"
        />
      </View>
    </ScrollView>
  );
}

// Reusable Stat Card Component
const StatCard = ({
  icon,
  label,
  value,
  color = '#007bff',
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={30} color={color} style={styles.statIcon} />
    <View style={styles.statContent}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  </View>
);

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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statIcon: {
    marginRight: 15,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 16,
    color: '#555',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
