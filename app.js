/* ============================================================
   ELITE TURF ARENA — Main Application Script
   Handles: navbar, scroll animations, booking logic,
            lightbox, toasts, mobile menu, modal
   ============================================================ */

'use strict';

// ============================================================
// SECTION 1: SLOT DATA — mockup state with localStorage sync
// ============================================================

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getTodaySlots(dateOffset = 0) {
  const base = [
    { id: 'slot_06', time: '6:00 AM – 7:00 AM',  price: 30, period: 'Morning'   },
    { id: 'slot_07', time: '7:00 AM – 8:00 AM',  price: 30, period: 'Morning'   },
    { id: 'slot_08', time: '8:00 AM – 9:00 AM',  price: 30, period: 'Morning'   },
    { id: 'slot_09', time: '9:00 AM – 10:00 AM', price: 30, period: 'Morning'   },
    { id: 'slot_10', time: '10:00 AM – 11:00 AM',price: 30, period: 'Morning'   },
    { id: 'slot_11', time: '11:00 AM – 12:00 PM',price: 30, period: 'Morning'   },
    { id: 'slot_12', time: '12:00 PM – 1:00 PM', price: 38, period: 'Afternoon' },
    { id: 'slot_13', time: '1:00 PM – 2:00 PM',  price: 38, period: 'Afternoon' },
    { id: 'slot_14', time: '2:00 PM – 3:00 PM',  price: 38, period: 'Afternoon' },
    { id: 'slot_15', time: '3:00 PM – 4:00 PM',  price: 38, period: 'Afternoon' },
    { id: 'slot_16', time: '4:00 PM – 5:00 PM',  price: 38, period: 'Afternoon' },
    { id: 'slot_17', time: '5:00 PM – 6:00 PM',  price: 38, period: 'Afternoon' },
    { id: 'slot_18', time: '6:00 PM – 7:00 PM',  price: 45, period: 'Evening'   },
    { id: 'slot_19', time: '7:00 PM – 8:00 PM',  price: 45, period: 'Evening'   },
    { id: 'slot_20', time: '8:00 PM – 9:00 PM',  price: 45, period: 'Evening'   },
    { id: 'slot_21', time: '9:00 PM – 10:00 PM', price: 45, period: 'Evening'   },
    { id: 'slot_22', time: '10:00 PM – 11:00 PM',price: 40, period: 'Evening'   },
  ];

  // Load booked state from localStorage, key includes dateOffset
  const storageKey = `eta_booked_d${dateOffset}`;
  let bookedIds = [];
  try {
    bookedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch(e) { bookedIds = []; }

  // Some slots pre-booked for realism
  const preBooked = dateOffset === 0
    ? ['slot_07', 'slot_14', 'slot_19']
    : dateOffset === 1
    ? ['slot_06', 'slot_13', 'slot_21']
    : ['slot_08', 'slot_16'];

  return base.map(s => ({
    ...s,
    id: s.id + '_d' + dateOffset,
    booked: bookedIds.includes(s.id + '_d' + dateOffset) || preBooked.includes(s.id),
    storageKey,
  }));
}

function markSlotBooked(slotId, storageKey) {
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch(e) {}
  if (!stored.includes(slotId)) {
    stored.push(slotId);
    localStorage.setItem(storageKey, JSON.stringify(stored));
  }
}

// ============================================================
// SECTION 2: SHARED STATE
// ============================================================

let currentDateOffset = 0;
let selectedSlot = null;
let selectedPayment = 'Credit Card';
let currentFormat = '11v11';

// ============================================================
// SECTION 3: NAVBAR — transparent → frosted on scroll
// ============================================================

function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const isHero = navbar.classList.contains('navbar-hero');

  function updateNavbar() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      if (isHero) navbar.classList.remove('navbar-hero');
    } else {
      navbar.classList.remove('scrolled');
      if (isHero) navbar.classList.add('navbar-hero');
    }
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
}

// ============================================================
// SECTION 4: MOBILE MENU
// ============================================================

function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const closeBtn = document.getElementById('mobileMenuClose');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const doClose = () => {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', doClose);

  // Close on link click
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', doClose));
}

// ============================================================
// SECTION 5: SCROLL ANIMATIONS — IntersectionObserver
// ============================================================

function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
  if (!elements.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const staggerIdx = entry.target.style.getPropertyValue('--stagger-index') || 0;
        const delay = parseFloat(staggerIdx) * 80;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => io.observe(el));
}

// ============================================================
// SECTION 6: HERO BG ANIMATION (index.html only)
// ============================================================

function initHero() {
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  setTimeout(() => bg.classList.add('loaded'), 100);
}

// ============================================================
// SECTION 7: HOME PAGE — SLOT PREVIEW
// ============================================================

