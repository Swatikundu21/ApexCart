const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  db.all('SELECT * FROM products ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.updateStock = (req, res) => {
  const { stock } = req.body;
  const { id } = req.params;
  const qty = Number(stock);

  if (!Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  db.run('UPDATE products SET stock = ? WHERE id = ?', [qty, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Stock updated', stock: qty });
  });
};
