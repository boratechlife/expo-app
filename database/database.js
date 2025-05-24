// database/Database.js
import * as SQLite from 'expo-sqlite';

// Initialize the database tables
// Initialize the database tables with sample data
export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync('rental_management_2');
  try {
    // Drop tables in reverse order of dependency to avoid foreign key constraints issues
    await db.execAsync(`
      PRAGMA foreign_keys = OFF; -- Temporarily disable foreign key checks for dropping tables
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS tenancies;
      DROP TABLE IF EXISTS units;
      DROP TABLE IF EXISTS blocks;
      DROP TABLE IF EXISTS tenants;
      PRAGMA foreign_keys = ON; -- Re-enable foreign key checks
    `);
    console.log('All existing tables dropped successfully (if they existed).');

    await db.execAsync(`
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        total_units INTEGER,
        monthly_rent REAL NOT NULL, -- Added monthly_rent to blocks table
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id INTEGER,
        unit_number TEXT NOT NULL,
        status TEXT DEFAULT 'vacant',
        FOREIGN KEY (block_id) REFERENCES blocks (id) on DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS tenancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        unit_id INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) on DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units (id) on DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenancy_id INTEGER,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_for_month TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        FOREIGN KEY (tenancy_id) REFERENCES tenancies (id) on DELETE CASCADE
      );
    `);

    console.log('All tables created successfully');

    // Insert sample data based on the images

    console.log('Payments data inserted successfully');
    console.log('Database initialized with sample data successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
// CRUD operations for tenants
const tenantOperations = {
  // Create a new tenant
  addTenant: async (tenant) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO tenants (name, phone, email) VALUES (?, ?, ?)',
        tenant.name,
        tenant.phone,
        tenant.email
      );
      console.log('Tenant added with ID:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding tenant:', error);
      throw error;
    }
  },

  // Get all tenants
  getAllTenants: async () => {
    try {
      const tenants = await db.getAllAsync(
        'SELECT * FROM tenants ORDER BY name'
      );
      return tenants;
    } catch (error) {
      console.error('Error getting tenants:', error);
      throw error;
    }
  },

  // Get tenant by ID
  getTenantById: async (id) => {
    try {
      const tenant = await db.getFirstAsync(
        'SELECT * FROM tenants WHERE id = ?',
        id
      );
      return tenant || null;
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw error;
    }
  },

  // Update tenant
  updateTenant: async (tenant) => {
    try {
      const result = await db.runAsync(
        'UPDATE tenants SET name = ?, phone = ?, email = ? WHERE id = ?',
        tenant.name,
        tenant.phone,
        tenant.email,
        tenant.id
      );
      console.log('Tenant updated:', result.changes);
      return result.changes;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  },

  // Delete tenant
  deleteTenant: async (id) => {
    try {
      const result = await db.runAsync('DELETE FROM tenants WHERE id = ?', id);
      console.log('Tenant deleted:', result.changes);
      return result.changes;
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  },
};

// CRUD operations for blocks
const blockOperations = {
  // Create a new block
  addBlock: async (block) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO blocks (name, address, total_units, monthly_rent) VALUES (?, ?, ?, ?)',
        block.name,
        block.address,
        block.total_units,
        block.monthly_rent // Added monthly_rent to insertion
      );
      console.log('Block added with ID:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding block:', error);
      throw error;
    }
  },

  // Get all blocks
  getAllBlocks: async () => {
    try {
      const blocks = await db.getAllAsync('SELECT * FROM blocks ORDER BY name');
      return blocks;
    } catch (error) {
      console.error('Error getting blocks:', error);
      throw error;
    }
  },

  // Get block by ID
  getBlockById: async (id) => {
    try {
      const block = await db.getFirstAsync(
        'SELECT * FROM blocks WHERE id = ?',
        id
      );
      return block || null;
    } catch (error) {
      console.error('Error getting block:', error);
      throw error;
    }
  },

  // Update block
  updateBlock: async (block) => {
    try {
      const result = await db.runAsync(
        'UPDATE blocks SET name = ?, address = ?, total_units = ?, monthly_rent = ? WHERE id = ?',
        block.name,
        block.address,
        block.total_units,
        block.monthly_rent, // Added monthly_rent to update
        block.id
      );
      console.log('Block updated:', result.changes);
      return result.changes;
    } catch (error) {
      console.error('Error updating block:', error);
      throw error;
    }
  },

  // Delete block
  deleteBlock: async (id) => {
    try {
      const result = await db.runAsync('DELETE FROM blocks WHERE id = ?', id);
      console.log('Block deleted:', result.changes);
      return result.changes;
    } catch (error) {
      console.error('Error deleting block:', error);
      throw error;
    }
  },
};

// CRUD operations for units
const unitOperations = {
  // Create a new unit
  addUnit: async (unit) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO units (block_id, unit_number, status) VALUES (?, ?, ?)', // Removed monthly_rent
        unit.block_id,
        unit.unit_number,
        unit.status || 'vacant'
      );
      console.log('Unit added with ID:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding unit:', error);
      throw error;
    }
  },

  // Get all units for a block
  getUnitsByBlockId: async (blockId) => {
    try {
      const units = await db.getAllAsync(
        'SELECT u.*, b.monthly_rent FROM units u JOIN blocks b ON u.block_id = b.id WHERE u.block_id = ? ORDER BY u.unit_number', // Joined to get monthly_rent from blocks
        blockId
      );
      return units;
    } catch (error) {
      console.error('Error getting units:', error);
      throw error;
    }
  },

  // Update unit
  updateUnit: async (unit) => {
    try {
      const result = await db.runAsync(
        'UPDATE units SET unit_number = ?, status = ? WHERE id = ?', // Removed monthly_rent
        unit.unit_number,
        unit.status,
        unit.id
      );
      console.log('Unit updated:', result.changes);
      return result.changes;
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  },
};

