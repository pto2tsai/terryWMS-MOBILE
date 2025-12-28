// ============================================================
// dispatch-orders.js - 移板/併板工單載入
// ============================================================

        window.loadMoveOrders = function() {
            
            var orders = (window.dispatchOrders || []).filter(function(o) {
                if (o.status === 'done') return false;
                
                // 檢查 type 欄位
                if (o.type === 'move' || o.orderType === 'move') return true;
                
                // 檢查 operations 裡面的類型
                var ops = o.operations || [];
                var hasMoveOp = ops.some(function(op) {
                    return op.type === '移位' || op.type === 'move';
                });
                
                // 如果有移位操作且沒有合併操作，視為移板工單
                var hasMergeOp = ops.some(function(op) {
                    return op.type === '合併' || op.type === 'merge';
                });
                
                return hasMoveOp && !hasMergeOp;
            });
            
            
            var countEl = document.getElementById('move-orders-count');
            var listEl = document.getElementById('move-orders-list');
            
            if (countEl) countEl.innerText = orders.length + ' 筆';
            
            if (!listEl) return;
            
            if (orders.length === 0) {
                listEl.innerHTML = '<div style="text-align:center;color:#64748b;font-size:13px;padding:12px;">無待辦移板工單</div>';
                return;
            }
            
            listEl.innerHTML = orders.map(function(order) {
                var ops = order.operations || [];
                var completed = (order.completedOps || []).length;
                var statusColor = completed > 0 ? '#f59e0b' : '#3b82f6';
                var statusText = completed > 0 ? '進行中 ' + completed + '/' + ops.length : '待執行';
                
                return '<div class="list-item" style="padding:10px;margin-bottom:8px;cursor:pointer;" onclick="executeMoveOrder(\'' + order.id + '\')">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div style="font-weight:bold;color:white;">' + (order.productName || order.orderNo || '移板工單') + '</div>' +
                    '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(59,130,246,0.2);color:' + statusColor + ';">' + statusText + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + 
                    ops.slice(0,2).map(function(op) { return op.from + ' → ' + op.to; }).join(' | ') +
                    (ops.length > 2 ? ' ...' : '') +
                    '</div>' +
                    '</div>';
            }).join('');
        }
        
        // 載入併板工單
        window.loadMergeOrders = function() {
            
            var orders = (window.dispatchOrders || []).filter(function(o) {
                if (o.status === 'done') return false;
                
                // 檢查 type 欄位
                if (o.type === 'merge' || o.orderType === 'merge') return true;
                
                // 檢查 operations 裡面的類型
                var ops = o.operations || [];
                var hasMergeOp = ops.some(function(op) {
                    return op.type === '合併' || op.type === 'merge';
                });
                
                return hasMergeOp;
            });
            
            
            var countEl = document.getElementById('merge-orders-count');
            var listEl = document.getElementById('merge-orders-list');
            
            if (countEl) countEl.innerText = orders.length + ' 筆';
            
            if (!listEl) return;
            
            if (orders.length === 0) {
                listEl.innerHTML = '<div style="text-align:center;color:#64748b;font-size:13px;padding:12px;">無待辦併板工單</div>';
                return;
            }
            
            listEl.innerHTML = orders.map(function(order) {
                var ops = order.operations || [];
                var completed = (order.completedOps || []).length;
                var statusColor = completed > 0 ? '#f59e0b' : '#a855f7';
                var statusText = completed > 0 ? '進行中 ' + completed + '/' + ops.length : '待執行';
                
                return '<div class="list-item" style="padding:10px;margin-bottom:8px;cursor:pointer;" onclick="executeMergeOrder(\'' + order.id + '\')">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div style="font-weight:bold;color:white;">' + (order.productName || order.orderNo || '併板工單') + '</div>' +
                    '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(168,85,247,0.2);color:' + statusColor + ';">' + statusText + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + 
                    ops.slice(0,2).map(function(op) { return op.from + ' + ' + op.to; }).join(' | ') +
                    (ops.length > 2 ? ' ...' : '') +
                    '</div>' +
                    '</div>';
            }).join('');
        }
        
        // 執行移板工單
        window.executeMoveOrder = function(orderId) {
            var order = (window.dispatchOrders || []).find(function(o) { return o.id === orderId; });
            if (!order) { showToast('找不到工單'); return; }
            
            var ops = order.operations || [];
            var completedOps = order.completedOps || [];
            
            // 找到第一個未完成的操作
            var nextOp = null;
            for (var i = 0; i < ops.length; i++) {
                var opId = ops[i].id || 'op-' + i;
                if (completedOps.indexOf(opId) === -1) {
                    nextOp = ops[i];
                    nextOp._idx = i;
                    break;
                }
            }
            
            if (!nextOp) {
                showToast('此工單已全部完成');
                return;
            }
            
            // 儲存當前工單
            window.currentMoveOrder = order;
            window.currentMoveOp = nextOp;
            
            // 顯示工單指引
            var result = document.getElementById('scan-move-result');
            if (result) {
                result.innerHTML = '<div style="background:rgba(59,130,246,0.2);border:1px solid #3b82f6;border-radius:10px;padding:12px;margin-bottom:12px;">' +
                    '<div style="color:#93c5fd;font-size:12px;margin-bottom:4px;"><i class="fa-solid fa-clipboard-list" style="margin-right:4px;"></i>執行工單 (' + (completedOps.length + 1) + '/' + ops.length + ')</div>' +
                    '<div style="color:white;font-weight:bold;">' + (order.productName || '') + '</div>' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">' +
                    '<span style="color:#fbbf24;font-weight:bold;font-size:16px;">' + nextOp.from + '</span>' +
                    '<span style="color:#3b82f6;">→</span>' +
                    '<span style="color:#10b981;font-weight:bold;font-size:16px;">' + nextOp.to + '</span>' +
                    '</div>' +
                    '</div>';
            }
            
            // 聚焦到掃描輸入框
            setTimeout(function() {
                var input = document.getElementById('scan-move-pallet');
                if (input) input.focus();
            }, 100);
            showToast('請掃描棧板插單');
        };
        
        // 執行併板工單
        window.executeMergeOrder = function(orderId) {
            var order = (window.dispatchOrders || []).find(function(o) { return o.id === orderId; });
            if (!order) { showToast('找不到工單'); return; }
            
            var ops = order.operations || [];
            var completedOps = order.completedOps || [];
            
            // 找到第一個未完成的操作
            var nextOp = null;
            for (var i = 0; i < ops.length; i++) {
                var opId = ops[i].id || 'op-' + i;
                if (completedOps.indexOf(opId) === -1) {
                    nextOp = ops[i];
                    nextOp._idx = i;
                    break;
                }
            }
            
            if (!nextOp) {
                showToast('此工單已全部完成');
                return;
            }
            
            // 儲存當前工單
            window.currentMergeOrder = order;
            window.currentMergeOp = nextOp;
            
            // 顯示工單指引
            var result = document.getElementById('scan-merge-result');
            if (result) {
                result.innerHTML = '<div style="background:rgba(168,85,247,0.2);border:1px solid #a855f7;border-radius:10px;padding:12px;margin-bottom:12px;">' +
                    '<div style="color:#d8b4fe;font-size:12px;margin-bottom:4px;"><i class="fa-solid fa-clipboard-list" style="margin-right:4px;"></i>執行工單 (' + (completedOps.length + 1) + '/' + ops.length + ')</div>' +
                    '<div style="color:white;font-weight:bold;">' + (order.productName || '') + '</div>' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">' +
                    '<span style="color:#f97316;font-weight:bold;font-size:16px;">' + nextOp.from + '</span>' +
                    '<span style="color:#a855f7;font-size:20px;">+</span>' +
                    '<span style="color:#10b981;font-weight:bold;font-size:16px;">' + nextOp.to + '</span>' +
                    '</div>' +
                    '</div>';
            }
            
            // 聚焦到掃描輸入框
            setTimeout(function() {
                var input = document.getElementById('scan-merge-less');
                if (input) input.focus();
            }, 100);
            showToast('請掃描少的棧板');
        };
        
