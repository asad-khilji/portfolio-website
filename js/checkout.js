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

  $("#bizName").textContent = DATA.business.name;

  renderSummary();

  $("#checkoutForm").addEventListener("submit", (e) => {
  });
}

function renderSummary() {
  const empty = cart.length === 0;
  $("#emptyNotice").style.display = empty ? "block" : "none";
  $("#submitBtn").disabled = empty;

  const servicesById = new Map(DATA.services.map(s => [s.id, s]));
  let subtotal = 0;
  let lines = [];

  for (const i of cart) {
    const s = servicesById.get(i.id);
    if (!s) continue;
    const lineTotal = s.price * i.qty;
    subtotal += lineTotal;
    lines.push(`- ${s.name} x${i.qty} = ${money(lineTotal, DATA.business.currency)}`);
  }

  const summaryText =
`Order Summary
${lines.join("\n")}
Subtotal: ${money(subtotal, DATA.business.currency)}
`;

  $("#orderSummary").textContent = summaryText;
}

function submitOrder() {
  if (cart.length === 0) return;

  const form = $("#checkoutForm");
  const formData = new FormData(form);

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const phone = (formData.get("phone") || "").toString().trim();
  const company = (formData.get("company") || "").toString().trim();
  const notes = (formData.get("notes") || "").toString().trim();

  const servicesById = new Map(DATA.services.map(s => [s.id, s]));
  let subtotal = 0;
  let items = [];

  for (const i of cart) {
    const s = servicesById.get(i.id);
    if (!s) continue;
    const lineTotal = s.price * i.qty;
    subtotal += lineTotal;
    items.push({ name: s.name, qty: i.qty, unit: s.price, total: lineTotal });
  }

  const orderId = `ORD-${Date.now()}`;
  const subject = `${DATA.business.name} Order ${orderId}`;

  const body =
`New Service Order: ${orderId}

Customer:
Name: ${name}
Email: ${email}
Phone: ${phone || "-"}
Company: ${company || "-"}

Items:
${items.map(it => `- ${it.name} x${it.qty} @ ${money(it.unit, DATA.business.currency)} = ${money(it.total, DATA.business.currency)}`).join("\n")}

Subtotal: ${money(subtotal, DATA.business.currency)}

Notes:
${notes || "-"}

(Submitted from portfolio website checkout)
`;

  // 1) Open email client (no payment)
  const mailto = `mailto:${encodeURIComponent(DATA.business.emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  // 2) OPTIONAL: send to backend if you add one later
  // fetch("/submit-order", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ orderId, name, email, phone, company, notes, items, subtotal })
  // }).catch(console.error);

  // Clear cart after submit (optional)
  cart = [];
  saveCart();
  renderSummary();
}

init().catch(err => {
  console.error(err);
  alert("Failed to load data/services.json. If you're opening files directly, run a local server.");
});
