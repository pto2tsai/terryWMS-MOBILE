// ============================================================
// picking.js - 波次揀貨功能
// ============================================================

        // ========== 揀貨掃描 ==========
        let currentWave = null;
        let pickingItems = [];
        
        window.loadPickingWaves = function() {
            const waves = window.waves || [];
            const select = document.getElementById('picking-wave-select');
            select.innerHTML = '<option value="">-- 請選擇 --</option>';
            
            waves.filter(w => w.status !== 'done').forEach(w => {
                select.innerHTML += `<option value="${w.id}">${w.waveNo} - ${w.logistics || '混合'} (${w.totalQty || 0}件)</option>`;
            });
        }
        
        window.loadPickingWave = function() {
            const waveId = document.getElementById('picking-wave-select').value;
            if (!waveId) {
                document.getElementById('picking-scan-area').style.display = 'none';
                document.getElementById('picking-actions').style.display = 'none';
                return;
            }
            
            const waves = window.waves || [];
            currentWave = waves.find(w => w.id === waveId);
            if (!currentWave) return;
            
            // 產生揀貨清單
            pickingItems = [];
            (currentWave.orders || []).forEach(order => {
                let needed = parseInt(order.quantity) || 0;
                const matching = window.pallets.filter(p => p.productName === order.productName)
                    .sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
                
                matching.forEach(p => {
                    if (needed <= 0) return;
                    const pick = Math.min(p.quantity, needed);
                    pickingItems.push({
                        id: p.palletId + '-' + order.id,
                        palletId: p.palletId,
                        locationId: p.locationId,
                        productName: p.productName,
                        pickQty: pick,
                        orderNo: order.orderNo,
                        customer: order.customer,
                        completed: false
                    });
                    needed -= pick;
                });
                
                if (needed > 0) {
                    pickingItems.push({
                        id: 'shortage-' + order.id,
                        locationId: '庫存不足',
                        productName: order.productName,
                        pickQty: needed,
                        shortage: true
                    });
                }
            });
            
            // 標記已完成
            const completed = currentWave.completedItems || [];
            pickingItems.forEach(item => {
                if (completed.includes(item.id)) item.completed = true;
            });
            
            renderPickingList();
            document.getElementById('picking-scan-area').style.display = 'block';
            document.getElementById('picking-actions').style.display = 'block';
            document.getElementById('picking-scan').focus();
        };
        
        function renderPickingList() {
            const list = document.getElementById('picking-list');
            const completed = pickingItems.filter(i => i.completed).length;
            const total = pickingItems.filter(i => !i.shortage).length;
            document.getElementById('picking-progress').innerText = completed + '/' + total;
            
            if (pickingItems.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>無揀貨項目</p></div>';
                return;
            }
            
            // 按儲位排序
            pickingItems.sort((a, b) => (a.locationId || '').localeCompare(b.locationId || ''));
            
            list.innerHTML = pickingItems.map(item => {
                const cls = item.completed ? 'completed' : item.shortage ? 'shortage' : '';
                const status = item.completed ? '<span class="item-status done">✓ 完成</span>' :
                              item.shortage ? '<span class="item-status shortage">缺貨</span>' :
                              '<span class="item-status pending">待揀</span>';
                return `
                    <div class="list-item ${cls}">
                        <div class="item-row">
                            <span class="item-location">${item.locationId}</span>
                            ${status}
                        </div>
                        <div class="item-product">${item.productName}</div>
                        <div class="item-row">
                            <span class="item-detail">${item.palletId || '-'} | ${item.customer || ''}</span>
                            <span class="item-qty">${item.pickQty}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // ========== 揀貨三步驟驗證 ==========
        let currentPickingItem = null;
        let currentPickingIndex = 0;
        
        // 顯示當前揀貨項目
        function showCurrentPickingItem() {
            // 找下一個未完成的項目
            const pending = pickingItems.filter(i => !i.completed && !i.shortage);
            if (pending.length === 0) {
                document.getElementById('picking-current-item').style.display = 'none';
                document.getElementById('picking-step1').style.display = 'none';
                document.getElementById('picking-step2').style.display = 'none';
                document.getElementById('picking-step3').style.display = 'none';
                document.getElementById('picking-scan-result').className = 'scan-result success';
                document.getElementById('picking-scan-result').innerText = '🎉 所有項目已揀完！請點擊「完成波次」';
                return;
            }
            
            currentPickingItem = pending[0];
            currentPickingIndex = pickingItems.indexOf(currentPickingItem);
            
            // 顯示資訊
            document.getElementById('picking-item-product').innerText = currentPickingItem.productName + (currentPickingItem.spec ? ' / ' + currentPickingItem.spec : '');
            document.getElementById('picking-item-batch').innerText = currentPickingItem.batchNo || '(無批號)';
            document.getElementById('picking-item-qty').innerText = currentPickingItem.pickQty;
            document.getElementById('picking-item-location').innerText = currentPickingItem.locationId || '-';
            
            // 重置步驟
            document.getElementById('picking-current-item').style.display = 'block';
            document.getElementById('picking-step1').style.display = 'block';
            document.getElementById('picking-step2').style.display = 'none';
            document.getElementById('picking-step3').style.display = 'none';
            document.getElementById('picking-location-scan').value = '';
            document.getElementById('picking-pallet-scan').value = '';
            document.getElementById('picking-qty-input').value = currentPickingItem.pickQty;
            
            document.getElementById('picking-scan-result').className = 'scan-result';
            document.getElementById('picking-scan-result').innerText = '';
            
            setTimeout(() => document.getElementById('picking-location-scan').focus(), 100);
        }
        
        // Step 1: 確認儲位
        window.confirmPickingLocation = function() {
            const input = document.getElementById('picking-location-scan');
            const result = document.getElementById('picking-scan-result');
            const scanned = input.value.trim().toUpperCase();
            
            if (!scanned) {
                result.className = 'scan-result error';
                result.innerText = '請掃描儲位';
                return;
            }
            
            if (!currentPickingItem) {
                result.className = 'scan-result error';
                result.innerText = '請先選擇波次';
                return;
            }
            
            const expected = (currentPickingItem.locationId || '').toUpperCase();
            
            if (scanned === expected) {
                result.className = 'scan-result success';
                result.innerText = '✓ 儲位確認，請掃描板號';
                
                document.getElementById('picking-step1').style.display = 'none';
                document.getElementById('picking-step2').style.display = 'block';
                
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(() => document.getElementById('picking-pallet-scan').focus(), 100);
            } else {
                result.className = 'scan-result error';
                result.innerText = '❌ 儲位錯誤！\n掃描的: ' + scanned + '\n正確的: ' + expected;
                input.value = '';
                input.focus();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
        };
        
        // Step 2: 確認板號
        window.confirmPickingPallet = function() {
            const input = document.getElementById('picking-pallet-scan');
            const result = document.getElementById('picking-scan-result');
            const scanned = input.value.trim().toUpperCase();
            
            if (!scanned) {
                result.className = 'scan-result error';
                result.innerText = '請掃描板號';
                return;
            }
            
            const expected = (currentPickingItem.palletId || '').toUpperCase();
            
            if (scanned === expected) {
                result.className = 'scan-result success';
                result.innerText = '✓ 板號確認，請確認數量';
                
                document.getElementById('picking-step2').style.display = 'none';
                document.getElementById('picking-step3').style.display = 'block';
                document.getElementById('picking-qty-input').value = currentPickingItem.pickQty;
                
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(() => document.getElementById('picking-qty-input').focus(), 100);
            } else {
                result.className = 'scan-result error';
                result.innerText = '❌ 板號錯誤！\n掃描的: ' + scanned + '\n正確的: ' + expected;
                input.value = '';
                input.focus();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
        };
        
        // Step 3: 確認數量
        window.confirmPickingQty = async function() {
            const input = document.getElementById('picking-qty-input');
            const result = document.getElementById('picking-scan-result');
            const qty = parseInt(input.value) || 0;
            
            if (qty <= 0) {
                result.className = 'scan-result error';
                result.innerText = '請輸入有效數量';
                return;
            }
            
            const expectedQty = currentPickingItem.pickQty;
            
            // 標記完成
            currentPickingItem.completed = true;
            currentPickingItem.actualQty = qty;
            
            // 儲存進度到 Firebase
            try {
                if (!currentWave.completedItems) currentWave.completedItems = [];
                currentWave.completedItems.push(currentPickingItem.id);
                
                await window.updateDoc(window.doc(window.db, 'waves', currentWave.id), {
                    completedItems: currentWave.completedItems,
                    status: 'picking'
                });
            } catch (err) {
                console.error('儲存失敗:', err);
            }
            
            // 記錄出庫異動
            logInventoryChange({
                type: 'outbound',
                productName: currentPickingItem.productName,
                spec: currentPickingItem.spec || '',
                quantity: qty,
                quantityChange: -qty,
                locationId: currentPickingItem.locationId,
                batchNo: currentPickingItem.batchNo || '',
                palletId: currentPickingItem.palletId || '',
                note: '手機版揀貨 - 波次: ' + (currentWave.waveNo || '')
            });
            
            if (qty !== expectedQty) {
                result.className = 'scan-result info';
                result.innerText = '⚠️ 數量差異！\n需要: ' + expectedQty + ' / 實際: ' + qty;
            } else {
                result.className = 'scan-result success';
                result.innerText = '✅ 揀貨完成！' + currentPickingItem.productName + ' x ' + qty;
            }
            
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            renderPickingList();
            
            // 1.5 秒後顯示下一個項目
            setTimeout(() => {
                showCurrentPickingItem();
            }, 1500);
        };
        
        // 重置揀貨步驟 / 跳過此項
        window.resetPickingScan = function() {
            if (currentPickingItem && !currentPickingItem.completed) {
                if (confirm('確定要跳過此項目？\n\n' + currentPickingItem.productName + ' x ' + currentPickingItem.pickQty)) {
                    currentPickingItem.shortage = true;
                    renderPickingList();
                }
            }
            showCurrentPickingItem();
        };
        
        // 原始的單步驟確認 (保留相容性)
        window.confirmPickingScan = async function() {
            const input = document.getElementById('picking-scan');
            const result = document.getElementById('picking-scan-result');
            const scanned = input.value.trim();
            
            if (!scanned) return;
            
            const found = pickingItems.find(i => !i.completed && !i.shortage && 
                (i.palletId === scanned || i.locationId === scanned));
            
            if (!found) {
                result.className = 'scan-result error';
                result.innerText = '❌ 找不到：' + scanned;
                input.select();
                return;
            }
            
            found.completed = true;
            
            // 儲存進度到 Firebase
            try {
                if (!currentWave.completedItems) currentWave.completedItems = [];
                currentWave.completedItems.push(found.id);
                
                await window.updateDoc(window.doc(window.db, 'waves', currentWave.id), {
                    completedItems: currentWave.completedItems,
                    status: 'picking'
                });
            } catch (err) {
                console.error('儲存失敗:', err);
            }
            
            result.className = 'scan-result success';
            result.innerText = '✓ ' + found.productName + ' x ' + found.pickQty;
            
            // 📝 記錄出庫異動
            logInventoryChange({
                type: 'outbound',
                productName: found.productName,
                spec: found.spec || '',
                quantity: found.pickQty,
                quantityChange: -found.pickQty,  // 負數表示出庫
                locationId: found.locationId,
                batchNo: found.batchNo || '',
                palletId: found.palletId || '',
                note: '手機版揀貨 - 波次: ' + (currentWave.waveNo || '')
            });
            
            renderPickingList();
            input.value = '';
            input.focus();
            
            // 震動反饋
            if (navigator.vibrate) navigator.vibrate(100);
        };
        
        window.completePickingWave = async function() {
            const completed = pickingItems.filter(i => i.completed).length;
            const total = pickingItems.filter(i => !i.shortage).length;
            
            if (completed === 0) {
                alert('尚未揀貨任何項目');
                return;
            }
            
            if (!confirm(`完成波次？\n\n已揀：${completed}/${total}`)) return;
            
            // 更新 Firebase
            try {
                await window.updateDoc(window.doc(window.db, 'waves', currentWave.id), {
                    status: 'done',
                    completedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('更新失敗:', err);
            }
            
            alert('✅ 波次完成！');
            goBack();
        };
