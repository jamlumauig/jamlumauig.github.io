import {
  initFirebase,
  signInGuest,
  isFirebaseConfigured,
  uploadDocumentForCard,
  loadDocumentFiles,
  loadRemarksRecord,
  saveRemarksRecord
} from './documents-firebase.js';

// Frontend password protection is only a light access gate. Use Firebase Auth and security rules for real privacy.
const DOCUMENT_ACCESS_PASSWORD = 'lakbay2026';
const DOCUMENT_ACCESS_KEY = 'vietnamDocsUnlocked';
const GROUP_STATE_KEY = 'documents-group-layout-v1';

const doc = (key, title, note, tag = 'Required') => ({
  key,
  title,
  note,
  tag,
  tagClass: tag.toLowerCase() === 'optional' ? 'optional' : ''
});

const REMOVED_DOC_KEYS = new Set([
  'baggage-details',
  'pickup-details',
  'occupants-list',
  'hotel-address-screenshot',
  'checkin-details',
  'daily-schedule-copy',
  'emergency-cash-plan'
]);

const REMARKS_LOCAL_PREFIX = 'documents-remarks-v1';
const REMARKS_DEBOUNCE_MS = 600;
const REMARKS_STATUS_HIDE_MS = 2000;
const remarksSaveTimers = new WeakMap();
const remarksStatusTimers = new WeakMap();
let remarksSyncWarningShown = false;
let remarksRefreshTimer = null;
let documentsBootstrapped = false;

const groupStateDefaults = [
  {
    categoryKey: 'transportation',
    categoryTitle: 'Transportation',
    groups: [
      {
        groupKey: 'manila-hanoi-flight',
        groupTitle: 'Manila → Hanoi Flight',
        summary: 'Flight tickets and booking references',
        addLabel: 'Add Flight Booking',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('traveller-tickets', 'Traveller Tickets', 'Passenger tickets and boarding references.'),
          doc('booking-receipt', 'Booking Receipt', 'Airline or OTA receipt for the booking.')
        ],
        subgroups: [
          { subgroupKey: 'booking-a', subgroupLabel: 'Booking A', docs: [] },
          { subgroupKey: 'booking-b', subgroupLabel: 'Booking B', docs: [] }
        ]
      },
      {
        groupKey: 'hanoi-sapa-bus',
        groupTitle: 'Hanoi → Sapa Bus',
        summary: 'Bus tickets and boarding references',
        addLabel: 'Add Bus Reservation',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('traveller-tickets', 'Traveller Tickets', 'Tickets or QR codes for boarding.'),
          doc('booking-receipt', 'Booking Receipt', 'Reservation confirmation and receipt.')
        ],
        subgroups: [
          { subgroupKey: 'booking-a', subgroupLabel: 'Booking A', docs: [] }
        ]
      },
      {
        groupKey: 'sapa-hanoi-overnight-bus',
        groupTitle: 'Sapa → Hanoi Overnight Bus',
        summary: 'Return trip and sleeper notes',
        addLabel: 'Add Return Booking',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('return-ticket', 'Return Ticket', 'Return boarding pass or QR code.'),
          doc('booking-receipt', 'Booking Receipt', 'Return-leg booking confirmation.')
        ],
        subgroups: [
          { subgroupKey: 'booking-a', subgroupLabel: 'Booking A', docs: [] }
        ]
      },
      {
        groupKey: 'hanoi-airport-transfer',
        groupTitle: 'Hanoi Airport Transfer',
        summary: 'Airport pickup and ride details',
        addLabel: 'Add Transfer Booking',
        subgroupPrefix: 'Transfer',
        templateDocs: [
          doc('transfer-details', 'Transfer Details', 'Driver, pickup, and contact information.'),
          doc('payment-receipt', 'Payment Receipt', 'Receipt or screenshot for the ride.')
        ],
        subgroups: [
          { subgroupKey: 'transfer-a', subgroupLabel: 'Transfer A', docs: [] }
        ]
      },
      {
        groupKey: 'return-flight-ticket',
        groupTitle: 'Return Flight Ticket',
        summary: 'Return flight and seat assignment',
        addLabel: 'Add Flight Booking',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('return-ticket', 'Return Flight Ticket', 'Return flight confirmation and e-ticket.'),
          doc('seat-assignment', 'Seat Assignment', 'Seat or check-in reference if available.')
        ],
        subgroups: [
          { subgroupKey: 'booking-a', subgroupLabel: 'Booking A', docs: [] }
        ]
      }
    ]
  },
  {
    categoryKey: 'hotels',
    categoryTitle: 'Hotels',
    groups: [
      {
        groupKey: 'sapa-valley-hotel',
        groupTitle: 'Sapa Valley Hotel',
        summary: 'Room bookings and confirmations',
        addLabel: 'Add Room',
        subgroupPrefix: 'Room',
        templateDocs: [
          doc('booking-confirmation', 'Room / Booking Confirmation', 'Upload booking confirmation or room reservation details.'),
          doc('payment-receipt', 'Payment Receipt', 'Deposit or full payment proof.')
        ],
        subgroups: [
          { subgroupKey: 'room-a', subgroupLabel: 'Room A', docs: [] },
          { subgroupKey: 'room-b', subgroupLabel: 'Room B', docs: [] }
        ]
      },
      {
        groupKey: 'la-renta-hotel-spa',
        groupTitle: 'La Renta Hotel & Spa',
        summary: 'Room bookings and confirmations',
        addLabel: 'Add Room',
        subgroupPrefix: 'Room',
        templateDocs: [
          doc('booking-confirmation', 'Room / Booking Confirmation', 'Upload booking confirmation or room reservation details.'),
          doc('payment-receipt', 'Payment Receipt', 'Deposit or full payment proof.')
        ],
        subgroups: [
          { subgroupKey: 'room-a', subgroupLabel: 'Room A', docs: [] }
        ]
      }
    ]
  },
  {
    categoryKey: 'itinerary',
    categoryTitle: 'Itinerary / Activities',
    groups: [
      {
        groupKey: 'full-vietnam-itinerary',
        groupTitle: 'Full Vietnam Itinerary',
        summary: 'Trip copy, tickets, and activity confirmations',
        addLabel: 'Add Copy',
        subgroupPrefix: 'Copy',
        templateDocs: [
          doc('full-itinerary', 'Full Vietnam Itinerary', 'Complete day-by-day plan in one file.'),
          doc('activity-confirmations', 'Activity Confirmations', 'Tickets and confirmations for booked activities.'),
          doc('fansipan-ticket', 'Fansipan Ticket / Confirmation', 'If booked for the cable car or summit.'),
          doc('puppet-theater-ticket', 'Puppet Theater Ticket', 'Use if you have a purchased show ticket.'),
          doc('mega-grand-world-details', 'Mega Grand World Details', 'Directions or reservations if needed.')
        ],
        subgroups: [
          { subgroupKey: 'copy-a', subgroupLabel: 'Copy A', docs: [] },
          { subgroupKey: 'copy-b', subgroupLabel: 'Copy B', docs: [] }
        ]
      }
    ]
  },
  {
    categoryKey: 'budget-money',
    categoryTitle: 'Budget / Money',
    groups: [
      {
        groupKey: 'shared-budget',
        groupTitle: 'Shared Budget',
        summary: 'Trip budget, exchange notes, and payment screenshots',
        addLabel: 'Add Budget Set',
        subgroupPrefix: 'Set',
        templateDocs: [
          doc('shared-budget-summary', 'Shared Budget Summary', 'Who paid what and planned spending.'),
          doc('currency-exchange-notes', 'Currency Exchange Notes', 'Rates, counters, and exchange reminders.'),
          doc('payment-screenshots', 'Payment Screenshots', 'Helpful proof if anyone needs to verify payment.')
        ],
        subgroups: [
          { subgroupKey: 'set-a', subgroupLabel: 'Set A', docs: [] }
        ]
      }
    ]
  },
  {
    categoryKey: 'emergency-travel-info',
    categoryTitle: 'Emergency / Travel Info',
    groups: [
      {
        groupKey: 'trip-support',
        groupTitle: 'Trip Support',
        summary: 'Emergency contacts, insurance, and SIM/WiFi notes',
        addLabel: 'Add Support Pack',
        subgroupPrefix: 'Pack',
        templateDocs: [
          doc('emergency-contacts', 'Emergency Contacts', 'All trip contacts in one place.'),
          doc('travel-insurance-copy', 'Travel Insurance Copy', 'If the group has a shared policy.'),
          doc('embassy-contact-notes', 'Embassy / Contact Notes', 'Support contacts and address notes.'),
          doc('sim-wifi-details', 'SIM / WiFi Details', 'Shared data plan or portable WiFi information.')
        ],
        subgroups: [
          { subgroupKey: 'pack-a', subgroupLabel: 'Pack A', docs: [] }
        ]
      }
    ]
  }
];

