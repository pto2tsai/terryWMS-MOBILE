// ============================================================
// stocktake-batch.js - 批次盤點功能
// ============================================================

        // ========== 批次盤點模式 ==========
        window._stBatch = { items: [], currentPallet: null };
        
        // 模式切換
        window.switchStMode = function(mode) {
            var singleBtn = document.getElementById('st-mode-single');
            var batchBtn = document.getElementById('st-mode-batch');
            var singleMode = document.getElementById('st-single-mode');
            var batchMode = document.getElementById('st-batch-mode');
            
            if (mode === 'single') {
                singleBtn.style.background = '#0ea5e9';
                singleBtn.style.color = 'white';
                batchBtn.style.background = '#334155';
                batchBtn.style.color = '#94a3b8';
                singleMode.style.display = 'block';
                batchMode.style.display = 'none';
                resetStocktake();
            } else {
                singleBtn.style.background = '#334155';
                singleBtn.style.color = '#94a3b8';
                batchBtn.style.background = '#8b5cf6';
                batchBtn.style.color = 'white';
                singleMode.style.display = 'none';
                batchMode.style.display = 'block';
                stBatchReset();
            }
        };
        
        // 批次掃描
        window.stBatchScan = function() {
            var input = document.getElementById('st-batch-scan');
            var code = input.value.trim().toUpperCase();
            if (!code) return;
            
            // 查找棧板
            var pallet = window.pallets.find(function(p) { return p.palletId === code; });
            if (!pallet) {
                pallet = window.pallets.find(function(p) { return p.locationId === code; });
            }
            
            if (!pallet) {
                showToast('❌ 找不到此棧板或儲位');
                vibrateError();
                input.value = '';
                return;
            }
            
            // 檢查是否已存在
            var exists = window._stBatch.items.find(function(item) { return item.pallet.id === pallet.id; });
            if (exists) {
                showToast('⚠️ 此項目已在列表中');
                input.value = '';
                return;
            }
            
            window._stBatch.currentPallet = pallet;
            
            // 顯示當前項目
            document.getElementById('st-batch-cur-product').textContent = pallet.productName;
            document.getElementById('st-batch-cur-loc').textContent = pallet.locationId;
            document.getElementById('st-batch-cur-sys').textContent = pallet.quantity;
            document.getElementById('st-batch-cur-qty').value = '';
            document.getElementById('st-batch-current').style.display = 'block';
            document.getElementById('st-batch-cur-qty').focus();
            
            vibrateSuccess();
            input.value = '';
        };
        
        // 批次 - 數量相符
        window.stBatchSameQty = function() {
            if (window._stBatch.currentPallet) {
                document.getElementById('st-batch-cur-qty').value = window._stBatch.currentPallet.quantity;
            }
        };
        
        // 批次 - 加入項目
        window.stBatchAddItem = function() {
            var pallet = window._stBatch.currentPallet;
            if (!pallet) return;
            
            var qty = parseInt(document.getElementById('st-batch-cur-qty').value);
            if (isNaN(qty) || qty < 0) {
                showToast('❌ 請輸入正確數量');
                return;
            }
            
            var diff = qty - pallet.quantity;
            window._stBatch.items.push({
                pallet: pallet,
                actualQty: qty,
                diff: diff
            });
            
            window._stBatch.currentPallet = null;
            document.getElementById('st-batch-current').style.display = 'none';
            
            stBatchRenderList();
            vibrateSuccess();
            showToast('✅ 已加入列表');
            document.getElementById('st-batch-scan').focus();
        };
        
        // 批次 - 渲染列表
        window.stBatchRenderList = function() {
            var items = window._stBatch.items;
            var container = document.getElementById('st-batch-list');
            var countEl = document.getElementById('st-batch-count');
            var submitCountEl = document.getElementById('st-batch-submit-count');
            
            countEl.textContent = items.length;
            submitCountEl.textContent = items.length;
            
            if (items.length === 0) {
                container.innerHTML = '<div style="text-align:center;color:#64748b;font-size:13px;padding:16px;">開始掃描加入盤點項目</div>';
                return;
            }
            
            container.innerHTML = items.map(function(item, idx) {
                var diffText = item.diff === 0 ? '相符' : (item.diff > 0 ? '+' + item.diff : item.diff);
                var diffColor = item.diff === 0 ? '#22c55e' : '#fbbf24';
                return '<div style="background:#1e293b;border-radius:8px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">' +
                    '<div style="flex:1;">' +
                        '<div style="color:white;font-size:14px;font-weight:bold;">' + item.pallet.productName + '</div>' +
                        '<div style="color:#64748b;font-size:11px;">' + item.pallet.locationId + ' | 系統:' + item.pallet.quantity + ' → 實際:' + item.actualQty + '</div>' +
                    '</div>' +
                    '<div style="color:' + diffColor + ';font-weight:bold;margin-right:8px;">' + diffText + '</div>' +
                    '<button onclick="stBatchRemove(' + idx + ')" style="background:#ef4444;border:none;border-radius:6px;color:white;padding:6px 10px;font-size:12px;"><i class="fa-solid fa-xmark"></i></button>' +
                '</div>';
            }).join('');
        };
        
        // 批次 - 移除項目
        window.stBatchRemove = function(idx) {
            window._stBatch.items.splice(idx, 1);
            stBatchRenderList();
        };
        
        // 批次 - 清空
        window.stBatchClear = function() {
            if (window._stBatch.items.length > 0) {
                if (!confirm('確定清空所有盤點項目？')) return;
            }
            stBatchReset();
        };
        
        // 批次 - 重置
        window.stBatchReset = function() {
            window._stBatch = { items: [], currentPallet: null };
            document.getElementById('st-batch-scan').value = '';
            document.getElementById('st-batch-current').style.display = 'none';
            stBatchRenderList();
        };
        
        // 批次 - 提交
        window.stBatchSubmit = async function() {
            var items = window._stBatch.items;
            if (items.length === 0) {
                showToast('⚠️ 請先加入盤點項目');
                return;
            }
            
            if (!confirm('確定提交 ' + items.length + ' 筆盤點？')) return;
            
            var success = 0;
            var failed = 0;
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                try {
                    var docRef = doc(db, 'pallets', item.pallet.id);
                    
                    if (item.actualQty === 0) {
                        await deleteDoc(docRef);
                    } else if (item.actualQty !== item.pallet.quantity) {
                        await updateDoc(docRef, { quantity: item.actualQty });
                    }
                    
                    // 記錄盤點
                    await addDoc(collection(db, 'inventoryLogs'), {
                        type: '批次盤點',
                        productName: item.pallet.productName,
                        palletId: item.pallet.palletId,
                        locationId: item.pallet.locationId,
                        quantity: item.diff,
                        beforeQty: item.pallet.quantity,
                        afterQty: item.actualQty,
                        operator: window.currentUser?.name || '手機用戶',
                        timestamp: serverTimestamp()
                    });
                    
                    // 加入今日記錄
                    var diffText = item.diff === 0 ? '相符' : (item.diff > 0 ? '+' + item.diff : item.diff);
                    window._stData.todayRecords.unshift({
                        time: new Date().toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}),
                        product: item.pallet.productName,
                        loc: item.pallet.locationId,
                        diff: diffText
                    });
                    
                    success++;
                } catch (err) {
                    console.error('批次盤點失敗:', err);
                    failed++;
                }
            }
            
            renderStTodayList();
            stBatchReset();
            
            if (failed === 0) {
                showToast('✅ 批次盤點完成！共 ' + success + ' 筆');
                vibrateSuccess();
            } else {
                showToast('⚠️ 完成 ' + success + ' 筆，失敗 ' + failed + ' 筆');
                vibrateError();
            }
        };
        
        // Enter 鍵觸發
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const active = document.activeElement;
                if (active.id === 'picking-scan') confirmPickingScan();
                if (active.id === 'inbound-scan') confirmInboundScan();
                if (active.id === 'dispatch-scan') confirmDispatchScan();
                if (active.id === 'query-input') doInventoryQuery();
            }
        });
    
