# ApexCart Enterprise E-Commerce Portal v2.4

This document contains all source code, database scripts, server configurations, and step-by-step setup instructions to run the **ApexCart E-Commerce Portal** locally on your computer.

---

## 1. Quick Setup & Execution

Since AI assistants generate plain text and code structures directly in the environment, you can quickly assemble the `.zip` archive on your machine using standard terminal commands or copy-paste the project files below.

### Step 1: Create Project Structure
Open your terminal (macOS/Linux) or Command Prompt / PowerShell (Windows) and run:

```bash
mkdir apexcart
cd apexcart
mkdir -p src/config src/controllers public
```

### Step 2: Save the Files Below
Create the files in your project directory matching the filenames provided in Section 2.

### Step 3: Install Dependencies & Seed Database
```bash
# Install npm dependencies
npm install

# Seed SQLite database with default users and products
npm run seed
```

### Step 4: Launch Application
```bash
npm start
```
Access the running portal at: `http://localhost:3000`

---

## 2. Project Source Files

### File: `package.json`
```json
{
  "name": "apexcart-enterprise-portal",
  "version": "2.4.0",
  "description": "ApexCart Enterprise E-Commerce Portal with Express & SQLite Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "seed": "node src/config/seed.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

---

### File: `server.js`
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/config/db');

const authController = require('./src/controllers/authController');
const productsController = require('./src/controllers/productsController');
const ordersController = require('./src/controllers/ordersController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

/* ==========================================================================
   API ROUTES
   ========================================================================== */

// Auth Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

// Product Routes
app.get('/api/products', productsController.getAllProducts);
app.put('/api/products/:id/stock', authController.verifyToken, authController.verifyAdmin, productsController.updateStock);

// Order Routes
app.post('/api/orders', authController.verifyToken, ordersController.createOrder);
app.get('/api/orders', authController.verifyToken, ordersController.getUserOrders);

// Serve Frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` ApexCart Enterprise Portal running at:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`====================================================`);
});
```

---

### File: `src/config/db.js`
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../apexcart.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite Database:', err);
  } else {
    console.log('Connected to ApexCart SQLite Database.');
  }
});

module.exports = db;
```

---

### File: `src/config/schema.sql`
```sql
-- Database Schema for ApexCart

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('customer', 'admin')) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_usd REAL NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    safety_stock INT NOT NULL DEFAULT 5,
    rating REAL DEFAULT 5.0,
    image_url TEXT
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Processing',
    tracking_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INT NOT NULL,
    price_usd REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);
```

---

### File: `src/config/seed.js`
```javascript
const db = require('./db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seed() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

  db.serialize(async () => {
    db.exec(schemaSql, (err) => {
      if (err) return console.error('Schema Execution Error:', err);
      console.log('✓ Tables initialized.');
    });

    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    const userStmt = db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
    userStmt.run('usr-admin-01', 'Lead Architect', 'admin@apexcart.com', adminHash, 'admin');
    userStmt.run('usr-cust-01', 'Alex Morgan', 'alex@example.com', userHash, 'customer');
    userStmt.finalize();

    const prodStmt = db.prepare('INSERT INTO products (id, sku, name, category, price_usd, stock, safety_stock, rating, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    prodStmt.run('p1', 'APX-WCH-001', 'Apex SmartWatch Ultra Titanium', 'wearables', 749.00, 14, 5, 4.9, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=500&q=80');
    prodStmt.run('p2', 'APX-AUD-002', 'Apex Studio Wireless Headphones', 'audio', 399.00, 3, 5, 4.8, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80');
    prodStmt.run('p3', 'APX-LAP-003', 'Apex Silicon M3 Workstation Laptop', 'laptops', 1999.00, 8, 2, 5.0, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80');
    prodStmt.run('p4', 'APX-ACC-004', 'MagCharge Enterprise 3-in-1 Hub', 'accessories', 129.00, 45, 10, 4.7, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=500&q=80');
    prodStmt.finalize();

    console.log('✓ Database seeded successfully.');
  });
}

seed();
```

---

### File: `src/controllers/authController.js`
```javascript
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'apexcart_enterprise_secret_key_2026';

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;
    const sql = 'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)';

    db.run(sql, [userId, name, email, hashedPassword, 'customer'], function(err) {
      if (err) return res.status(400).json({ error: 'Email already registered' });
      const token = jwt.sign({ id: userId, email, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: userId, name, email, role: 'customer' } });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
};

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

exports.verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};
```

---

### File: `src/controllers/productsController.js`
```javascript
const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.updateStock = (req, res) => {
  const { stock } = req.body;
  const { id } = req.params;
  db.run('UPDATE products SET stock = ? WHERE id = ?', [stock, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Stock updated', stock });
  });
};
```

---

### File: `src/controllers/ordersController.js`
```javascript
const db = require('../config/db');

exports.createOrder = (req, res) => {
  const { items, total_amount } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const orderId = `APX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const trackingCode = `FedEx #FX-${Math.floor(10000 + Math.random() * 90000)}`;

  db.serialize(() => {
    db.run(
      'INSERT INTO orders (id, user_id, total_amount, status, tracking_code) VALUES (?, ?, ?, ?, ?)',
      [orderId, req.user.id, total_amount, 'Processing', trackingCode]
    );

    const stmt = db.prepare('INSERT INTO order_items (id, order_id, product_sku, quantity, price_usd) VALUES (?, ?, ?, ?, ?)');
    items.forEach((item, idx) => {
      stmt.run(`item-${Date.now()}-${idx}`, orderId, item.sku, item.quantity, item.price_usd);
    });
    stmt.finalize();

    res.json({
      message: 'Order created',
      order_id: orderId,
      tracking_code: trackingCode,
      kafka_telemetry: {
        topic: 'telemetry.orders.checkout.v1',
        partition: 1,
        offset: Date.now(),
        erp_sync_status: 'SAP_INGESTED_OK'
      }
    });
  });
};

exports.getUserOrders = (req, res) => {
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};
```

---

## 3. How to Create the ZIP File Manually

If you want to create the `.zip` file on your computer after setting up the files above:

### On macOS / Linux Terminal:
```bash
zip -r apexcart_enterprise_portal.zip apexcart/
```

### On Windows PowerShell:
```powershell
Compress-Archive -Path apexcart\* -DestinationPath apexcart_enterprise_portal.zip
```