const travellerData = {
  'traveller-1': {
    label: 'Jam',
    categories: [
      {
        categoryKey: 'identity',
        categoryTitle: 'Identity',
        docs: [
          doc('passport', 'Passport', 'Primary travel document.'),
          doc('government-id', 'Valid Government ID', 'Bring a backup ID.', 'Recommended'),
          doc('boarding-pass', 'Boarding Pass', 'Print or save a screenshot.')
        ]
      },
      {
        categoryKey: 'employment-source-of-funds',
        categoryTitle: 'Employment / Source of Funds',
        docs: [
          doc('company-id', 'Company ID', 'Helpful for immigration checks.', 'Recommended'),
          doc('coe', 'Certificate of Employment', 'If available from your employer.', 'Recommended'),
          doc('approved-leave-form', 'Approved Leave Form', 'Optional but useful proof.', 'Optional'),
          doc('payslip', 'Payslip', 'Bring recent copies if available.', 'Optional'),
          doc('business-permit', 'Business Permit', 'If self-employed.', 'Optional'),
          doc('school-id', 'School ID / Enrollment Proof', 'If student.', 'Optional')
        ]
      },
      {
        categoryKey: 'financial-proof',
        categoryTitle: 'Financial Proof',
        docs: [
          doc('bank-certificate', 'Bank Certificate', 'Shows account standing.', 'Recommended'),
          doc('bank-statement', 'Bank Statement', 'Recent statement if available.', 'Recommended'),
          doc('card-copy', 'Credit / Debit Card Copy', 'Hide sensitive numbers if preferred.', 'Optional'),
          doc('proof-of-funds', 'Proof of Funds', 'Any extra proof that helps.', 'Recommended')
        ]
      },
      {
        categoryKey: 'trip-proof',
        categoryTitle: 'Trip Proof',
        docs: [
          doc('personal-itinerary', 'Personal Travel Itinerary', 'Personal copy of the trip plan.'),
          doc('hotel-booking-copy', 'Hotel Booking Copy', 'Your personal booking reference.'),
          doc('return-ticket-copy', 'Return Ticket Copy', 'Return flight confirmation.'),
          doc('travel-insurance-copy', 'Travel Insurance Copy', 'Recommended for immigration and safety.', 'Recommended')
        ]
      },
      {
        categoryKey: 'other-supporting-documents',
        categoryTitle: 'Other Supporting Documents',
        docs: [
          doc('emergency-contact-card', 'Emergency Contact Card', 'Emergency names and phone numbers.', 'Recommended'),
          doc('authorization-letter', 'Authorization Letter', 'If someone else is helping with travel documents.', 'Optional'),
          doc('other-documents', 'Other Supporting Document', 'Any extra papers that may help.', 'Optional')
        ]
      }
    ]
  },
  'traveller-2': {
    label: 'Maye',
    categories: []
  },
  'traveller-3': {
    label: 'Kyra',
    categories: []
  },
  'traveller-4': {
    label: 'Bon',
    categories: []
  }
};

