const express = require('express');
const cors = require('cors');
const path = require('path');
require('./src/config/db');

const authController = require('./src/controllers/authController');
const productsController = require('./src/controllers/productsController');
const ordersController = require('./src/controllers/ordersController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

app.get('/api/products', productsController.getAllProducts);
app.put(
  '/api/products/:id/stock',
  authController.verifyToken,
  authController.verifyAdmin,
  productsController.updateStock
);

app.post('/api/orders', authController.verifyToken, ordersController.createOrder);
app.get('/api/orders', authController.verifyToken, ordersController.getUserOrders);
app.get('/api/admin/orders', authController.verifyToken, authController.verifyAdmin, ordersController.getAllOrders);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(' ApexCart Enterprise Portal running at:');
  console.log(` http://localhost:${PORT}`);
  console.log('====================================================');
});
