const db = require('./db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seed() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  db.exec(schemaSql, (err) => {
    if (err) {
      console.error('Schema Execution Error:', err);
      db.close();
      process.exit(1);
    }
    console.log('✓ Tables initialized.');

    db.serialize(() => {
      const userStmt = db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
      );
      userStmt.run('usr-admin-01', 'Lead Architect', 'admin@apexcart.com', adminHash, 'admin');
      userStmt.run('usr-cust-01', 'Alex Morgan', 'alex@example.com', userHash, 'customer');
      userStmt.finalize();

      const prodStmt = db.prepare(
        'INSERT INTO products (id, sku, name, category, price_usd, stock, safety_stock, rating, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      prodStmt.run(
        'p1',
        'APX-WCH-001',
        'Apex SmartWatch Ultra Titanium',
        'wearables',
        749.0,
        14,
        5,
        4.9,
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80'
      );
      prodStmt.run(
        'p2',
        'APX-AUD-002',
        'Apex Studio Wireless Headphones',
        'audio',
        399.0,
        3,
        5,
        4.8,
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
      );
      prodStmt.run(
        'p3',
        'APX-LAP-003',
        'Apex Silicon M3 Workstation Laptop',
        'laptops',
        1999.0,
        8,
        2,
        5.0,
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
      );
      prodStmt.run(
        'p4',
        'APX-ACC-004',
        'MagCharge Enterprise 3-in-1 Hub',
        'accessories',
        129.0,
        45,
        10,
        4.7,
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80'
      );
      prodStmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          console.error('Seed Error:', finalizeErr);
          db.close();
          process.exit(1);
        }
        console.log('✓ Database seeded successfully.');
        console.log('  Admin:    admin@apexcart.com / admin123');
        console.log('  Customer: alex@example.com / user123');
        db.close();
      });
    });
  });
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