// CRUD operations for tenancies
const tenancyOperations = {
  // Create a new tenancy
  addTenancy: async (tenancy) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO tenancies (tenant_id, unit_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
        tenancy.tenant_id,
        tenancy.unit_id,
        tenancy.start_date,
        tenancy.end_date || null,
        tenancy.status || 'active'
      );

      // Update unit status to occupied
      await db.runAsync(
        'UPDATE units SET status = "occupied" WHERE id = ?',
        tenancy.unit_id
      );

      console.log('Tenancy added with ID:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding tenancy:', error);
      throw error;
    }
  },

  // Get active tenancies with tenant and unit information
  getActiveTenancies: async () => {
    try {
      const tenancies = await db.getAllAsync(`
        SELECT 
          t.id as tenancy_id, 
          ten.id as tenant_id, 
          ten.name as tenant_name,
          u.id as unit_id,
          u.unit_number,
          b.id as block_id,
          b.name as block_name,
          b.monthly_rent, -- Getting monthly_rent from blocks table
          t.start_date,
          t.end_date
        FROM tenancies t
        JOIN tenants ten ON t.tenant_id = ten.id
        JOIN units u ON t.unit_id = u.id
        JOIN blocks b ON u.block_id = b.id
        WHERE t.status = 'active'
        ORDER BY b.name, u.unit_number
      `);
      return tenancies;
    } catch (error) {
      console.error('Error getting tenancies:', error);
      throw error;
    }
  },

  // End a tenancy
  endTenancy: async (tenancyId, endDate) => {
    try {
      // First get the unit ID for this tenancy
      const tenancy = await db.getFirstAsync(
        'SELECT unit_id FROM tenancies WHERE id = ?',
        tenancyId
      );

      if (tenancy) {
        // Update tenancy status
        await db.runAsync(
          'UPDATE tenancies SET status = "inactive", end_date = ? WHERE id = ?',
          endDate,
          tenancyId
        );

        // Update unit status to vacant
        await db.runAsync(
          'UPDATE units SET status = "vacant" WHERE id = ?',
          tenancy.unit_id
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error ending tenancy:', error);
      throw error;
    }
  },
};

// CRUD operations for payments
const paymentOperations = {
  // Record a new payment
  addPayment: async (payment) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO payments (tenancy_id, amount, payment_date, payment_for_month, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
        payment.tenancy_id,
        payment.amount,
        payment.payment_date,
        payment.payment_for_month,
        payment.payment_method || 'cash',
        payment.notes || ''
      );
      console.log('Payment recorded with ID:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  // Get payments for a specific tenancy
  getPaymentsByTenancyId: async (tenancyId) => {
    try {
      const payments = await db.getAllAsync(
        'SELECT * FROM payments WHERE tenancy_id = ? ORDER BY payment_date DESC',
        tenancyId
      );
      return payments;
    } catch (error) {
      console.error('Error getting payments:', error);
      throw error;
    }
  },

  // Get payments for a specific month
  getPaymentsByMonth: async (month) => {
    try {
      const payments = await db.getAllAsync(
        `
        SELECT 
          p.*,
          ten.name as tenant_name,
          b.name as block_name,
          u.unit_number
        FROM payments p
        JOIN tenancies t ON p.tenancy_id = t.id
        JOIN tenants ten ON t.tenant_id = ten.id
        JOIN units u ON t.unit_id = u.id
        JOIN blocks b ON u.block_id = b.id
        WHERE p.payment_for_month = ?
        ORDER BY p.payment_date DESC
      `,
        month
      );
      return payments;
    } catch (error) {
      console.error('Error getting payments by month:', error);
      throw error;
    }
  },

  // Calculate balance for all active tenancies
  calculateBalances: async () => {
    try {
      const balances = await db.getAllAsync(`
        SELECT 
          t.id as tenancy_id,
          ten.id as tenant_id,
          ten.name as tenant_name,
          u.id as unit_id,
          u.unit_number,
          b.name as block_name,
          b.monthly_rent, -- Getting monthly_rent from blocks table
          (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE tenancy_id = t.id
          ) as total_paid,
          (
            SELECT COUNT(DISTINCT payment_for_month)
            FROM payments
            WHERE tenancy_id = t.id
          ) as months_paid,
          ROUND(b.monthly_rent * ( -- Using monthly_rent from blocks table
            julianday('now') - julianday(t.start_date)
          ) / 30) as total_due
        FROM tenancies t
        JOIN tenants ten ON t.tenant_id = ten.id
        JOIN units u ON t.unit_id = u.id
        JOIN blocks b ON u.block_id = b.id
        WHERE t.status = 'active'
        ORDER BY b.name, u.unit_number
      `);

      return balances.map((row) => {
        return {
          ...row,
          balance: row.total_due - row.total_paid,
          status: row.total_paid >= row.total_due ? 'paid' : 'outstanding',
        };
      });
    } catch (error) {
      console.error('Error calculating balances:', error);
      throw error;
    }
  },
};

export default {
  initDB,
  tenant: tenantOperations,
  block: blockOperations,
  unit: unitOperations,
  tenancy: tenancyOperations,
  payment: paymentOperations,
};