function initHomeSlots() {
  const container = document.getElementById('homeSlots');
  if (!container) return;

  const slots = getTodaySlots(0);
  // Show only evening slots (6 PM onwards)
  const preview = slots.filter(s => s.period === 'Evening').slice(0, 4);

  container.innerHTML = preview.map(slot => renderSlotCard(slot, false)).join('');

  // Animate in
  container.querySelectorAll('.slot-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 100);
  });
}

function renderSlotCard(slot, interactive = true) {
  const statusClass = slot.booked ? 'booked' : 'available';
  const statusLabel = slot.booked ? 'Fully Booked' : 'Available';
  const statusDot = slot.booked ? '●' : '●';

  const bookingAction = interactive && !slot.booked
    ? `onclick="selectSlot('${slot.id}', '${slot.time}', ${slot.price}, '${slot.storageKey}')"`
    : '';

  return `
    <div class="slot-card ${statusClass}" id="card_${slot.id}" ${bookingAction}>
      <div class="slot-status-badge ${statusClass}">
        <span class="status-dot"></span>
        ${statusLabel}
      </div>
      <div class="slot-time">${slot.time}</div>
      <div class="slot-date">${slot.period} Session · 1 hour</div>
      <div class="slot-price">$${slot.price}<span>/hr</span></div>
      ${!slot.booked ? `
      <div class="slot-footer">
        ${interactive
          ? `<button class="btn btn-primary" style="width:100%;" onclick="selectSlot('${slot.id}','${slot.time}',${slot.price},'${slot.storageKey}')">Select This Slot</button>`
          : `<a href="booking.html" class="btn btn-outline" style="width:100%;">Book Now →</a>`
        }
      </div>` : `
      <div class="slot-footer" style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--gray-100);">
        <button class="btn" style="width:100%;background:var(--gray-100);color:var(--gray-400);cursor:not-allowed;" disabled>Unavailable</button>
      </div>`}
    </div>
  `;
}

// ============================================================
// SECTION 8: BOOKING PAGE — DATES, SLOTS, SELECTION
// ============================================================

function initBookingPage() {
  const dateTabs = document.getElementById('dateTabs');
  const slotGroups = document.getElementById('slotGroups');
  if (!dateTabs || !slotGroups) return;

  // Render date tabs
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const tab = document.createElement('div');
    tab.className = 'date-tab' + (i === 0 ? ' active' : '');
    tab.textContent = label;
    tab.setAttribute('data-offset', i);
    tab.onclick = () => {
      document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentDateOffset = i;
      selectedSlot = null;
      resetPanel();
      renderSlots(i);
    };
    dateTabs.appendChild(tab);
  }

  renderSlots(0);
}

function renderSlots(dateOffset) {
  const container = document.getElementById('slotGroups');
  if (!container) return;

  const slots = getTodaySlots(dateOffset);
  const groups = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach(s => groups[s.period].push(s));

  const periodIcons = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆' };

  let html = '';
  for (const [period, slotList] of Object.entries(groups)) {
    if (!slotList.length) continue;
    html += `<div class="time-group-label">${periodIcons[period]} ${period}</div>`;
    html += `<div class="slots-grid" style="margin-bottom:0.5rem;">`;
    slotList.forEach(slot => {
      html += renderSlotCard(slot, true);
    });
    html += `</div>`;
  }

  container.innerHTML = html;

  // Animate newly rendered cards
  container.querySelectorAll('.slot-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '';
      card.style.transform = '';
    }, i * 40);
  });
}

function setFormat(el, fmt) {
  document.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  currentFormat = fmt;
  // Update modal format display
  const mf = document.getElementById('modalSlotFormat');
  if (mf) mf.textContent = fmt.replace('v', ' v ');
}

