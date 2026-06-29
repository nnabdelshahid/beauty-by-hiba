/*
 * Shared client‑side logic for the Beauty by Hiba site. This file is
 * loaded on every page and attaches event handlers depending on the
 * presence of specific elements. Bookings are persisted in browser
 * localStorage to enable a lightweight client portal without a backend.
 */

// Define base service prices; deposit is half the price
const SERVICE_PRICES = {
  brows: 30,
  makeup: 50,
  skin: 40,
  multi: 200,
};

function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem('beauty_bookings') || '[]');
  } catch (err) {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem('beauty_bookings', JSON.stringify(bookings));
}

function addBooking(booking) {
  const bookings = loadBookings();
  bookings.push(booking);
  saveBookings(bookings);
}

function toggleDeposit(id) {
  const bookings = loadBookings();
  const booking = bookings.find((b) => b.id === id);
  if (booking) {
    booking.depositPaid = !booking.depositPaid;
    saveBookings(bookings);
  }
}

// Generate a simple .ics file as a Blob URL. Based on RFC 5545.
function generateICS(booking) {
  const id = booking.id;
  const start = new Date(`${booking.startDate}T${booking.startTime}`);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startUtc = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  let endUtc;
  if (booking.service === 'multi' && booking.endDate) {
    const endDateObj = new Date(`${booking.endDate}T17:00`);
    endUtc = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } else {
    const endObj = new Date(start.getTime() + 60 * 60 * 1000);
    endUtc = endObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${id}@beauty-by-hiba`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:Beauty by Hiba – ${booking.service} appointment`,
    `DESCRIPTION:Appointment for ${booking.service} with Beauty by Hiba${booking.name ? ` for ${booking.name}` : ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}

function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;
  const serviceSelect = form.querySelector('select[name="service"]');
  const endDateField = document.getElementById('endDateField');
  serviceSelect.addEventListener('change', () => {
    if (serviceSelect.value === 'multi') {
      endDateField.style.display = 'block';
    } else {
      endDateField.style.display = 'none';
    }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = (form.querySelector('input[name="name"]') as HTMLInputElement).value.trim();
    const email = (form.querySelector('input[name="email"]') as HTMLInputElement).value.trim();
    const phone = (form.querySelector('input[name="phone"]') as HTMLInputElement).value.trim();
    const service = (form.querySelector('select[name="service"]') as HTMLSelectElement).value;
    const startDate = (form.querySelector('input[name="startDate"]') as HTMLInputElement).value;
    const startTime = (form.querySelector('input[name="startTime"]') as HTMLInputElement).value;
    const endDate = (form.querySelector('input[name="endDate"]') as HTMLInputElement).value;
    // Validation
    const errors: string[] = [];
    if (!name) errors.push('Name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
    if (!SERVICE_PRICES[service]) errors.push('Invalid service');
    if (!startDate) errors.push('Start date is required');
    if (!startTime) errors.push('Start time is required');
    // Validate schedule
    if (startDate && startTime) {
      const [h, m] = startTime.split(':').map((n) => parseInt(n, 10));
      if (h < 9 || h > 16) errors.push('Appointments must start between 09:00 and 16:59');
      const dateObj = new Date(`${startDate}T${startTime}`);
      const day = dateObj.getDay();
      if (day === 0 || day === 6) errors.push('Appointments are only available Monday–Friday');
    }
    if (service === 'multi') {
      if (!endDate) errors.push('End date is required for multi‑day events');
      else {
        const startObj = new Date(`${startDate}T${startTime}`);
        const endObj = new Date(`${endDate}T00:00`);
        if (endObj < startObj) errors.push('End date must be on or after the start date');
      }
    }
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    if (errors.length) {
      resultDiv.innerHTML = `<p style="color:#b64272">${errors.join('<br>')}</p>`;
      return;
    }
    const price = SERVICE_PRICES[service];
    const depositDue = Math.round(price * 0.5);
    const id = Date.now().toString();
    const booking: any = {
      id,
      name,
      email,
      phone,
      service,
      startDate,
      startTime,
      endDate: service === 'multi' ? endDate : undefined,
      depositPaid: false,
      depositDue,
    };
    addBooking(booking);
    const icsUrl = generateICS(booking);
    resultDiv.innerHTML = `
      <div class="success">
        <h2>Thank you!</h2>
        <p>Your booking request has been saved.</p>
        <p>Deposit due: <strong>$${depositDue}</strong></p>
        <p><a href="${icsUrl}" download>Download calendar event (.ics)</a></p>
      </div>
    `;
    form.reset();
    endDateField.style.display = 'none';
  });
}

function initPortal() {
  const table = document.getElementById('bookingTable');
  if (!table) return;
  function render() {
    const bookings = loadBookings();
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    bookings.forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.service}</td>
        <td>${b.startDate}${b.endDate ? ' – ' + b.endDate : ''}</td>
        <td>${b.startTime}</td>
        <td>${b.depositPaid ? 'Yes' : 'No'}</td>
        <td><button class="button" data-id="${b.id}">${b.depositPaid ? 'Mark Unpaid' : 'Mark Paid'}</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
  table.addEventListener('click', function (e) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' && target.dataset.id) {
      toggleDeposit(target.dataset.id);
      render();
    }
  });
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  initBookingForm();
  initPortal();
});