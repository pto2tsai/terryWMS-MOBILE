// ============================================================
// firebase-init.js - Firebase 初始化與認證 (傳統載入版)
// ============================================================

// Firebase 設定
var firebaseConfig = { 
    apiKey: "AIzaSyBEWzyRMJQirGbh28ANkE6aN42GzUBuw2s", 
    authDomain: "terrywms-2345f.firebaseapp.com", 
    projectId: "terrywms-2345f", 
    storageBucket: "terrywms-2345f.firebasestorage.app", 
    messagingSenderId: "75589714942", 
    appId: "1:75589714942:web:3a7f723c3d1449df78f6af" 
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var auth = firebase.auth();

// 設定全域參考
window.db = db;
window.auth = auth;

// Firestore 函數包裝 (模擬 modular API)
window.collection = function(db, name) { return db.collection(name); };
window.doc = function(db, col, id) { return db.collection(col).doc(id); };
window.getDocs = function(ref) { return ref.get(); };
window.getDoc = function(ref) { return ref.get(); };
window.addDoc = function(ref, data) { return ref.add(data); };
window.updateDoc = function(ref, data) { return ref.update(data); };
window.deleteDoc = function(ref) { return ref.delete(); };
window.query = function(ref) { return ref; };
window.where = function(field, op, val) { return { field: field, op: op, val: val }; };
window.orderBy = function(field, dir) { return { field: field, dir: dir }; };
window.onSnapshot = function(ref, callback) { return ref.onSnapshot(callback); };
window.serverTimestamp = function() { return firebase.firestore.FieldValue.serverTimestamp(); };
window.writeBatch = function(db) { return db.batch(); };

// 資料
window.pallets = [];
window.waves = [];
window.dispatchOrders = [];
window.inboundTasks = [];
window.currentUser = null;
window.allPallets = [];

// 工單數量（用於通知）
var prevWaveCount = 0;
var prevDispatchCount = 0;
var prevInboundCount = 0;

// 監聽認證狀態
auth.onAuthStateChanged(function(user) {
    if (user) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-main').classList.add('active');
        document.getElementById('display-user').innerText = user.email.split('@')[0];
        window.currentUser = user.email.split('@')[0];
        initData();
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-main').classList.remove('active');
    }
});

// 登入
window.doLogin = async function() {
    var email = document.getElementById('login-email').value;
    var pwd = document.getElementById('login-pwd').value;
    var errorEl = document.getElementById('login-error');
    
    try {
        errorEl.style.display = 'none';
        await auth.signInWithEmailAndPassword(email, pwd);
    } catch (err) {
        errorEl.style.display = 'block';
        if (err.code === 'auth/user-not-found') errorEl.innerText = '帳號不存在';
        else if (err.code === 'auth/wrong-password') errorEl.innerText = '密碼錯誤';
        else if (err.code === 'auth/invalid-credential') errorEl.innerText = '帳號或密碼錯誤';
        else errorEl.innerText = '登入失敗';
    }
};

// 登出
window.doLogout = function() {
    auth.signOut();
};

// 初始化資料 - 即時監聽
function initData() {
    // 監聽庫存
    db.collection('pallets').onSnapshot(function(snap) {
        window.pallets = [];
        snap.forEach(function(d) { window.pallets.push({ id: d.id, ...d.data() }); });
        window.allPallets = window.pallets;
        updateBadges();
    });
    
    // 監聽波次工單
    db.collection('waves').onSnapshot(function(snap) {
        window.waves = [];
        snap.forEach(function(d) { window.waves.push({ id: d.id, ...d.data() }); });
        
        var activeCount = window.waves.filter(function(w) { return w.status !== 'done'; }).length;
        var badge = document.getElementById('badge-picking');
        if (badge) {
            badge.style.display = activeCount > 0 ? 'flex' : 'none';
            badge.innerText = activeCount;
        }
        
        // 新工單通知
        if (activeCount > prevWaveCount && prevWaveCount > 0) {
            showNotification('新波次工單', '有 ' + (activeCount - prevWaveCount) + ' 個新波次待揀貨');
        }
        prevWaveCount = activeCount;
    });
    
    // 監聽調度工單
    db.collection('dispatchOrders').onSnapshot(function(snap) {
        window.dispatchOrders = [];
        snap.forEach(function(d) { window.dispatchOrders.push({ id: d.id, ...d.data() }); });
        
        var activeCount = window.dispatchOrders.filter(function(o) { return o.status !== 'done'; }).length;
        
        // 更新移板/併板 badge
        if (window.loadMoveOrders) window.loadMoveOrders();
        if (window.loadMergeOrders) window.loadMergeOrders();
        
        // 新工單通知
        if (activeCount > prevDispatchCount && prevDispatchCount > 0) {
            showNotification('新調度工單', '有 ' + (activeCount - prevDispatchCount) + ' 個新調度待執行');
        }
        prevDispatchCount = activeCount;
    });
    
    // 監聽入庫任務
    db.collection('consignments').onSnapshot(function(snap) {
        window.inboundTasks = [];
        snap.forEach(function(d) { window.inboundTasks.push({ id: d.id, ...d.data() }); });
        
        var activeCount = window.inboundTasks.filter(function(t) { return t.status !== 'done'; }).length;
        var badge = document.getElementById('badge-inbound');
        if (badge) {
            badge.style.display = activeCount > 0 ? 'flex' : 'none';
            badge.innerText = activeCount;
        }
        
        // 新任務通知
        if (activeCount > prevInboundCount && prevInboundCount > 0) {
            showNotification('新入庫任務', '有 ' + (activeCount - prevInboundCount) + ' 個新貨物待入庫');
        }
        prevInboundCount = activeCount;
        
        // 更新入庫任務列表
        if (window.loadInboundTasks) window.loadInboundTasks();
    });
    
    console.log('✅ Firebase 資料監聯已啟動');
}

function updateBadges() {
    // 可擴充
}

// 推播通知
function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: '📦' });
    }
    
    // 震動提醒
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

// 請求通知權限
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(function(reg) { console.log('✅ SW 註冊成功'); })
        .catch(function(err) { console.log('❌ SW 註冊失敗:', err); });
}
