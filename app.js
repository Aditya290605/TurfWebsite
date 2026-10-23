/**
 * CA Sports Arena - Core Application Logic
 * Mobile-first, responsive slot engine, advance payment, auth, and WhatsApp dispatch.
 */
'use strict';

(function () {
  // Safe config fallback
  const CFG = window.TURF_CONFIG || {
    name: "CA Sports Arena",
    shortName: "CA Turf",
    contact: { whatsappNumber: "919823045678", phone: "+91 98230 45678" },
    pricing: { weekdayPerHour: 500, weekendPerHour: 800, advancePercentage: 25, advanceMinAmount: 200 }
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Base 1-hour slots definition (6:00 AM to 12:00 AM Midnight)
  const HOURLY_SLOTS = [
    // Morning
    { id: 'h06', startHour: 6,  label: '06:00 AM', end: '07:00 AM', period: 'Morning' },
    { id: 'h07', startHour: 7,  label: '07:00 AM', end: '08:00 AM', period: 'Morning' },
    { id: 'h08', startHour: 8,  label: '08:00 AM', end: '09:00 AM', period: 'Morning' },
    { id: 'h09', startHour: 9,  label: '09:00 AM', end: '10:00 AM', period: 'Morning' },
    { id: 'h10', startHour: 10, label: '10:00 AM', end: '11:00 AM', period: 'Morning' },
    { id: 'h11', startHour: 11, label: '11:00 AM', end: '12:00 PM', period: 'Morning' },
    // Afternoon
    { id: 'h12', startHour: 12, label: '12:00 PM', end: '01:00 PM', period: 'Afternoon' },
    { id: 'h13', startHour: 13, label: '01:00 PM', end: '02:00 PM', period: 'Afternoon' },
    { id: 'h14', startHour: 14, label: '02:00 PM', end: '03:00 PM', period: 'Afternoon' },
    { id: 'h15', startHour: 15, label: '03:00 PM', end: '04:00 PM', period: 'Afternoon' },
    { id: 'h16', startHour: 16, label: '04:00 PM', end: '05:00 PM', period: 'Afternoon' },
    // Evening
    { id: 'h17', startHour: 17, label: '05:00 PM', end: '06:00 PM', period: 'Evening' },
    { id: 'h18', startHour: 18, label: '06:00 PM', end: '07:00 PM', period: 'Evening' },
    { id: 'h19', startHour: 19, label: '07:00 PM', end: '08:00 PM', period: 'Evening' },
    { id: 'h20', startHour: 20, label: '08:00 PM', end: '09:00 PM', period: 'Evening' },
    // Night Under Floodlights
    { id: 'h21', startHour: 21, label: '09:00 PM', end: '10:00 PM', period: 'Night Match' },
    { id: 'h22', startHour: 22, label: '10:00 PM', end: '11:00 PM', period: 'Night Match' },
    { id: 'h23', startHour: 23, label: '11:00 PM', end: '12:00 AM', period: 'Night Match' }
  ];

  // Pre-seeded booked slots for demonstration
  const DEFAULT_SEED_BOOKINGS = {
    0: ['h08', 'h18', 'h20'],
    1: ['h07', 'h19'],
    2: ['h18', 'h21']
  };

  // State
  let state = {
    dayOffset: 0,
    selectedSlot: null,
    selectedDuration: 1, // hours
    selectedFormat: 'Box Cricket (6–8 a side)',
    paymentMode: 'advance', // 'advance' (25% / ₹200 min) or 'full'
    currentUser: null,
    lightboxIndex: 0
  };

  // Gallery images list for lightbox
  const GALLERY_ITEMS = [
    { src: 'images/night_action.webp', fallback: 'images/night_action.png', title: 'Night Action Under 500 LUX Floodlights' },
    { src: 'images/hero_aerial.webp', fallback: 'images/hero_aerial.png', title: 'Full Arena Aerial View' },
    { src: 'images/turf_closeup.webp', fallback: 'images/turf_closeup.png', title: 'FIFA-Grade Synthetic Monofilament Turf' },
    { src: 'images/turf_panoramic.webp', fallback: 'images/turf_panoramic.png', title: 'Panoramic Court & Perimeter Netting' },
    { src: 'images/locker_room.webp', fallback: 'images/locker_room.png', title: 'Clean Changing Rooms & Hot Showers' },
    { src: 'images/facility_wide.webp', fallback: 'images/facility_wide.png', title: 'Spacious Dugouts & Canteen Lounge' }
  ];

  /* -------------------------------------------------------------
     STORAGE HELPERS
  ------------------------------------------------------------- */
  function getStoredBookings() {
    try {
      return JSON.parse(localStorage.getItem('ca_booked_slots') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveStoredBookings(bookings) {
    try {
      localStorage.setItem('ca_booked_slots', JSON.stringify(bookings));
    } catch (e) {}
  }

  function getUserBookings() {
    try {
      return JSON.parse(localStorage.getItem('ca_my_bookings') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveUserBooking(booking) {
    const list = getUserBookings();
    list.unshift(booking);
    try {
      localStorage.setItem('ca_my_bookings', JSON.stringify(list));
    } catch (e) {}
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('ca_user') || 'null');
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
      localStorage.setItem('ca_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ca_user');
    }
    updateUserUI();
  }

  // SessionStorage draft persistence
  function saveDraftSession() {
    const draft = {
      dayOffset: state.dayOffset,
      slotId: state.selectedSlot ? state.selectedSlot.id : null,
      slotLabel: state.selectedSlot ? state.selectedSlot.label : null,
      duration: state.selectedDuration,
      format: state.selectedFormat,
      paymentMode: state.paymentMode
    };
    try {
      sessionStorage.setItem('ca_draft_booking', JSON.stringify(draft));
    } catch (e) {}
  }

  function loadDraftSession() {
    try {
      const data = sessionStorage.getItem('ca_draft_booking');
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  /* -------------------------------------------------------------
     DATE & PRICING UTILITIES
  ------------------------------------------------------------- */
  function getDateForOffset(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  function getHourlyRate(date) {
    return isWeekend(date) ? CFG.pricing.weekendPerHour : CFG.pricing.weekdayPerHour;
  }

  function calculatePricing() {
    const date = getDateForOffset(state.dayOffset);
    const hourlyRate = getHourlyRate(date);
    const total = hourlyRate * state.selectedDuration;
    const isWknd = isWeekend(date);

    // Calculate advance
    let advance = Math.round(total * (CFG.pricing.advancePercentage / 100));
    if (advance < CFG.pricing.advanceMinAmount) {
      advance = Math.min(total, CFG.pricing.advanceMinAmount);
    }

    const payNow = state.paymentMode === 'full' ? total : advance;
    const balanceAtVenue = total - payNow;

    return {
      date,
      isWeekend: isWknd,
      rate: hourlyRate,
      duration: state.selectedDuration,
      total,
      advance,
      payNow,
      balanceAtVenue
    };
  }

  /* -------------------------------------------------------------
     SLOT GENERATION & TEMPORAL FILTERING
  ------------------------------------------------------------- */
  function getSlotsForDay(offset) {
    const targetDate = getDateForOffset(offset);
    const now = new Date();
    const isToday = offset === 0;
    const currentHour = now.getHours();

    const storedBookings = getStoredBookings();
    const dayKey = `d_${offset}_${targetDate.getFullYear()}_${targetDate.getMonth()}_${targetDate.getDate()}`;
    const dayBookedList = storedBookings[dayKey] || DEFAULT_SEED_BOOKINGS[offset] || [];

    return HOURLY_SLOTS.map(slot => {
      // Temporal check: past hour for today?
      const isPast = isToday && (slot.startHour <= currentHour);
      const isBooked = isPast || dayBookedList.includes(slot.id);

      return {
        ...slot,
        uid: `${dayKey}_${slot.id}`,
        dayKey,
        isPast,
        isBooked
      };
    });
  }

  /* -------------------------------------------------------------
     RENDER: DATE TABS
  ------------------------------------------------------------- */
  function renderDateTabs() {
    const container = document.getElementById('dateTabs');
    if (!container) return;

    container.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = i === 0 ? 'Today' : (i === 1 ? 'Tmrw' : DAYS[d.getDay()]);
      const dateNum = d.getDate();
      const monthName = MONTHS[d.getMonth()];
      const wknd = isWeekend(d);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `date-tab-btn ${i === state.dayOffset ? 'active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === state.dayOffset ? 'true' : 'false');
      btn.setAttribute('aria-label', `${dayName}, ${dateNum} ${monthName}`);

      btn.innerHTML = `
        <span class="date-tab-day">${dayName}</span>
        <span class="date-tab-num">${dateNum}</span>
        <span class="date-tab-tag ${wknd ? 'weekend' : ''}">${wknd ? '₹800' : '₹500'}</span>
      `;

      btn.addEventListener('click', () => {
        state.dayOffset = i;
        state.selectedSlot = null; // reset slot on day change
        renderDateTabs();
        renderSlotsGrid();
        updateSummaryPanel();
        saveDraftSession();
      });

      container.appendChild(btn);
    }
  }

  /* -------------------------------------------------------------
     RENDER: SLOTS GRID
  ------------------------------------------------------------- */
  function renderSlotsGrid() {
    const container = document.getElementById('slotsContainer');
    if (!container) return;

    const slots = getSlotsForDay(state.dayOffset);
    const groups = {
      'Morning': [],
      'Afternoon': [],
      'Evening': [],
      'Night Match': []
    };

    slots.forEach(s => {
      if (groups[s.period]) groups[s.period].push(s);
    });

    const periodIcons = {
      'Morning': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>`,
      'Afternoon': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>`,
      'Evening': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
      'Night Match': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    };

    let html = '';

    for (const [period, list] of Object.entries(groups)) {
      if (!list.length) continue;
      html += `
        <div class="daypart-group">
          <div class="daypart-header">
            ${periodIcons[period] || ''}
            <span>${period} (${period === 'Night Match' ? 'Floodlit' : list.length + ' Slots'})</span>
          </div>
          <div class="slots-grid">
      `;

      list.forEach(slot => {
        const isSelected = state.selectedSlot && state.selectedSlot.id === slot.id;
        const disabledAttr = slot.isBooked ? 'disabled' : '';
        const statusLabel = slot.isPast ? 'Expired' : (slot.isBooked ? 'Booked' : 'Available');
        const statusClass = slot.isBooked ? 'taken' : 'avail';

        html += `
          <button type="button"
                  class="slot-btn ${isSelected ? 'selected' : ''} ${slot.isBooked ? 'booked' : ''}"
                  data-slot-id="${slot.id}"
                  data-slot-label="${slot.label} – ${slot.end}"
                  data-start-hour="${slot.startHour}"
                  data-period="${slot.period}"
                  data-daykey="${slot.dayKey}"
                  ${disabledAttr}
                  aria-label="${slot.label} to ${slot.end}, ${statusLabel}">
            <div class="slot-time-text">${slot.label}</div>
            <div class="slot-status-pill ${statusClass}">${statusLabel}</div>
          </button>
        `;
      });

      html += `</div></div>`;
    }

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.slot-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.slotId;
        const label = btn.dataset.slotLabel;
        const period = btn.dataset.period;
        const startHour = parseInt(btn.dataset.startHour, 10);
        const dayKey = btn.dataset.daykey;

        state.selectedSlot = { id, label, period, startHour, dayKey };
        renderSlotsGrid();
        updateSummaryPanel();
        saveDraftSession();

        // On mobile, smooth scroll to summary panel if below view
        if (window.innerWidth < 960) {
          const panel = document.getElementById('bookingPanel');
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });
  }

  /* -------------------------------------------------------------
     RENDER: SUMMARY PANEL & PRICING
  ------------------------------------------------------------- */
  function updateSummaryPanel() {
    const emptyState = document.getElementById('summaryEmpty');
    const filledState = document.getElementById('summaryFilled');
    const bookBtn = document.getElementById('confirmBookBtn');
    const stickyAmount = document.getElementById('stickyBarAmount');

    const pricing = calculatePricing();

    // Update bottom mobile sticky price bar
    if (stickyAmount) {
      stickyAmount.innerHTML = `${CFG.pricing.currencySymbol}${pricing.rate}<span>/hr</span>`;
    }

    if (!state.selectedSlot) {
      if (emptyState) emptyState.style.display = 'block';
      if (filledState) filledState.style.display = 'none';
      if (bookBtn) {
        bookBtn.disabled = true;
        bookBtn.innerHTML = `Select a Time Slot First`;
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (filledState) filledState.style.display = 'block';

    // Format selected date
    const d = pricing.date;
    const dateStr = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

    const slotTimeEl = document.getElementById('summarySlotTime');
    const slotDateEl = document.getElementById('summarySlotDate');
    const rateTagEl = document.getElementById('summaryRateTag');

    if (slotTimeEl) slotTimeEl.textContent = state.selectedSlot.label;
    if (slotDateEl) slotDateEl.textContent = `${dateStr} · ${state.selectedSlot.period}`;
    if (rateTagEl) rateTagEl.textContent = pricing.isWeekend ? 'Weekend Rate (₹800/hr)' : 'Weekday Rate (₹500/hr)';

    // Duration display
    const durVal = document.getElementById('durationVal');
    if (durVal) durVal.textContent = `${state.selectedDuration} hour${state.selectedDuration > 1 ? 's' : ''}`;

    // Pricing Breakdown rows
    const rateRow = document.getElementById('summaryRateRow');
    const totalRow = document.getElementById('summaryTotalRow');
    const advanceRow = document.getElementById('summaryAdvanceRow');
    const balanceRow = document.getElementById('summaryBalanceRow');

    if (rateRow) rateRow.textContent = `₹${pricing.rate} × ${pricing.duration}h`;
    if (totalRow) totalRow.textContent = `₹${pricing.total}`;

    if (state.paymentMode === 'advance') {
      if (advanceRow) advanceRow.style.display = 'flex';
      const advEl = document.getElementById('summaryAdvanceVal');
      if (advEl) advEl.textContent = `₹${pricing.advance}`;

      if (balanceRow) balanceRow.style.display = 'flex';
      const balEl = document.getElementById('summaryBalanceVal');
      if (balEl) balEl.textContent = `₹${pricing.balanceAtVenue}`;
    } else {
      if (advanceRow) advanceRow.style.display = 'none';
      if (balanceRow) balanceRow.style.display = 'none';
    }

    if (bookBtn) {
      bookBtn.disabled = false;
      if (state.paymentMode === 'advance') {
        bookBtn.innerHTML = `Pay Advance ₹${pricing.payNow} & Book Slot →`;
      } else {
        bookBtn.innerHTML = `Confirm Booking — ₹${pricing.total} →`;
      }
    }
  }

  /* -------------------------------------------------------------
     BOOKING SUBMISSION & WHATSAPP DISPATCH
  ------------------------------------------------------------- */
  function handleBookingSubmission() {
    if (!state.selectedSlot) return;

    const nameInput = document.getElementById('bookName');
    const phoneInput = document.getElementById('bookPhone');
    const nameError = document.getElementById('bookNameError');
    const phoneError = document.getElementById('bookPhoneError');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    let hasError = false;

    if (!name || name.length < 2) {
      if (nameError) nameError.textContent = 'Please enter your full name.';
      if (nameInput) nameInput.classList.add('error');
      hasError = true;
    } else {
      if (nameError) nameError.textContent = '';
      if (nameInput) nameInput.classList.remove('error');
    }

    // Indian 10-digit phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      if (phoneError) phoneError.textContent = 'Enter a valid 10-digit Indian phone number.';
      if (phoneInput) phoneInput.classList.add('error');
      hasError = true;
    } else {
      if (phoneError) phoneError.textContent = '';
      if (phoneInput) phoneInput.classList.remove('error');
    }

    if (hasError) return;

    const pricing = calculatePricing();
    const d = pricing.date;
    const dateFormatted = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const bookingRef = `CA-${Date.now().toString().slice(-6)}`;

    const bookingData = {
      ref: bookingRef,
      name,
      phone,
      slotLabel: state.selectedSlot.label,
      dateLabel: dateFormatted,
      format: state.selectedFormat,
      duration: state.selectedDuration,
      total: pricing.total,
      payNow: pricing.payNow,
      balance: pricing.balanceAtVenue,
      paymentMode: state.paymentMode,
      timestamp: new Date().toISOString()
    };

    // Save in user bookings
    saveUserBooking(bookingData);

    // Save into day's booked slots
    const stored = getStoredBookings();
    if (!stored[state.selectedSlot.dayKey]) stored[state.selectedSlot.dayKey] = [];
    stored[state.selectedSlot.dayKey].push(state.selectedSlot.id);
    saveStoredBookings(stored);

    // Build prefilled WhatsApp message
    const waText = encodeURIComponent(
      `🏏 *Booking Request — ${CFG.name}*\n` +
      `---------------------------------\n` +
      `*Ref:* #${bookingRef}\n` +
      `*Name:* ${name}\n` +
      `*Phone:* ${phone}\n` +
      `*Date:* ${dateFormatted}\n` +
      `*Slot:* ${state.selectedSlot.label}\n` +
      `*Format:* ${state.selectedFormat}\n` +
      `*Duration:* ${state.selectedDuration} Hour(s)\n` +
      `*Total Price:* ₹${pricing.total}\n` +
      `*Advance (${state.paymentMode === 'full' ? 'Full Paid' : '25%'}):* ₹${pricing.payNow}\n` +
      `*Balance at Venue:* ₹${pricing.balanceAtVenue}\n` +
      `---------------------------------\n` +
      `Please confirm my slot reservation!`
    );

    const waUrl = `https://wa.me/${CFG.contact.whatsappNumber}?text=${waText}`;

    // Show confirmation modal
    showConfirmationModal(bookingData, waUrl);

    // Clear draft session & re-render
    state.selectedSlot = null;
    sessionStorage.removeItem('ca_draft_booking');
    renderSlotsGrid();
    updateSummaryPanel();
    showToast('Slot Booked!', 'Your reservation has been recorded.');
  }

  function showConfirmationModal(b, waUrl) {
    const modal = document.getElementById('confirmationModal');
    if (!modal) return;

    const refEl = document.getElementById('confRef');
    const slotEl = document.getElementById('confSlot');
    const dateEl = document.getElementById('confDate');
    const nameEl = document.getElementById('confName');
    const totalEl = document.getElementById('confTotal');
    const advanceEl = document.getElementById('confAdvance');
    const balanceEl = document.getElementById('confBalance');
    const waLink = document.getElementById('confWhatsAppLink');

    if (refEl) refEl.textContent = `#${b.ref}`;
    if (slotEl) slotEl.textContent = b.slotLabel;
    if (dateEl) dateEl.textContent = b.dateLabel;
    if (nameEl) nameEl.textContent = `${b.name} (${b.phone})`;
    if (totalEl) totalEl.textContent = `₹${b.total}`;
    if (advanceEl) advanceEl.textContent = `₹${b.payNow} (${b.paymentMode === 'full' ? 'Full' : 'Advance'})`;
    if (balanceEl) balanceEl.textContent = `₹${b.balance}`;

    if (waLink) {
      waLink.href = waUrl;
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
    }

    modal.classList.add('open');
  }

  /* -------------------------------------------------------------
     AUTHENTICATION SYSTEM (Login, Sign-Up, Guest Mode)
  ------------------------------------------------------------- */
  function initAuth() {
    state.currentUser = getCurrentUser();
    updateUserUI();

    const authModal = document.getElementById('authModal');
    const openBtn = document.getElementById('userAuthBtn');
    const closeBtn = document.getElementById('authCloseBtn');
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const formLogin = document.getElementById('formLogin');
    const formSignup = document.getElementById('formSignup');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (state.currentUser) {
          // Open My Bookings if logged in
          openMyBookings();
        } else {
          // Open Login Modal
          if (authModal) authModal.classList.add('open');
        }
      });
    }

    if (closeBtn && authModal) {
      closeBtn.addEventListener('click', () => authModal.classList.remove('open'));
    }

    if (tabLogin && tabSignup && formLogin && formSignup) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        formLogin.style.display = 'flex';
        formSignup.style.display = 'none';
      });

      tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        formSignup.style.display = 'flex';
        formLogin.style.display = 'none';
      });

      // Submit Login
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('loginPhone').value.trim();
        const name = document.getElementById('loginName')?.value.trim() || 'Player';

        if (phone.length === 10) {
          setCurrentUser({ name, phone });
          if (authModal) authModal.classList.remove('open');
          showToast(`Welcome back, ${name}!`);
        }
      });

      // Submit Sign-Up
      formSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const phone = document.getElementById('signupPhone').value.trim();
        const email = document.getElementById('signupEmail')?.value.trim() || '';

        if (name && phone.length === 10) {
          setCurrentUser({ name, phone, email });
          if (authModal) authModal.classList.remove('open');
          showToast(`Account created for ${name}!`);
        }
      });
    }
  }

  function updateUserUI() {
    const userBtn = document.getElementById('userAuthBtn');
    const nameInput = document.getElementById('bookName');
    const phoneInput = document.getElementById('bookPhone');

    if (!userBtn) return;

    if (state.currentUser) {
      userBtn.innerHTML = `
        <span class="user-avatar-initials">${state.currentUser.name.charAt(0).toUpperCase()}</span>
        <span>${state.currentUser.name.split(' ')[0]} (My Bookings)</span>
      `;
      if (nameInput && !nameInput.value) nameInput.value = state.currentUser.name;
      if (phoneInput && !phoneInput.value) phoneInput.value = state.currentUser.phone;
    } else {
      userBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Login / Sign Up</span>
      `;
    }
  }

  function openMyBookings() {
    const modal = document.getElementById('myBookingsModal');
    const listEl = document.getElementById('myBookingsList');
    if (!modal || !listEl) return;

    const bookings = getUserBookings();
    if (!bookings.length) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);">
          <p>No slots booked yet.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="document.getElementById('myBookingsModal').classList.remove('open');document.getElementById('booking').scrollIntoView({behavior:'smooth'});">Book a Slot Now</button>
        </div>
      `;
    } else {
      listEl.innerHTML = bookings.map(b => `
        <div class="booked-slot-item">
          <div>
            <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--text);">${b.slotLabel}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);">${b.dateLabel} · ${b.format}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">Ref: #${b.ref}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:var(--accent);">₹${b.total}</div>
            <div style="font-size:0.72rem;font-weight:700;color:var(--state-avail);">Advance Paid: ₹${b.payNow}</div>
            <div style="font-size:0.72rem;color:var(--text-dim);">Due: ₹${b.balance}</div>
          </div>
        </div>
      `).join('');
    }

    modal.classList.add('open');
  }

  /* -------------------------------------------------------------
     LIGHTBOX WITH KEYBOARD & MOBILE SWIPE SUPPORT
  ------------------------------------------------------------- */
  function initLightbox() {
    const modal = document.getElementById('lightboxModal');
    const imgEl = document.getElementById('lightboxImg');
    const captionEl = document.getElementById('lightboxCaption');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');

    if (!modal || !imgEl) return;

    function showImage(idx) {
      state.lightboxIndex = (idx + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
      const item = GALLERY_ITEMS[state.lightboxIndex];
      imgEl.src = item.src;
      imgEl.alt = item.title;
      if (captionEl) captionEl.textContent = item.title;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Attach click to gallery items
    document.querySelectorAll('[data-gallery-index]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.galleryIndex, 10);
        showImage(idx);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => showImage(state.lightboxIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showImage(state.lightboxIndex + 1));

    // Keyboard support: ESC, ArrowLeft, ArrowRight
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showImage(state.lightboxIndex - 1);
      if (e.key === 'ArrowRight') showImage(state.lightboxIndex + 1);
    });

    // Mobile touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) showImage(state.lightboxIndex - 1); // Swipe right -> prev
        else showImage(state.lightboxIndex + 1);          // Swipe left -> next
      }
    }
  }

  /* -------------------------------------------------------------
     TOAST NOTIFICATIONS
  ------------------------------------------------------------- */
  function showToast(title, desc = '') {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;

    const tEl = document.getElementById('toastTitle');
    const dEl = document.getElementById('toastDesc');

    if (tEl) tEl.textContent = title;
    if (dEl) dEl.textContent = desc;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  /* -------------------------------------------------------------
     MOBILE MENU & NAVIGATION TOGGLE
  ------------------------------------------------------------- */
  function initNavigation() {
    const toggleBtn = document.getElementById('navToggleBtn');
    const drawer = document.getElementById('mobileNavDrawer');
    const drawerClose = document.getElementById('mobileDrawerClose');

    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }

    if (drawerClose && drawer) {
      drawerClose.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    // Close on link click
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (drawer) {
          drawer.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });
  }

  /* -------------------------------------------------------------
     INIT APP ON DOM LOAD
  ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Check for draft session restore
    const draft = loadDraftSession();
    if (draft) {
      state.dayOffset = draft.dayOffset || 0;
      state.selectedDuration = draft.duration || 1;
      state.selectedFormat = draft.format || 'Box Cricket (6–8 a side)';
      state.paymentMode = draft.paymentMode || 'advance';
    }

    // Format pills selector
    document.querySelectorAll('.format-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedFormat = pill.dataset.format;
        saveDraftSession();
      });
    });

    // Duration Stepper
    const durMinus = document.getElementById('durMinus');
    const durPlus = document.getElementById('durPlus');
    if (durMinus && durPlus) {
      durMinus.addEventListener('click', () => {
        if (state.selectedDuration > 1) {
          state.selectedDuration--;
          updateSummaryPanel();
          saveDraftSession();
        }
      });
      durPlus.addEventListener('click', () => {
        if (state.selectedDuration < 4) {
          state.selectedDuration++;
          updateSummaryPanel();
          saveDraftSession();
        }
      });
    }

    // Advance Payment Mode Toggles
    const payAdvanceBtn = document.getElementById('payModeAdvance');
    const payFullBtn = document.getElementById('payModeFull');
    if (payAdvanceBtn && payFullBtn) {
      payAdvanceBtn.addEventListener('click', () => {
        payAdvanceBtn.classList.add('active');
        payFullBtn.classList.remove('active');
        state.paymentMode = 'advance';
        updateSummaryPanel();
        saveDraftSession();
      });
      payFullBtn.addEventListener('click', () => {
        payFullBtn.classList.add('active');
        payAdvanceBtn.classList.remove('active');
        state.paymentMode = 'full';
        updateSummaryPanel();
        saveDraftSession();
      });
    }

    // Booking Submission Button
    const confirmBtn = document.getElementById('confirmBookBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleBookingSubmission);
    }

    // Modal Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('open');
      });
    });

    // Logout trigger if exists
    const logoutBtn = document.getElementById('userLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        setCurrentUser(null);
        const myBookingsModal = document.getElementById('myBookingsModal');
        if (myBookingsModal) myBookingsModal.classList.remove('open');
        showToast('Logged out successfully');
      });
    }

    // Initialize all components
    renderDateTabs();
    renderSlotsGrid();
    updateSummaryPanel();
    initAuth();
    initLightbox();
    initNavigation();
  });

})();
