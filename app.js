const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('apexcart.cart') || '[]'),
  user: JSON.parse(localStorage.getItem('apexcart.user') || 'null'),
  token: localStorage.getItem('apexcart.token') || '',
  category: 'all',
  query: ''
};

const $ = (id) => document.getElementById(id);

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function saveSession() {
  localStorage.setItem('apexcart.cart', JSON.stringify(state.cart));
  if (state.token) localStorage.setItem('apexcart.token', state.token);
  else localStorage.removeItem('apexcart.token');
  if (state.user) localStorage.setItem('apexcart.user', JSON.stringify(state.user));
  else localStorage.removeItem('apexcart.user');
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2200);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.quantity * item.price_usd, 0);
}

function updateChrome() {
  $('cartCount').textContent = cartCount();
  $('authBtn').textContent = state.user ? state.user.name.split(' ')[0] : 'Account';
  $('adminBtn').classList.toggle('hidden', !(state.user && state.user.role === 'admin'));
  $('logoutBtn').classList.toggle('hidden', !state.user);
}

function stockLabel(product) {
  if (product.stock <= 0) return { cls: 'out', text: 'Out of stock' };
  if (product.stock <= product.safety_stock) return { cls: 'low', text: `Low stock · ${product.stock}` };
  return { cls: 'ok', text: `${product.stock} in warehouse` };
}

function renderProducts() {
  const q = state.query.toLowerCase();
  const list = state.products.filter((p) => {
    const catOk = state.category === 'all' || p.category === state.category;
    const qOk = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return catOk && qOk;
  });

  $('productGrid').innerHTML = list.map((p) => {
    const stock = stockLabel(p);
    return `
      <article class="card">
        <img src="${p.image_url}" alt="${p.name}">
        <div class="card-body">
          <div class="small muted">${p.category} · ${p.sku}</div>
          <h3>${p.name}</h3>
          <div class="row">
            <div class="price">${money(p.price_usd)}</div>
            <div class="stock ${stock.cls}">${stock.text}</div>
          </div>
          <p class="muted small">Rating ${p.rating.toFixed(1)} ★</p>
          <button class="btn" ${p.stock <= 0 ? 'disabled' : ''} onclick="addToCart('${p.id}')">Add to cart</button>
        </div>
      </article>
    `;
  }).join('') || '<p class="muted">No products match that search.</p>';
}

function addToCart(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product || product.stock <= 0) return;
  const existing = state.cart.find((i) => i.id === id);
  const nextQty = existing ? existing.quantity + 1 : 1;
  if (nextQty > product.stock) return toast('Not enough stock');
  if (existing) existing.quantity = nextQty;
  else state.cart.push({ id: product.id, sku: product.sku, name: product.name, price_usd: product.price_usd, quantity: 1, image_url: product.image_url });
  saveSession();
  updateChrome();
  renderCart();
  toast(`${product.name} added`);
}

