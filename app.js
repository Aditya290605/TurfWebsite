'use strict';

/* ============================================================
   PENALTY BOX TURF — Application Script
   Cricket Turf Booking | ₹500/hour | 6 slots/day
   ============================================================ */

// ---- DAYS / MONTHS ----
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ---- BASE PRICE ----
const BASE_PRICE = 500; // ₹ per hour

// ---- SLOT DEFINITIONS (6 slots only) ----
const SLOT_DEFS = [
  { id: 's1', label: '6:00 AM', end: '8:00 AM',  period: 'Morning'   },
  { id: 's2', label: '8:00 AM', end: '10:00 AM', period: 'Morning'   },
  { id: 's3', label: '11:00 AM',end: '1:00 PM',  period: 'Afternoon' },
  { id: 's4', label: '2:00 PM', end: '4:00 PM',  period: 'Afternoon' },
  { id: 's5', label: '5:00 PM', end: '7:00 PM',  period: 'Evening'   },
  { id: 's6', label: '8:00 PM', end: '10:00 PM', period: 'Evening'   },
];

// Slots pre-booked by others per day index
const PRE_BOOKED = {
  0: ['s3'],
  1: ['s6'],
  2: ['s2','s5'],
};

function getSlotsForDay(dayOffset) {
  const key = `pbt_booked_d${dayOffset}`;
  let userBooked = [];
  try { userBooked = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}

  const preBooked = PRE_BOOKED[dayOffset] || [];

  return SLOT_DEFS.map(def => ({
    ...def,
    uid: def.id + '_d' + dayOffset,
    storageKey: key,
    booked: preBooked.includes(def.id),
    bookedByUser: userBooked.includes(def.id + '_d' + dayOffset),
  }));
}

function persistUserBooking(uid, key) {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  if (!arr.includes(uid)) { arr.push(uid); localStorage.setItem(key, JSON.stringify(arr)); }
}

// ---- STATE ----
let currentDayOffset = 0;
let selectedSlot = null;
let selectedDuration = 1;   // hours
let selectedPayment = 'UPI';

// ---- COMPUTED TOTAL ----
function computeTotal() { return BASE_PRICE * selectedDuration; }

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const isHero = nav.classList.contains('navbar-hero');
  function update() {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
      if (isHero) nav.classList.remove('navbar-hero');
    } else {
      nav.classList.remove('scrolled');
      if (isHero) nav.classList.add('navbar-hero');
    }
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const closeBtn = document.getElementById('mobileMenuClose');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => { menu.classList.add('open'); document.body.style.overflow = 'hidden'; });
  const close = () => { menu.classList.remove('open'); document.body.style.overflow = ''; };
  if (closeBtn) closeBtn.addEventListener('click', close);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

// ============================================================
// SCROLL ANIMATIONS
// ============================================================
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const idx = parseFloat(e.target.style.getPropertyValue('--stagger-index') || 0);
      setTimeout(() => e.target.classList.add('visible'), idx * 80);
      io.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

// ============================================================
// HERO BG
// ============================================================
function initHero() {
  const bg = document.getElementById('heroBg');
  if (bg) setTimeout(() => bg.classList.add('loaded'), 100);
}

// ============================================================
// HOME PAGE — SLOT PREVIEW (2 evening slots)
// ============================================================
function initHomeSlots() {
  const container = document.getElementById('homeSlots');
  if (!container) return;
  const slots = getSlotsForDay(0).filter(s => s.period === 'Evening');
  container.innerHTML = slots.map(s => renderHomeSlotCard(s)).join('');
  container.querySelectorAll('.slot-card').forEach((c, i) => {
    c.style.opacity = '0'; c.style.transform = 'translateY(20px)';
    setTimeout(() => { c.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; c.style.opacity = '1'; c.style.transform = ''; }, i * 120);
  });
}

function renderHomeSlotCard(slot) {
  const isBooked = slot.booked || slot.bookedByUser;
  return `
  <div class="slot-card ${isBooked ? 'booked' : 'available'}">
    <div class="slot-status-badge ${isBooked ? 'booked' : 'available'}">
      <span class="status-dot"></span>${isBooked ? (slot.bookedByUser ? 'Your Booking' : 'Booked') : 'Available'}
    </div>
    <div class="slot-time">${slot.label} – ${slot.end}</div>
    <div class="slot-date">${slot.period} Session</div>
    <div class="slot-price">₹${BASE_PRICE}<span>/hr</span></div>
    <div class="slot-footer">
      ${isBooked
        ? `<button class="btn" style="width:100%;background:var(--gray-100);color:var(--gray-400);cursor:not-allowed;" disabled>Unavailable</button>`
        : `<a href="booking.html" class="btn btn-outline" style="width:100%;">Book This Slot</a>`}
    </div>
  </div>`;
}

