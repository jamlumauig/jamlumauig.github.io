import {
  initFirebase,
  signInGuest,
  isFirebaseConfigured,
  uploadDocumentForCard,
  loadDocumentFiles
} from './documents-firebase.js';

const GROUP_STATE_KEY = 'documents-group-layout-v1';

const doc = (key, title, note, tag = 'Required') => ({
  key,
  title,
  note,
  tag,
  tagClass: tag.toLowerCase() === 'optional' ? 'optional' : ''
});

const groupStateDefaults = [
  {
    categoryKey: 'transportation',
    categoryTitle: 'Transportation',
    groups: [
      {
        groupKey: 'manila-hanoi-flight',
        groupTitle: 'Manila → Hanoi Flight',
        summary: 'Flight tickets and baggage details',
        addLabel: 'Add Flight Booking',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('traveller-tickets', 'Traveller Tickets', 'Passenger tickets and boarding references.'),
          doc('booking-receipt', 'Booking Receipt', 'Airline or OTA receipt for the booking.'),
          doc('baggage-details', 'Baggage Details', 'Allowance, weight, and baggage notes.')
        ],
        subgroups: [
          { subgroupKey: 'booking-a', subgroupLabel: 'Booking A', docs: [] },
          { subgroupKey: 'booking-b', subgroupLabel: 'Booking B', docs: [] }
        ]
      },
      {
        groupKey: 'hanoi-sapa-bus',
        groupTitle: 'Hanoi → Sapa Bus',
        summary: 'Bus tickets and pickup details',
        addLabel: 'Add Bus Reservation',
        subgroupPrefix: 'Booking',
        templateDocs: [
          doc('traveller-tickets', 'Traveller Tickets', 'Tickets or QR codes for boarding.'),
          doc('booking-receipt', 'Booking Receipt', 'Reservation confirmation and receipt.'),
          doc('pickup-details', 'Pickup Details', 'Meeting point and boarding notes.')
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
          doc('booking-receipt', 'Booking Receipt', 'Return-leg booking confirmation.'),
          doc('baggage-details', 'Baggage Details', 'Sleeper seat, baggage, and pickup notes.')
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
        summary: 'Room bookings and shared check-in details',
        addLabel: 'Add Room',
        subgroupPrefix: 'Room',
        templateDocs: [
          doc('booking-confirmation', 'Room / Booking Confirmation', 'Upload booking confirmation or room reservation details.'),
          doc('payment-receipt', 'Payment Receipt', 'Deposit or full payment proof.'),
          doc('occupants-list', 'Occupants List', 'Names of guests assigned to the room.')
        ],
        subgroups: [
          { subgroupKey: 'room-a', subgroupLabel: 'Room A', docs: [] },
          { subgroupKey: 'room-b', subgroupLabel: 'Room B', docs: [] },
          {
            subgroupKey: 'additional-shared',
            subgroupLabel: 'Additional Shared Docs',
            fixed: true,
            docs: [
              doc('hotel-address-screenshot', 'Hotel Address Screenshot', 'Useful for rides and offline check-in.'),
              doc('checkin-details', 'Check-in Details', 'Times, policies, and arrival notes.')
            ]
          }
        ]
      },
      {
        groupKey: 'la-renta-hotel-spa',
        groupTitle: 'La Renta Hotel & Spa',
        summary: 'Room bookings and arrival notes',
        addLabel: 'Add Room',
        subgroupPrefix: 'Room',
        templateDocs: [
          doc('booking-confirmation', 'Room / Booking Confirmation', 'Upload booking confirmation or room reservation details.'),
          doc('payment-receipt', 'Payment Receipt', 'Deposit or full payment proof.'),
          doc('occupants-list', 'Occupants List', 'Names of guests assigned to the room.')
        ],
        subgroups: [
          { subgroupKey: 'room-a', subgroupLabel: 'Room A', docs: [] },
          {
            subgroupKey: 'additional-shared',
            subgroupLabel: 'Additional Shared Docs',
            fixed: true,
            docs: [
              doc('hotel-address-screenshot', 'Hotel Address Screenshot', 'Useful for rides and offline check-in.'),
              doc('checkin-details', 'Check-in Details', 'Times, policies, and arrival notes.')
            ]
          }
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
          doc('daily-schedule-copy', 'Daily Schedule Copy', 'A quick version for the whole group.'),
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
          doc('emergency-cash-plan', 'Emergency Cash Plan', 'Cash reserve and fallback plan.'),
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
    return parsed;
  } catch {
    return clone(groupStateDefaults);
  }
}

function saveGroupState(state) {
  try {
    localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; uploads still work through Firebase Storage.
  }
}

let groupState = loadGroupState();

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
      desc: 'Shared transport, hotel, itinerary, budget, and emergency files.',
      count: `${groupStateDefaults.length} categories`,
      open: 'Open Group Files'
    },
    ...Object.keys(travellerData).map((travellerId) => ({
      href: `${travellerId}-documents.html`,
      icon: '◐',
      title: travellerData[travellerId].label || travellerId.replace('-', ' '),
      desc: 'Passport, employment, financial proof, tickets, and IO support documents.',
      count: `${travellerData[travellerId].categories.length} categories`,
      open: `Open ${travellerData[travellerId].label || travellerId}`
    }))
  ];

  return `
    <div class="page compact" id="docs-top">
      <header class="hero compact">
        <div class="eyebrow">Traveller Documents</div>
        <h1>Traveller Documents</h1>
        <p>Group trip files and personal IO document checklists.</p>
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
            <div class="section-label">Choose a section</div>
            <h2 class="section-title">Documents Hub</h2>
          </div>
          <div class="section-subtitle">Open the section you need. Each page is kept focused and easier to use on mobile.</div>
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
  return `
    <article class="doc-card"
      data-doc-owner="${escapeHtml(owner)}"
      data-doc-category="${escapeHtml(category)}"
      data-doc-key="${escapeHtml(key)}"
      ${group ? `data-doc-group="${escapeHtml(group)}"` : ''}
      ${subgroup ? `data-doc-subgroup="${escapeHtml(subgroup)}"` : ''}
      ${travellerId ? `data-doc-traveller="${escapeHtml(travellerId)}"` : ''}>
      <div class="doc-card-head">
        <div class="doc-meta">
          <span class="doc-tag ${tagClass}">${escapeHtml(tag)}</span>
          <div class="doc-title">${escapeHtml(title)}</div>
        </div>
        <span class="doc-status needed">Needed</span>
      </div>
      <p class="doc-note doc-description">${escapeHtml(note)}</p>
      <div class="doc-file-name">No file uploaded yet.</div>
      <div class="doc-actions">
        <button class="doc-upload-btn" type="button">Upload</button>
        <a class="doc-download-btn" href="#" aria-disabled="true" target="_blank" rel="noopener">Download</a>
        <input class="doc-file-input" type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
      </div>
      <div class="doc-progress-wrap" hidden>
        <div class="doc-progress"><div class="doc-progress-bar"></div></div>
      </div>
      <div class="doc-progress-text">0%</div>
      <div class="doc-files">
        <div class="doc-files-title">Uploaded files</div>
        <div data-doc-files></div>
      </div>
      <div class="doc-error" hidden></div>
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
  return `
    <section class="section accordion is-open doc-category" id="group-${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}">
      <button class="accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
        <span>
          <strong>${escapeHtml(category.categoryTitle)}</strong>
          <span class="sub">Shared files for this category</span>
        </span>
        <span class="arrow" aria-hidden="true">▼</span>
      </button>
      <div class="accordion-body" id="${escapeHtml(category.categoryKey)}-body">
        ${category.groups.map((group) => renderGroupCard(category, group)).join('')}
      </div>
    </section>
  `;
}

