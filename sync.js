/* =========================================================
   Sincronización automática entre dispositivos (Firebase)
   - Cada registro (movimiento, tarjeta, cliente…) se guarda como un documento.
   - Si dos dispositivos cambian lo mismo, gana el cambio más reciente.
   - Sin internet, los cambios se guardan y se suben al reconectar.
   ========================================================= */
const cfg = window.FIREBASE_CONFIG;
const App = window.App;
const BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';

let fb = null, db = null, auth = null, user = null, unsub = null;
let flushing = false, flushAgain = false, loading = false;

function status(s, extra = {}) {
  App.setSyncStatus({ status: s, email: user ? user.email : null, message: '', ...extra });
}

async function load() {
  if (!cfg) { status('off'); return; }
  if (loading || fb) return;
  loading = true;
  status('loading');
  try {
    const [a, b, c] = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-firestore.js')
    ]);
    fb = { ...a, ...b, ...c };
  } catch (e) {
    loading = false;
    status('offline', { message: 'Sin conexión: la sincronización se activará cuando haya internet.' });
    window.addEventListener('online', load, { once: true });
    return;
  }
  const app = fb.initializeApp(cfg);
  auth = fb.getAuth(app);
  try {
    db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
  } catch (e) {
    db = fb.getFirestore(app);
  }
  fb.onAuthStateChanged(auth, (u) => {
    user = u;
    if (unsub) { unsub(); unsub = null; }
    if (!u) { status('signedout'); return; }
    start();
  });
  loading = false;
}

function start() {
  status('syncing');
  // Primera vez con esta cuenta en este dispositivo: sube lo que ya tenías
  if (App.getSyncUid() !== user.uid) {
    App.markAllPending();
    App.setSyncUid(user.uid);
  }
  const col = fb.collection(db, 'users', user.uid, 'records');
  unsub = fb.onSnapshot(col, { includeMetadataChanges: true }, (snap) => {
    const docs = snap.docChanges().filter((ch) => ch.type !== 'removed').map((ch) => ch.doc.data());
    if (docs.length) App.applyRemote(docs);
    report(snap.metadata);
  }, (err) => status('error', { message: traducir(err) }));
  flush();
}

function report(meta) {
  if (!user) return;
  if (!navigator.onLine) status('offline');
  else if (meta.hasPendingWrites || App.pendingCount()) status('syncing');
  else status('synced');
}

function flush() {
  if (!db || !user) return;
  if (flushing) { flushAgain = true; return; }
  const docs = App.pendingDocs();
  if (!docs.length) return;
  flushing = true;
  try {
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = fb.writeBatch(db);
      for (const d of chunk) {
        batch.set(fb.doc(db, 'users', user.uid, 'records', `${d.coll}__${d.id}`), {
          coll: d.coll, id: d.id, updatedAt: d.updatedAt, deleted: !!d.deleted, data: d.data
        });
      }
      // Con la caché local, la escritura queda guardada aunque no haya internet;
      // la promesa se cumple cuando el servidor la confirma.
      batch.commit()
        .then(() => { App.clearPending(chunk); if (navigator.onLine) status(App.pendingCount() ? 'syncing' : 'synced'); })
        .catch((e) => status('error', { message: traducir(e) }));
    }
    status(navigator.onLine ? 'syncing' : 'offline');
  } finally {
    flushing = false;
    if (flushAgain) { flushAgain = false; setTimeout(flush, 0); }
  }
}

function traducir(e) {
  const code = (e && e.code) || '';
  if (code.includes('permission-denied')) return 'Permiso denegado: revisa las reglas de Firestore (firestore.rules).';
  if (code.includes('unavailable')) return 'Sin conexión con el servidor. Se reintentará solo.';
  return (e && e.message) || 'Error al sincronizar';
}

window.Sync = {
  flush,
  signIn: (email, pw) => fb.signInWithEmailAndPassword(auth, email, pw),
  signUp: (email, pw) => fb.createUserWithEmailAndPassword(auth, email, pw),
  signOut: () => fb.signOut(auth),
  reset: (email) => fb.sendPasswordResetEmail(auth, email)
};

window.addEventListener('online', () => { if (!fb) load(); else { flush(); status(App.pendingCount() ? 'syncing' : 'synced'); } });
window.addEventListener('offline', () => { if (user) status('offline'); });
load();
