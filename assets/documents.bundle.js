var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// assets/js/documents-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((value) => typeof value === "string" && !value.includes("PASTE_"));
}
function waitForUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
  });
}
async function initFirebase() {
  if (!isFirebaseConfigured()) return { configured: false, app: null, auth: null, storage: null };
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!app) app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);
    return { configured: true, app, auth, storage };
  })();
  return initPromise;
}
async function signInGuest() {
  await initFirebase();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  await signInAnonymously(auth);
  return waitForUser();
}
function sanitizeFileName(filename) {
  return (filename || "file").normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^[_ .-]+|[_ .-]+$/g, "") || "file";
}
function validateFile(file) {
  var _a;
  const ext = (((_a = file == null ? void 0 : file.name) == null ? void 0 : _a.split(".").pop()) || "").toLowerCase();
  if (!file) return "Please choose a file.";
  if (file.size > MAX_FILE_SIZE) return "File too large. Maximum size is 10MB.";
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.has(file.type) && file.type !== "") {
    return "Unsupported file type. Use PDF, JPG, PNG, DOC, or DOCX.";
  }
  return "";
}
function getDocFolderPath(card) {
  if (card.dataset.docOwner === "group") {
    const category2 = card.dataset.docCategory || "group";
    const group = card.dataset.docGroup || "booking";
    const subgroup = card.dataset.docSubgroup || "main";
    const key2 = card.dataset.docKey || "document";
    return `travel-documents/group/${category2}/${group}/${subgroup}/${key2}`;
  }
  const travellerId = card.dataset.docOwner || "traveller-1";
  const category = card.dataset.docCategory || "identity";
  const key = card.dataset.docKey || "document";
  return `travel-documents/travellers/${travellerId}/${category}/${key}`;
}
function getDocFolderPaths(card) {
  var _a;
  const paths = [getDocFolderPath(card)];
  if (((_a = card == null ? void 0 : card.dataset) == null ? void 0 : _a.docOwner) === "group" && card.dataset.docGroupAlias) {
    const category = card.dataset.docCategory || "group";
    const group = card.dataset.docGroupAlias || "booking";
    const subgroup = card.dataset.docSubgroup || "main";
    const key = card.dataset.docKey || "document";
    paths.push(`travel-documents/group/${category}/${group}/${subgroup}/${key}`);
  }
  return [...new Set(paths)];
}
function buildStoragePath(card, filename) {
  const safeName = sanitizeFileName(filename);
  return `${getDocFolderPath(card)}/${safeName}`;
}
async function uploadDocumentForCard(card, file, onProgress = () => {
}) {
  const validation = validateFile(file);
  if (validation) throw new Error(validation);
  await initFirebase();
  if (!storage) throw new Error("Firebase is not configured yet.");
  const fileRef = ref(storage, buildStoragePath(card, file.name));
  const task = uploadBytesResumable(fileRef, file);
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
        onProgress(pct);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ filename: sanitizeFileName(file.name), url, path: task.snapshot.ref.fullPath });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}
async function loadDocumentFiles(card) {
  await initFirebase();
  if (!storage) return [];
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const path of getDocFolderPaths(card)) {
    const folderRef = ref(storage, path);
    let result;
    try {
      result = await listAll(folderRef);
    } catch {
      continue;
    }
    for (const itemRef of result.items) {
      if (seen.has(itemRef.name)) continue;
      seen.add(itemRef.name);
      const [meta, url] = await Promise.all([
        getMetadata(itemRef).catch(() => ({})),
        getDownloadURL(itemRef)
      ]);
      items.push({
        name: itemRef.name,
        url,
        timeCreated: meta.timeCreated || ""
      });
    }
  }
  return items.sort((a, b) => new Date(b.timeCreated || 0) - new Date(a.timeCreated || 0));
}
async function loadRemarksRecord(docId) {
  void docId;
  return null;
}
async function saveRemarksRecord(docId, payload) {
  void docId;
  void payload;
}
var firebaseConfig, MAX_FILE_SIZE, ALLOWED_EXT, ALLOWED_MIME, app, auth, storage, initPromise;
var init_documents_firebase = __esm({
  "assets/js/documents-firebase.js"() {
    firebaseConfig = {
      apiKey: "AIzaSyAfNoo_6wluw763G-MYm2a2FD1KfHj3UhU",
      authDomain: "lakbayph-236bf.firebaseapp.com",
      projectId: "lakbayph-236bf",
      storageBucket: "lakbayph-236bf.firebasestorage.app",
      databaseURL: "https://lakbayph-236bf-default-rtdb.firebaseio.com",
      messagingSenderId: "815265006781",
      appId: "1:815265006781:web:b5349e2287086edb1763d4",
      measurementId: "G-VKWM3VDD3F"
    };
    MAX_FILE_SIZE = 10 * 1024 * 1024;
    ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];
    ALLOWED_MIME = /* @__PURE__ */ new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]);
    app = null;
    auth = null;
    storage = null;
    initPromise = null;
  }
});