['traveller-2', 'traveller-3', 'traveller-4'].forEach((travellerId) => {
  travellerData[travellerId].categories = JSON.parse(JSON.stringify(travellerData['traveller-1'].categories));
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getPageType() {
  return document.body?.dataset.docPage || 'hub';
}

function getTravellerId(pageType) {
  return pageType.startsWith('traveller-') ? pageType : 'traveller-1';
}

function loadGroupState() {
  try {
    const raw = localStorage.getItem(GROUP_STATE_KEY);
    if (!raw) return clone(groupStateDefaults);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return clone(groupStateDefaults);
    return sanitizeGroupState(parsed);
  } catch {
    return clone(groupStateDefaults);
  }
}

function sanitizeDocs(docs) {
  return (docs || []).filter((item) => item && !REMOVED_DOC_KEYS.has(item.key));
}

function sanitizeGroupState(state) {
  const cloned = clone(state);
  for (const category of cloned) {
    for (const group of category.groups || []) {
      group.templateDocs = sanitizeDocs(group.templateDocs);
      group.subgroups = (group.subgroups || [])
        .map((subgroup) => ({
          ...subgroup,
          docs: sanitizeDocs(subgroup.docs)
        }))
        .filter((subgroup) => !subgroup.fixed || (subgroup.docs && subgroup.docs.length));
    }
  }
  return cloned;
}

function saveGroupState(state) {
  try {
    localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; uploads still work through Firebase Storage.
  }
}

let groupState = loadGroupState();

function buildRemarksKey(card) {
  if (!card) return '';
  const owner = card.dataset.docOwner || 'traveller-1';
  const category = card.dataset.docCategory || 'identity';
  const docKey = card.dataset.docKey || 'document';
  if (owner === 'group') {
    const group = card.dataset.docGroup || 'group';
    const subgroup = card.dataset.docSubgroup || 'main';
    return `group_${category}_${group}_${subgroup}_${docKey}`;
  }
  return `${owner}_${category}_${docKey}`;
}

function buildRemarksTextareaId(card) {
  return `remarks-${buildRemarksKey(card).replace(/[^A-Za-z0-9_-]+/g, '-')}`;
}

function getRemarksLocalKey(card) {
  return `${REMARKS_LOCAL_PREFIX}:${buildRemarksKey(card)}`;
}

function readLocalRemarks(card) {
  try {
    return localStorage.getItem(getRemarksLocalKey(card)) || '';
  } catch {
    return '';
  }
}

function writeLocalRemarks(card, text) {
  try {
    localStorage.setItem(getRemarksLocalKey(card), text || '');
  } catch {
    // Ignore local persistence failures.
  }
}

function warnRemarksSync(message, error) {
  if (remarksSyncWarningShown) return;
  remarksSyncWarningShown = true;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

function setRemarksStatus(card, message, kind = 'saved') {
  const status = card.querySelector('.doc-remarks-status');
  if (!status) return;
  clearTimeout(remarksStatusTimers.get(card));
  if (!message) {
    status.hidden = true;
    status.textContent = '';
    status.className = 'doc-remarks-status';
    status.removeAttribute('data-state');
    return;
  }
  status.hidden = false;
  status.textContent = message;
  status.className = `doc-remarks-status ${kind}`;
  status.dataset.state = kind;
  if (kind === 'saved') {
    remarksStatusTimers.set(card, setTimeout(() => {
      status.hidden = true;
      status.textContent = '';
      status.className = 'doc-remarks-status';
      status.removeAttribute('data-state');
    }, REMARKS_STATUS_HIDE_MS));
  }
}

function syncRemarksWrapperState(card) {
  const wrap = card.querySelector('.doc-remarks-wrap');
  const input = card.querySelector('.doc-remarks-input');
  const copy = card.querySelector('.doc-remarks-copy');
  if (!wrap || !input) return;
  const value = input.value.trim();
  wrap.dataset.hasRemarks = value ? 'true' : 'false';
  if (copy) copy.textContent = value;
}

function applyRemarksValue(card, text, { persistLocal = true } = {}) {
  const input = card.querySelector('.doc-remarks-input');
  if (!input) return;
  input.value = text || '';
  syncRemarksWrapperState(card);
  if (persistLocal) writeLocalRemarks(card, input.value);
}

async function loadRemarksForCard(card) {
  const key = buildRemarksKey(card);
  const localValue = readLocalRemarks(card);
  if (localValue) {
    applyRemarksValue(card, localValue, { persistLocal: false });
  }

  try {
    const record = await loadRemarksRecord(key);
    if (record && typeof record.remarks === 'string') {
      if (!record.remarks && localValue) {
        return;
      }
      const input = card.querySelector('.doc-remarks-input');
      if (document.activeElement === input && input.value && input.value !== record.remarks) {
        return;
      }
      applyRemarksValue(card, record.remarks, { persistLocal: true });
    }
  } catch (error) {
    if (!localValue) {
      applyRemarksValue(card, '', { persistLocal: false });
    }
    warnRemarksSync('Remarks sync unavailable.', error);
  }
}

async function saveRemarksForCard(card, text) {
  const key = buildRemarksKey(card);
  writeLocalRemarks(card, text);
  try {
    await saveRemarksRecord(key, {
      remarks: text,
      owner: card.dataset.docOwner || '',
      category: card.dataset.docCategory || '',
      group: card.dataset.docGroup || '',
      subgroup: card.dataset.docSubgroup || '',
      docKey: card.dataset.docKey || ''
    });
  } catch (error) {
    warnRemarksSync('Remarks sync unavailable.', error);
  }
}

function queueRemarksSave(card, text) {
  clearTimeout(remarksSaveTimers.get(card));
  setRemarksStatus(card, 'Saving…', 'saving');
  remarksSaveTimers.set(card, setTimeout(async () => {
    await saveRemarksForCard(card, text);
    setRemarksStatus(card, 'Saved', 'saved');
  }, REMARKS_DEBOUNCE_MS));
}

function flushRemarksSave(card) {
  const input = card.querySelector('.doc-remarks-input');
  if (!input) return;
  clearTimeout(remarksSaveTimers.get(card));
  void (async () => {
    setRemarksStatus(card, 'Saving…', 'saving');
    await saveRemarksForCard(card, input.value);
    setRemarksStatus(card, 'Saved', 'saved');
  })();
}

async function syncRemarksForCards(scope = document) {
  const cards = [...scope.querySelectorAll('.doc-card')];
  await Promise.all(cards.map(async (card) => {
    await loadRemarksForCard(card);
  }));
}

function startRemarksPolling() {
  if (remarksRefreshTimer) return;
  const tick = () => {
    if (document.hidden) return;
    void syncRemarksForCards();
  };
  remarksRefreshTimer = window.setInterval(tick, 15000);
  document.addEventListener('visibilitychange', tick);
}

function sectionQuickLinksForPage(pageType) {
  if (pageType === 'group') {
    return [
      ['#group-transportation', 'Transportation'],
      ['#group-hotels', 'Hotels'],
      ['#group-itinerary', 'Itinerary'],
      ['#group-budget', 'Budget'],
      ['#group-emergency', 'Emergency']
    ];
  }
  if (pageType.startsWith('traveller-')) {
    return [
      ['#identity', 'Identity'],
      ['#employment-source-of-funds', 'Employment'],
      ['#financial-proof', 'Financial'],
      ['#trip-proof', 'Trip Proof'],
      ['#other-supporting-documents', 'Other']
    ];
  }
  return [];
}

function renderHub() {
  const counts = [
    {
      href: 'group-documents.html',
      icon: '◌',
      title: 'Group Trip Documents',
      desc: 'Shared trip files.',
      count: `${groupStateDefaults.length} sections`,
      open: 'Open'
    },
    ...Object.keys(travellerData).map((travellerId) => ({
      href: `${travellerId}-documents.html`,
      icon: '◐',
      title: `${travellerId.replace('-', ' ').replace('traveller ', 'Traveller ')} · ${travellerData[travellerId].label || travellerId.replace('-', ' ')}`,
      desc: 'Personal IO checklist.',
      count: `${travellerData[travellerId].categories.length} sections`,
      open: 'Open'
    }))
  ];

  return `
    <div class="page compact" id="docs-top">
      <header class="hero compact">
        <div class="eyebrow">Traveller Documents</div>
        <h1>Traveller Documents</h1>
        <p>Shared files and personal checklists.</p>
        <div class="hero-actions">
          <a class="btn primary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
        </div>
        <div class="sync-badge" data-sync-status>Checking Firebase sync...</div>
      </header>
      ${renderBreadcrumbs([{ label: 'Documents Home' }])}

      <div class="notice">Uploaded files are synced through Firebase Storage. Only share this page with trusted travellers.</div>

      <section class="section">
        <div class="section-head">
          <div>
            <div class="section-label">Sections</div>
            <h2 class="section-title">Open a page</h2>
          </div>
          <div class="section-subtitle">Tap a card to open the shared file page or a traveller checklist.</div>
        </div>
        <div class="hub-grid">
          ${counts.map((card) => `
            <a class="hub-card" href="${escapeHtml(card.href)}">
              <div class="hub-icon">${escapeHtml(card.icon)}</div>
              <div>
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.desc)}</p>
              </div>
              <div class="meta">
                <span class="hub-count">${escapeHtml(card.count)}</span>
                <span class="hub-open">${escapeHtml(card.open)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function isDocumentsUnlocked() {
  try {
    return sessionStorage.getItem(DOCUMENT_ACCESS_KEY) === 'true';
  } catch {
    return false;
  }
}

function setDocumentsAccessState(unlocked) {
  const gate = document.getElementById('documentAccessGate');
  const protectedContent = document.getElementById('protectedDocumentsContent');
  if (gate) gate.hidden = unlocked;
  if (protectedContent) protectedContent.hidden = !unlocked;
}

function showDocumentAccessError(message) {
  const error = document.getElementById('documentAccessError');
  if (!error) return;
  error.textContent = message || 'Incorrect password. Please try again.';
  error.hidden = false;
}

function hideDocumentAccessError() {
  const error = document.getElementById('documentAccessError');
  if (!error) return;
  error.hidden = true;
  error.textContent = '';
}

function bootstrapDocumentsAfterUnlock() {
  if (documentsBootstrapped) return;
  documentsBootstrapped = true;
  initDocumentsPage();
}

function unlockDocuments() {
  try {
    sessionStorage.setItem(DOCUMENT_ACCESS_KEY, 'true');
  } catch {}
  setDocumentsAccessState(true);
  hideDocumentAccessError();
  bootstrapDocumentsAfterUnlock();
}

function lockDocuments() {
  try {
    sessionStorage.removeItem(DOCUMENT_ACCESS_KEY);
  } catch {}
  documentsBootstrapped = false;
  setDocumentsAccessState(false);
  hideDocumentAccessError();
  const passwordInput = document.getElementById('documentAccessPassword');
  if (passwordInput) passwordInput.value = '';
}

function initDocumentAccessGate() {
  const gate = document.getElementById('documentAccessGate');
  const form = document.getElementById('documentAccessForm');
  const lockBtn = document.getElementById('lockDocumentsBtn');
  const passwordInput = document.getElementById('documentAccessPassword');
  const unlockBtn = form?.querySelector('button[type="submit"]');

  if (!gate) {
    bootstrapDocumentsAfterUnlock();
    return;
  }

  if (isDocumentsUnlocked()) {
    setDocumentsAccessState(true);
    bootstrapDocumentsAfterUnlock();
  } else {
    setDocumentsAccessState(false);
  }

  const attemptUnlock = () => {
    const value = (passwordInput?.value || '').trim();
    if (!value) {
      showDocumentAccessError('Enter the shared password.');
      passwordInput?.focus();
      return;
    }
    if (value === DOCUMENT_ACCESS_PASSWORD) {
      unlockDocuments();
    } else {
      showDocumentAccessError('Incorrect password. Please try again.');
      passwordInput?.focus();
    }
  };

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.noValidate = true;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      attemptUnlock();
    });
  }

  if (unlockBtn && !unlockBtn.dataset.bound) {
    unlockBtn.dataset.bound = 'true';
    unlockBtn.addEventListener('click', (event) => {
      event.preventDefault();
      attemptUnlock();
    });
  }

  if (passwordInput && !passwordInput.dataset.bound) {
    passwordInput.dataset.bound = 'true';
    passwordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        attemptUnlock();
      }
    });
  }

  if (lockBtn && !lockBtn.dataset.bound) {
    lockBtn.dataset.bound = 'true';
    lockBtn.addEventListener('click', lockDocuments);
  }
}

