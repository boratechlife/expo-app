// screens/DashboardScreen.js
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'; // Added ActivityIndicator

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalBlocks: 0,
    totalOccupiedUnits: 0,
    totalVacantUnits: 0,
    totalCollected: 0,
    totalOutstanding: 0, // This will be 0 as monthly_rent is removed for now
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const db = await SQLite.openDatabaseAsync('rental_management_2'); // Ensure db connection is opened here
      try {
        // Get all tenants
        const tenants = (await db.getAllAsync(
          'SELECT * FROM tenants ORDER BY name'
        )) as Array<{ id: number; name: string }>;

        // Get all blocks to calculate total units
        const blocks = (await db.getAllAsync(
          'SELECT total_units FROM blocks' // Only need total_units
        )) as Array<{ total_units: number }>;

        // Get active tenancies and total payments for them
        // Removed monthly_rent reference as requested
        const paymentsByTenancy = (await db.getAllAsync(`
          SELECT 
            t.id as tenancy_id, 
            COALESCE(SUM(p.amount), 0) as total_paid
          FROM tenancies t
          LEFT JOIN payments p ON t.id = p.tenancy_id
          WHERE t.status = 'active'
          GROUP BY t.id
        `)) as Array<{ tenancy_id: number; total_paid: number }>;

        // Calculate totals
        let totalCollected = 0;
        paymentsByTenancy.forEach((payment) => {
          totalCollected += payment.total_paid;
        });

        // Total occupied units is simply the count of active tenancies
        const totalOccupiedUnits = paymentsByTenancy.length;

        // Sum up total units from all blocks
        const totalUnits = blocks.reduce<number>(
          (sum, block: { total_units: number }) =>
            sum + (block.total_units || 0),
          0
        );

        setStats({
          totalTenants: tenants?.length || 0,
          totalBlocks: blocks?.length || 0,
          totalOccupiedUnits: totalOccupiedUnits,
          totalVacantUnits: totalUnits - totalOccupiedUnits,
          totalCollected: totalCollected,
          totalOutstanding: 0, // Set to 0 as monthly_rent is not used for calculation here
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard Summary</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalTenants}</Text>
          <Text style={styles.statLabel}>Total Tenants</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalBlocks}</Text>
          <Text style={styles.statLabel}>Total Blocks</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOccupiedUnits}</Text>
          <Text style={styles.statLabel}>Occupied Units</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalVacantUnits}</Text>
          <Text style={styles.statLabel}>Vacant Units</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statValue}>
            Kes{stats.totalCollected.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Collected</Text>
        </View>

        <View style={[styles.statCard, styles.outstandingCard]}>
          <Text style={styles.statValue}>
            Kes{stats.totalOutstanding.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Outstanding Balance</Text>
        </View>
      </View>
    </ScrollView>
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
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  incomeCard: {
    backgroundColor: '#e6f7eb',
  },
  outstandingCard: {
    backgroundColor: '#fce8e8',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    // Added loading text style
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});