// ============================================================
// BOOKING PAGE — DATE TABS
// ============================================================
function initBookingPage() {
  const dateTabs = document.getElementById('dateTabs');
  const slotContainer = document.getElementById('slotGroups');
  if (!dateTabs || !slotContainer) return;

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const tab = document.createElement('div');
    tab.className = 'date-tab' + (i === 0 ? ' active' : '');
    tab.innerHTML = `<span class="tab-day">${label}</span>`;
    tab.dataset.offset = i;
    tab.onclick = () => {
      document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentDayOffset = i;
      selectedSlot = null;
      selectedDuration = 1;
      updatePanel();
      renderSlots(i);
    };
    dateTabs.appendChild(tab);
  }
  renderSlots(0);
}

function renderSlots(dayOffset) {
  const container = document.getElementById('slotGroups');
  if (!container) return;
  const slots = getSlotsForDay(dayOffset);
  const groups = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach(s => groups[s.period].push(s));

  const periodLabel = {
    Morning:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg> Morning`,
    Afternoon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="6"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Afternoon`,
    Evening:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Evening`,
  };

  let html = '';
  for (const [period, list] of Object.entries(groups)) {
    if (!list.length) continue;
    html += `<div class="time-group-label">${periodLabel[period]}</div><div class="slots-grid" style="margin-bottom:0.5rem;">`;
    list.forEach(s => { html += renderBookingSlotCard(s); });
    html += `</div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.slot-card').forEach((c, i) => {
    c.style.opacity = '0'; c.style.transform = 'translateY(14px)';
    setTimeout(() => { c.style.transition = 'opacity 0.38s ease,transform 0.38s ease'; c.style.opacity=''; c.style.transform=''; }, i * 50);
  });
}

function renderBookingSlotCard(slot) {
  const isBooked = slot.booked;
  const isUserBooked = slot.bookedByUser;

  if (isUserBooked) {
    return `
    <div class="slot-card booked" id="card_${slot.uid}" style="border-color:var(--green-300);background:var(--green-50);">
      <div class="slot-status-badge" style="background:var(--green-100);color:var(--green-800);border:1px solid var(--green-300);">
        <span class="status-dot" style="background:var(--green-600);"></span>Your Booking
      </div>
      <div class="slot-time">${slot.label} – ${slot.end}</div>
      <div class="slot-date">${slot.period} · Confirmed</div>
      <div class="slot-price" style="color:var(--green-700);">₹${BASE_PRICE}<span>/hr</span></div>
      <div class="slot-footer">
        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.7rem 1rem;background:var(--green-100);border-radius:var(--radius-full);font-size:0.84rem;font-weight:700;color:var(--green-800);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Booked by You
        </div>
      </div>
    </div>`;
  }

  if (isBooked) {
    return `
    <div class="slot-card booked" id="card_${slot.uid}">
      <div class="slot-status-badge booked"><span class="status-dot"></span>Fully Booked</div>
      <div class="slot-time">${slot.label} – ${slot.end}</div>
      <div class="slot-date">${slot.period} Session</div>
      <div class="slot-price">₹${BASE_PRICE}<span>/hr</span></div>
      <div class="slot-footer">
        <button class="btn" style="width:100%;background:var(--gray-100);color:var(--gray-400);cursor:not-allowed;font-size:0.85rem;" disabled>Not Available</button>
      </div>
    </div>`;
  }

  return `
  <div class="slot-card available" id="card_${slot.uid}" onclick="selectSlot('${slot.uid}','${slot.label} – ${slot.end}','${slot.period}','${slot.storageKey}')">
    <div class="slot-status-badge available"><span class="status-dot"></span>Available</div>
    <div class="slot-time">${slot.label} – ${slot.end}</div>
    <div class="slot-date">${slot.period} Session</div>
    <div class="slot-price">₹${BASE_PRICE}<span>/hr</span></div>
    <div class="slot-footer">
      <button class="btn btn-primary" style="width:100%;font-size:0.85rem;" onclick="event.stopPropagation();selectSlot('${slot.uid}','${slot.label} – ${slot.end}','${slot.period}','${slot.storageKey}')">
        Select Slot
      </button>
    </div>
  </div>`;
}

