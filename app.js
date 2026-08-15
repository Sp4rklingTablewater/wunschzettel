// ============================================================
// Hier trägst du deine Firebase-Zugangsdaten ein.
// Anleitung dazu steht in der README.md.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC5dhaC6RlpH45XUzSSfYhs5VjuEX7U_Dg",
  authDomain: "wunschzettel-afe6d.firebaseapp.com",
  projectId: "wunschzettel-afe6d",
  storageBucket: "wunschzettel-afe6d.firebasestorage.app",
  messagingSenderId: "803192793283",
  appId: "1:803192793283:web:f7c3708f583f065ca09a76"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, setDoc, deleteDoc,
  collection, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { items, pageTitle } from "./items.js";

document.getElementById("page-title").textContent = pageTitle;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const grid = document.getElementById("tag-grid");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalText = document.getElementById("modal-text");
const nameInput = document.getElementById("name-input");
const amountField = document.getElementById("amount-field");
const amountInput = document.getElementById("amount-input");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");

let reservations = {}; // { itemId: { reservedBy, reservedAt } }
let contributorsByItem = {}; // { itemId: [name, name, ...] } - nur Namen, keine Beträge
let pendingItemId = null;
let pendingAction = "reserve"; // "reserve" | "money"

function render() {
  grid.innerHTML = "";
  items.forEach(item => {
    const res = reservations[item.id];
    const contributors = contributorsByItem[item.id] || [];
    const tag = document.createElement("article");
    tag.className = "tag" + (res ? " reserved" : "");

    const contributorsHtml = contributors.length
      ? `<p class="contributors"><strong>Geldgeschenk dabei von:</strong> ${contributors.map(escapeHtml).join(", ")}</p>`
      : "";

    const moneyButtonHtml = !res
      ? `<button class="tag-btn secondary" data-action="money" data-id="${item.id}">Geld dazugeben</button>`
      : "";

    tag.innerHTML = `
      <div class="tag-hole"></div>
      <div class="tag-img-wrap"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" loading="lazy"></div>
      <h2 class="tag-name">${escapeHtml(item.name)}</h2>
      <p class="tag-desc">${escapeHtml(item.description)}</p>
      <span class="tag-price">${escapeHtml(item.price)}</span>
      ${item.link ? `<a class="tag-link" href="${escapeAttr(item.link)}" target="_blank" rel="noopener">Zum Shop</a>` : ""}
      ${res
        ? `<p class="reserved-by">Reserviert von ${escapeHtml(res.reservedBy)}</p>
           <button class="tag-btn" data-action="unreserve" data-id="${item.id}">Doch nicht ich – freigeben</button>
           <div class="stamp">Vergeben</div>`
        : `<button class="tag-btn" data-action="reserve" data-id="${item.id}">Ich schenke das!</button>
           ${moneyButtonHtml}
           ${contributorsHtml}`
      }
    `;
    grid.appendChild(tag);
  });
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "reserve") {
    openModal(id, "reserve");
  } else if (btn.dataset.action === "money") {
    openModal(id, "money");
  } else {
    unreserve(id);
  }
});

function openModal(itemId, action) {
  pendingItemId = itemId;
  pendingAction = action;
  nameInput.value = "";
  amountInput.value = "";
  if (action === "money") {
    modalText.textContent = "Wie heißt du? Der Betrag bleibt geheim, nur du und wir sehen ihn.";
    amountField.classList.remove("hidden");
    modalConfirm.textContent = "Dazugeben";
  } else {
    modalText.textContent = "Wie heißt du? Das sehen dann die anderen.";
    amountField.classList.add("hidden");
    modalConfirm.textContent = "Ich schenke das!";
  }
  modalBackdrop.classList.remove("hidden");
  nameInput.focus();
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  pendingItemId = null;
}

modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") modalConfirm.click();
});

modalConfirm.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  if (pendingAction === "money") {
    const amount = parseFloat(amountInput.value.replace(",", "."));
    if (!amount || amount <= 0) {
      amountInput.focus();
      return;
    }
    await contributeMoney(pendingItemId, name, amount);
  } else {
    await reserve(pendingItemId, name);
  }
  closeModal();
});

async function reserve(itemId, name) {
  try {
    await setDoc(doc(db, "reservations", itemId), {
      reservedBy: name,
      reservedAt: Date.now()
    });
  } catch (err) {
    alert("Das hat leider nicht geklappt. Bitte kurz nochmal versuchen.");
    console.error(err);
  }
}

async function contributeMoney(itemId, name, amount) {
  try {
    // Öffentlich sichtbar: nur wer und wofür, kein Betrag.
    await addDoc(collection(db, "contributions"), {
      itemId,
      name,
      timestamp: Date.now()
    });
    // Nur für dich einsehbar (in der Firebase-Konsole): der Betrag.
    // Die Firestore-Regeln verbieten das Lesen dieser Sammlung über
    // die Webseite, deshalb kann kein Besucher die Zahl sehen.
    await addDoc(collection(db, "pledges"), {
      itemId,
      name,
      amount,
      timestamp: Date.now()
    });
  } catch (err) {
    alert("Das hat leider nicht geklappt. Bitte kurz nochmal versuchen.");
    console.error(err);
  }
}

