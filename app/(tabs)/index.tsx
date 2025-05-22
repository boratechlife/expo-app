// screens/DashboardScreen.js
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalBlocks: 0,
    totalOccupiedUnits: 0,
    totalVacantUnits: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const db = await SQLite.openDatabaseAsync('rental_management');
      try {
        // Get all tenants
        const tenants = (await db.getAllAsync(
          'SELECT * FROM tenants ORDER BY name'
        )) as Array<{ id: number; name: string }>;

        // Get all blocks
        const blocks = (await db.getAllAsync(
          'SELECT * FROM blocks ORDER BY name'
        )) as Array<{ total_units: number }>;

        // Get active tenancies with balances
        const balances = (await db.getAllAsync(`
  SELECT t.tenant_id, SUM(p.amount) as total_paid, 
         (u.monthly_rent * julianday('now') - julianday(t.start_date)) / 30 - SUM(p.amount) as balance
  FROM tenancies t
  JOIN units u ON t.unit_id = u.id
  LEFT JOIN payments p ON t.id = p.tenancy_id
  GROUP BY t.id
`)) as Array<{ total_paid: number; balance: number }>;

        // Calculate totals
        let totalCollected = 0;
        let totalOutstanding = 0;

        balances &&
          balances.forEach(
            (balance: { total_paid: number; balance: number }) => {
              totalCollected += balance.total_paid;
              if (balance.balance > 0) {
                totalOutstanding += balance.balance;
              }
            }
          );

        const occupiedUnits = balances ? balances.length : 0;

        const totalUnits =
          blocks &&
          blocks.reduce<number>(
            (sum, block: { total_units: number }) =>
              sum + (block.total_units || 0),
            0
          );

        setStats({
          totalTenants: tenants?.length,
          totalBlocks: blocks?.length,
          totalOccupiedUnits: occupiedUnits,
          totalVacantUnits: totalUnits - occupiedUnits,
          totalCollected,
          totalOutstanding,
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
        <Text>Loading statistics...</Text>
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
});