// ============================================================
// SLOT SELECTION
// ============================================================
function selectSlot(uid, time, period, storageKey) {
  document.querySelectorAll('.slot-card.selected').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('card_' + uid);
  if (card) card.classList.add('selected');

  selectedSlot = { uid, time, period, storageKey };
  selectedDuration = 1;

  updatePanel();
  updateStepIndicator(2);

  // On mobile scroll to panel
  const panel = document.querySelector('.booking-panel');
  if (panel && window.innerWidth < 900) {
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

// ============================================================
// PANEL UPDATE
// ============================================================
function updatePanel() {
  const hasSlot = !!selectedSlot;
  const total = computeTotal();

  // Elements
  const slotTime = document.getElementById('summaryTime');
  const slotDate = document.getElementById('summaryDate');
  const summaryPrice = document.getElementById('summaryPrice');
  const pb1 = document.getElementById('priceBreakdown1');
  const pbt = document.getElementById('priceBreakdownTotal');
  const durDisplay = document.getElementById('durDisplay');
  const paySection = document.getElementById('paymentSection');
  const bookBtn = document.getElementById('bookBtn');
  const panelEmpty = document.getElementById('panelEmpty');
  const panelFilled = document.getElementById('panelFilled');

  if (panelEmpty) panelEmpty.style.display = hasSlot ? 'none' : '';
  if (panelFilled) panelFilled.style.display = hasSlot ? '' : 'none';

  if (!hasSlot) {
    if (bookBtn) { bookBtn.disabled = true; bookBtn.textContent = 'Select a Slot First'; }
    return;
  }

  // Date label
  const today = new Date();
  const d = new Date(today); d.setDate(today.getDate() + currentDayOffset);
  const dateLabel = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  if (slotTime) slotTime.textContent = selectedSlot.time;
  if (slotDate) slotDate.textContent = dateLabel + ' · ' + selectedSlot.period;
  if (summaryPrice) summaryPrice.textContent = `₹${total}`;
  if (pb1) pb1.textContent = `₹${BASE_PRICE} × ${selectedDuration}h`;
  if (pbt) pbt.textContent = `₹${total}`;
  if (durDisplay) durDisplay.textContent = selectedDuration + (selectedDuration === 1 ? ' hour' : ' hours');
  if (paySection) paySection.style.display = '';

  if (bookBtn) {
    bookBtn.disabled = false;
    bookBtn.textContent = `Confirm Booking — ₹${total}`;
  }
}

function setDuration(delta) {
  selectedDuration = Math.max(1, Math.min(4, selectedDuration + delta));
  updatePanel();
}

function setFormat(el, fmt) {
  document.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const mf = document.getElementById('modalSlotFormat');
  if (mf) mf.textContent = fmt;
}

function selectPayment(el) {
  document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayment = el.dataset.method;
}

function updateStepIndicator(step) {
  [1,2,3].forEach(n => {
    const el = document.getElementById('step' + n + 'indicator');
    if (!el) return;
    el.classList.remove('active','done');
    if (n < step) el.classList.add('done');
    if (n === step) el.classList.add('active');
  });
}

// ============================================================
// BOOKING FLOW
// ============================================================
function handleBooking() {
  if (!selectedSlot) return;

  const ms = document.getElementById('modalSlotTime');
  const md = document.getElementById('modalSlotDate');
  const mp = document.getElementById('modalPayment');
  const mt = document.getElementById('modalTotal');
  const mdur = document.getElementById('modalDuration');

  const today = new Date();
  const d = new Date(today); d.setDate(today.getDate() + currentDayOffset);
  const dateLabel = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  if (ms) ms.textContent = selectedSlot.time;
  if (md) md.textContent = dateLabel;
  if (mp) mp.textContent = selectedPayment;
  if (mt) mt.textContent = `₹${computeTotal()}`;
  if (mdur) mdur.textContent = `${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`;

  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.classList.add('open');
  }
  updateStepIndicator(3);
}

function closeModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.classList.remove('open');
  }
  if (selectedSlot) updateStepIndicator(2);
}

