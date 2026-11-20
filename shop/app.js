const productsElement = document.querySelector('#products');
const cartElement = document.querySelector('#cart-items');
const countElement = document.querySelector('#cart-count');
const totalElement = document.querySelector('#total');
const statusElement = document.querySelector('#status');
let catalogue = [];
let cart;
try { cart = JSON.parse(localStorage.getItem('qe-shop-cart') || '{}'); if (!cart || typeof cart !== 'object' || Array.isArray(cart)) cart = {}; } catch { cart = {}; }
const currency = value => `₹${value.toLocaleString('en-IN')}`;
function save() { localStorage.setItem('qe-shop-cart', JSON.stringify(cart)); renderCart(); }
function renderCart() {
  cartElement.replaceChildren(); let total = 0; let count = 0;
  for (const product of catalogue) {
    const quantity = Math.max(0, Math.min(99, Number.parseInt(cart[product.id], 10) || 0));
    if (!quantity) continue;
    total += product.price * quantity; count += quantity;
    const row = document.createElement('div'); row.className = 'cart-row';
    const title = document.createElement('strong'); title.textContent = product.name;
    const details = document.createElement('span'); details.textContent = `${quantity} × ${currency(product.price)}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${product.name}`); remove.addEventListener('click', () => { delete cart[product.id]; save(); });
    row.append(title, details, remove); cartElement.append(row);
  }
  if (!count) { const empty = document.createElement('p'); empty.textContent = 'Your cart is empty.'; cartElement.append(empty); }
  countElement.textContent = count; totalElement.textContent = currency(total);
}
function showProducts() {
  for (const product of catalogue) {
    const card = document.createElement('article'); card.className = 'product';
    const visual = document.createElement('div'); visual.className = `product-art ${product.color}`; visual.setAttribute('aria-hidden','true');
    const number = document.createElement('span'); number.textContent = String(catalogue.indexOf(product) + 1).padStart(2,'0'); visual.append(number);
    const meta = document.createElement('p'); meta.className = 'category'; meta.textContent = product.category;
    const name = document.createElement('h3'); name.textContent = product.name;
    const line = document.createElement('div'); line.className = 'product-bottom';
    const price = document.createElement('strong'); price.textContent = currency(product.price);
    const add = document.createElement('button'); add.textContent = 'Add to cart'; add.setAttribute('aria-label', `Add ${product.name} to cart`); add.addEventListener('click', () => { cart[product.id] = Math.min(99, (Number(cart[product.id]) || 0) + 1); save(); statusElement.textContent = `${product.name} added to cart.`; });
    line.append(price,add); card.append(visual,meta,name,line); productsElement.append(card);
  }
}
document.querySelector('#checkout').addEventListener('submit', event => {
  event.preventDefault();
  if (!catalogue.some(product => Number(cart[product.id]) > 0)) { statusElement.textContent = 'Add an item to your cart before checkout.'; return; }
  const name = document.querySelector('#name').value.trim();
  if (!name) { statusElement.textContent = 'Enter a name for the demo order.'; return; }
  const order = { id: crypto.randomUUID(), name, items: { ...cart }, createdAt: new Date().toISOString() };
  localStorage.setItem('qe-shop-last-order', JSON.stringify(order)); cart = {}; save(); event.target.reset();
  statusElement.textContent = `Demo order placed for ${name}. No payment was taken.`;
});
fetch('./products.json').then(response => { if (!response.ok) throw new Error('Catalogue unavailable'); return response.json(); }).then(data => { catalogue = data; showProducts(); renderCart(); }).catch(() => { document.querySelector('#load-error').textContent = 'Unable to load the catalogue. Please try again.'; });