function selectSlot(id, time, price, storageKey) {
  // Deselect previous
  document.querySelectorAll('.slot-card.selected').forEach(c => c.classList.remove('selected'));

  selectedSlot = { id, time, price, storageKey };

  // Mark selected card
  const card = document.getElementById('card_' + id);
  if (card) card.classList.add('selected');

  // Update summary panel
  const display = document.getElementById('selectedSlotDisplay');
  const timeEl = document.getElementById('summaryTime');
  const priceEl = document.getElementById('summaryPrice');
  const dateEl = document.getElementById('summaryDate');
  const paySection = document.getElementById('paymentSection');
  const bookBtn = document.getElementById('bookBtn');
  const pb1 = document.getElementById('priceBreakdown1');
  const pbt = document.getElementById('priceBreakdownTotal');

  if (display) display.classList.add('active');
  if (timeEl) timeEl.textContent = time;
  if (priceEl) priceEl.textContent = `$${price}.00`;
  if (pb1) pb1.textContent = `$${price}.00`;
  if (pbt) pbt.textContent = `$${price + 2}.00`;

  // Get date label
  const today = new Date();
  const dateObj = new Date(today);
  dateObj.setDate(today.getDate() + currentDateOffset);
  const dateLabel = `${DAYS[dateObj.getDay()]}, ${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`;
  if (dateEl) dateEl.textContent = dateLabel;

  if (paySection) paySection.style.display = '';
  if (bookBtn) {
    bookBtn.disabled = false;
    bookBtn.textContent = 'Confirm Booking →';
  }

  // Update step indicator
  updateStepIndicator(2);

  // Scroll panel into view on mobile
  const panel = document.querySelector('.booking-panel');
  if (panel && window.innerWidth < 900) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function resetPanel() {
  const display = document.getElementById('selectedSlotDisplay');
  const paySection = document.getElementById('paymentSection');
  const bookBtn = document.getElementById('bookBtn');
  if (display) display.classList.remove('active');
  if (paySection) paySection.style.display = 'none';
  if (bookBtn) {
    bookBtn.disabled = true;
    bookBtn.textContent = 'Select a Slot to Continue';
  }
  updateStepIndicator(1);
}

function selectPayment(el) {
  document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayment = el.dataset.method;
}

// ============================================================
// SECTION 9: STEP INDICATOR
// ============================================================

function updateStepIndicator(step) {
  [1, 2, 3].forEach(n => {
    const ind = document.getElementById('step' + n + 'indicator');
    if (!ind) return;
    ind.classList.remove('active', 'done');
    if (n < step) ind.classList.add('done');
    if (n === step) ind.classList.add('active');
  });
}

// ============================================================
// SECTION 10: BOOKING FLOW — handleBooking + confirmBooking
// ============================================================

function handleBooking() {
  if (!selectedSlot) return;

  // Populate modal
  const ms = document.getElementById('modalSlotTime');
  const md = document.getElementById('modalSlotDate');
  const mp = document.getElementById('modalPayment');
  const mt = document.getElementById('modalTotal');
  const mf = document.getElementById('modalSlotFormat');

  const today = new Date();
  const dateObj = new Date(today);
  dateObj.setDate(today.getDate() + currentDateOffset);
  const dateLabel = `${DAYS[dateObj.getDay()]}, ${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}, 2025`;

  if (ms) ms.textContent = selectedSlot.time;
  if (md) md.textContent = dateLabel;
  if (mp) mp.textContent = selectedPayment;
  if (mt) mt.textContent = `$${selectedSlot.price + 2}.00`;
  if (mf) mf.textContent = currentFormat.replace('v', ' v ');

  // Show modal
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.add('open');

  updateStepIndicator(3);
}

function closeModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('open');
  updateStepIndicator(2);
}

function confirmBooking() {
  if (!selectedSlot) return;

  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.textContent = 'Processing...';
    confirmBtn.disabled = true;
  }

  setTimeout(() => {
    // Mark booked in localStorage
    markSlotBooked(selectedSlot.id, selectedSlot.storageKey);

    // Update UI card
    const card = document.getElementById('card_' + selectedSlot.id);
    if (card) {
      card.classList.remove('available', 'selected');
      card.classList.add('booked', 'just-booked');
      card.innerHTML = `
        <div class="slot-status-badge booked"><span class="status-dot"></span>Fully Booked</div>
        <div class="slot-time">${selectedSlot.time}</div>
        <div class="slot-date">Your Booking · 1 hour</div>
        <div class="slot-price">$${selectedSlot.price}<span>/hr</span></div>
        <div class="slot-footer">
          <button class="btn" style="width:100%;background:var(--green-50);color:var(--green-700);border:1px solid var(--green-200);cursor:default;">✓ Booked by You</button>
        </div>
      `;
    }

    // Close modal
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('open');

    // Show toast
    showToast('Booking Confirmed! 🎉', `${selectedSlot.time} has been reserved.`);

    // Reset state
    selectedSlot = null;
    resetPanel();

  }, 1200);
}

// ============================================================
// SECTION 11: TOAST NOTIFICATION
// ============================================================

function showToast(title, desc) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const titleEl = toast.querySelector('.toast-title');
  const descEl = document.getElementById('toastDesc');
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ============================================================
// SECTION 12: LIGHTBOX
// ============================================================

function openLightbox(src) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lightbox || !img) return;
  img.src = src;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

// ESC key closes lightbox and modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeModal();
  }
});

// ============================================================
// SECTION 13: GALLERY LIGHTBOX — Turf page gallery
// ============================================================

function initGalleryLightbox() {
  const items = document.querySelectorAll('#turfGallery .gallery-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const imgSrc = item.dataset.img || item.querySelector('img')?.src;
      if (imgSrc) openLightbox(imgSrc);
    });
  });
}

// ============================================================
// SECTION 14: INIT — runs on DOM ready
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initHero();
  initHomeSlots();
  initBookingPage();
  initGalleryLightbox();
});
