import {parseInbox, mergeRecord} from './inbox-import.mjs';
const settings = window.FIREBASE_SETTINGS;
const report = message => {
  window.firebaseSetupError = message;
  window.dispatchEvent(new Event('firebase-error'));
};

/* ---------- login screen (only the two registered accounts can read or write) ---------- */
const css = `
.authgate{position:fixed;inset:0;z-index:300;background:var(--bg,#f6f3f2);display:grid;place-items:center;
  padding:max(24px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(24px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
.authgate[hidden]{display:none}
.authbox{width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px;text-align:center}
.authbox h1{font-family:var(--display,sans-serif);font-weight:400;font-size:30px;line-height:1.1;margin:0 0 4px;color:var(--ink,#1f1a1a)}
.authbox h1 em{font-style:normal;color:var(--chili,#c8241b)}
.authbox p{margin:0;color:var(--muted,#6f6564);font-size:14px;line-height:1.6}
.authbox input{font:16px var(--body,sans-serif);color:var(--ink,#1f1a1a);background:var(--paper,#fff);border:1.5px solid var(--line,#e6dedc);border-radius:12px;padding:12px;width:100%}
.authbox input:focus{outline:none;border-color:var(--chili,#c8241b)}
.authbtn{font:700 16px var(--body,sans-serif);border:0;border-radius:12px;padding:12px;background:var(--chili,#c8241b);color:#fff;cursor:pointer}
.authbtn:disabled{opacity:.5;cursor:default}
.authbtn:focus-visible{outline:2px solid var(--broth,#e88a1a);outline-offset:2px}
.authmsg{color:var(--chili,#c8241b)!important;font-weight:700;min-height:1.6em}`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
const gate = document.createElement('div');
gate.className = 'authgate';
gate.hidden = true;
gate.setAttribute('role', 'dialog');
gate.setAttribute('aria-modal', 'true');
gate.setAttribute('aria-labelledby', 'authtitle');
gate.innerHTML = `
  <form class="authbox" id="authform" novalidate>
    <h1 id="authtitle">곰찌의 <em>맛집</em> 도장깨기</h1>
    <p>둘만 쓰는 기록이에요. 로그인해 주세요.</p>
    <input id="authemail" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="아이디" aria-label="아이디" required>
    <input id="authpw" type="password" autocomplete="current-password" placeholder="비밀번호" aria-label="비밀번호" required>
    <button class="authbtn" id="authgo" type="submit">로그인</button>
    <p class="authmsg" id="authmsg" aria-live="polite"></p>
  </form>`;
document.body.appendChild(gate);
const $id = id => document.getElementById(id);
const LOGIN_DOMAIN = 'matjip.example.com';

const authError = code => ({
  'auth/invalid-credential': '아이디나 비밀번호가 달라요.',
  'auth/wrong-password': '아이디나 비밀번호가 달라요.',
  'auth/user-not-found': '아이디나 비밀번호가 달라요.',
  'auth/invalid-email': '아이디는 영어 소문자·숫자로 입력해 주세요.',
  'auth/too-many-requests': '시도가 너무 많았어요. 잠시 뒤 다시 해 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  'auth/operation-not-allowed': 'Firebase 콘솔에서 이메일/비밀번호 로그인을 켜 주세요.'
}[code] || `로그인하지 못했어요 (${code || '알 수 없는 오류'})`);

function addLogout(authSDK, auth) {
  if ($id('auth-logout')) return;
  const tools = document.querySelector('.record-tools');
  if (!tools) return;
  const b = document.createElement('button');
  b.className = 'tool-icon';
  b.id = 'auth-logout';
  b.type = 'button';
  b.setAttribute('aria-label', '로그아웃');
  b.title = '로그아웃';
  b.innerHTML = '<span aria-hidden="true">🚪</span><span class="tool-tip">로그아웃</span>';
  b.onclick = async () => {
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1';
      b.querySelector('.tool-tip').textContent = '한 번 더 누르면 로그아웃';
      setTimeout(() => { b.dataset.armed = ''; b.querySelector('.tool-tip').textContent = '로그아웃'; }, 3000);
      return;
    }
    await authSDK.signOut(auth);
    location.reload();
  };
  tools.appendChild(b);
}

if (!settings?.firebaseConfig?.apiKey || !settings.firebaseConfig.projectId || !settings.workspaceId) {
  report('Firebase 설정 전 · 이 기기에 저장돼요');
} else {
  try {
    const version = '12.4.0';
    const [appSDK, storeSDK, authSDK] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`)
    ]);
    const app = appSDK.initializeApp(settings.firebaseConfig);
    // Keeps the sign-in across visits, including the iPhone home-screen app.
    const auth = authSDK.initializeAuth(app, {
      persistence: [authSDK.indexedDBLocalPersistence, authSDK.browserLocalPersistence]
    });
    const store = storeSDK.initializeFirestore(app, {
      localCache: storeSDK.persistentLocalCache({tabManager: storeSDK.persistentMultipleTabManager()})
    });
    const collectionRef = name => storeSDK.collection(store, 'workspaces', settings.workspaceId, name);
    const members = settings.members || {};

    $id('authform').onsubmit = async event => {
      event.preventDefault();
      const login = $id('authemail').value.trim().toLowerCase(), pw = $id('authpw').value;
      if (!login || !pw) { $id('authmsg').textContent = '아이디와 비밀번호를 입력해 주세요.'; return; }
      // Firebase needs an e-mail address, so a bare ID gets a reserved placeholder domain (no mail is ever sent).
      const email = login.includes('@') ? login : `${login}@${LOGIN_DOMAIN}`;
      $id('authgo').disabled = true; $id('authmsg').textContent = '';
      try { await authSDK.signInWithEmailAndPassword(auth, email, pw); }
      catch (error) { $id('authmsg').textContent = authError(error.code); $id('authpw').value = ''; $id('authpw').focus(); }
      finally { $id('authgo').disabled = false; }
    };

    let started = false;
    authSDK.onAuthStateChanged(auth, user => {
      if (!user) {
        gate.hidden = false;
        report('로그인이 필요해요');
        setTimeout(() => $id('authemail').focus(), 50);
        return;
      }
      gate.hidden = true;
      $id('authpw').value = '';
      if (started) return;
      started = true;
      addLogout(authSDK, auth);
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
        // Visits are labelled with the signed-in account; names come from firebase-config.js.
        user: {
          id: async () => user.uid,
          profiles: async ids => Object.fromEntries(ids.filter(id => members[id]).map(id => [id, {name: members[id]}]))
        },
        importInbox: async (input, catalog, progress = () => {}) => {
          const records = parseInbox(input, catalog);
          let completed = 0;
          for (const record of records) {
            await storeSDK.runTransaction(store, async transaction => {
              const ref = storeSDK.doc(collectionRef(record.collection), record.id);
              const snapshot = await transaction.get(ref);
              transaction.set(ref, mergeRecord(snapshot.exists() ? snapshot.data() : null, record.data));
            });
            progress(++completed, records.length);
          }
          return completed;
        },
        importMissing: (name, id, data) => storeSDK.runTransaction(store, async transaction => {
          const ref = storeSDK.doc(collectionRef(name), id);
          const existing = await transaction.get(ref);
          if (!existing.exists()) transaction.set(ref, data);
        })
      };
      window.dispatchEvent(new Event('firebase-ready'));
    });
  } catch (error) { report(`Firebase 연결 실패 (${error.code || 'network-error'})`); }
}