function heroChrome({ title, subtitle, status, actions = '', quickLinks = '' }) {
  return `
    <header class="hero compact">
      <div class="eyebrow">Hanoi + Sapa · Vietnam Trip</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
      <div class="hero-actions">${actions}</div>
      <div class="sync-badge" data-sync-status>${escapeHtml(status)}</div>
    </header>
    ${quickLinks}
  `;
}

function renderBreadcrumbs(items) {
  if (!items || !items.length) return '';
  return `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      ${items.map((item, index) => {
        const label = escapeHtml(item.label);
        if (item.href && index < items.length - 1) {
          return `<a class="crumb" href="${escapeHtml(item.href)}">${label}</a>`;
        }
        return `<span class="crumb">${label}</span>`;
      }).join('')}
    </nav>
  `;
}

function renderDocCard({ owner, category, key, title, note, tag = 'Required', tagClass = '', group = '', subgroup = '', travellerId = '' }) {
  const remarksId = buildRemarksTextareaId({
    dataset: { docOwner: owner, docCategory: category, docKey: key, docGroup: group, docSubgroup: subgroup }
  });
  return `
    <article class="doc-row doc-card"
      data-doc-owner="${escapeHtml(owner)}"
      data-doc-category="${escapeHtml(category)}"
      data-doc-key="${escapeHtml(key)}"
      ${group ? `data-doc-group="${escapeHtml(group)}"` : ''}
      ${subgroup ? `data-doc-subgroup="${escapeHtml(subgroup)}"` : ''}
      ${travellerId ? `data-doc-traveller="${escapeHtml(travellerId)}"` : ''}>
      <input class="doc-file-input" type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
      <div class="doc-row-main">
        <div class="doc-row-title-line">
          <h4>${escapeHtml(title)}</h4>
          <span class="doc-required-pill ${tagClass}">${escapeHtml(tag)}</span>
          <span class="doc-status missing">Missing</span>
        </div>
        <p class="doc-row-desc">${escapeHtml(note)}</p>
        <div class="doc-file-name">No file uploaded yet.</div>
        <div class="doc-remarks-wrap" data-remarks-wrap data-has-remarks="false">
          <label class="doc-remarks-label" for="${escapeHtml(remarksId)}">Remarks / Notes</label>
          <textarea
            class="doc-remarks-input"
            id="${escapeHtml(remarksId)}"
            rows="2"
            maxlength="500"
            placeholder="Add remarks or reminders..."
            data-remarks-input></textarea>
          <div class="doc-remarks-copy" aria-hidden="true"></div>
          <div class="doc-remarks-status" hidden aria-live="polite"></div>
        </div>
        <div class="doc-progress-wrap" hidden>
          <div class="doc-progress"><div class="doc-progress-bar"></div></div>
        </div>
        <div class="doc-error" hidden></div>
      </div>
      <div class="doc-row-actions">
        <button class="doc-upload-btn" type="button">Upload</button>
        <a class="doc-download-btn disabled" href="#" aria-disabled="true" target="_blank" rel="noopener">Download</a>
      </div>
    </article>
  `;
}