function renderGroupCard(category, group) {
  const subgroupCount = group.subgroups.filter((item) => !item.fixed).length;
  return `
    <article class="group-card doc-parent-card" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}">
      <div class="group-card-head">
        <div>
          <h3 class="group-card-title">${escapeHtml(group.groupTitle)}</h3>
          <div class="group-card-subtitle">${escapeHtml(group.summary || category.categoryTitle)}</div>
          <div class="group-card-summary" data-group-summary>${subgroupCount} booking groups · Shared files</div>
        </div>
        <div class="group-actions">
          <button class="add-btn" type="button" data-add-subgroup="${escapeHtml(group.groupKey)}">${escapeHtml(group.addLabel || 'Add Booking')}</button>
        </div>
      </div>
      <div class="subgroup-list">
        ${group.subgroups.map((subgroup, index) => renderGroupSubgroup(category, group, subgroup, index)).join('')}
      </div>
    </article>
  `;
}

function renderGroupSubgroup(category, group, subgroup, index) {
  const openDefault = subgroup.fixed || index === 0;
  const docs = subgroup.docs.length ? subgroup.docs : clone(group.templateDocs || []);
  return `
    <section class="subgroup doc-parent-card ${openDefault ? 'is-open' : ''}" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-subgroup="${escapeHtml(subgroup.subgroupKey)}" data-default-open-mobile="${openDefault ? 'true' : 'false'}">
      <div class="subgroup-head">
        <div class="subgroup-meta">
          <div class="subgroup-label">${escapeHtml(subgroup.fixed ? 'Shared Docs' : group.subgroupPrefix || 'Booking')}</div>
          <div class="subgroup-name">${escapeHtml(subgroup.subgroupLabel)}</div>
          <div class="subgroup-note">${escapeHtml(subgroup.fixed ? 'Reference files for the whole reservation group' : 'Each document card syncs independently')}</div>
          <div class="subgroup-summary">${docs.length} document types</div>
        </div>
        <div class="booking-actions">
          <button class="toggle-btn" type="button" aria-expanded="${openDefault ? 'true' : 'false'}" aria-controls="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" data-subgroup-toggle>
            <span>Show Details</span>
            <span class="caret" aria-hidden="true">▼</span>
          </button>
          ${subgroup.fixed ? '' : `<button class="remove-btn" type="button" data-remove-subgroup="${escapeHtml(group.groupKey)}" data-subgroup-key="${escapeHtml(subgroup.subgroupKey)}">Remove</button>`}
        </div>
      </div>
      <div class="subgroup-body" id="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" ${openDefault ? '' : 'hidden'}>
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
  const openDefault = true;
  return `
    <section class="section accordion is-open doc-category" id="${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}">
      <button class="accordion-toggle" type="button" aria-expanded="${openDefault ? 'true' : 'false'}" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
        <span>
          <strong>${escapeHtml(category.categoryTitle)}</strong>
          <span class="sub">${escapeHtml(category.docs.length)} document types</span>
        </span>
        <span class="arrow" aria-hidden="true">▼</span>
      </button>
      <div class="accordion-body" id="${escapeHtml(category.categoryKey)}-body" ${openDefault ? '' : 'hidden'}>
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
  badge.classList.remove('needed', 'uploading', 'uploaded', 'error', 'is-uploading', 'is-uploaded', 'is-error');
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
  const progressText = card.querySelector('.doc-progress-text');
  const files = card.querySelector('[data-doc-files]');
  setCardStatus(card, 'Needed', 'needed');
  setCardError(card, '');
  if (fileName) fileName.textContent = 'No file uploaded yet.';
  if (downloadBtn) {
    downloadBtn.href = '#';
    downloadBtn.setAttribute('aria-disabled', 'true');
  }
  if (progressWrap) progressWrap.hidden = true;
  if (progressText) progressText.textContent = '0%';
  if (files) files.innerHTML = '<div class="doc-empty">No files uploaded yet.</div>';
}

