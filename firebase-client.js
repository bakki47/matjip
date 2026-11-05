const settings = window.FIREBASE_SETTINGS;
const report = message => {
  window.firebaseSetupError = message;
  window.dispatchEvent(new Event('firebase-error'));
};
if (!settings?.firebaseConfig?.apiKey || !settings.firebaseConfig.projectId || !settings.workspaceId) {
  report('Firebase 설정 전 · 이 기기에 저장돼요');
} else {
  try {
    const version = '12.4.0';
    const [appSDK, storeSDK] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
    ]);
    const app = appSDK.initializeApp(settings.firebaseConfig);
    const store = storeSDK.initializeFirestore(app, {
      localCache: storeSDK.persistentLocalCache({tabManager: storeSDK.persistentMultipleTabManager()})
    });
    const collectionRef = name => storeSDK.collection(store, 'workspaces', settings.workspaceId, name);
    // A local identifier labels visits; it grants no database permissions.
    let visitorId = localStorage.getItem('matjip-visitor-id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('matjip-visitor-id', visitorId);
    }
    window.firebaseStore = {
      db: {
        collection: name => ({
          doc: id => ({
            set: data => storeSDK.setDoc(storeSDK.doc(collectionRef(name), id), data),
            delete: () => storeSDK.deleteDoc(storeSDK.doc(collectionRef(name), id))
          }),
          onSnapshot: observer => storeSDK.onSnapshot(collectionRef(name), observer)
        })
      },
      user: {id: async () => visitorId, profiles: async () => ({})},
      importMissing: (name, id, data) => storeSDK.runTransaction(store, async transaction => {
        const ref = storeSDK.doc(collectionRef(name), id);
        const existing = await transaction.get(ref);
        if (!existing.exists()) transaction.set(ref, data);
      })
    };
    window.dispatchEvent(new Event('firebase-ready'));
  } catch (error) { report(`Firebase 연결 실패 (${error.code || 'network-error'})`); }
}