function changeQty(id, delta) {
  const item = state.cart.find((i) => i.id === id);
  const product = state.products.find((p) => p.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((i) => i.id !== id);
  if (product && item.quantity > product.stock) item.quantity = product.stock;
  saveSession();
  updateChrome();
  renderCart();
}

function renderCart() {
  $('cartItems').innerHTML = state.cart.map((item) => `
    <div class="row" style="margin-bottom:14px">
      <div>
        <strong>${item.name}</strong>
        <div class="muted small">${item.sku} · ${money(item.price_usd)}</div>
      </div>
      <div class="qty">
        <button class="ghost" onclick="changeQty('${item.id}', -1)">−</button>
        <span>${item.quantity}</span>
        <button class="ghost" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Your cart is empty.</p>';
  $('cartTotal').textContent = money(cartTotal());
}

function openDrawer(open) {
  $('cartDrawer').classList.toggle('open', open);
}

function openAuth(open, mode = 'login') {
  $('authModal').classList.toggle('open', open);
  $('authTitle').textContent = mode === 'register' ? 'Create account' : 'Sign in';
  $('authName').classList.toggle('hidden', mode !== 'register');
  $('authSubmit').dataset.mode = mode;
}

async function submitAuth(event) {
  event.preventDefault();
  const mode = $('authSubmit').dataset.mode || 'login';
  const payload = {
    name: $('authName').value.trim(),
    email: $('authEmail').value.trim(),
    password: $('authPassword').value
  };
  try {
    const data = await api(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.token = data.token;
    state.user = data.user;
    saveSession();
    updateChrome();
    openAuth(false);
    toast(`Welcome, ${data.user.name}`);
  } catch (err) {
    toast(err.message);
  }
}

async function checkout() {
  if (!state.cart.length) return toast('Cart is empty');
  if (!state.token) {
    openDrawer(false);
    openAuth(true, 'login');
    return toast('Sign in to checkout');
  }
  try {
    const data = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: state.cart.map(({ sku, quantity, price_usd }) => ({ sku, quantity, price_usd })),
        total_amount: cartTotal()
      })
    });
    state.cart = [];
    saveSession();
    updateChrome();
    renderCart();
    openDrawer(false);
    await loadProducts();
    toast(`Order ${data.order_id} · ${data.tracking_code}`);
    showOrders();
  } catch (err) {
    toast(err.message);
  }
}

async function showOrders() {
  if (!state.token) return openAuth(true, 'login');
  const orders = await api('/api/orders');
  $('ordersBody').innerHTML = orders.map((o) => `
    <tr>
      <td>${o.id}</td>
      <td>${o.status}</td>
      <td>${money(o.total_amount)}</td>
      <td>${o.tracking_code || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No orders yet.</td></tr>';
  $('storeView').classList.add('hidden');
  $('adminView').classList.add('hidden');
  $('ordersView').classList.remove('hidden');
}

async function showAdmin() {
  if (!state.user || state.user.role !== 'admin') return toast('Admin access required');
  const [products, orders] = await Promise.all([api('/api/products'), api('/api/admin/orders')]);
  state.products = products;
  const revenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const alerts = products.filter((p) => p.stock <= p.safety_stock).length;
  $('kpiRevenue').textContent = money(revenue);
  $('kpiOrders').textContent = String(orders.length);
  $('kpiAlerts').textContent = String(alerts);
  $('adminOrders').innerHTML = orders.map((o) => `
    <tr>
      <td>${o.id}</td>
      <td>${o.customer_name}<div class="muted small">${o.customer_email}</div></td>
      <td>${o.status}</td>
      <td>${money(o.total_amount)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No transactions yet.</td></tr>';
  $('adminStock').innerHTML = products.map((p) => `
    <tr>
      <td>${p.name}<div class="muted small">${p.sku}</div></td>
      <td>${p.stock}</td>
      <td>${p.safety_stock}</td>
      <td>
        <input class="field" style="margin:0;width:90px" type="number" min="0" value="${p.stock}" id="stock-${p.id}">
        <button class="ghost" onclick="saveStock('${p.id}')">Save</button>
      </td>
    </tr>
  `).join('');
  $('storeView').classList.add('hidden');
  $('ordersView').classList.add('hidden');
  $('adminView').classList.remove('hidden');
}

async function saveStock(id) {
  const stock = Number($(`stock-${id}`).value);
  try {
    await api(`/api/products/${id}/stock`, { method: 'PUT', body: JSON.stringify({ stock }) });
    toast('Inventory updated');
    await loadProducts();
    showAdmin();
  } catch (err) {
    toast(err.message);
  }
}

function showStore() {
  $('ordersView').classList.add('hidden');
  $('adminView').classList.add('hidden');
  $('storeView').classList.remove('hidden');
}

function logout() {
  state.user = null;
  state.token = '';
  saveSession();
  updateChrome();
  showStore();
  toast('Signed out');
}

async function loadProducts() {
  state.products = await api('/api/products');
  const cats = ['all', ...new Set(state.products.map((p) => p.category))];
  $('filters').innerHTML = cats.map((c) => `
    <button class="chip ${state.category === c ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>
  `).join('');
  renderProducts();
}

function setCategory(c) {
  state.category = c;
  loadProducts();
}

$('search').addEventListener('input', (e) => {
  state.query = e.target.value;
  renderProducts();
});

updateChrome();
renderCart();
loadProducts().catch((err) => toast(err.message));