function renderHubCardPreview({ title, desc, count, href }) {
  return `
    <a class="hub-card" href="${escapeHtml(href)}">
      <div class="hub-icon">◌</div>
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(desc)}</p>
      </div>
      <div class="meta">
        <span class="hub-count">${escapeHtml(count)}</span>
        <span class="hub-open">Open</span>
      </div>
    </a>
  `;
}

function renderGroupPage() {
  const quickLinks = sectionQuickLinksForPage('group')
    .map(([href, label]) => `<a class="quick-link" href="${href}">${escapeHtml(label)}</a>`)
    .join('');

  const shell = `
    <div class="page" id="docs-top">
      ${heroChrome({
        title: 'Group Trip Documents',
        subtitle: 'Shared transport, hotels, itinerary, budget, and emergency files.',
        status: isFirebaseConfigured() ? 'Firebase Storage ready' : 'Firebase is not configured yet.',
        actions: `
          <a class="btn primary" href="documents.html">Documents Home</a>
          <a class="btn secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
        `,
        quickLinks: quickLinks ? `<div class="quick-links">${quickLinks}</div>` : ''
      })}
      ${renderBreadcrumbs([
        { label: 'Documents Home', href: 'documents.html' },
        { label: 'Group Trip Documents' }
      ])}

      <div class="notice">Uploaded files are synced through Firebase Storage. Only share this page with trusted travellers.</div>

      <div class="docs-topbar">
        <div class="nav-group">
          <a class="pill primary" href="documents.html">Documents Home</a>
          <a class="pill secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
        </div>
      </div>

      <div id="group-page-content">
        ${groupState.map(renderGroupCategory).join('')}
      </div>

      <div class="warning" data-firebase-warning hidden></div>
    </div>
  `;

  return shell;
}

function renderGroupDocuments(container) {
  if (!container) return;
  container.innerHTML = groupState.map(renderGroupCategory).join('');
}

function renderGroupCategory(category) {
  const totalDocs = category.groups.reduce((count, group) => count + group.subgroups.reduce((subCount, subgroup) => {
    const docs = subgroup.docs.length ? subgroup.docs : group.templateDocs || [];
    return subCount + docs.length;
  }, 0), 0);
  return `
    <section class="section accordion is-open doc-section-clean doc-category" id="group-${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}" data-doc-total="${totalDocs}">
      <div class="doc-section-head doc-accordion-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(category.categoryTitle)}</strong>
            <span class="sub">${escapeHtml(category.description || 'Shared trip files')}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="arrow" aria-hidden="true">▼</span>
        </button>
      </div>
      <div class="accordion-body doc-accordion-body" id="${escapeHtml(category.categoryKey)}-body">
        ${category.groups.map((group) => renderGroupCard(category, group)).join('')}
      </div>
    </section>
  `;
}

function renderGroupCard(category, group) {
  const subgroupCount = group.subgroups.filter((item) => !item.fixed).length;
  const totalDocs = group.subgroups.reduce((count, subgroup) => {
    const docs = subgroup.docs.length ? subgroup.docs : group.templateDocs || [];
    return count + docs.length;
  }, 0);
  return `
    <article class="doc-accordion doc-parent-card" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-total="${totalDocs}">
      <div class="doc-accordion-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(group.groupKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(group.groupTitle)}</strong>
            <span class="sub">${escapeHtml(group.summary || category.categoryTitle)}</span>
          </span>
          <span class="doc-section-progress doc-group-progress">${subgroupCount} booking${subgroupCount === 1 ? '' : 's'} · ${totalDocs} docs</span>
          <span class="arrow" aria-hidden="true">▼</span>
        </button>
        <div class="group-actions">
          <button class="add-btn" type="button" data-add-subgroup="${escapeHtml(group.groupKey)}">${escapeHtml(group.addLabel || 'Add Booking')}</button>
        </div>
      </div>
      <div class="accordion-body doc-accordion-body" id="${escapeHtml(group.groupKey)}-body">
        ${group.subgroups.map((subgroup, index) => renderGroupSubgroup(category, group, subgroup, index)).join('')}
      </div>
    </article>
  `;
}

