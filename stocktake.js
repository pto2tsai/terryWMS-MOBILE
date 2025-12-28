// ============================================================
// stocktake.js - 庫存盤點功能
// ============================================================

        // ========== 庫存盤點 ==========
        window._stData = { pallet: null, todayRecords: [] };
        
        window.stScan = function() {
            var input = document.getElementById('st-scan-input');
            var code = input.value.trim().toUpperCase();
            if (!code) return;
            
            // 判斷是儲位還是棧板
            var pallet = null;
            
            // 先嘗試用棧板編號查找
            pallet = window.pallets.find(function(p) { return p.palletId === code; });
            
            // 如果找不到，嘗試用儲位查找（取第一個）
            if (!pallet) {
                pallet = window.pallets.find(function(p) { return p.locationId === code; });
            }
            
            if (!pallet) {
                showStResult('error', '❌ 找不到此棧板或儲位');
                vibrateError();
                return;
            }
            
            window._stData.pallet = pallet;
            document.getElementById('st-info-loc').textContent = pallet.locationId;
            document.getElementById('st-info-product').textContent = pallet.productName;
            document.getElementById('st-info-lot').textContent = pallet.batchNo || '-';
            document.getElementById('st-info-sys-qty').textContent = pallet.quantity;
            document.getElementById('st-actual-qty').value = '';
            
            document.getElementById('st-scan-area').style.display = 'none';
            document.getElementById('st-result-area').style.display = 'block';
            document.getElementById('st-actual-qty').focus();
            vibrateSuccess();
        };
        
        window.stSameQty = function() {
            if (window._stData.pallet) {
                document.getElementById('st-actual-qty').value = window._stData.pallet.quantity;
            }
        };
        
        window.executeStocktake = async function() {
            var actualQty = parseInt(document.getElementById('st-actual-qty').value);
            var pallet = window._stData.pallet;
            
            if (!pallet) {
                showStResult('error', '❌ 請先掃描棧板');
                return;
            }
            if (isNaN(actualQty) || actualQty < 0) {
                showStResult('error', '❌ 請輸入正確數量');
                return;
            }
            
            var diff = actualQty - pallet.quantity;
            var diffText = diff === 0 ? '相符' : (diff > 0 ? '+' + diff : diff);
            
            try {
                var docRef = doc(db, 'pallets', pallet.id);
                
                if (actualQty === 0) {
                    await deleteDoc(docRef);
                } else if (actualQty !== pallet.quantity) {
                    await updateDoc(docRef, { quantity: actualQty });
                }
                
                // 記錄盤點
                await addDoc(collection(db, 'inventoryLogs'), {
                    type: '庫存盤點',
                    productName: pallet.productName,
                    palletId: pallet.palletId,
                    locationId: pallet.locationId,
                    quantity: diff,
                    beforeQty: pallet.quantity,
                    afterQty: actualQty,
                    operator: window.currentUser?.name || '手機用戶',
                    timestamp: serverTimestamp()
                });
                
                // 加入今日記錄
                window._stData.todayRecords.unshift({
                    time: new Date().toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}),
                    product: pallet.productName,
                    loc: pallet.locationId,
                    diff: diffText
                });
                renderStTodayList();
                
                showStResult('success', '✅ 盤點完成！差異：' + diffText);
                vibrateSuccess();
                
                setTimeout(function() { resetStocktake(); }, 1500);
            } catch (err) {
                showStResult('error', '❌ 盤點失敗：' + err.message);
                vibrateError();
            }
        };
        
        window.showStResult = function(type, msg) {
            var el = document.getElementById('st-result');
            el.className = 'scan-result ' + type;
            el.textContent = msg;
            el.style.display = 'block';
        };
        
        window.resetStocktake = function() {
            window._stData.pallet = null;
            document.getElementById('st-scan-area').style.display = 'block';
            document.getElementById('st-result-area').style.display = 'none';
            document.getElementById('st-scan-input').value = '';
            document.getElementById('st-result').style.display = 'none';
            document.getElementById('st-scan-input').focus();
        };
        
        window.renderStTodayList = function() {
            var list = window._stData.todayRecords;
            var container = document.getElementById('st-today-list');
            var countEl = document.getElementById('st-today-count');
            
            countEl.textContent = list.length + ' 筆';
            
            if (list.length === 0) {
                container.innerHTML = '<div style="text-align:center;color:#64748b;font-size:13px;padding:20px;">尚無盤點記錄</div>';
                return;
            }
            
            container.innerHTML = list.map(function(r) {
                var diffColor = r.diff === '相符' ? '#22c55e' : '#fbbf24';
                return '<div style="background:#1e293b;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
                    '<div>' +
                        '<div style="color:white;font-weight:bold;">' + r.product + '</div>' +
                        '<div style="color:#64748b;font-size:12px;">' + r.loc + ' · ' + r.time + '</div>' +
                    '</div>' +
                    '<div style="color:' + diffColor + ';font-weight:bold;">' + r.diff + '</div>' +
                '</div>';
            }).join('');
        };
