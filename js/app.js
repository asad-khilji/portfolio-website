const DATA_URL = "data/services.json";
const CART_KEY = "portfolio_cart_v1";

let DATA = null;
let cart = loadCart();

const $ = (sel) => document.querySelector(sel);

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function money(n, currency="USD") {
  return new Intl.NumberFormat(undefined, { style:"currency", currency }).format(n);
}

async function init() {
  const res = await fetch(DATA_URL);
  DATA = await res.json();

  // header/footer info
  $("#bizName").textContent = DATA.business.name;
  $("#bizNameFooter").textContent = DATA.business.name;
  $("#year").textContent = new Date().getFullYear();

  // categories dropdown
  const categories = [...new Set(DATA.services.map(s => s.category))].sort();
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    $("#category").appendChild(opt);
  }

  // listeners
  $("#search").addEventListener("input", renderServices);
  $("#category").addEventListener("change", renderServices);
  $("#clearFilters").addEventListener("click", () => {
    $("#search").value = "";
    $("#category").value = "all";
    renderServices();
  });
  $("#clearCart").addEventListener("click", () => {
    cart = [];
    saveCart();
    renderCart();
  });

  renderServices();
  renderCart();
}

function renderServices() {
  const q = $("#search").value.trim().toLowerCase();
  const cat = $("#category").value;

  let list = DATA.services.slice();

  if (cat !== "all") list = list.filter(s => s.category === cat);
  if (q) {
    list = list.filter(s =>
      (s.name + " " + s.description + " " + s.category).toLowerCase().includes(q)
    );
  }

  $("#serviceCount").textContent = `${list.length} service${list.length === 1 ? "" : "s"}`;
  const grid = $("#servicesGrid");
  grid.innerHTML = "";

  for (const s of list) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="body">
        <div class="pill">${escapeHtml(s.category)} · ${escapeHtml(String(s.turnaroundDays))} day(s)</div>
        <h3 style="margin-top:10px">${escapeHtml(s.name)}</h3>
        <div class="small">${escapeHtml(s.description)}</div>
        <div class="small" style="margin-top:10px">Includes: ${escapeHtml(s.deliverables.join(", "))}</div>
        <div class="price-row">
          <strong>${money(s.price, DATA.business.currency)}</strong>
          <button class="btn" data-add="${escapeHtml(s.id)}">Buy service</button>
        </div>
      </div>
    `;
    grid.appendChild(el);
  }

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.getAttribute("data-add")));
  });
}

function addToCart(serviceId) {
  const existing = cart.find(i => i.id === serviceId);
  if (existing) existing.qty += 1;
  else cart.push({ id: serviceId, qty: 1 });

  saveCart();
  renderCart();
}

function changeQty(serviceId, delta) {
  const item = cart.find(i => i.id === serviceId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== serviceId);
  saveCart();
  renderCart();
}

function renderCart() {
  const itemsWrap = $("#cartItems");
  itemsWrap.innerHTML = "";

  const servicesById = new Map(DATA ? DATA.services.map(s => [s.id, s]) : []);
  let count = 0;
  let subtotal = 0;

  for (const i of cart) {
    const s = servicesById.get(i.id);
    if (!s) continue;
    count += i.qty;
    subtotal += s.price * i.qty;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div style="flex:1">
        <strong>${escapeHtml(s.name)}</strong>
        <div class="small">${escapeHtml(s.category)} · ${money(s.price, DATA.business.currency)}</div>
        <div class="qty">
          <button class="iconbtn" aria-label="Decrease quantity">−</button>
          <span class="pill">${i.qty}</span>
          <button class="iconbtn" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="pill">${money(s.price * i.qty, DATA.business.currency)}</div>
    `;
    const [minusBtn, plusBtn] = row.querySelectorAll("button");
    minusBtn.addEventListener("click", () => changeQty(i.id, -1));
    plusBtn.addEventListener("click", () => changeQty(i.id, +1));

    itemsWrap.appendChild(row);
  }

  $("#cartCount").textContent = `${count} item${count === 1 ? "" : "s"}`;
  $("#subtotal").textContent = DATA ? money(subtotal, DATA.business.currency) : "$0";
  $("#checkoutBtn").toggleAttribute("disabled", count === 0);

  // hide drawer if empty (optional)
  $("#cartDrawer").style.opacity = count === 0 ? 0.85 : 1;
}

function escapeHtml(str="") {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}
function escapeAttr(str="") {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

init().catch(err => {
  console.error(err);
  alert("Failed to load data/services.json. If you're opening files directly, run a local server.");
});
