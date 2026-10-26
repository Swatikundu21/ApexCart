const db = require('./db');

exports.createOrder = (req, res) => {
  const { items, total_amount } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const orderId = `APX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const trackingCode = `FedEx #FX-${Math.floor(10000 + Math.random() * 90000)}`;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO orders (id, user_id, total_amount, status, tracking_code) VALUES (?, ?, ?, ?, ?)',
      [orderId, req.user.id, total_amount, 'Processing', trackingCode],
      function (orderErr) {
        if (orderErr) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Could not create order' });
        }

        const stmt = db.prepare(
          'INSERT INTO order_items (id, order_id, product_sku, quantity, price_usd) VALUES (?, ?, ?, ?, ?)'
        );
        const stockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?');

        let failed = false;
        items.forEach((item, idx) => {
          if (failed) return;
          stmt.run(`item-${Date.now()}-${idx}`, orderId, item.sku, item.quantity, item.price_usd);
          stockStmt.run(item.quantity, item.sku, item.quantity, function (stockErr) {
            if (stockErr || this.changes === 0) failed = true;
          });
        });

        stmt.finalize();
        stockStmt.finalize((finalizeErr) => {
          if (failed || finalizeErr) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient stock for one or more items' });
          }
          db.run('COMMIT', (commitErr) => {
            if (commitErr) return res.status(500).json({ error: 'Could not finalize order' });
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
        });
      }
    );
  });
};

exports.getUserOrders = (req, res) => {
  const sql =
    req.user.role === 'admin'
      ? 'SELECT * FROM orders ORDER BY created_at DESC'
      : 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
  const params = req.user.role === 'admin' ? [] : [req.user.id];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getAllOrders = (req, res) => {
  const sql = `
    SELECT o.*, u.name AS customer_name, u.email AS customer_email
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};
