const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db');

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

// Only listen on PORT during local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`ApexCart running locally at http://localhost:${PORT}`);
  });
}

// Export app for Vercel serverless deployment
module.exports = app;
