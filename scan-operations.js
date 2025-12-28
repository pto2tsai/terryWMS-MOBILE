// ============================================================
// scan-operations.js - 掃描入庫/出庫/移板/併板作業
// ============================================================

        // ========== 自動掃描觸發（無需按確認鍵）==========
        // 條碼槍通常會在掃描後自動送出 Enter 鍵
        // 或者當輸入長度達到一定值時自動觸發
        
        var scanTimeout = null;
        var MIN_SCAN_LENGTH = 3;  // 最小有效掃描長度
        
        function autoTrigger(inputId, callback, delay) {
            delay = delay || 300;
            var input = document.getElementById(inputId);
            if (!input) return;
            var val = input.value.trim();
            if (val.length < MIN_SCAN_LENGTH) return;
            
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(function() {
                callback();
            }, delay);
        }
        
        // ----- 入庫自動觸發 -----
        window.autoScanInLoc = function(e) {
            // Enter 鍵直接觸發
            if (e.keyCode === 13) { scanInboundStep1(); return; }
            // 或者延遲自動觸發
            autoTrigger('scan-in-location', scanInboundStep1, 500);
        };
        
        window.autoScanInPallet = function(e) {
            if (e.keyCode === 13) { scanInboundStep2(); return; }
            autoTrigger('scan-in-pallet', scanInboundStep2, 500);
        };
        
        // ----- 出庫自動觸發 -----
        window.autoScanOutPallet = function(e) {
            if (e.keyCode === 13) { scanOutboundStep1(); return; }
            autoTrigger('scan-out-pallet', scanOutboundStep1, 500);
        };
        
        // ----- 移板自動觸發 -----
        window.autoScanMovePallet = function(e) {
            if (e.keyCode === 13) { scanMoveStep1(); return; }
            autoTrigger('scan-move-pallet', scanMoveStep1, 500);
        };
        
        window.autoScanMoveNewLoc = function(e) {
            if (e.keyCode === 13) { scanMoveStep2(); return; }
            autoTrigger('scan-move-new-loc', scanMoveStep2, 500);
        };
        
        // ----- 併板自動觸發 -----
        window.autoScanMergeLess = function(e) {
            if (e.keyCode === 13) { scanMergeStep1(); return; }
            autoTrigger('scan-merge-less', scanMergeStep1, 500);
        };
        
        window.autoScanMergeMore = function(e) {
            if (e.keyCode === 13) { scanMergeStep2(); return; }
            autoTrigger('scan-merge-more', scanMergeStep2, 500);
        };
        
        // ========== 相機掃描完成後自動觸發 ==========
        var originalOnScanSuccess = window.onScanSuccess;
        window.onScanSuccess = function(decodedText) {
            if (originalOnScanSuccess) originalOnScanSuccess(decodedText);
            
            // 根據當前焦點的輸入框自動觸發對應函數
            setTimeout(function() {
                var activeId = document.activeElement ? document.activeElement.id : '';
                if (activeId === 'scan-in-location') scanInboundStep1();
                else if (activeId === 'scan-in-pallet') scanInboundStep2();
                else if (activeId === 'scan-out-pallet') scanOutboundStep1();
                else if (activeId === 'scan-move-pallet') scanMoveStep1();
                else if (activeId === 'scan-move-new-loc') scanMoveStep2();
                else if (activeId === 'scan-merge-less') scanMergeStep1();
                else if (activeId === 'scan-merge-more') scanMergeStep2();
            }, 100);
        };

        // ========== 新版掃描作業流程 ==========
        var scanData = {
            inbound: { location: null },
            outbound: { pallet: null, stock: 0 },
            move: { pallet: null, oldLoc: null },
            merge: { less: null, more: null }
        };

        

        
        // ----- 入庫作業 -----
        window.scanInboundStep1 = function() {
            var rawLoc = document.getElementById('scan-in-location').value.trim();
            if (!rawLoc || rawLoc.length < 5) return; // 最少5碼如 IA011
            var loc = window.formatLocationId(rawLoc);
            if (!loc || loc.length < 8) { showToast('儲位格式不正確'); return; }
            
            scanData.inbound.location = loc;
            document.getElementById('scan-in-loc-display').innerText = loc;
            document.getElementById('scan-in-step1').style.display = 'none';
            document.getElementById('scan-in-step2').style.display = 'block';
            
            feedbackSuccess(); // 震動+音效
            setTimeout(function() { document.getElementById('scan-in-pallet').focus(); }, 100);
        };
        
        window.scanInboundStep2 = async function() {
            var rawId = document.getElementById('scan-in-pallet').value.trim();
            if (!rawId) { showToast('請掃描插單'); return; }
            var palletId = window.formatPalletId(rawId);
            
            var loc = scanData.inbound.location;
            var result = document.getElementById('scan-in-result');
            
            // 查找棧板 - 從多個來源查找
            var pallet = null;
            if (window.allPallets && window.allPallets.length > 0) {
                pallet = window.allPallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            if (!pallet && window.pallets && window.pallets.length > 0) {
                pallet = window.pallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            
            // 如果找不到，嘗試從 Firebase 查詢
            if (!pallet) {
                try {
                    var docRef = window.doc(window.db, "pallets", palletId);
                    var docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        pallet = { id: docSnap.id, ...docSnap.data() };
                    }
                } catch(e) { console.log('Firebase查詢失敗:', e); }
            }
            
            if (!pallet) {
                feedbackError();
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 找不到此棧板: ' + palletId + '</div>';
                document.getElementById('scan-in-pallet').value = '';
                document.getElementById('scan-in-pallet').focus();
                return;
            }
            
            // 儲存棧板資訊到 scanData
            scanData.inbound.pallet = pallet;
            
            // 顯示 Step 3: 確認件數
            document.getElementById('scan-in-step2').style.display = 'none';
            document.getElementById('scan-in-step3').style.display = 'block';
            
            // 填入棧板資訊
            document.getElementById('scan-in-loc-display2').innerText = scanData.inbound.location;
            document.getElementById('scan-in-product-name').innerText = pallet.productName || '-';
            document.getElementById('scan-in-spec').innerText = pallet.spec || '-';
            document.getElementById('scan-in-batch').innerText = pallet.batchNo || '-';
            document.getElementById('scan-in-qty-input').value = pallet.quantity || '';
            document.getElementById('scan-in-qty-input').placeholder = '預設: ' + (pallet.quantity || 0);
            
            feedbackSuccess();
            setTimeout(function() { document.getElementById('scan-in-qty-input').focus(); }, 100);
            result.innerHTML = '';
        };
        
        // 入庫最終確認（含件數）
        window.confirmScanInbound = async function() {
            var pallet = scanData.inbound.pallet;
            var loc = scanData.inbound.location;
            if (!pallet || !loc) { showToast('請先掃描儲位和棧板'); return; }
            
            var qty = parseInt(document.getElementById('scan-in-qty-input').value) || pallet.quantity;
            if (qty <= 0) { showToast('請輸入有效數量'); return; }
            
            var result = document.getElementById('scan-in-result');
            
            try {
                await window.updateDoc(window.doc(window.db, "pallets", pallet.id), { 
                    locationId: loc,
                    quantity: qty
                });
                
                // 記錄異動
                await window.addDoc(window.collection(window.db, 'inventoryLogs'), {
                    type: 'inbound', productName: pallet.productName, spec: pallet.spec || '',
                    quantity: qty, quantityChange: qty, locationId: loc,
                    batchNo: pallet.batchNo || '', palletId: pallet.palletId || pallet.id, 
                    note: '手機版掃描入庫',
                    operator: window.currentUser || 'mobile', timestamp: new Date()
                });
                
                result.innerHTML = '<div style="background:#065f46;border-radius:10px;padding:16px;text-align:center;">' +
                    '<div style="font-size:32px;margin-bottom:8px;">✅</div>' +
                    '<div style="color:white;font-size:18px;font-weight:bold;">' + pallet.productName + '</div>' +
                    '<div style="color:#6ee7b7;">' + qty + ' 件</div>' +
                    '<div style="color:#10b981;font-weight:bold;margin-top:8px;">已綁定至 ' + loc + '</div>' +
                    '<div style="display:flex;gap:10px;margin-top:16px;">' +
                    '<button onclick="resetScanInbound()" style="flex:1;padding:12px;background:#10b981;border:none;border-radius:8px;color:white;font-weight:bold;">繼續入庫</button>' +
                    '<button onclick="goBack()" style="flex:1;padding:12px;background:#475569;border:none;border-radius:8px;color:white;font-weight:bold;">回主選單</button>' +
                    '</div></div>';
                
                vibrateSuccess(); playBeep('success'); 
                showToast('✅ 入庫成功！');
            } catch (err) {
                result.innerHTML = '<div style="color:#f87171;">❌ 入庫失敗: ' + err.message + '</div>';
            }
        };
        
        window.resetScanInbound = function() {
            scanData.inbound = { location: null, pallet: null };
            document.getElementById('scan-in-location').value = '';
            document.getElementById('scan-in-pallet').value = '';
            var qtyInput = document.getElementById('scan-in-qty-input');
            if (qtyInput) qtyInput.value = '';
            document.getElementById('scan-in-step1').style.display = 'block';
            document.getElementById('scan-in-step2').style.display = 'none';
            var step3 = document.getElementById('scan-in-step3');
            if (step3) step3.style.display = 'none';
            document.getElementById('scan-in-result').innerHTML = '';
            setTimeout(function() { document.getElementById('scan-in-location').focus(); }, 100);
        };
        
        // ----- 出庫作業 -----
        window.scanOutboundStep1 = async function() {
            var rawId = document.getElementById('scan-out-pallet').value.trim();
            if (!rawId) { showToast('請掃描插單'); return; }
            var palletId = window.formatPalletId(rawId);
            
            var result = document.getElementById('scan-out-result');
            
            // 從多個來源查找棧板
            var pallet = null;
            if (window.allPallets && window.allPallets.length > 0) {
                pallet = window.allPallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            if (!pallet && window.pallets && window.pallets.length > 0) {
                pallet = window.pallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            
            // 如果找不到，嘗試從 Firebase 查詢
            if (!pallet) {
                try {
                    result.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:8px;"><i class="fa-solid fa-spinner fa-spin"></i> 查詢中...</div>';
                    var docRef = window.doc(window.db, "pallets", palletId);
                    var docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        pallet = { id: docSnap.id, ...docSnap.data() };
                    }
                } catch(e) { console.log('Firebase查詢失敗:', e); }
            }
            
            if (!pallet) {
                errorFeedback(); 
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 找不到此棧板: ' + palletId + '</div>';
                document.getElementById('scan-out-pallet').value = '';
                return;
            }
            
            scanData.outbound.pallet = pallet;
            scanData.outbound.stock = pallet.quantity;
            
            document.getElementById('scan-out-product').innerText = pallet.productName;
            document.getElementById('scan-out-spec').innerText = pallet.spec || '-';
            document.getElementById('scan-out-stock').innerText = pallet.quantity;
            document.getElementById('scan-out-loc').innerText = pallet.locationId;
            
            // 生成快速數量按鈕
            var quickBtns = document.getElementById('scan-out-quick-btns');
            var stock = pallet.quantity;
            var btnHtml = '';
            
            // 常用數量按鈕
            var quickNums = [];
            if (stock >= 1) quickNums.push(1);
            if (stock >= 5) quickNums.push(5);
            if (stock >= 10) quickNums.push(10);
            if (stock >= 20) quickNums.push(20);
            if (stock >= 50 && stock > 20) quickNums.push(50);
            // 添加半數和全數
            var half = Math.floor(stock / 2);
            if (half > 0 && quickNums.indexOf(half) === -1) quickNums.push(half);
            
            // 排序並生成按鈕
            quickNums.sort(function(a,b){ return a-b; });
            quickNums.forEach(function(num) {
                btnHtml += '<button onclick="setOutQty(' + num + ')" style="padding:12px;background:#334155;border:1px solid #475569;border-radius:8px;color:white;font-weight:bold;font-size:16px;">' + num + '</button>';
            });
            quickBtns.innerHTML = btnHtml;
            
            document.getElementById('scan-out-step1').style.display = 'none';
            document.getElementById('scan-out-step2').style.display = 'block';
            feedbackSuccess();
            setTimeout(function() { document.getElementById('scan-out-qty').focus(); }, 100);
            result.innerHTML = '';
        };
        
        window.setOutQty = function(qty) {
            document.getElementById('scan-out-qty').value = qty;
            // 自動聚焦到確認按鈕，方便直接按 Enter
            document.getElementById('scan-out-qty').focus();
        };
        

        // 出庫數量快捷設定
        window.setOutQty = function(qty) {
            document.getElementById('scan-out-qty').value = qty;
            playBeep();
        };
        
        window.addOutQty = function(delta) {
            var input = document.getElementById('scan-out-qty');
            var current = parseInt(input.value) || 0;
            var newVal = Math.max(0, current + delta);
            var max = scanData.outbound.stock;
            input.value = Math.min(newVal, max);
            playBeep();
        };
        
        
        // 出庫數量快捷按鈕
        window.addOutQty = function(n) {
            var el = document.getElementById('scan-out-qty');
            var current = parseInt(el.value) || 0;
            var max = scanData.outbound.stock;
            el.value = Math.min(current + n, max);
            playBeep();
        };

        window.scanOutboundAll = function() {
            document.getElementById('scan-out-qty').value = scanData.outbound.stock;
        };
        
        window.setOutQty = function(qty) {
            var stock = scanData.outbound.stock;
            var current = parseInt(document.getElementById('scan-out-qty').value) || 0;
            var newQty = current + qty;
            if (newQty > stock) newQty = stock;
            document.getElementById('scan-out-qty').value = newQty;
        };
        
        window.executeScanOutbound = async function() {
            var pallet = scanData.outbound.pallet;
            if (!pallet) { showToast('請先掃描棧板'); return; }
            
            var qty = parseInt(document.getElementById('scan-out-qty').value) || 0;
            if (qty <= 0) { showToast('請輸入出庫數量'); return; }
            if (qty > pallet.quantity) { showToast('數量不能超過庫存 ' + pallet.quantity); return; }
            
            var newQty = pallet.quantity - qty;
            var result = document.getElementById('scan-out-result');
            
            try {
                if (newQty === 0) {
                    await window.deleteDoc(window.doc(window.db, "pallets", pallet.id));
                } else {
                    await window.updateDoc(window.doc(window.db, "pallets", pallet.id), { quantity: newQty });
                }
                
                await window.addDoc(window.collection(window.db, 'inventoryLogs'), {
                    type: 'outbound', productName: pallet.productName, spec: pallet.spec || '',
                    quantity: qty, quantityChange: -qty, locationId: pallet.locationId,
                    batchNo: pallet.batchNo || '', palletId: pallet.palletId, note: '手機版掃描出庫',
                    operator: window.currentUser || 'mobile', timestamp: new Date()
                });
                
                result.innerHTML = '<div style="background:#9a3412;border-radius:10px;padding:16px;text-align:center;">' +
                    '<div style="font-size:32px;margin-bottom:8px;">✅</div>' +
                    '<div style="color:white;font-size:18px;font-weight:bold;">' + pallet.productName + '</div>' +
                    '<div style="color:#fdba74;">出庫：' + qty + ' 件</div>' +
                    (newQty > 0 ? '<div style="color:#fbbf24;">剩餘：' + newQty + ' 件</div>' : '<div style="color:#f87171;">已清空，儲位已釋放</div>') +
                    '<div style="display:flex;gap:10px;margin-top:16px;">' +
                    '<button onclick="resetScanOutbound()" style="flex:1;padding:12px;background:#ea580c;border:none;border-radius:8px;color:white;font-weight:bold;">繼續出庫</button>' +
                    '<button onclick="goBack()" style="flex:1;padding:12px;background:#475569;border:none;border-radius:8px;color:white;font-weight:bold;">回主選單</button>' +
                    '</div></div>';
                
                vibrateSuccess(); playBeep('success');
            } catch (err) {
                result.innerHTML = '<div style="color:#f87171;">❌ 出庫失敗: ' + err.message + '</div>';
            }
        };
        
        window.resetScanOutbound = function() {
            scanData.outbound = { pallet: null, stock: 0 };
            document.getElementById('scan-out-pallet').value = '';
            document.getElementById('scan-out-qty').value = '';
            document.getElementById('scan-out-step1').style.display = 'block';
            document.getElementById('scan-out-step2').style.display = 'none';
            document.getElementById('scan-out-result').innerHTML = '';
            setTimeout(function() { document.getElementById('scan-out-pallet').focus(); }, 100);
        };
        
        // ----- 移板作業 -----
        window.scanMoveStep1 = async function() {
            var rawId = document.getElementById('scan-move-pallet').value.trim();
            if (!rawId) { showToast('請掃描插單'); return; }
            var palletId = window.formatPalletId(rawId);
            
            var result = document.getElementById('scan-move-result');
            
            // 從多個來源查找棧板
            var pallet = null;
            if (window.allPallets && window.allPallets.length > 0) {
                pallet = window.allPallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            if (!pallet && window.pallets && window.pallets.length > 0) {
                pallet = window.pallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            
            // 如果找不到，嘗試從 Firebase 查詢
            if (!pallet) {
                try {
                    result.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:8px;"><i class="fa-solid fa-spinner fa-spin"></i> 查詢中...</div>';
                    var docRef = window.doc(window.db, "pallets", palletId);
                    var docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        pallet = { id: docSnap.id, ...docSnap.data() };
                    }
                } catch(e) { console.log('Firebase查詢失敗:', e); }
            }
            
            if (!pallet) {
                errorFeedback(); 
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 找不到此棧板: ' + palletId + '</div>';
                document.getElementById('scan-move-pallet').value = '';
                return;
            }
            
            scanData.move.pallet = pallet;
            scanData.move.oldLoc = pallet.locationId;
            
            document.getElementById('scan-move-product').innerText = pallet.productName + ' | ' + pallet.quantity + '件';
            document.getElementById('scan-move-old-loc').innerText = pallet.locationId;
            
            document.getElementById('scan-move-step1').style.display = 'none';
            document.getElementById('scan-move-step2').style.display = 'block';
            feedbackSuccess();
            setTimeout(function() { document.getElementById('scan-move-new-loc').focus(); }, 100);
            result.innerHTML = '';
        };
        
        window.scanMoveStep2 = async function() {
            var rawLoc = document.getElementById('scan-move-new-loc').value.trim();
            if (!rawLoc) { showToast('請掃描新儲位'); return; }
            var newLoc = window.formatLocationId(rawLoc);
            
            var pallet = scanData.move.pallet;
            var oldLoc = scanData.move.oldLoc;
            var result = document.getElementById('scan-move-result');
            
            try {
                await window.updateDoc(window.doc(window.db, "pallets", pallet.id), { locationId: newLoc });
                
                await window.addDoc(window.collection(window.db, 'inventoryLogs'), {
                    type: 'move', productName: pallet.productName, spec: pallet.spec || '',
                    quantity: pallet.quantity, quantityChange: 0, locationId: newLoc, fromLocation: oldLoc,
                    releasedLocation: oldLoc,  // 被釋放的原儲位
                    batchNo: pallet.batchNo || '', palletId: pallet.palletId, 
                    note: '手機版掃描移板: ' + oldLoc + '→' + newLoc + ', 儲位 ' + oldLoc + ' 已釋放',
                    operator: window.currentUser || 'mobile', timestamp: new Date()
                });
                
                result.innerHTML = '<div style="background:#1e40af;border-radius:10px;padding:16px;text-align:center;">' +
                    '<div style="font-size:32px;margin-bottom:8px;">✅</div>' +
                    '<div style="color:white;font-size:16px;font-weight:bold;">' + pallet.productName + '</div>' +
                    '<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:8px;">' +
                    '<span style="color:#94a3b8;text-decoration:line-through;">' + oldLoc + '</span>' +
                    '<span style="color:#3b82f6;">→</span>' +
                    '<span style="color:#60a5fa;font-size:18px;font-weight:bold;">' + newLoc + '</span></div>' +
                    '<div style="color:#a3e635;font-size:12px;margin-top:8px;">📍 儲位 ' + oldLoc + ' 已釋放</div>' +
                    '<div style="display:flex;gap:10px;margin-top:16px;">' +
                    '<button onclick="resetScanMove()" style="flex:1;padding:12px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:bold;">繼續移板</button>' +
                    '<button onclick="goBack()" style="flex:1;padding:12px;background:#475569;border:none;border-radius:8px;color:white;font-weight:bold;">回主選單</button>' +
                    '</div></div>';
                
                vibrateSuccess(); playBeep('success');
                showToast('✅ 移板成功！');
            } catch (err) {
                result.innerHTML = '<div style="color:#f87171;">❌ 移板失敗: ' + err.message + '</div>';
            }
        };
        
        window.resetScanMove = function() {
            scanData.move = { pallet: null, oldLoc: null };
            document.getElementById('scan-move-pallet').value = '';
            document.getElementById('scan-move-new-loc').value = '';
            document.getElementById('scan-move-step1').style.display = 'block';
            document.getElementById('scan-move-step2').style.display = 'none';
            document.getElementById('scan-move-result').innerHTML = '';
            setTimeout(function() { document.getElementById('scan-move-pallet').focus(); }, 100);
        };
        
        // ----- 併板作業 -----
        window.scanMergeStep1 = async function() {
            var rawId = document.getElementById('scan-merge-less').value.trim();
            if (!rawId) { showToast('請掃描插單'); return; }
            var palletId = window.formatPalletId(rawId);
            
            var result = document.getElementById('scan-merge-result');
            
            // 從多個來源查找棧板
            var pallet = null;
            if (window.allPallets && window.allPallets.length > 0) {
                pallet = window.allPallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            if (!pallet && window.pallets && window.pallets.length > 0) {
                pallet = window.pallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            
            // 如果找不到，嘗試從 Firebase 查詢
            if (!pallet) {
                try {
                    result.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:8px;"><i class="fa-solid fa-spinner fa-spin"></i> 查詢中...</div>';
                    var docRef = window.doc(window.db, "pallets", palletId);
                    var docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        pallet = { id: docSnap.id, ...docSnap.data() };
                    }
                } catch(e) { console.log('Firebase查詢失敗:', e); }
            }
            
            if (!pallet) {
                errorFeedback(); 
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 找不到此棧板: ' + palletId + '</div>';
                document.getElementById('scan-merge-less').value = '';
                return;
            }
            
            scanData.merge.less = pallet;
            
            document.getElementById('scan-merge-less-name').innerText = pallet.productName;
            document.getElementById('scan-merge-less-qty').innerText = pallet.quantity;
            
            document.getElementById('scan-merge-step1').style.display = 'none';
            document.getElementById('scan-merge-less-info').style.display = 'block';
            document.getElementById('scan-merge-plus').style.display = 'block';
            document.getElementById('scan-merge-step2').style.display = 'block';
            feedbackSuccess();
            setTimeout(function() { document.getElementById('scan-merge-more').focus(); }, 100);
            result.innerHTML = '';
        };
        
        window.scanMergeStep2 = async function() {
            var rawId = document.getElementById('scan-merge-more').value.trim();
            if (!rawId) { showToast('請掃描插單'); return; }
            var palletId = window.formatPalletId(rawId);
            
            var result = document.getElementById('scan-merge-result');
            
            // 從多個來源查找棧板
            var pallet = null;
            if (window.allPallets && window.allPallets.length > 0) {
                pallet = window.allPallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            if (!pallet && window.pallets && window.pallets.length > 0) {
                pallet = window.pallets.find(function(p) {
                    return p.palletId === palletId || p.id === palletId;
                });
            }
            
            // 如果找不到，嘗試從 Firebase 查詢
            if (!pallet) {
                try {
                    result.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:8px;"><i class="fa-solid fa-spinner fa-spin"></i> 查詢中...</div>';
                    var docRef = window.doc(window.db, "pallets", palletId);
                    var docSnap = await window.getDoc(docRef);
                    if (docSnap.exists()) {
                        pallet = { id: docSnap.id, ...docSnap.data() };
                    }
                } catch(e) { console.log('Firebase查詢失敗:', e); }
            }
            
            if (!pallet) {
                errorFeedback(); 
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 找不到此棧板: ' + palletId + '</div>';
                document.getElementById('scan-merge-more').value = '';
                return;
            }
            
            var less = scanData.merge.less;
            if (less.productName !== pallet.productName) {
                result.innerHTML = '<div style="color:#f87171;text-align:center;padding:12px;"><i class="fa-solid fa-times-circle"></i> 品名不同，無法合併<br><span style="font-size:12px;">少的: ' + less.productName + '<br>多的: ' + pallet.productName + '</span></div>';
                document.getElementById('scan-merge-more').value = '';
                return;
            }
            
            scanData.merge.more = pallet;
            var total = less.quantity + pallet.quantity;
            
            document.getElementById('scan-merge-more-name').innerText = pallet.productName;
            document.getElementById('scan-merge-more-qty').innerText = pallet.quantity;
            document.getElementById('scan-merge-total').innerText = total;
            document.getElementById('scan-merge-calc').innerText = less.quantity + ' + ' + pallet.quantity + ' = ' + total;
            
            document.getElementById('scan-merge-step2').style.display = 'none';
            document.getElementById('scan-merge-more-info').style.display = 'block';
            document.getElementById('scan-merge-preview').style.display = 'block';
            // btn removed - auto execute
            feedbackSuccess();
            result.innerHTML = '';
            
            // 自動執行合併（3秒後，給用戶確認時間）
            result.innerHTML = '<div style="color:#a855f7;text-align:center;padding:8px;font-size:14px;"><i class="fa-solid fa-spinner fa-spin"></i> 3 秒後自動合併，按重置取消...</div>';
            window.mergeCountdown = setTimeout(function() {
                executeScanMerge();
            }, 3000);
        };
        
        window.executeScanMerge = async function() {
            var less = scanData.merge.less;
            var more = scanData.merge.more;
            if (!less || !more) return;
            
            var total = less.quantity + more.quantity;
            var result = document.getElementById('scan-merge-result');
            
            try {
                var batch = window.writeBatch(window.db);
                batch.update(window.doc(window.db, "pallets", more.id), { quantity: total });
                batch.delete(window.doc(window.db, "pallets", less.id));
                await batch.commit();
                
                await window.addDoc(window.collection(window.db, 'inventoryLogs'), {
                    type: 'merge', productName: more.productName, spec: more.spec || '',
                    quantity: total, quantityChange: 0, locationId: more.locationId,
                    fromLocation: less.locationId,  // 原儲位（已釋放）
                    batchNo: more.batchNo || '', palletId: more.palletId,
                    deletedPalletId: less.palletId,  // 被刪除的板號
                    deletedLocation: less.locationId,  // 被釋放的儲位
                    note: '手機版掃描併板: ' + less.palletId + '(' + less.locationId + ')→' + more.palletId + '(' + more.locationId + '), 儲位 ' + less.locationId + ' 已釋放',
                    operator: window.currentUser || 'mobile', timestamp: new Date()
                });
                
                result.innerHTML = '<div style="background:#6b21a8;border-radius:10px;padding:16px;text-align:center;">' +
                    '<div style="font-size:32px;margin-bottom:8px;">✅</div>' +
                    '<div style="color:white;font-size:18px;font-weight:bold;">' + more.productName + '</div>' +
                    '<div style="color:#d8b4fe;">合併後：' + total + ' 件</div>' +
                    '<div style="color:#a3e635;font-size:12px;margin-top:8px;">📍 儲位 ' + less.locationId + ' 已釋放</div>' +
                    '<div style="display:flex;gap:10px;margin-top:16px;">' +
                    '<button onclick="resetScanMerge()" style="flex:1;padding:12px;background:#a855f7;border:none;border-radius:8px;color:white;font-weight:bold;">繼續併板</button>' +
                    '<button onclick="goBack()" style="flex:1;padding:12px;background:#475569;border:none;border-radius:8px;color:white;font-weight:bold;">回主選單</button>' +
                    '</div></div>';
                
                vibrateSuccess(); playBeep('success');
                showToast('✅ 併板成功！');
            } catch (err) {
                result.innerHTML = '<div style="color:#f87171;">❌ 併板失敗: ' + err.message + '</div>';
            }
        };
        
        window.resetScanMerge = function() {
            if (window.mergeCountdown) clearTimeout(window.mergeCountdown);
            scanData.merge = { less: null, more: null };
            document.getElementById('scan-merge-less').value = '';
            document.getElementById('scan-merge-more').value = '';
            document.getElementById('scan-merge-step1').style.display = 'block';
            document.getElementById('scan-merge-less-info').style.display = 'none';
            document.getElementById('scan-merge-plus').style.display = 'none';
            document.getElementById('scan-merge-step2').style.display = 'none';
            document.getElementById('scan-merge-more-info').style.display = 'none';
            document.getElementById('scan-merge-preview').style.display = 'none';
            document.getElementById('btn-scan-merge-confirm').style.display = 'none';
            document.getElementById('scan-merge-result').innerHTML = '';
            document.getElementById('scan-merge-less').focus();
        };