function setCardUploaded(card, fileNameValue, url) {
  const fileName = card.querySelector('.doc-file-name');
  const downloadBtn = card.querySelector('.doc-download-btn');
  const progressWrap = card.querySelector('.doc-progress-wrap');
  const progressText = card.querySelector('.doc-progress-text');
  setCardStatus(card, 'Uploaded', 'uploaded');
  setCardError(card, '');
  if (fileName) fileName.textContent = fileNameValue;
  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.setAttribute('aria-disabled', 'false');
  }
  if (progressWrap) progressWrap.hidden = false;
  if (progressText) progressText.textContent = '100%';
}

function renderFileList(card, items) {
  const files = card.querySelector('[data-doc-files]');
  if (!files) return;
  if (!items.length) {
    files.innerHTML = '<div class="doc-empty">No files uploaded yet.</div>';
    return;
  }
  files.innerHTML = items.map((item) => `
    <a class="doc-file-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
      <span>${escapeHtml(item.name)}</span>
      <span>Download</span>
    </a>
  `).join('');
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
      renderFileList(card, items);
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
    const progressText = card.querySelector('.doc-progress-text');
    if (progressWrap) progressWrap.hidden = false;
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';

    try {
      const result = await uploadDocumentForCard(card, file, (pct) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) progressText.textContent = `${pct}%`;
      });
      setCardUploaded(card, result.filename, result.url);
      const items = await loadDocumentFiles(card);
      renderFileList(card, items);
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