// assets/js/documents-ui.js
var require_documents_ui = __commonJS({
  "assets/js/documents-ui.js"() {
    init_documents_firebase();
    var DOCUMENT_ACCESS_PASSWORD = "lakbay2026";
    var DOCUMENT_ACCESS_KEY = "vietnamDocsUnlocked";
    var GROUP_STATE_KEY = "documents-group-layout-v3";
    var GROUP_STATE_LEGACY_KEYS = [
      "documents-group-layout-v2",
      "documents-group-layout-v1"
    ];
    var doc = (key, title, note, tag = "Required") => ({
      key,
      title,
      note,
      tag,
      tagClass: tag.toLowerCase() === "optional" ? "optional" : ""
    });
    var REMOVED_DOC_KEYS = /* @__PURE__ */ new Set([
      "pickup-details",
      "occupants-list",
      "hotel-address-screenshot",
      "checkin-details",
      "daily-schedule-copy",
      "emergency-cash-plan",
      "seat-assignment",
      "payment-receipt"
    ]);
    var REMARKS_LOCAL_PREFIX = "documents-remarks-v1";
    var REMARKS_DEBOUNCE_MS = 600;
    var REMARKS_STATUS_HIDE_MS = 2e3;
    var remarksSaveTimers = /* @__PURE__ */ new WeakMap();
    var remarksStatusTimers = /* @__PURE__ */ new WeakMap();
    var remarksSyncWarningShown = false;
    var remarksRefreshTimer = null;
    var documentsBootstrapped = false;
    var groupStateDefaults = [
      {
        categoryKey: "transportation",
        categoryTitle: "Transportation",
        groups: [
          {
            groupKey: "tickets",
            groupTitle: "Roundtrip Flight Tickets",
            summary: "Roundtrip flight tickets and booking references.",
            addLabel: "Add Ticket Set",
            subgroupPrefix: "Booking",
            templateDocs: [
              doc("traveller-tickets", "Traveller Tickets", "Passenger tickets and boarding references."),
            ],
            subgroups: [
              { subgroupKey: "booking-a", subgroupLabel: "Booking A", docs: [] },
              { subgroupKey: "booking-b", subgroupLabel: "Booking B", docs: [] }
            ]
          },
          {
            groupKey: "hanoi-sapa-bus",
            groupTitle: "Bus Tickets",
            summary: "Bus tickets and boarding references",
            addLabel: "Add Bus Reservation",
            subgroupPrefix: "Booking",
            templateDocs: [
              doc("traveller-tickets", "Traveller Tickets", "Tickets or QR codes for boarding.")
            ],
            subgroups: [
              { subgroupKey: "booking-a", subgroupLabel: "Booking A", docs: [] }
            ]
          },
          {
            groupKey: "sapa-hanoi-overnight-bus",
            groupTitle: "Overnight Bus",
            summary: "Return trip and sleeper notes",
            addLabel: "Add Return Booking",
            subgroupPrefix: "Booking",
            templateDocs: [
              doc("return-ticket", "Return Ticket", "Return boarding pass or QR code.")
            ],
            subgroups: [
              { subgroupKey: "booking-a", subgroupLabel: "Booking A", docs: [] }
            ]
          }
        ]
      },
      {
        categoryKey: "hotels",
        categoryTitle: "Hotels",
        groups: [
          {
            groupKey: "sapa-valley-hotel",
            groupTitle: "Sapa Valley Hotel",
            summary: "Room bookings and confirmations",
            addLabel: "Add Room",
            subgroupPrefix: "Room",
            templateDocs: [
              doc("booking-confirmation", "Room / Booking Confirmation", "Upload booking confirmation or room reservation details.")
            ],
            subgroups: [
              { subgroupKey: "room-a", subgroupLabel: "Room A", docs: [] },
              { subgroupKey: "room-b", subgroupLabel: "Room B", docs: [] }
            ]
          },
          {
            groupKey: "la-renta-hotel-spa",
            groupTitle: "La Renta Hotel & Spa",
            summary: "Room bookings and confirmations",
            addLabel: "Add Room",
            subgroupPrefix: "Room",
            templateDocs: [
              doc("booking-confirmation", "Room / Booking Confirmation", "Upload booking confirmation or room reservation details.")
            ],
            subgroups: [
              { subgroupKey: "room-a", subgroupLabel: "Room A", docs: [] }
            ]
          }
        ]
      },
      {
        categoryKey: "itinerary",
        categoryTitle: "Itinerary / Activities",
        groups: [
          {
            groupKey: "full-vietnam-itinerary",
            groupTitle: "Full Vietnam Itinerary",
            summary: "Trip copy, tickets, and activity confirmations",
            addLabel: "Add Copy",
            subgroupPrefix: "Copy",
            templateDocs: [
              doc("full-itinerary", "Full Vietnam Itinerary", "Complete day-by-day plan in one file."),
              doc("activity-confirmations", "Activity Confirmations", "Tickets and confirmations for booked activities."),
              doc("fansipan-ticket", "Fansipan Ticket / Confirmation", "If booked for the cable car or summit."),
              doc("puppet-theater-ticket", "Puppet Theater Ticket", "Use if you have a purchased show ticket."),
              doc("mega-grand-world-details", "Mega Grand World Details", "Directions or reservations if needed.")
            ],
            subgroups: [
              { subgroupKey: "copy-a", subgroupLabel: "Copy A", docs: [] },
              { subgroupKey: "copy-b", subgroupLabel: "Copy B", docs: [] }
            ]
          }
        ]
      },
      {
        categoryKey: "budget-money",
        categoryTitle: "Budget / Money",
        groups: [
          {
            groupKey: "shared-budget",
            groupTitle: "Shared Budget",
            summary: "Trip budget, exchange notes, and payment screenshots",
            addLabel: "Add Budget Set",
            subgroupPrefix: "Set",
            templateDocs: [
              doc("shared-budget-summary", "Shared Budget Summary", "Who paid what and planned spending."),
              doc("currency-exchange-notes", "Currency Exchange Notes", "Rates, counters, and exchange reminders."),
              doc("payment-screenshots", "Payment Screenshots", "Helpful proof if anyone needs to verify payment.")
            ],
            subgroups: [
              { subgroupKey: "set-a", subgroupLabel: "Set A", docs: [] }
            ]
          }
        ]
      },
      {
        categoryKey: "emergency-travel-info",
        categoryTitle: "Emergency / Travel Info",
        groups: [
          {
            groupKey: "trip-support",
            groupTitle: "Trip Support",
            summary: "Emergency contacts, insurance, and SIM/WiFi notes",
            addLabel: "Add Support Pack",
            subgroupPrefix: "Pack",
            templateDocs: [
              doc("emergency-contacts", "Emergency Contacts", "All trip contacts in one place."),
              doc("travel-insurance-copy", "Travel Insurance Copy", "If the group has a shared policy."),
              doc("embassy-contact-notes", "Embassy / Contact Notes", "Support contacts and address notes."),
              doc("sim-wifi-details", "SIM / WiFi Details", "Shared data plan or portable WiFi information.")
            ],
            subgroups: [
              { subgroupKey: "pack-a", subgroupLabel: "Pack A", docs: [] }
            ]
          }
        ]
      }
    ];
    var travellerData = {
      "traveller-1": {
        label: "Jam",
        categories: [
          {
            categoryKey: "identity",
            categoryTitle: "Identity",
            docs: [
              doc("passport", "Passport", "Primary travel document."),
              doc("government-id", "Valid Government ID", "Bring a backup ID.", "Recommended"),
              doc("boarding-pass", "Boarding Pass", "Print or save a screenshot.")
            ]
          },
          {
            categoryKey: "employment-source-of-funds",
            categoryTitle: "Employment / Source of Funds",
            docs: [
              doc("company-id", "Company ID", "Helpful for immigration checks.", "Recommended"),
              doc("coe", "Certificate of Employment", "If available from your employer.", "Recommended"),
              doc("approved-leave-form", "Approved Leave Form", "Optional but useful proof.", "Optional"),
              doc("payslip", "Payslip", "Bring recent copies if available.", "Optional"),
              doc("business-permit", "Business Permit", "If self-employed.", "Optional"),
              doc("school-id", "School ID / Enrollment Proof", "If student.", "Optional")
            ]
          },
          {
            categoryKey: "financial-proof",
            categoryTitle: "Financial Proof",
            docs: [
              doc("bank-certificate", "Bank Certificate", "Shows account standing.", "Recommended"),
              doc("bank-statement", "Bank Statement", "Recent statement if available.", "Recommended"),
              doc("card-copy", "Credit / Debit Card Copy", "Hide sensitive numbers if preferred.", "Optional"),
              doc("proof-of-funds", "Proof of Funds", "Any extra proof that helps.", "Recommended")
            ]
          },
          {
            categoryKey: "trip-proof",
            categoryTitle: "Trip Proof",
            docs: [
              doc("personal-itinerary", "Personal Travel Itinerary", "Personal copy of the trip plan."),
              doc("hotel-booking-copy", "Hotel Booking Copy", "Your personal booking reference."),
              doc("return-ticket-copy", "Return Ticket Copy", "Return flight confirmation."),
              doc("travel-insurance-copy", "Travel Insurance Copy", "Recommended for immigration and safety.", "Recommended")
            ]
          },
          {
            categoryKey: "other-supporting-documents",
            categoryTitle: "Other Supporting Documents",
            docs: [
              doc("emergency-contact-card", "Emergency Contact Card", "Emergency names and phone numbers.", "Recommended"),
              doc("authorization-letter", "Authorization Letter", "If someone else is helping with travel documents.", "Optional"),
              doc("other-documents", "Other Supporting Document", "Any extra papers that may help.", "Optional")
            ]
          }
        ]
      },
      "traveller-2": {
        label: "Maye",
        categories: []
      },
      "traveller-3": {
        label: "Kyra",
        categories: []
      },
      "traveller-4": {
        label: "Bon",
        categories: []
      }
    };
    ["traveller-2", "traveller-3", "traveller-4"].forEach((travellerId) => {
      travellerData[travellerId].categories = JSON.parse(JSON.stringify(travellerData["traveller-1"].categories));
    });
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function escapeHtml(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }
    function getPageType() {
      var _a;
      return ((_a = document.body) == null ? void 0 : _a.dataset.docPage) || "hub";
    }
    function loadGroupState() {
      try {
        const raw = localStorage.getItem(GROUP_STATE_KEY) || GROUP_STATE_LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        if (!raw) return clone(groupStateDefaults);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return clone(groupStateDefaults);
        const migrated = sanitizeGroupState(migrateGroupState(parsed));
        saveGroupState(migrated);
        cleanupLegacyGroupState();
        return migrated;
      } catch {
        return clone(groupStateDefaults);
      }
    }
    function cleanupLegacyGroupState() {
      try {
        for (const key of GROUP_STATE_LEGACY_KEYS) {
          localStorage.removeItem(key);
        }
      } catch {
      }
    }
    function normalizeTransportationGroup(group) {
      const label = String(group.groupTitle || "").toLowerCase();
      const key = String(group.groupKey || "").toLowerCase();
      const isReturnFlight = key === "hanoi-manila-return-flight" || key === "return-flight-ticket" || /return flight/.test(label);
      if (isReturnFlight) return null;
      const isTickets = key === "manila-hanoi-flight" || key === "tickets" || /manila\s*→\s*hanoi flight/.test(label) || /^tickets?$/.test(label);
      if (!isTickets) return {
        ...group,
        templateDocs: sanitizeDocs(group.templateDocs),
        subgroups: (group.subgroups || []).map((subgroup) => ({
          ...subgroup,
          docs: sanitizeDocs(subgroup.docs)
        }))
      };
      return {
        ...group,
        groupKey: "tickets",
        groupTitle: "Tickets",
        summary: "Roundtrip flight tickets and booking references.",
        addLabel: "Add Ticket Set",
        templateDocs: [
          doc("traveller-tickets", "Traveller Tickets", "Passenger tickets and boarding references."),
        ],
        subgroups: (group.subgroups || []).map((subgroup) => ({
          ...subgroup,
          docs: sanitizeDocs(subgroup.docs)
        }))
      };
    }
    function migrateGroupState(state) {
      var _a;
      const cloned = clone(state);
      for (const category of cloned) {
        if (category.categoryKey !== "transportation") continue;
        const nextGroups = [];
        const ticketGroupIndex = /* @__PURE__ */ new Map();
        for (const group of category.groups || []) {
          const normalized = normalizeTransportationGroup(group);
          if (!normalized) {
            continue;
          }
          if (normalized.groupKey === "tickets") {
            const existingIndex = ticketGroupIndex.get("tickets");
            if (typeof existingIndex === "number") {
              const existing = nextGroups[existingIndex];
              const mergedSubgroups = [...existing.subgroups || []];
              for (const subgroup of normalized.subgroups || []) {
                const subgroupIndex = mergedSubgroups.findIndex((item) => item.subgroupKey === subgroup.subgroupKey);
                if (subgroupIndex === -1) {
                  mergedSubgroups.push(subgroup);
                } else {
                  const current = mergedSubgroups[subgroupIndex];
                  mergedSubgroups[subgroupIndex] = {
                    ...current,
                    ...subgroup,
                    docs: current.fixed ? current.docs : ((_a = current.docs) == null ? void 0 : _a.length) ? current.docs : subgroup.docs
                  };
                }
              }
              nextGroups[existingIndex] = {
                ...existing,
                ...normalized,
                subgroups: mergedSubgroups
              };
            } else {
              ticketGroupIndex.set("tickets", nextGroups.length);
              nextGroups.push(normalized);
            }
            continue;
          }
          nextGroups.push({
            ...normalized,
            templateDocs: sanitizeDocs(normalized.templateDocs),
            subgroups: (normalized.subgroups || []).map((subgroup) => ({
              ...subgroup,
              docs: sanitizeDocs(subgroup.docs)
            }))
          });
        }
        category.groups = nextGroups;
      }
      return cloned;
    }
    function sanitizeDocs(docs) {
      return (docs || []).filter((item) => item && !REMOVED_DOC_KEYS.has(item.key));
    }
    function sanitizeGroupState(state) {
      const cloned = clone(state);
      for (const category of cloned) {
        for (const group of category.groups || []) {
          group.templateDocs = sanitizeDocs(group.templateDocs);
          group.subgroups = (group.subgroups || []).map((subgroup) => ({
            ...subgroup,
            docs: sanitizeDocs(subgroup.docs)
          })).filter((subgroup) => !subgroup.fixed || subgroup.docs && subgroup.docs.length);
        }
      }
      return cloned;
    }
    function saveGroupState(state) {
      try {
        localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(state));
      } catch {
      }
    }
    var groupState = loadGroupState();
    function buildRemarksKey(card) {
      if (!card) return "";
      const owner = card.dataset.docOwner || "traveller-1";
      const category = card.dataset.docCategory || "identity";
      const docKey = card.dataset.docKey || "document";
      if (owner === "group") {
        const group = card.dataset.docGroup || "group";
        const subgroup = card.dataset.docSubgroup || "main";
        return `group_${category}_${group}_${subgroup}_${docKey}`;
      }
      return `${owner}_${category}_${docKey}`;
    }
    function buildRemarksTextareaId(card) {
      return `remarks-${buildRemarksKey(card).replace(/[^A-Za-z0-9_-]+/g, "-")}`;
    }
    function getRemarksLocalKey(card) {
      return `${REMARKS_LOCAL_PREFIX}:${buildRemarksKey(card)}`;
    }
    function readLocalRemarks(card) {
      try {
        return localStorage.getItem(getRemarksLocalKey(card)) || "";
      } catch {
        return "";
      }
    }
    function writeLocalRemarks(card, text) {
      try {
        localStorage.setItem(getRemarksLocalKey(card), text || "");
      } catch {
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
    function setRemarksStatus(card, message, kind = "saved") {
      const status = card.querySelector(".doc-remarks-status");
      if (!status) return;
      clearTimeout(remarksStatusTimers.get(card));
      if (!message) {
        status.hidden = true;
        status.textContent = "";
        status.className = "doc-remarks-status";
        status.removeAttribute("data-state");
        return;
      }
      status.hidden = false;
      status.textContent = message;
      status.className = `doc-remarks-status ${kind}`;
      status.dataset.state = kind;
      if (kind === "saved") {
        remarksStatusTimers.set(card, setTimeout(() => {
          status.hidden = true;
          status.textContent = "";
          status.className = "doc-remarks-status";
          status.removeAttribute("data-state");
        }, REMARKS_STATUS_HIDE_MS));
      }
    }
    function syncRemarksWrapperState(card) {
      const wrap = card.querySelector(".doc-remarks-wrap");
      const input = card.querySelector(".doc-remarks-input");
      const copy = card.querySelector(".doc-remarks-copy");
      if (!wrap || !input) return;
      const value = input.value.trim();
      wrap.dataset.hasRemarks = value ? "true" : "false";
      if (copy) copy.textContent = value;
    }
    function applyRemarksValue(card, text, { persistLocal = true } = {}) {
      const input = card.querySelector(".doc-remarks-input");
      if (!input) return;
      input.value = text || "";
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
        if (record && typeof record.remarks === "string") {
          if (!record.remarks && localValue) {
            return;
          }
          const input = card.querySelector(".doc-remarks-input");
          if (document.activeElement === input && input.value && input.value !== record.remarks) {
            return;
          }
          applyRemarksValue(card, record.remarks, { persistLocal: true });
        }
      } catch (error) {
        if (!localValue) {
          applyRemarksValue(card, "", { persistLocal: false });
        }
        warnRemarksSync("Remarks sync unavailable.", error);
      }
    }
    async function saveRemarksForCard(card, text) {
      const key = buildRemarksKey(card);
      writeLocalRemarks(card, text);
      try {
        await saveRemarksRecord(key, {
          remarks: text,
          owner: card.dataset.docOwner || "",
          category: card.dataset.docCategory || "",
          group: card.dataset.docGroup || "",
          subgroup: card.dataset.docSubgroup || "",
          docKey: card.dataset.docKey || ""
        });
      } catch (error) {
        warnRemarksSync("Remarks sync unavailable.", error);
      }
    }
    function queueRemarksSave(card, text) {
      clearTimeout(remarksSaveTimers.get(card));
      setRemarksStatus(card, "Saving\u2026", "saving");
      remarksSaveTimers.set(card, setTimeout(async () => {
        await saveRemarksForCard(card, text);
        setRemarksStatus(card, "Saved", "saved");
      }, REMARKS_DEBOUNCE_MS));
    }
    function flushRemarksSave(card) {
      const input = card.querySelector(".doc-remarks-input");
      if (!input) return;
      clearTimeout(remarksSaveTimers.get(card));
      void (async () => {
        setRemarksStatus(card, "Saving\u2026", "saving");
        await saveRemarksForCard(card, input.value);
        setRemarksStatus(card, "Saved", "saved");
      })();
    }
    async function syncRemarksForCards(scope = document) {
      const cards = [...scope.querySelectorAll(".doc-card")];
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
      remarksRefreshTimer = window.setInterval(tick, 15e3);
      document.addEventListener("visibilitychange", tick);
    }
    function docsQuickNavLinksForPage(pageType) {
      if (pageType === "hub") {
        return [
          ["#docs-top", "Top"],
          ["group-documents.html", "Group Trip Documents"],
          ["traveller-1-documents.html", "Traveller 1 \xB7 Jam"],
          ["traveller-2-documents.html", "Traveller 2 \xB7 Maye"],
          ["traveller-3-documents.html", "Traveller 3 \xB7 Kyra"],
          ["traveller-4-documents.html", "Traveller 4 \xB7 Bon"],
          ["io-guide.html", "IO Q&A Guide"],
          ["vietnam-sapa-itinerary.html", "Back to Itinerary"]
        ];
      }
      if (pageType === "group") {
        return [
          ["#docs-top", "Top"],
          ["documents.html", "Documents Home"],
          ["#group-transportation", "Transportation"],
          ["#group-hotels", "Hotels"],
          ["#group-itinerary", "Itinerary / Activities"],
          ["#group-budget", "Budget"],
          ["#group-emergency", "Emergency"],
          ["io-guide.html", "IO Q&A Guide"],
          ["vietnam-sapa-itinerary.html", "Back to Itinerary"]
        ];
      }
      if (pageType.startsWith("traveller-")) {
        return [
          ["#docs-top", "Top"],
          ["documents.html", "Documents Home"],
          ["#identity", "Identity"],
          ["#employment-source-of-funds", "Employment"],
          ["#financial-proof", "Financial"],
          ["#trip-proof", "Trip Proof"],
          ["#other-supporting-documents", "Other"],
          ["io-guide.html", "IO Q&A Guide"],
          ["vietnam-sapa-itinerary.html", "Back to Itinerary"]
        ];
      }
      return [];
    }
    function renderDocsQuickNav(pageType) {
      const links = docsQuickNavLinksForPage(pageType).map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("");
      if (!links) return "";
      return `
    <nav class="docs-quick-nav no-print" aria-label="Documents quick navigation">
      <button class="docs-nav-toggle" type="button" aria-expanded="false" aria-controls="docsQuickNavPanel">
        <span class="docs-hamburger" aria-hidden="true"></span>
        <span class="sr-only">Open documents menu</span>
      </button>
      <div class="docs-nav-backdrop" data-docs-menu-close aria-hidden="true"></div>
      <div id="docsQuickNavPanel" class="docs-nav-panel" aria-hidden="true">
        <div class="docs-nav-head">
          <strong>Documents Menu</strong>
          <button class="docs-nav-close" type="button" data-docs-menu-close aria-label="Close menu">\xD7</button>
        </div>
        <div class="docs-nav-links">
          ${links}
        </div>
      </div>
    </nav>
  `;
    }
    function ensureDocsQuickNav() {
      const root = document.querySelector("#documents-root");
      if (!root || root.querySelector(".docs-quick-nav")) return;
      root.insertAdjacentHTML("afterbegin", renderDocsQuickNav(getPageType()));
    }
    function initDocsQuickNav() {
      const nav = document.querySelector(".docs-quick-nav");
      if (!nav) return;
      const toggle = nav.querySelector(".docs-nav-toggle");
      const panel = nav.querySelector(".docs-nav-panel");
      const backdrop = nav.querySelector(".docs-nav-backdrop");
      const closeTargets = nav.querySelectorAll("[data-docs-menu-close]");
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      function openMenu() {
        toggle == null ? void 0 : toggle.setAttribute("aria-expanded", "true");
        panel == null ? void 0 : panel.classList.add("is-open");
        panel == null ? void 0 : panel.setAttribute("aria-hidden", "false");
        backdrop == null ? void 0 : backdrop.classList.add("is-open");
        backdrop == null ? void 0 : backdrop.setAttribute("aria-hidden", "false");
        if (isMobile) {
          document.body.classList.add("docs-menu-open");
        }
      }
      function closeMenu() {
        toggle == null ? void 0 : toggle.setAttribute("aria-expanded", "false");
        panel == null ? void 0 : panel.classList.remove("is-open");
        panel == null ? void 0 : panel.setAttribute("aria-hidden", "true");
        backdrop == null ? void 0 : backdrop.classList.remove("is-open");
        backdrop == null ? void 0 : backdrop.setAttribute("aria-hidden", "true");
        document.body.classList.remove("docs-menu-open");
      }
      toggle == null ? void 0 : toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = toggle.getAttribute("aria-expanded") === "true";
        if (open) closeMenu();
        else openMenu();
      });
      closeTargets.forEach((button) => {
        button.addEventListener("click", closeMenu);
      });
      nav.querySelectorAll(".docs-nav-panel a").forEach((link) => {
        link.addEventListener("click", (event) => {
          const href = link.getAttribute("href") || "";
          if (href.startsWith("#")) {
            event.preventDefault();
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
          closeMenu();
        });
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });
      document.addEventListener("click", (event) => {
        if (!(panel == null ? void 0 : panel.classList.contains("is-open"))) return;
        if (nav.contains(event.target)) return;
        closeMenu();
      });
    }
    function isDocumentsUnlocked() {
      try {
        return sessionStorage.getItem(DOCUMENT_ACCESS_KEY) === "true";
      } catch {
        return false;
      }
    }
    function setDocumentsAccessState(unlocked) {
      const gate = document.getElementById("documentAccessGate");
      const protectedContent = document.getElementById("protectedDocumentsContent");
      if (gate) {
        gate.hidden = unlocked;
        gate.classList.toggle("is-hidden", unlocked);
      }
      if (protectedContent) {
        protectedContent.hidden = !unlocked;
        protectedContent.classList.toggle("is-visible", unlocked);
      }
    }
    function showDocumentAccessError(message) {
      const error = document.getElementById("documentAccessError");
      if (!error) return;
      error.textContent = message || "Incorrect password. Please try again.";
      error.hidden = false;
      const success = document.getElementById("documentAccessSuccess");
      if (success) {
        success.hidden = true;
        success.textContent = "";
      }
    }
    function hideDocumentAccessError() {
      const error = document.getElementById("documentAccessError");
      if (!error) return;
      error.hidden = true;
      error.textContent = "";
    }
    function showDocumentAccessSuccess(message) {
      const success = document.getElementById("documentAccessSuccess");
      if (!success) return;
      success.textContent = message || "Unlocked. Loading documents...";
      success.hidden = false;
      const error = document.getElementById("documentAccessError");
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
    }
    function bootstrapDocumentsAfterUnlock() {
      if (documentsBootstrapped) return;
      documentsBootstrapped = true;
      initDocumentsPage();
    }
    function unlockDocuments() {
      try {
        sessionStorage.setItem(DOCUMENT_ACCESS_KEY, "true");
      } catch {
      }
      showDocumentAccessSuccess("Unlocked. Loading documents...");
      setDocumentsAccessState(true);
      hideDocumentAccessError();
      bootstrapDocumentsAfterUnlock();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function lockDocuments() {
      try {
        sessionStorage.removeItem(DOCUMENT_ACCESS_KEY);
      } catch {
      }
      documentsBootstrapped = false;
      setDocumentsAccessState(false);
      hideDocumentAccessError();
      const success = document.getElementById("documentAccessSuccess");
      if (success) {
        success.hidden = true;
        success.textContent = "";
      }
      const passwordInput = document.getElementById("documentAccessPassword");
      if (passwordInput) passwordInput.value = "";
    }
    function initDocumentAccessGate() {
      const gate = document.getElementById("documentAccessGate");
      const form = document.getElementById("documentAccessForm");
      const lockBtn = document.getElementById("lockDocumentsBtn");
      const passwordInput = document.getElementById("documentAccessPassword");
      const unlockBtn = document.getElementById("documentAccessUnlockBtn");
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
        const value = ((passwordInput == null ? void 0 : passwordInput.value) || "").trim();
        if (!value) {
          showDocumentAccessError("Enter the shared password.");
          passwordInput == null ? void 0 : passwordInput.focus();
          return;
        }
        if (value === DOCUMENT_ACCESS_PASSWORD) {
          unlockDocuments();
        } else {
          showDocumentAccessError("Incorrect password. Please try again.");
          passwordInput == null ? void 0 : passwordInput.focus();
        }
      };
      if (form && !form.dataset.bound) {
        form.dataset.bound = "true";
        form.noValidate = true;
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          attemptUnlock();
        });
      }
      if (unlockBtn && !unlockBtn.dataset.bound) {
        unlockBtn.dataset.bound = "true";
        unlockBtn.addEventListener("click", (event) => {
          event.preventDefault();
          attemptUnlock();
        });
      }
      if (passwordInput && !passwordInput.dataset.bound) {
        passwordInput.dataset.bound = "true";
        passwordInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            attemptUnlock();
          }
        });
      }
      if (lockBtn && !lockBtn.dataset.bound) {
        lockBtn.dataset.bound = "true";
        lockBtn.addEventListener("click", lockDocuments);
      }
    }
    function renderDocCard({ owner, category, key, title, note, tag = "Required", tagClass = "", group = "", subgroup = "", travellerId = "", groupAlias = "" }) {
      const remarksId = buildRemarksTextareaId({
        dataset: { docOwner: owner, docCategory: category, docKey: key, docGroup: group, docSubgroup: subgroup }
      });
      return `
    <article class="doc-row doc-card"
      data-doc-owner="${escapeHtml(owner)}"
      data-doc-category="${escapeHtml(category)}"
      data-doc-key="${escapeHtml(key)}"
      ${group ? `data-doc-group="${escapeHtml(group)}"` : ""}
      ${groupAlias ? `data-doc-group-alias="${escapeHtml(groupAlias)}"` : ""}
      ${subgroup ? `data-doc-subgroup="${escapeHtml(subgroup)}"` : ""}
      ${travellerId ? `data-doc-traveller="${escapeHtml(travellerId)}"` : ""}>
      <input class="doc-file-input" type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
      <div class="doc-row-content">
        <div class="doc-row-main">
          <div class="doc-row-title-line">
            <h4>${escapeHtml(title)}</h4>
            <div class="doc-row-badges">
              <span class="doc-required-pill ${tagClass}">${escapeHtml(tag)}</span>
              <span class="doc-status missing">Missing</span>
            </div>
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
        <aside class="doc-row-actions">
          <button class="doc-upload-btn" type="button">Upload</button>
          <a class="doc-download-btn disabled" href="#" aria-disabled="true" target="_blank" rel="noopener">Download</a>
        </aside>
      </div>
    </article>
  `;
    }
    function renderGroupDocuments(container) {
      if (!container) return;
      container.innerHTML = groupState.map(renderGroupCategory).join("");
    }
    function renderGroupCategory(category) {
      const totalDocs = category.groups.reduce((count, group) => count + group.subgroups.reduce((subCount, subgroup) => {
        const docs = subgroup.docs.length ? subgroup.docs : group.templateDocs || [];
        return subCount + docs.length;
      }, 0), 0);
      const bookingGridClass = ["transportation", "hotels"].includes(category.categoryKey) ? "doc-booking-grid is-wide" : "doc-booking-grid is-standard";
      return `
    <section class="section accordion is-open doc-section-clean doc-category" id="group-${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}" data-doc-total="${totalDocs}">
      <div class="doc-section-head doc-accordion-head doc-category-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(category.categoryTitle)}</strong>
            <span class="sub">${escapeHtml(category.description || "Shared trip files")}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="arrow" aria-hidden="true">\u25BC</span>
        </button>
      </div>
      <div class="accordion-body doc-accordion-body doc-group-category-body ${bookingGridClass}" id="${escapeHtml(category.categoryKey)}-body">
        ${category.groups.map((group) => renderGroupCard(category, group)).join("")}
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
    <article class="doc-accordion doc-parent-card doc-group-card doc-booking-card" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-total="${totalDocs}">
      <div class="doc-accordion-head doc-booking-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="true" aria-controls="${escapeHtml(group.groupKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(group.groupTitle)}</strong>
            <span class="sub">${escapeHtml(group.summary || category.categoryTitle)}</span>
          </span>
          <span class="doc-section-progress doc-group-progress">${subgroupCount} booking${subgroupCount === 1 ? "" : "s"} \xB7 ${totalDocs} docs</span>
          <span class="arrow" aria-hidden="true">\u25BC</span>
        </button>
        <div class="group-actions">
          <button class="add-btn" type="button" data-add-subgroup="${escapeHtml(group.groupKey)}">${escapeHtml(group.addLabel || "Add Booking")}</button>
        </div>
      </div>
      <div class="accordion-body doc-accordion-body" id="${escapeHtml(group.groupKey)}-body">
        ${group.subgroups.map((subgroup, index) => renderGroupSubgroup(category, group, subgroup, index)).join("")}
      </div>
    </article>
  `;
    }
    function renderGroupSubgroup(category, group, subgroup, index) {
      const openDefault = subgroup.fixed || index === 0;
      const docs = subgroup.docs.length ? subgroup.docs : clone(group.templateDocs || []);
      const totalDocs = docs.length;
      const childGridClass = ["transportation", "hotels"].includes(category.categoryKey) ? "doc-booking-grid is-wide" : "doc-booking-grid is-standard";
      const groupAlias = group.groupKey === "tickets" ? "manila-hanoi-flight" : "";
      return `
    <section class="subgroup doc-accordion doc-parent-card ${openDefault ? "is-open" : ""}" data-doc-category="${escapeHtml(category.categoryKey)}" data-doc-group="${escapeHtml(group.groupKey)}" data-doc-subgroup="${escapeHtml(subgroup.subgroupKey)}" data-doc-total="${totalDocs}" data-default-open-mobile="${openDefault ? "true" : "false"}">
        <div class="doc-accordion-head doc-booking-head">
        <button class="toggle-btn doc-accordion-toggle" type="button" aria-expanded="${openDefault ? "true" : "false"}" aria-controls="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" data-subgroup-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(subgroup.subgroupLabel)}</strong>
            <span class="sub">${escapeHtml(subgroup.fixed ? "Shared docs" : "Booking group")}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="caret" aria-hidden="true">\u25BC</span>
        </button>
        <div class="booking-actions">
          ${subgroup.fixed ? "" : `<button class="remove-btn" type="button" data-remove-subgroup="${escapeHtml(group.groupKey)}" data-subgroup-key="${escapeHtml(subgroup.subgroupKey)}">Remove</button>`}
        </div>
      </div>
      <div class="subgroup-body doc-accordion-body" id="${escapeHtml(group.groupKey)}-${escapeHtml(subgroup.subgroupKey)}-body" ${openDefault ? "" : "hidden"}>
        <div class="doc-grid doc-child-grid ${childGridClass}">
          ${docs.map((item) => renderDocCard({
        owner: "group",
        category: category.categoryKey,
        key: item.key,
        title: item.title,
        note: item.note,
        tag: item.tag,
        tagClass: item.tagClass,
        group: group.groupKey,
        subgroup: subgroup.subgroupKey,
        groupAlias
      })).join("")}
        </div>
      </div>
    </section>
  `;
    }
    function renderTravellerDocuments(container, travellerId) {
      if (!container) return;
      const traveller = travellerData[travellerId] || travellerData["traveller-1"];
      container.innerHTML = traveller.categories.map((category) => renderTravellerCategory(travellerId, category)).join("");
    }
    function renderTravellerCategory(travellerId, category) {
      const totalDocs = category.docs.length;
      const openDefault = true;
      return `
    <section class="section accordion is-open doc-section-clean doc-category" id="${escapeHtml(category.categoryKey)}" data-category="${escapeHtml(category.categoryKey)}" data-doc-total="${totalDocs}">
      <div class="doc-section-head doc-accordion-head">
        <button class="accordion-toggle doc-accordion-toggle" type="button" aria-expanded="${openDefault ? "true" : "false"}" aria-controls="${escapeHtml(category.categoryKey)}-body" data-accordion-toggle>
          <span>
            <strong class="doc-section-title">${escapeHtml(category.categoryTitle)}</strong>
            <span class="sub">${escapeHtml(category.description || "Personal document checklist")}</span>
          </span>
          <span class="doc-section-progress" data-doc-summary>0 of ${totalDocs} uploaded</span>
          <span class="arrow" aria-hidden="true">\u25BC</span>
        </button>
      </div>
      <div class="accordion-body doc-accordion-body" id="${escapeHtml(category.categoryKey)}-body" ${openDefault ? "" : "hidden"}>
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
      })).join("")}
        </div>
      </div>
    </section>
  `;
    }
    function setSyncText(message) {
      document.querySelectorAll("[data-sync-status]").forEach((el) => {
        el.textContent = message;
      });
    }
    function setWarning(message) {
      document.querySelectorAll("[data-firebase-warning]").forEach((el) => {
        el.hidden = !message;
        el.textContent = message || "";
      });
    }
    function setUploadButtonsEnabled(enabled) {
      document.querySelectorAll(".doc-upload-btn").forEach((button) => {
        button.disabled = !enabled;
      });
    }
    var docHandlersBound = false;
    function setCardStatus(card, text, state) {
      const badge = card.querySelector(".doc-status");
      if (!badge) return;
      badge.classList.remove("missing", "uploading", "uploaded", "error", "needed", "is-uploading", "is-uploaded", "is-error");
      badge.classList.add(state);
      badge.textContent = text;
    }
    function setCardError(card, message) {
      const errorEl = card.querySelector(".doc-error");
      if (!errorEl) return;
      errorEl.hidden = !message;
      errorEl.textContent = message || "";
    }
    function setCardEmpty(card) {
      const fileName = card.querySelector(".doc-file-name");
      const downloadBtn = card.querySelector(".doc-download-btn");
      const progressWrap = card.querySelector(".doc-progress-wrap");
      const progressBar = card.querySelector(".doc-progress-bar");
      setCardStatus(card, "Missing", "missing");
      setCardError(card, "");
      if (fileName) fileName.textContent = "No file uploaded yet.";
      if (downloadBtn) {
        downloadBtn.href = "#";
        downloadBtn.setAttribute("aria-disabled", "true");
        downloadBtn.classList.add("disabled");
      }
      if (progressWrap) progressWrap.hidden = true;
      if (progressBar) progressBar.style.width = "0%";
    }
    function setCardUploaded(card, fileNameValue, url) {
      const fileName = card.querySelector(".doc-file-name");
      const downloadBtn = card.querySelector(".doc-download-btn");
      const progressWrap = card.querySelector(".doc-progress-wrap");
      const progressBar = card.querySelector(".doc-progress-bar");
      setCardStatus(card, "Uploaded", "uploaded");
      setCardError(card, "");
      if (fileName) fileName.textContent = fileNameValue;
      if (downloadBtn) {
        downloadBtn.href = url;
        downloadBtn.setAttribute("aria-disabled", "false");
        downloadBtn.classList.remove("disabled");
      }
      if (progressWrap) progressWrap.hidden = true;
      if (progressBar) progressBar.style.width = "0%";
    }
    async function hydrateCards() {
      const cards = [...document.querySelectorAll(".doc-card")];
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
          setCardError(card, (error == null ? void 0 : error.message) || "Could not load saved files.");
        }
      }));
    }
    async function setupFirebaseState() {
      if (!isFirebaseConfigured()) {
        setSyncText("Firebase is not configured yet.");
        setWarning("Firebase is not configured yet.");
        setUploadButtonsEnabled(false);
        return;
      }
      try {
        await initFirebase();
        await signInGuest();
        setSyncText("Firebase Storage ready");
        setWarning("");
        setUploadButtonsEnabled(true);
      } catch (error) {
        setSyncText("Firebase sync unavailable");
        setWarning("Firebase sync unavailable. Check Auth and Storage rules.");
        setUploadButtonsEnabled(false);
      }
    }
    async function syncAllDocumentCards() {
      await hydrateCards();
      await syncRemarksForCards();
      updateDocumentSummaries();
    }
    function initDocumentUploadHandlers() {
      bindAccordionToggles();
    }
    function initDocumentAccordions() {
      initPageEnhancements();
    }
    var remarksHandlersBound = false;
    function initRemarksHandlers() {
      document.querySelectorAll(".doc-card").forEach((card) => {
        const input = card.querySelector(".doc-remarks-input");
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
      document.addEventListener("input", (event) => {
        const input = event.target.closest(".doc-remarks-input");
        if (!input) return;
        const card = input.closest(".doc-card");
        if (!card) return;
        syncRemarksWrapperState(card);
        queueRemarksSave(card, input.value);
      });
      document.addEventListener("blur", (event) => {
        const input = event.target.closest(".doc-remarks-input");
        if (!input) return;
        const card = input.closest(".doc-card");
        if (!card) return;
        syncRemarksWrapperState(card);
        flushRemarksSave(card);
      }, true);
    }
    function updateDocumentSummaries() {
      document.querySelectorAll("[data-doc-summary]").forEach((summary) => {
        const scope = summary.closest(".doc-accordion, .doc-category, .subgroup");
        if (!scope) return;
        const cards = [...scope.querySelectorAll(".doc-card")];
        const uploaded = cards.filter((card) => {
          var _a;
          return (_a = card.querySelector(".doc-status")) == null ? void 0 : _a.classList.contains("uploaded");
        }).length;
        summary.textContent = `${uploaded} of ${cards.length} uploaded`;
      });
    }
    function bindAccordionToggles() {
      if (docHandlersBound) return;
      docHandlersBound = true;
      document.addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-accordion-toggle]");
        if (toggle) {
          const section = toggle.closest(".accordion");
          const body = section == null ? void 0 : section.querySelector(".accordion-body");
          if (!section || !body) return;
          const open = toggle.getAttribute("aria-expanded") !== "true";
          toggle.setAttribute("aria-expanded", String(open));
          body.hidden = !open;
          section.classList.toggle("is-open", open);
          return;
        }
        const subgroupToggle = event.target.closest("[data-subgroup-toggle]");
        if (subgroupToggle) {
          const subgroup = subgroupToggle.closest(".subgroup");
          const body = subgroup == null ? void 0 : subgroup.querySelector(".subgroup-body");
          if (!subgroup || !body) return;
          const open = subgroupToggle.getAttribute("aria-expanded") !== "true";
          subgroupToggle.setAttribute("aria-expanded", String(open));
          subgroup.classList.toggle("is-open", open);
          body.hidden = !open;
          const label = subgroupToggle.querySelector("span:first-child");
          if (label) label.textContent = open ? "Hide Details" : "Show Details";
          return;
        }
        const addBtn = event.target.closest("[data-add-subgroup]");
        if (addBtn) {
          const groupKey = addBtn.dataset.addSubgroup;
          addGroupSubgroup(groupKey);
          return;
        }
        const removeBtn = event.target.closest("[data-remove-subgroup]");
        if (removeBtn) {
          removeGroupSubgroup(removeBtn.dataset.removeSubgroup, removeBtn.dataset.subgroupKey);
        }
      });
      document.addEventListener("change", async (event) => {
        const input = event.target.closest(".doc-file-input");
        if (!input) return;
        const card = input.closest(".doc-card");
        if (!card) return;
        const [file] = input.files || [];
        if (!file) return;
        setCardStatus(card, "Uploading\u2026", "uploading");
        setCardError(card, "");
        const progressWrap = card.querySelector(".doc-progress-wrap");
        const progressBar = card.querySelector(".doc-progress-bar");
        if (progressWrap) progressWrap.hidden = false;
        if (progressBar) progressBar.style.width = "0%";
        try {
          const result = await uploadDocumentForCard(card, file, (pct) => {
            if (progressBar) progressBar.style.width = `${pct}%`;
          });
          setCardUploaded(card, result.filename, result.url);
          updateDocumentSummaries();
        } catch (error) {
          setCardStatus(card, "Error", "error");
          setCardError(card, (error == null ? void 0 : error.message) || "Upload failed. Please try again.");
        } finally {
          input.value = "";
        }
      });
      document.addEventListener("click", (event) => {
        const uploadBtn = event.target.closest(".doc-upload-btn");
        if (!uploadBtn) return;
        const card = uploadBtn.closest(".doc-card");
        const input = card == null ? void 0 : card.querySelector(".doc-file-input");
        if (input) input.click();
      });
    }
    function addGroupSubgroup(groupKey) {
      const group = groupState.flatMap((category) => category.groups).find((item) => item.groupKey === groupKey);
      if (!group) return;
      const openIndexes = group.subgroups.filter((item) => !item.fixed).length;
      const label = `Booking ${String.fromCharCode(65 + openIndexes % 26)}`;
      const key = `${group.subgroupPrefix || "booking"}-${String.fromCharCode(97 + openIndexes % 26)}`;
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
    function rerenderPage() {
      const pageType = getPageType();
      if (pageType === "group") {
        renderGroupDocuments(document.getElementById("groupDocumentsContainer"));
      } else if (pageType.startsWith("traveller-")) {
        const travellerId = document.body.dataset.travellerId || pageType;
        renderTravellerDocuments(document.getElementById("travellerDocumentsContainer"), travellerId);
      }
      initPageEnhancements();
      initRemarksHandlers();
      void bootstrapUploads();
    }
    function initPageEnhancements() {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      document.querySelectorAll(".section.doc-section-clean, .section.accordion.doc-category, .doc-category").forEach((section, index) => {
        const body = section.querySelector(".accordion-body");
        const toggle = section.querySelector("[data-accordion-toggle]");
        if (!body || !toggle) return;
        const open = mobile ? index === 0 : true;
        toggle.setAttribute("aria-expanded", String(open));
        body.hidden = !open;
        section.classList.toggle("is-open", open);
      });
      document.querySelectorAll(".subgroup").forEach((subgroup) => {
        const body = subgroup.querySelector(".subgroup-body");
        const toggle = subgroup.querySelector("[data-subgroup-toggle]");
        if (!body || !toggle) return;
        const open = mobile ? subgroup.dataset.defaultOpenMobile === "true" || subgroup === document.querySelector(".subgroup") : true;
        toggle.setAttribute("aria-expanded", String(open));
        body.hidden = !open;
        subgroup.classList.toggle("is-open", open);
        const label = toggle.querySelector("span:first-child");
        if (label) label.textContent = open ? "Hide Details" : "Show Details";
      });
      updateDocumentSummaries();
    }
    async function bootstrapUploads() {
      await setupFirebaseState();
      if (!isFirebaseConfigured()) return;
      await syncAllDocumentCards();
    }
    function initDocumentsPage() {
      const root = document.querySelector("#documents-root");
      if (!root) return;
      ensureDocsQuickNav();
      const pageType = getPageType();
      if (pageType === "group") {
        renderGroupDocuments(document.getElementById("groupDocumentsContainer"));
      } else if (pageType.startsWith("traveller-")) {
        const travellerId = document.body.dataset.travellerId || pageType;
        renderTravellerDocuments(document.getElementById("travellerDocumentsContainer"), travellerId);
      }
      initDocumentAccordions();
      initDocumentUploadHandlers();
      initRemarksHandlers();
      startRemarksPolling();
      initDocsQuickNav();
      void bootstrapUploads();
    }
    document.addEventListener("DOMContentLoaded", initDocumentAccessGate);
  }
});
export default require_documents_ui();