async function unreserve(itemId) {
  const ok = confirm("Diese Reservierung wirklich wieder freigeben?");
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "reservations", itemId));
  } catch (err) {
    alert("Das hat leider nicht geklappt. Bitte kurz nochmal versuchen.");
    console.error(err);
  }
}

// Live-Updates: sobald jemand anderes etwas reserviert, aktualisiert
// sich die Seite bei allen automatisch.
items.forEach(item => {
  onSnapshot(doc(db, "reservations", item.id), (snap) => {
    if (snap.exists()) {
      reservations[item.id] = snap.data();
    } else {
      delete reservations[item.id];
    }
    render();
  });

  // Nur Namen, nie Beträge - die "pledges"-Sammlung mit den Beträgen
  // wird hier nie abgefragt.
  const contribQuery = query(collection(db, "contributions"), where("itemId", "==", item.id));
  onSnapshot(contribQuery, (snap) => {
    contributorsByItem[item.id] = snap.docs.map(d => d.data().name);
    render();
  });
});

render();

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll('"', "&quot;");
}
// ============================================================
// Hier trägst du deine Firebase-Zugangsdaten ein.
// Anleitung dazu steht in der README.md.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC5dhaC6RlpH45XUzSSfYhs5VjuEX7U_Dg",
  authDomain: "wunschzettel-afe6d.firebaseapp.com",
  projectId: "wunschzettel-afe6d",
  storageBucket: "wunschzettel-afe6d.firebasestorage.app",
  messagingSenderId: "803192793283",
  appId: "1:803192793283:web:f7c3708f583f065ca09a76"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { items, pageTitle } from "./items.js";

document.getElementById("page-title").textContent = pageTitle;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const grid = document.getElementById("tag-grid");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalText = document.getElementById("modal-text");
const nameInput = document.getElementById("name-input");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");

let reservations = {}; // { itemId: { reservedBy, reservedAt } }
let pendingItemId = null;

function render() {
  grid.innerHTML = "";
  items.forEach(item => {
    const res = reservations[item.id];
    const tag = document.createElement("article");
    tag.className = "tag" + (res ? " reserved" : "");

    tag.innerHTML = `
      <div class="tag-hole"></div>
      <div class="tag-img-wrap"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" loading="lazy"></div>
      <h2 class="tag-name">${escapeHtml(item.name)}</h2>
      <p class="tag-desc">${escapeHtml(item.description)}</p>
      <span class="tag-price">${escapeHtml(item.price)}</span>
      ${item.link ? `<a class="tag-link" href="${escapeAttr(item.link)}" target="_blank" rel="noopener">Zum Shop</a>` : ""}
      ${res
        ? `<p class="reserved-by">Reserviert von ${escapeHtml(res.reservedBy)}</p>
           <button class="tag-btn" data-action="unreserve" data-id="${item.id}">Doch nicht ich – freigeben</button>
           <div class="stamp">Vergeben</div>`
        : `<button class="tag-btn" data-action="reserve" data-id="${item.id}">Ich schenke das!</button>`
      }
    `;
    grid.appendChild(tag);
  });
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "reserve") {
    openModal(id);
  } else {
    unreserve(id);
  }
});

function openModal(itemId) {
  pendingItemId = itemId;
  nameInput.value = "";
  modalText.textContent = "Wie heißt du? Das sehen dann die anderen.";
  modalBackdrop.classList.remove("hidden");
  nameInput.focus();
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  pendingItemId = null;
}

modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") modalConfirm.click();
});

modalConfirm.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  await reserve(pendingItemId, name);
  closeModal();
});

async function reserve(itemId, name) {
  try {
    await setDoc(doc(db, "reservations", itemId), {
      reservedBy: name,
      reservedAt: Date.now()
    });
  } catch (err) {
    alert("Das hat leider nicht geklappt. Bitte kurz nochmal versuchen.");
    console.error(err);
  }
}

async function unreserve(itemId) {
  const ok = confirm("Diese Reservierung wirklich wieder freigeben?");
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "reservations", itemId));
  } catch (err) {
    alert("Das hat leider nicht geklappt. Bitte kurz nochmal versuchen.");
    console.error(err);
  }
}

// Live-Updates: sobald jemand anderes etwas reserviert, aktualisiert
// sich die Seite bei allen automatisch.
items.forEach(item => {
  onSnapshot(doc(db, "reservations", item.id), (snap) => {
    if (snap.exists()) {
      reservations[item.id] = snap.data();
    } else {
      delete reservations[item.id];
    }
    render();
  });
});

render();

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll('"', "&quot;");
}
