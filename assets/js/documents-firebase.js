import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAfNoo_6wluw763G-MYm2a2FD1KfHj3UhU",
  authDomain: "lakbayph-236bf.firebaseapp.com",
  projectId: "lakbayph-236bf",
  storageBucket: "lakbayph-236bf.firebasestorage.app",
  messagingSenderId: "815265006781",
  appId: "1:815265006781:web:b5349e2287086edb1763d4",
  measurementId: "G-VKWM3VDD3F"
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
export const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

let app = null;
let auth = null;
let storage = null;
let initPromise = null;

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && !value.includes('PASTE_'));
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

export async function initFirebase() {
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

export async function signInGuest() {
  await initFirebase();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  await signInAnonymously(auth);
  return waitForUser();
}

export function sanitizeFileName(filename) {
  return (filename || 'file')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_ .-]+|[_ .-]+$/g, '') || 'file';
}

export function validateFile(file) {
  const ext = (file?.name?.split('.').pop() || '').toLowerCase();
  if (!file) return 'Please choose a file.';
  if (file.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 10MB.';
  if (!ALLOWED_EXT.includes(ext) || (!ALLOWED_MIME.has(file.type) && file.type !== '')) {
    return 'Unsupported file type. Use PDF, JPG, PNG, DOC, or DOCX.';
  }
  return '';
}

export function getDocFolderPath(card) {
  if (card.dataset.docOwner === 'group') {
    const category = card.dataset.docCategory || 'group';
    const group = card.dataset.docGroup || 'booking';
    const subgroup = card.dataset.docSubgroup || 'main';
    const key = card.dataset.docKey || 'document';
    return `travel-documents/group/${category}/${group}/${subgroup}/${key}`;
  }
  const travellerId = card.dataset.docOwner || 'traveller-1';
  const category = card.dataset.docCategory || 'identity';
  const key = card.dataset.docKey || 'document';
  return `travel-documents/travellers/${travellerId}/${category}/${key}`;
}

export function buildStoragePath(card, filename) {
  const safeName = sanitizeFileName(filename);
  return `${getDocFolderPath(card)}/${safeName}`;
}

export async function uploadDocumentForCard(card, file, onProgress = () => {}) {
  const validation = validateFile(file);
  if (validation) throw new Error(validation);
  await initFirebase();
  if (!storage) throw new Error('Firebase is not configured yet.');

  const fileRef = ref(storage, buildStoragePath(card, file.name));
  const task = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    task.on('state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
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

export async function loadDocumentFiles(card) {
  await initFirebase();
  if (!storage) return [];
  const folderRef = ref(storage, getDocFolderPath(card));
  const result = await listAll(folderRef);
  const items = await Promise.all(result.items.map(async (itemRef) => {
    const [meta, url] = await Promise.all([
      getMetadata(itemRef).catch(() => ({})),
      getDownloadURL(itemRef)
    ]);
    return {
      name: itemRef.name,
      url,
      timeCreated: meta.timeCreated || ''
    };
  }));
  return items.sort((a, b) => new Date(b.timeCreated || 0) - new Date(a.timeCreated || 0));
}