function renderGroupSubgroup(category, group, subgroup, index) {
  const openDefault = subgroup.fixed || index === 0;
  const docs = subgroup.docs.length ? subgroup.docs : clone(group.templateDocs || []);
  const totalDocs = docs.length;
  return `
    <section class="subgroup doc-accordion doc-parent-card ${openDefault ? 'is-open' : ''}" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-subgroup="${escapeHtml(subgroup.subgroupKey)}" data-doc-total="${totalDocs}" data-default-open-mobile="${openDefault ? 'true' : 'false'}">
      <div class="doc-accordion-head">
        <button class="toggle-btn doc-accordion-toggle" type="button" aria-expanded="${openDefault ? 'true' : 'false'}" aria-controls="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" data-subgroup-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(subgroup.subgroupLabel)}</strong>
            <span class="sub">${escapeHtml(subgroup.fixed ? 'Shared docs' : 'Booking group')}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="caret" aria-hidden="true">▼</span>
        </button>
        <div class="booking-actions">
          ${subgroup.fixed ? '' : `<button class="remove-btn" type="button" data-remove-subgroup="${escapeHtml(group.groupKey)}" data-subgroup-key="${escapeHtml(subgroup.subgroupKey)}">Remove</button>`}
        </div>
      </div>
      <div class="subgroup-body doc-accordion-body" id="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" ${openDefault ? '' : 'hidden'}>
        <div class="doc-grid doc-child-grid">
          ${docs.map((item) => renderDocCard({
            owner: 'group',
            category: category.categoryKey,
            key: item.key,
            title: item.title,
            note: item.note,
            tag: item.tag,
            tagClass: item.tagClass,
            group: group.groupKey,
            subgroup: subgroup.subgroupKey
          })).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderTravellerPage(travellerId) {
  const traveller = travellerData[travellerId] || travellerData['traveller-1'];
  const idx = ['traveller-1', 'traveller-2', 'traveller-3', 'traveller-4'].indexOf(travellerId);
  const prev = idx > 0 ? ['traveller-1', 'traveller-2', 'traveller-3', 'traveller-4'][idx - 1] : null;
  const next = idx < 3 ? ['traveller-1', 'traveller-2', 'traveller-3', 'traveller-4'][idx + 1] : null;
  const quickLinks = sectionQuickLinksForPage(travellerId)
    .map(([href, label]) => `<a class="quick-link" href="${href}">${escapeHtml(label)}</a>`)
    .join('');

  return `
    <div class="page" id="docs-top">
      ${heroChrome({
        title: `${traveller.label} · Traveller Documents`,
        subtitle: 'Passport, employment, financial proof, tickets, and IO support documents.',
        status: isFirebaseConfigured() ? 'Firebase Storage ready' : 'Firebase is not configured yet.',
        actions: `
          <a class="btn primary" href="documents.html">Documents Home</a>
          <a class="btn secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
          ${prev ? `<a class="btn secondary" href="${prev}-documents.html">Previous</a>` : ''}
          ${next ? `<a class="btn secondary" href="${next}-documents.html">Next</a>` : ''}
        `,
        quickLinks: quickLinks ? `<div class="quick-links">${quickLinks}</div>` : ''
      })}

      <div class="notice">Uploaded files are synced through Firebase Storage. Only share this page with trusted travellers.</div>

      <div class="docs-topbar">
        <div class="nav-group">
          <a class="pill primary" href="documents.html">Documents Home</a>
          <a class="pill secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
          ${prev ? `<a class="pill secondary" href="${prev}-documents.html">Previous Traveller</a>` : ''}
          ${next ? `<a class="pill secondary" href="${next}-documents.html">Next Traveller</a>` : ''}
        </div>
      </div>

      <div id="traveller-${escapeHtml(travellerId)}-content">
        ${traveller.categories.map((category) => renderTravellerCategory(travellerId, category)).join('')}
      </div>

      <div class="warning" data-firebase-warning hidden></div>
    </div>
  `;
}

function renderTravellerDocuments(container, travellerId) {
  if (!container) return;
  const traveller = travellerData[travellerId] || travellerData['traveller-1'];
  container.innerHTML = traveller.categories.map((category) => renderTravellerCategory(travellerId, category)).join('');
}

function renderTravellerCategory(travellerId, category) {
  const totalDocs = category.docs.length;
  const openDefault = true;
  return `
    <section class="section accordion is-open doc-section-clean doc-category" id="${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}" data-doc-total="${totalDocs}">
      <div class="doc-section-head doc-accordion-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="${openDefault ? 'true' : 'false'}" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(category.categoryTitle)}</strong>
            <span class="sub">${escapeHtml(category.description || 'Personal document checklist')}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="arrow" aria-hidden="true">▼</span>
        </button>
      </div>
      <div class="accordion-body doc-accordion-body" id="${escapeHtml(category.categoryKey)}-body" ${openDefault ? '' : 'hidden'}>
        <div class="doc-grid doc-child-grid">
          ${category.docs.map((item) => renderDocCard({
            owner: travellerId,
            travellerId,
            category: category.categoryKey,
            key: item.key,
            title: item.title,
            note: item.note,
            tag: item.tag,
            tagClass: item.tagClass
          })).join('')}
        </div>
      </div>
    </section>
  `;
}

function setSyncText(message) {
  document.querySelectorAll('[data-sync-status]').forEach((el) => {
    el.textContent = message;
  });
}

function setWarning(message) {
  document.querySelectorAll('[data-firebase-warning]').forEach((el) => {
    el.hidden = !message;
    el.textContent = message || '';
  });
}

function setUploadButtonsEnabled(enabled) {
  document.querySelectorAll('.doc-upload-btn').forEach((button) => {
    button.disabled = !enabled;
  });
}

let docHandlersBound = false;

function setCardStatus(card, text, state) {
  const badge = card.querySelector('.doc-status');
  if (!badge) return;
  badge.classList.remove('missing', 'uploading', 'uploaded', 'error', 'needed', 'is-uploading', 'is-uploaded', 'is-error');
  badge.classList.add(state);
  badge.textContent = text;
}

function setCardError(card, message) {
  const errorEl = card.querySelector('.doc-error');
  if (!errorEl) return;
  errorEl.hidden = !message;
  errorEl.textContent = message || '';
}

function setCardEmpty(card) {
  const fileName = card.querySelector('.doc-file-name');
  const downloadBtn = card.querySelector('.doc-download-btn');
  const progressWrap = card.querySelector('.doc-progress-wrap');
  const progressBar = card.querySelector('.doc-progress-bar');
  setCardStatus(card, 'Missing', 'missing');
  setCardError(card, '');
  if (fileName) fileName.textContent = 'No file uploaded yet.';
  if (downloadBtn) {
    downloadBtn.href = '#';
    downloadBtn.setAttribute('aria-disabled', 'true');
    downloadBtn.classList.add('disabled');
  }
  if (progressWrap) progressWrap.hidden = true;
  if (progressBar) progressBar.style.width = '0%';
}

function setCardUploaded(card, fileNameValue, url) {
  const fileName = card.querySelector('.doc-file-name');
  const downloadBtn = card.querySelector('.doc-download-btn');
  const progressWrap = card.querySelector('.doc-progress-wrap');
  const progressBar = card.querySelector('.doc-progress-bar');
  setCardStatus(card, 'Uploaded', 'uploaded');
  setCardError(card, '');
  if (fileName) fileName.textContent = fileNameValue;
  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.setAttribute('aria-disabled', 'false');
    downloadBtn.classList.remove('disabled');
  }
  if (progressWrap) progressWrap.hidden = true;
  if (progressBar) progressBar.style.width = '0%';
}

async function hydrateCards() {
  const cards = [...document.querySelectorAll('.doc-card')];
  await Promise.all(cards.map(async (card) => {
    try {
      const items = await loadDocumentFiles(card);
      if (!items.length) {
        setCardEmpty(card);
        return;
      }
      setCardUploaded(card, items[0].name, items[0].url);
    } catch (error) {
      setCardEmpty(card);
      setCardError(card, error?.message || 'Could not load saved files.');
    }
  }));
}

async function setupFirebaseState() {
  if (!isFirebaseConfigured()) {
    setSyncText('Firebase is not configured yet.');
    setWarning('Firebase is not configured yet.');
    setUploadButtonsEnabled(false);
    return;
  }

  try {
    await initFirebase();
    await signInGuest();
    setSyncText('Firebase Storage ready');
    setWarning('');
    setUploadButtonsEnabled(true);
  } catch (error) {
    setSyncText('Firebase sync unavailable');
    setWarning('Firebase sync unavailable. Check Auth and Storage rules.');
    setUploadButtonsEnabled(false);
  }
}

async function syncAllDocumentCards() {
  await hydrateCards();
  await syncRemarksForCards();
  updateDocumentSummaries();
}

function updateFirebaseStatus(message) {
  setSyncText(message);
}

function showDocWarning(message) {
  setWarning(message);
}

function disableUploadButtonsIfFirebaseUnavailable() {
  setUploadButtonsEnabled(false);
}

function initDocumentUploadHandlers() {
  bindAccordionToggles();
}

function initDocumentAccordions() {
  initPageEnhancements();
}

let remarksHandlersBound = false;

function initRemarksHandlers() {
  document.querySelectorAll('.doc-card').forEach((card) => {
    const input = card.querySelector('.doc-remarks-input');
    if (!input) return;
    if (input.value) {
      syncRemarksWrapperState(card);
      return;
    }
    const local = readLocalRemarks(card);
    if (local) {
      applyRemarksValue(card, local, { persistLocal: false });
    } else {
      syncRemarksWrapperState(card);
    }
  });

  if (remarksHandlersBound) return;
  remarksHandlersBound = true;

  document.addEventListener('input', (event) => {
    const input = event.target.closest('.doc-remarks-input');
    if (!input) return;
    const card = input.closest('.doc-card');
    if (!card) return;
    syncRemarksWrapperState(card);
    queueRemarksSave(card, input.value);
  });

  document.addEventListener('blur', (event) => {
    const input = event.target.closest('.doc-remarks-input');
    if (!input) return;
    const card = input.closest('.doc-card');
    if (!card) return;
    syncRemarksWrapperState(card);
    flushRemarksSave(card);
  }, true);
}

function updateDocumentSummaries() {
  document.querySelectorAll('[data-doc-summary]').forEach((summary) => {
    const scope = summary.closest('.doc-accordion, .doc-category, .subgroup');
    if (!scope) return;
    const cards = [...scope.querySelectorAll('.doc-card')];
    const uploaded = cards.filter((card) => card.querySelector('.doc-status')?.classList.contains('uploaded')).length;
    summary.textContent = `${uploaded} of ${cards.length} uploaded`;
  });
}

function bindAccordionToggles() {
  if (docHandlersBound) return;
  docHandlersBound = true;

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-accordion-toggle]');
    if (toggle) {
      const section = toggle.closest('.accordion');
      const body = section?.querySelector('.accordion-body');
      if (!section || !body) return;
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
      section.classList.toggle('is-open', open);
      return;
    }

    const subgroupToggle = event.target.closest('[data-subgroup-toggle]');
    if (subgroupToggle) {
      const subgroup = subgroupToggle.closest('.subgroup');
      const body = subgroup?.querySelector('.subgroup-body');
      if (!subgroup || !body) return;
      const open = subgroupToggle.getAttribute('aria-expanded') !== 'true';
      subgroupToggle.setAttribute('aria-expanded', String(open));
      subgroup.classList.toggle('is-open', open);
      body.hidden = !open;
      const label = subgroupToggle.querySelector('span:first-child');
      if (label) label.textContent = open ? 'Hide Details' : 'Show Details';
      return;
    }

    const addBtn = event.target.closest('[data-add-subgroup]');
    if (addBtn) {
      const groupKey = addBtn.dataset.addSubgroup;
      addGroupSubgroup(groupKey);
      return;
    }

    const removeBtn = event.target.closest('[data-remove-subgroup]');
    if (removeBtn) {
      removeGroupSubgroup(removeBtn.dataset.removeSubgroup, removeBtn.dataset.subgroupKey);
    }
  });

  document.addEventListener('change', async (event) => {
    const input = event.target.closest('.doc-file-input');
    if (!input) return;
    const card = input.closest('.doc-card');
    if (!card) return;
    const [file] = input.files || [];
    if (!file) return;

    setCardStatus(card, 'Uploading…', 'uploading');
    setCardError(card, '');
    const progressWrap = card.querySelector('.doc-progress-wrap');
    const progressBar = card.querySelector('.doc-progress-bar');
    if (progressWrap) progressWrap.hidden = false;
    if (progressBar) progressBar.style.width = '0%';

    try {
      const result = await uploadDocumentForCard(card, file, (pct) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
      });
      setCardUploaded(card, result.filename, result.url);
      updateDocumentSummaries();
    } catch (error) {
      setCardStatus(card, 'Error', 'error');
      setCardError(card, error?.message || 'Upload failed. Please try again.');
    } finally {
      input.value = '';
    }
  });

  document.addEventListener('click', (event) => {
    const uploadBtn = event.target.closest('.doc-upload-btn');
    if (!uploadBtn) return;
    const card = uploadBtn.closest('.doc-card');
    const input = card?.querySelector('.doc-file-input');
    if (input) input.click();
  });
}

function addGroupSubgroup(groupKey) {
  const group = groupState.flatMap((category) => category.groups).find((item) => item.groupKey === groupKey);
  if (!group) return;
  const openIndexes = group.subgroups.filter((item) => !item.fixed).length;
  const label = `Booking ${String.fromCharCode(65 + (openIndexes % 26))}`;
  const key = `${group.subgroupPrefix || 'booking'}-${String.fromCharCode(97 + (openIndexes % 26))}`;
  const insertAt = group.subgroups.findIndex((item) => item.fixed);
  const index = insertAt === -1 ? group.subgroups.length : insertAt;
  group.subgroups.splice(index, 0, {
    subgroupKey: key,
    subgroupLabel: label,
    docs: clone(group.templateDocs || [])
  });
  saveGroupState(groupState);
  rerenderPage();
}

function removeGroupSubgroup(groupKey, subgroupKey) {
  const group = groupState.flatMap((category) => category.groups).find((item) => item.groupKey === groupKey);
  if (!group) return;
  group.subgroups = group.subgroups.filter((item) => item.subgroupKey !== subgroupKey || item.fixed);
  saveGroupState(groupState);
  rerenderPage();
}

function renderGroupPageIntro() {
  const quickLinks = sectionQuickLinksForPage('group')
    .map(([href, label]) => `<a class="quick-link" href="${href}">${escapeHtml(label)}</a>`)
    .join('');

  return `
    <div class="page" id="docs-top">
      ${heroChrome({
        title: 'Group Trip Documents',
        subtitle: 'Shared transport, hotel, itinerary, budget, and emergency files.',
        status: isFirebaseConfigured() ? 'Firebase Storage ready' : 'Firebase is not configured yet.',
        actions: `
          <a class="btn primary" href="documents.html">Documents Home</a>
          <a class="btn secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
        `,
        quickLinks: quickLinks ? `<div class="quick-links">${quickLinks}</div>` : ''
      })}
      ${renderBreadcrumbs([
        { label: 'Documents Home', href: 'documents.html' },
        { label: 'Group Trip Documents' }
      ])}
      <div class="notice">Uploaded files are synced through Firebase Storage. Only share this page with trusted travellers.</div>
      <div class="docs-topbar">
        <div class="nav-group">
          <a class="pill primary" href="documents.html">Documents Home</a>
          <a class="pill secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
        </div>
      </div>
      <div id="group-page-content">
        ${groupState.map(renderGroupCategory).join('')}
      </div>
      <div class="warning" data-firebase-warning hidden></div>
    </div>
  `;
}

function renderTravellerPageIntro(travellerId) {
  const traveller = travellerData[travellerId] || travellerData['traveller-1'];
  const order = ['traveller-1', 'traveller-2', 'traveller-3', 'traveller-4'];
  const idx = order.indexOf(travellerId);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx < order.length - 1 ? order[idx + 1] : null;
  const quickLinks = sectionQuickLinksForPage(travellerId)
    .map(([href, label]) => `<a class="quick-link" href="${href}">${escapeHtml(label)}</a>`)
    .join('');

  return `
    <div class="page" id="docs-top">
      ${heroChrome({
        title: `${traveller.label} · Traveller Documents`,
        subtitle: 'Passport, employment, financial proof, tickets, and IO support documents.',
        status: isFirebaseConfigured() ? 'Firebase Storage ready' : 'Firebase is not configured yet.',
        actions: `
          <a class="btn primary" href="documents.html">Documents Home</a>
          <a class="btn secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
          ${prev ? `<a class="btn secondary" href="${prev}-documents.html">Previous</a>` : ''}
          ${next ? `<a class="btn secondary" href="${next}-documents.html">Next</a>` : ''}
        `,
        quickLinks: quickLinks ? `<div class="quick-links">${quickLinks}</div>` : ''
      })}
      ${renderBreadcrumbs([
        { label: 'Documents Home', href: 'documents.html' },
        { label: `${traveller.label} · Traveller Documents` }
      ])}
      <div class="notice">Uploaded files are synced through Firebase Storage. Only share this page with trusted travellers.</div>
      <div class="docs-topbar">
        <div class="nav-group">
          <a class="pill primary" href="documents.html">Documents Home</a>
          <a class="pill secondary" href="vietnam-sapa-itinerary.html">Back to Itinerary</a>
          ${prev ? `<a class="pill secondary" href="${prev}-documents.html">Previous Traveller</a>` : ''}
          ${next ? `<a class="pill secondary" href="${next}-documents.html">Next Traveller</a>` : ''}
        </div>
      </div>
      <div id="traveller-page-content">
        ${traveller.categories.map((category) => renderTravellerCategory(travellerId, category)).join('')}
      </div>
      <div class="warning" data-firebase-warning hidden></div>
    </div>
  `;
}

function rerenderPage() {
  const pageType = getPageType();
  if (pageType === 'group') {
    renderGroupDocuments(document.getElementById('groupDocumentsContainer'));
  } else if (pageType.startsWith('traveller-')) {
    const travellerId = document.body.dataset.travellerId || pageType;
    renderTravellerDocuments(document.getElementById('travellerDocumentsContainer'), travellerId);
  }
  initPageEnhancements();
  initRemarksHandlers();
  void bootstrapUploads();
}

function buildPageHTML() {
  const pageType = getPageType();
  if (pageType === 'hub') return renderHub();
  if (pageType === 'group') return renderGroupPageIntro();
  if (pageType.startsWith('traveller-')) return renderTravellerPageIntro(pageType);
  return renderHub();
}

function initPageEnhancements() {
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  document.querySelectorAll('.section.doc-section-clean, .section.accordion.doc-category, .doc-category').forEach((section, index) => {
    const body = section.querySelector('.accordion-body');
    const toggle = section.querySelector('[data-accordion-toggle]');
    if (!body || !toggle) return;
    const open = mobile ? index === 0 : true;
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    section.classList.toggle('is-open', open);
  });
  document.querySelectorAll('.subgroup').forEach((subgroup) => {
    const body = subgroup.querySelector('.subgroup-body');
    const toggle = subgroup.querySelector('[data-subgroup-toggle]');
    if (!body || !toggle) return;
    const open = mobile ? subgroup.dataset.defaultOpenMobile === 'true' || subgroup === document.querySelector('.subgroup') : true;
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    subgroup.classList.toggle('is-open', open);
    const label = toggle.querySelector('span:first-child');
    if (label) label.textContent = open ? 'Hide Details' : 'Show Details';
  });
  updateDocumentSummaries();
}

async function bootstrapUploads() {
  await setupFirebaseState();
  if (!isFirebaseConfigured()) return;
  await syncAllDocumentCards();
}

function initDocumentsPage() {
  const root = document.querySelector('#documents-root');
  if (!root) return;
  const pageType = getPageType();
  if (pageType === 'group') {
    renderGroupDocuments(document.getElementById('groupDocumentsContainer'));
  } else if (pageType.startsWith('traveller-')) {
    const travellerId = document.body.dataset.travellerId || pageType;
    renderTravellerDocuments(document.getElementById('travellerDocumentsContainer'), travellerId);
  }
  initDocumentAccordions();
  initDocumentUploadHandlers();
  initRemarksHandlers();
  startRemarksPolling();
  void bootstrapUploads();
}

document.addEventListener('DOMContentLoaded', initDocumentAccessGate);
