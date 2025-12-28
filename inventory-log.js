// ============================================================
// inventory-log.js - 庫存異動記錄系統
// ============================================================

        // ========== 庫存異動記錄系統 ==========
        // 記錄所有庫存異動到 inventoryLogs，供報表查詢使用
        async function logInventoryChange(data) {
            try {
                var logEntry = {
                    type: data.type || 'unknown',           // inbound, outbound, move, adjust
                    productName: data.productName || '',
                    spec: data.spec || '',
                    quantity: data.quantity || 0,
                    quantityChange: data.quantityChange || 0,  // 正數=入庫, 負數=出庫
                    locationId: data.locationId || '',
                    fromLocation: data.fromLocation || '',     // 移位用
                    toLocation: data.toLocation || '',         // 移位用
                    batchNo: data.batchNo || '',
                    palletId: data.palletId || '',
                    expDate: data.expDate || '',
                    note: data.note || '',
                    operator: window.currentUser ? window.currentUser.email : 'mobile-user',
                    operatorName: window.currentUser ? window.currentUser.email.split('@')[0] : 'operator',
                    deviceType: 'mobile',
                    timestamp: new Date().toISOString(),
                    createdAt: new Date()
                };
                
                await window.addDoc(window.collection(window.db, 'inventoryLogs'), logEntry);
                console.log('📝 異動記錄已儲存:', logEntry.type, logEntry.productName);
            } catch (e) {
                console.error('記錄異動失敗:', e);
            }
        }
        
        // 更新 Badge 數量
        function updateBadges() {
            // 揀貨
            var activeWaves = (window.waves || []).filter(function(w) { return w.status !== 'done'; }).length;
            var badgePicking = document.getElementById('badge-picking');
            if (badgePicking) {
                if (activeWaves > 0) {
                    badgePicking.innerText = activeWaves;
                    badgePicking.style.display = 'flex';
                } else {
                    badgePicking.style.display = 'none';
                }
            }
            
            // 入庫
            var activeTasks = (window.inboundTasks || []).filter(function(t) { return t.status !== 'done'; }).length;
            var badgeInbound = document.getElementById('badge-inbound');
            if (badgeInbound) {
                if (activeTasks > 0) {
                    badgeInbound.innerText = activeTasks;
                    badgeInbound.style.display = 'flex';
                } else {
                    badgeInbound.style.display = 'none';
                }
            }
            
            // 移板工單 - 改進篩選邏輯
            var orders = window.dispatchOrders || [];
            var moveOrders = orders.filter(function(o) { 
                if (o.status === 'done') return false;
                if (o.type === 'move' || o.orderType === 'move') return true;
                var ops = o.operations || [];
                var hasMoveOp = ops.some(function(op) { return op.type === '移位' || op.type === 'move'; });
                var hasMergeOp = ops.some(function(op) { return op.type === '合併' || op.type === 'merge'; });
                return hasMoveOp && !hasMergeOp;
            }).length;
            var badgeMove = document.getElementById('badge-move');
            if (badgeMove) {
                if (moveOrders > 0) {
                    badgeMove.innerText = moveOrders;
                    badgeMove.style.display = 'flex';
                } else {
                    badgeMove.style.display = 'none';
                }
            }
            
            // 併板工單 - 改進篩選邏輯
            var mergeOrders = orders.filter(function(o) { 
                if (o.status === 'done') return false;
                if (o.type === 'merge' || o.orderType === 'merge') return true;
                var ops = o.operations || [];
                return ops.some(function(op) { return op.type === '合併' || op.type === 'merge'; });
            }).length;
            var badgeMerge = document.getElementById('badge-merge');
            if (badgeMerge) {
                if (mergeOrders > 0) {
                    badgeMerge.innerText = mergeOrders;
                    badgeMerge.style.display = 'flex';
                } else {
                    badgeMerge.style.display = 'none';
                }
            }
        }
        