function confirmBooking() {
  if (!selectedSlot) return;
  const btn = document.getElementById('confirmBtn');
  if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }

  setTimeout(() => {
    // Persist
    persistUserBooking(selectedSlot.uid, selectedSlot.storageKey);

    // Update card in-place — keep visible, mark as "Your Booking"
    const card = document.getElementById('card_' + selectedSlot.uid);
    if (card) {
      card.className = 'slot-card booked just-booked';
      card.style.borderColor = 'var(--green-300)';
      card.style.background = 'var(--green-50)';
      card.onclick = null;
      card.innerHTML = `
        <div class="slot-status-badge" style="background:var(--green-100);color:var(--green-800);border:1px solid var(--green-300);">
          <span class="status-dot" style="background:var(--green-600);"></span>Your Booking
        </div>
        <div class="slot-time">${selectedSlot.time}</div>
        <div class="slot-date">${selectedSlot.period} · Confirmed</div>
        <div class="slot-price" style="color:var(--green-700);">₹${computeTotal()}<span>/${selectedDuration}hr</span></div>
        <div class="slot-footer">
          <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.7rem 1rem;background:var(--green-100);border-radius:var(--radius-full);font-size:0.84rem;font-weight:700;color:var(--green-800);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Booked by You
          </div>
        </div>`;
    }

    // Close modal, reset
    document.getElementById('confirmModal').classList.remove('open');
    if (btn) { btn.textContent = 'Confirm Booking'; btn.disabled = false; }

    showToast('Booking Confirmed!', `${selectedSlot.time} – ${selectedDuration} hour${selectedDuration>1?'s':''} reserved.`);

    selectedSlot = null;
    selectedDuration = 1;
    updateStepIndicator(1);
    updatePanel();
    if(typeof renderMyBookings === 'function') renderMyBookings();

  }, 1000);
}

// ============================================================
// TOAST
// ============================================================
function showToast(title, desc) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const t = toast.querySelector('.toast-title');
  const d = document.getElementById('toastDesc');
  if (t) t.textContent = title;
  if (d) d.textContent = desc;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeModal(); }
});

function initGalleryLightbox() {
  document.querySelectorAll('#turfGallery .gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.img || item.querySelector('img')?.src;
      if (src) openLightbox(src);
    });
  });
}

// ============================================================
// MY BOOKINGS
// ============================================================
function renderMyBookings() {
  const container = document.getElementById('myBookingsList');
  const section = document.getElementById('myBookingsSection');
  if (!container || !section) return;

  const today = new Date();
  let mySlots = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dateLabel = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const slotsForDay = getSlotsForDay(i);
    slotsForDay.forEach(slot => {
      if (slot.bookedByUser) {
        mySlots.push({ ...slot, dateLabel });
      }
    });
  }

  if (mySlots.length === 0) {
    section.style.display = 'block';
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: white; border: 1px dashed var(--green-200); border-radius: var(--radius-lg);">
        <div style="width:48px; height:48px; border-radius:50%; background:var(--green-50); color:var(--green-600); display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <h4 style="font-family:var(--font-primary); font-size:1.1rem; color:var(--gray-800); margin-bottom:0.4rem;">No Bookings Yet</h4>
        <p style="color:var(--gray-500); font-size:0.9rem;">Your confirmed slots will appear here.</p>
      </div>
    `;
    return;
  }

  section.style.display = 'block';
  
  container.innerHTML = mySlots.map(slot => `
    <div class="slot-card user-booked" style="border-color:var(--green-300);background:var(--green-50);">
      <div class="slot-status-badge" style="background:var(--green-100);color:var(--green-800);border:1px solid var(--green-300);">
        <span class="status-dot" style="background:var(--green-600);"></span>Confirmed
      </div>
      <div class="slot-time" style="font-family:var(--font-primary);font-size:1.1rem;font-weight:800;color:var(--gray-800);margin-top:0.5rem;margin-bottom:0.2rem;">${slot.label} – ${slot.end}</div>
      <div class="slot-date" style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.75rem;">${slot.dateLabel} · ${slot.period}</div>
      <div class="slot-price" style="font-family:var(--font-primary);font-size:1.1rem;font-weight:800;color:var(--green-700);margin-bottom:1rem;">₹${BASE_PRICE}<span style="font-size:0.75rem;font-weight:500;color:var(--gray-400);">/hr</span></div>
      <div class="slot-footer">
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.75rem 1rem;background:var(--green-100);border-radius:var(--radius-full);font-size:0.85rem;font-weight:700;color:var(--green-800);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Booked by You
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initHero();
  initHomeSlots();
  initBookingPage();
  initGalleryLightbox();
  renderMyBookings();
});
