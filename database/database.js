// database/Database.js
import * as SQLite from 'expo-sqlite';

// Initialize the database tables
// Initialize the database tables with sample data
export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync('rental_management');
  try {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id INTEGER,
        unit_number TEXT NOT NULL,
        monthly_rent REAL NOT NULL,
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

    // Insert blocks
    await db.execAsync(`
      INSERT INTO blocks (name, address, total_units) VALUES
      ('Block A', '123 Main Street', 25),
      ('Block B', '456 Park Avenue', 18),
      ('Block C', '789 Oak Road', 8);
    `);

    console.log('Blocks data inserted successfully');

    // Insert tenants - Block A
    await db.execAsync(`
      INSERT INTO tenants (name, phone, email) VALUES
      ('NAOMY JEOKOGEI', '0700000001', 'naomy.j@example.com'),
      ('BETTY LAGAT', '0700000002', 'betty.l@example.com'),
      ('MORIS NDICHU/SHARON KENDA', '0700000003', 'moris.n@example.com'),
      ('PAULINE NANCHALA', '0700000004', 'pauline.n@example.com'),
      ('JULIUS AGARA', '0700000005', 'julius.a@example.com'),
      ('IAN SAITOTI', '0700000006', 'ian.s@example.com'),
      ('NAOMY LASOI', '0700000007', 'naomy.l@example.com'),
      ('DENNIS KIPLIMO', '0700000008', 'dennis.k@example.com'),
      ('MOSES OTIENO', '0700000009', 'moses.o@example.com'),
      ('MOURINE & JUDITH', '0700000010', 'mourine.j@example.com'),
      ('IRNE', '0700000011', 'irne@example.com'),
      ('GLADYS JEPKOECH', '0700000012', 'gladys.j@example.com'),
      ('STELLAH BIRGEN', '0700000013', 'stellah.b@example.com'),
      ('TAELY MULONGO', '0700000014', 'taely.m@example.com'),
      ('DARIUS BETT', '0700000015', 'darius.b@example.com'),
      ('JANE MARWA', '0700000016', 'jane.m@example.com'),
      ('FAITH JEPCHUMBA', '0700000017', 'faith.j@example.com'),
      ('NOEL NASIMIYU', '0700000018', 'noel.n@example.com'),
      ('RUTH JEPCHIRCHIR', '0700000019', 'ruth.j@example.com'),
      ('FELIX', '0700000020', 'felix@example.com'),
      ('CYNTHIA LEWIS', '0700000021', 'cynthia.l@example.com'),
      ('PAUL BIWOTT', '0700000022', 'paul.b@example.com'),
      ('SHARON TITUS', '0700000023', 'sharon.t@example.com'),
      ('GIDEON BETT', '0700000024', 'gideon.b@example.com'),
      ('MORIS NDUNGU', '0700000025', 'moris.ndungu@example.com');
    `);

    // Insert tenants - Block B
    await db.execAsync(`
      INSERT INTO tenants (name, phone, email) VALUES
      ('SHADRACK KIPTOO', '0700000026', 'shadrack.k@example.com'),
      ('NOAH KIMELI (SHARON JEPKORIR)', '0700000027', 'noah.k@example.com'),
      ('LEONARD (MERCY CHEROTICH)', '0700000028', 'leonard@example.com'),
      ('KEVIN OMONDI', '0700000029', 'kevin.o@example.com'),
      ('JOAN & SHARON', '0700000030', 'joan.s@example.com'),
      ('MERCY KOECH', '0700000031', 'mercy.k@example.com'),
      ('PHILIP ROP', '0700000032', 'philip.r@example.com'),
      ('VICTOR & STELLAH JEMUTAI', '0700000033', 'victor.j@example.com'),
      ('CICILIA MUNYESI', '0700000034', 'cicilia.m@example.com'),
      ('ALLAN DARIUS BETT', '0700000035', 'allan.b@example.com'),
      ('BRENDA & DIANA', '0700000036', 'brenda.d@example.com'),
      ('KANGETE', '0700000037', 'kangete@example.com'),
      ('ISMAEL CHEPKWONY', '0700000038', 'ismael.c@example.com'),
      ('CHRISTOMANOES KIRWA', '0700000039', 'christomanoes.k@example.com'),
      ('BRIAN KIPRONO', '0700000040', 'brian.k@example.com'),
      ('JUSTINE KORIR', '0700000041', 'justine.k@example.com'),
      ('BRAMWEL AGESA', '0700000042', 'bramwel.a@example.com'),
      ('NAOMY CHERUIYOT', '0700000043', 'naomy.c@example.com');
    `);

    // Insert tenants - Block C
    await db.execAsync(`
      INSERT INTO tenants (name, phone, email) VALUES
      ('KEVIN KIBET/COLLINS', '0700000044', 'kevin.k@example.com'),
      ('VIVIAN JEPTOO', '0700000045', 'vivian.j@example.com'),
      ('FRANKLINE', '0700000046', 'frankline@example.com'),
      ('REGINA CHUMO', '0700000047', 'regina.c@example.com'),
      ('SHARON SUGUT & SANG', '0700000048', 'sharon.s@example.com'),
      ('KEVIN KARUNDA', '0700000049', 'kevin.karunda@example.com'),
      ('EVANS KIPRONO', '0700000050', 'evans.k@example.com'),
      ('GODFREY WAFULA', '0700000051', 'godfrey.w@example.com');
    `);

    console.log('Tenants data inserted successfully');

    // Insert units for Block A
    await db.execAsync(`
      INSERT INTO units (block_id, unit_number, monthly_rent, status) VALUES
      (1, 'A1', 8000, 'occupied'),
      (1, 'A2', 8000, 'occupied'),
      (1, 'A3', 8000, 'occupied'),
      (1, 'A4', 8000, 'occupied'),
      (1, 'A5', 8000, 'occupied'),
      (1, 'A6', 8000, 'occupied'),
      (1, 'A7', 8000, 'occupied'),
      (1, 'A8', 8000, 'occupied'),
      (1, 'A9', 8000, 'occupied'),
      (1, 'A10', 8000, 'occupied'),
      (1, 'A11', 8000, 'occupied'),
      (1, 'A12', 8000, 'occupied'),
      (1, 'A13', 8000, 'occupied'),
      (1, 'A14', 8000, 'occupied'),
      (1, 'A15', 8000, 'occupied'),
      (1, 'A16', 8000, 'occupied'),
      (1, 'A17', 8000, 'occupied'),
      (1, 'A18', 8000, 'occupied'),
      (1, 'A19', 8000, 'occupied'),
      (1, 'A20', 8000, 'occupied'),
      (1, 'A21', 8000, 'occupied'),
      (1, 'A22', 8000, 'occupied'),
      (1, 'A23', 8000, 'occupied'),
      (1, 'A24', 8000, 'occupied'),
      (1, 'A25', 8000, 'occupied');
    `);

    // Insert units for Block B
    await db.execAsync(`
      INSERT INTO units (block_id, unit_number, monthly_rent, status) VALUES
      (2, 'B1', 9000, 'occupied'),
      (2, 'B2', 9000, 'occupied'),
      (2, 'B3', 9000, 'occupied'),
      (2, 'B4', 9000, 'occupied'),
      (2, 'B5', 9000, 'occupied'),
      (2, 'B6', 9000, 'occupied'),
      (2, 'B7', 9000, 'occupied'),
      (2, 'B8', 9000, 'occupied'),
      (2, 'B9', 9000, 'occupied'),
      (2, 'B10', 9000, 'occupied'),
      (2, 'B11', 9000, 'occupied'),
      (2, 'B12', 9000, 'occupied'),
      (2, 'B13', 9000, 'occupied'),
      (2, 'B14', 9000, 'occupied'),
      (2, 'B15', 9000, 'occupied'),
      (2, 'B16', 9000, 'occupied'),
      (2, 'B17', 9000, 'occupied'),
      (2, 'B18', 9000, 'occupied');
    `);

    // Insert units for Block C
    await db.execAsync(`
      INSERT INTO units (block_id, unit_number, monthly_rent, status) VALUES
      (3, 'C1', 10000, 'occupied'),
      (3, 'C2', 10000, 'occupied'),
      (3, 'C3', 10000, 'occupied'),
      (3, 'C4', 10000, 'occupied'),
      (3, 'C5', 10000, 'occupied'),
      (3, 'C6', 10000, 'occupied'),
      (3, 'C7', 10000, 'occupied'),
      (3, 'C8', 10000, 'occupied');
    `);

    console.log('Units data inserted successfully');

    // Create tenancies (link tenants to units)
    // Block A tenancies
    await db.execAsync(`
      INSERT INTO tenancies (tenant_id, unit_id, start_date, status) VALUES
      (1, 1, '2024-01-01', 'active'),
      (2, 2, '2024-01-01', 'active'),
      (3, 3, '2024-01-01', 'active'),
      (4, 4, '2024-01-01', 'active'),
      (5, 5, '2024-01-01', 'active'),
      (6, 6, '2024-01-01', 'active'),
      (7, 7, '2024-01-01', 'active'),
      (8, 8, '2024-01-01', 'active'),
      (9, 9, '2024-01-01', 'active'),
      (10, 10, '2024-01-01', 'active'),
      (11, 11, '2024-01-01', 'active'),
      (12, 12, '2024-01-01', 'active'),
      (13, 13, '2024-01-01', 'active'),
      (14, 14, '2024-01-01', 'active'),
      (15, 15, '2024-01-01', 'active'),
      (16, 16, '2024-01-01', 'active'),
      (17, 17, '2024-01-01', 'active'),
      (18, 18, '2024-01-01', 'active'),
      (19, 19, '2024-01-01', 'active'),
      (20, 20, '2024-01-01', 'active'),
      (21, 21, '2024-01-01', 'active'),
      (22, 22, '2024-01-01', 'active'),
      (23, 23, '2024-01-01', 'active'),
      (24, 24, '2024-01-01', 'active'),
      (25, 25, '2024-01-01', 'active');
    `);

    // Block B tenancies
    await db.execAsync(`
      INSERT INTO tenancies (tenant_id, unit_id, start_date, status) VALUES
      (26, 26, '2024-01-01', 'active'),
      (27, 27, '2024-01-01', 'active'),
      (28, 28, '2024-01-01', 'active'),
      (29, 29, '2024-01-01', 'active'),
      (30, 30, '2024-01-01', 'active'),
      (31, 31, '2024-01-01', 'active'),
      (32, 32, '2024-01-01', 'active'),
      (33, 33, '2024-01-01', 'active'),
      (34, 34, '2024-01-01', 'active'),
      (35, 35, '2024-01-01', 'active'),
      (36, 36, '2024-01-01', 'active'),
      (37, 37, '2024-01-01', 'active'),
      (38, 38, '2024-01-01', 'active'),
      (39, 39, '2024-01-01', 'active'),
      (40, 40, '2024-01-01', 'active'),
      (41, 41, '2024-01-01', 'active'),
      (42, 42, '2024-01-01', 'active'),
      (43, 43, '2024-01-01', 'active');
    `);

    // Block C tenancies
    await db.execAsync(`
      INSERT INTO tenancies (tenant_id, unit_id, start_date, status) VALUES
      (44, 44, '2024-01-01', 'active'),
      (45, 45, '2024-01-01', 'active'),
      (46, 46, '2024-01-01', 'active'),
      (47, 47, '2024-01-01', 'active'),
      (48, 48, '2024-01-01', 'active'),
      (49, 49, '2024-01-01', 'active'),
      (50, 50, '2024-01-01', 'active'),
      (51, 51, '2024-01-01', 'active');
    `);

    console.log('Tenancies data inserted successfully');

    // Insert sample payments for May
    // Some tenants have paid fully, some partially, some haven't paid
    await db.execAsync(`
      -- Block A payments (some examples)
      INSERT INTO payments (tenancy_id, amount, payment_date, payment_for_month, payment_method) VALUES
      (1, 8000, '2024-05-03', '2024-05', 'M-PESA'),
      (2, 8000, '2024-05-02', '2024-05', 'Bank Transfer'),
      (3, 4000, '2024-05-05', '2024-05', 'M-PESA'), -- Partial payment
      (5, 8000, '2024-05-01', '2024-05', 'Cash'),
      (8, 8000, '2024-05-04', '2024-05', 'M-PESA'),
      (10, 6000, '2024-05-02', '2024-05', 'M-PESA'), -- Partial payment
      (15, 8000, '2024-05-03', '2024-05', 'Bank Transfer'),
      (20, 8000, '2024-05-01', '2024-05', 'M-PESA');
      
      -- Block B payments (some examples)
      INSERT INTO payments (tenancy_id, amount, payment_date, payment_for_month, payment_method) VALUES
      (26, 9000, '2024-05-02', '2024-05', 'M-PESA'),
      (28, 9000, '2024-05-03', '2024-05', 'Cash'),
      (30, 4500, '2024-05-04', '2024-05', 'M-PESA'), -- Partial payment
      (32, 9000, '2024-05-01', '2024-05', 'M-PESA'),
      (35, 9000, '2024-05-03', '2024-05', 'Bank Transfer'),
      (40, 9000, '2024-05-05', '2024-05', 'M-PESA');
      
      -- Block C payments (some examples)
      INSERT INTO payments (tenancy_id, amount, payment_date, payment_for_month, payment_method) VALUES
      (44, 10000, '2024-05-01', '2024-05', 'Bank Transfer'),
      (45, 10000, '2024-05-02', '2024-05', 'M-PESA'),
      (47, 5000, '2024-05-03', '2024-05', 'M-PESA'),  -- Partial payment
      (50, 10000, '2024-05-04', '2024-05', 'Cash');
    `);

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
        'INSERT INTO blocks (name, address, total_units) VALUES (?, ?, ?)',
        block.name,
        block.address,
        block.total_units
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
        'UPDATE blocks SET name = ?, address = ?, total_units = ? WHERE id = ?',
        block.name,
        block.address,
        block.total_units,
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
        'INSERT INTO units (block_id, unit_number, monthly_rent, status) VALUES (?, ?, ?, ?)',
        unit.block_id,
        unit.unit_number,
        unit.monthly_rent,
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
        'SELECT * FROM units WHERE block_id = ? ORDER BY unit_number',
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
        'UPDATE units SET unit_number = ?, monthly_rent = ?, status = ? WHERE id = ?',
        unit.unit_number,
        unit.monthly_rent,
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
          u.monthly_rent,
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
          u.monthly_rent,
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
          ROUND(u.monthly_rent * (
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
