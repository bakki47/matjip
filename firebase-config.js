// Firebase 콘솔 → 프로젝트 설정 → 내 앱 → 웹 앱의 firebaseConfig 값을 입력하세요.
const firebaseConfig = {
    apiKey: "AIzaSyCMLK8kx6JcHQowbTcmczwXlpwlY2fe0GI",
    authDomain: "matjip-2cc56.firebaseapp.com",
    projectId: "matjip-2cc56",
    storageBucket: "matjip-2cc56.firebasestorage.app",
    messagingSenderId: "9305342001",
    appId: "1:9305342001:web:22a6200f2a67337cf21510",
    measurementId: "G-V75ZECZJFN"
  };

// 로그인한 계정의 UID → 화면에 표시할 이름 (Firebase 콘솔 → Authentication → Users의 "사용자 UID")
const members = {
  "b7XdVz41I9V6fz1ssb6jseRhecJ3": "남자친구",
  "sC0wuqeQOGMVOucdMvOacEDvASE3": "곰찌"
};

window.FIREBASE_SETTINGS = {
  firebaseConfig,
  workspaceId: "our-food-log",
  members
};