function renderTravellerCategory(travellerId, category) {
  return `
    <section class="section accordion is-open" id="${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}">
      <button class="accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
        <span>
          <strong>${escapeHtml(category.categoryTitle)}</strong>
          <span class="sub">${escapeHtml(category.docs.length)} document types</span>
        </span>
        <span class="arrow" aria-hidden="true">▼</span>
      </button>
      <div class="accordion-body" id="${escapeHtml(category.categoryKey)}-body">
        <div class="doc-grid">
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

function renderGroupCategory(category) {
  return `
    <section class="section accordion is-open" id="group-${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}">
      <button class="accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
        <span>
          <strong>${escapeHtml(category.categoryTitle)}</strong>
          <span class="sub">Shared files for this category</span>
        </span>
        <span class="arrow" aria-hidden="true">▼</span>
      </button>
      <div class="accordion-body" id="${escapeHtml(category.categoryKey)}-body">
        ${category.groups.map((group) => renderGroupCard(category, group)).join('')}
      </div>
    </section>
  `;
}

function renderGroupCard(category, group) {
  const subgroupCount = group.subgroups.filter((item) => !item.fixed).length;
  return `
    <article class="group-card" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}">
      <div class="group-card-head">
        <div>
          <h3 class="group-card-title">${escapeHtml(group.groupTitle)}</h3>
          <div class="group-card-subtitle">${escapeHtml(group.summary || category.categoryTitle)}</div>
          <div class="group-card-summary">${subgroupCount} booking groups · Shared files</div>
        </div>
        <div class="group-actions">
          <button class="add-btn" type="button" data-add-subgroup="${escapeHtml(group.groupKey)}">${escapeHtml(group.addLabel || 'Add Booking')}</button>
        </div>
      </div>
      <div class="subgroup-list">
        ${group.subgroups.map((subgroup) => renderGroupSubgroup(category, group, subgroup)).join('')}
      </div>
    </article>
  `;
}

function renderGroupSubgroup(category, group, subgroup) {
  const openDefault = subgroup.fixed || subgroup.subgroupKey === 'booking-a';
  const docs = subgroup.docs.length ? subgroup.docs : clone(group.templateDocs || []);
  return `
    <section class="subgroup ${openDefault ? 'is-open' : ''}" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-subgroup="${escapeHtml(subgroup.subgroupKey)}" data-default-open-mobile="${openDefault ? 'true' : 'false'}">
      <div class="subgroup-head">
        <div class="subgroup-meta">
          <div class="subgroup-label">${escapeHtml(subgroup.fixed ? 'Shared Docs' : group.subgroupPrefix || 'Booking')}</div>
          <div class="subgroup-name">${escapeHtml(subgroup.subgroupLabel)}</div>
          <div class="subgroup-note">${escapeHtml(subgroup.fixed ? 'Reference files for the whole reservation group' : 'Each document card syncs independently')}</div>
          <div class="subgroup-summary">${docs.length} document types</div>
        </div>
        <div class="booking-actions">
          <button class="toggle-btn" type="button" aria-expanded="${openDefault ? 'true' : 'false'}" aria-controls="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" data-subgroup-toggle>
            <span>Show Details</span>
            <span class="caret" aria-hidden="true">▼</span>
          </button>
          ${subgroup.fixed ? '' : `<button class="remove-btn" type="button" data-remove-subgroup="${escapeHtml(group.groupKey)}" data-subgroup-key="${escapeHtml(subgroup.subgroupKey)}">Remove</button>`}
        </div>
      </div>
      <div class="subgroup-body" id="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" ${openDefault ? '' : 'hidden'}>
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

function rerenderPage() {
  const pageType = getPageType();
  if (pageType === 'group') {
    renderGroupDocuments(document.getElementById('groupDocumentsContainer'));
  } else if (pageType.startsWith('traveller-')) {
    const travellerId = document.body.dataset.travellerId || pageType;
    renderTravellerDocuments(document.getElementById('travellerDocumentsContainer'), travellerId);
  }
  initPageEnhancements();
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
  document.querySelectorAll('.accordion').forEach((section) => {
    const body = section.querySelector('.accordion-body');
    const toggle = section.querySelector('[data-accordion-toggle]');
    if (!body || !toggle) return;
    const open = window.matchMedia('(min-width: 768px)').matches;
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    section.classList.toggle('is-open', open);
  });
  document.querySelectorAll('.subgroup').forEach((subgroup) => {
    const body = subgroup.querySelector('.subgroup-body');
    const toggle = subgroup.querySelector('[data-subgroup-toggle]');
    if (!body || !toggle) return;
    const open = window.matchMedia('(min-width: 768px)').matches || subgroup.dataset.defaultOpenMobile === 'true';
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    subgroup.classList.toggle('is-open', open);
    const label = toggle.querySelector('span:first-child');
    if (label) label.textContent = open ? 'Hide Details' : 'Show Details';
  });
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
  void bootstrapUploads();
}

document.addEventListener('DOMContentLoaded', initDocumentsPage);
