// ============================================================
// inbound-task.js - 入庫任務功能
// ============================================================

        // ========== 入庫任務 ==========
        
        window.loadInboundTasks = function() {
            var tasks = (window.inboundTasks || []).filter(function(t) { return t.status !== 'done'; });
            
            var list = document.getElementById('inbound-list');
            var countEl = document.getElementById('inbound-count');
            
            // 如果數據還沒載入，顯示載入中
            if (!window.inboundTasks || window.inboundTasks.length === 0) {
                if (list) list.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> 載入中...</div>';
                if (countEl) countEl.innerText = '載入中...';
                return;
            }
            
            if (countEl) countEl.innerText = tasks.length + ' 筆待入庫';
            
            if (tasks.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>目前沒有待入庫任務</p></div>';
                return;
            }
            
            list.innerHTML = tasks.map(function(t) {
                return '<div class="list-item" style="cursor:pointer;" onclick="selectInboundTask(\'' + t.id + '\')">' +
                    '<div class="item-row">' +
                    '<span class="item-location">' + (t.locationId || '待分配') + '</span>' +
                    '<span class="item-status pending">點擊執行</span>' +
                    '</div>' +
                    '<div class="item-product">' + t.productName + '</div>' +
                    '<div class="item-row">' +
                    '<span class="item-detail">' + (t.palletId || '-') + ' | ' + (t.batchNo || '-') + '</span>' +
                    '<span class="item-qty">' + t.quantity + '</span>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }
        
        // 點擊任務 - 直接進入掃描步驟（不用確認視窗）
        window.selectInboundTask = function(taskId) {
            
            var task = (window.inboundTasks || []).find(function(t) { return t.id === taskId; });
            if (!task) { showToast('找不到任務'); return; }
            
            
            // 檢查是否需要財務核准
            if (task.approvalStatus === 'pending') {
                showToast('⚠️ 此入庫單尚未經財務核准');
                return;
            }
            
            // 直接設定任務並進入掃描步驟
            window.currentInboundTask = task;
            
            // 顯示任務資訊
            document.getElementById('inbound-show-product').innerText = task.productName + (task.spec ? ' / ' + task.spec : '');
            document.getElementById('inbound-show-qty').innerText = (task.quantity || 0) + ' 件';
            document.getElementById('inbound-show-location').innerText = task.locationId || '-';
            
            // 跳到 Step 2
            document.getElementById('inbound-step1').style.display = 'none';
            document.getElementById('inbound-step2').style.display = 'block';
            
            var result = document.getElementById('inbound-scan-result');
            result.className = 'scan-result info';
            result.innerHTML = '<div style="text-align:center;">' +
                '<div style="color:#22c55e;font-size:16px;font-weight:bold;">📍 請前往儲位</div>' +
                '<div style="color:#fbbf24;font-size:24px;font-weight:bold;margin-top:4px;">' + task.locationId + '</div>' +
                '<div style="color:#94a3b8;font-size:12px;margin-top:4px;">到達後掃描儲位條碼</div>' +
                '</div>';
            
            setTimeout(function() { document.getElementById('inbound-location-scan').focus(); }, 100);
            if (navigator.vibrate) navigator.vibrate(50);
            playBeep();
        };
        
        // 確認後進入 Step 2
        window.confirmInboundTaskAndProceed = function() {
            var task = window.pendingInboundTask;
            if (!task) return;
            
            // 關閉 Modal
            document.getElementById('inbound-confirm-modal').style.display = 'none';
            
            window.currentInboundTask = task;
            
            // 顯示任務資訊
            document.getElementById('inbound-show-product').innerText = task.productName + (task.spec ? ' / ' + task.spec : '');
            document.getElementById('inbound-show-qty').innerText = (task.quantity || 0) + ' 件';
            document.getElementById('inbound-show-location').innerText = task.locationId || '-';
            
            // 跳到 Step 2
            document.getElementById('inbound-step1').style.display = 'none';
            document.getElementById('inbound-step2').style.display = 'block';
            
            var result = document.getElementById('inbound-scan-result');
            result.className = 'scan-result info';
            result.innerHTML = '<div style="text-align:center;">' +
                '<div style="color:#22c55e;font-size:16px;font-weight:bold;">📍 請前往儲位</div>' +
                '<div style="color:#fbbf24;font-size:24px;font-weight:bold;margin-top:4px;">' + task.locationId + '</div>' +
                '<div style="color:#94a3b8;font-size:12px;margin-top:4px;">到達後掃描儲位條碼確認</div>' +
                '</div>';
            
            setTimeout(function() { document.getElementById('inbound-location-scan').focus(); }, 100);
            playBeep();
        };
        
        // 取消確認
        window.cancelInboundConfirm = function() {
            document.getElementById('inbound-confirm-modal').style.display = 'none';
            window.pendingInboundTask = null;
        };
        
        // ========== 入庫雙重掃描驗證 (v3.0 升級) ==========
        window.currentInboundTask = null;
        
        window.confirmInboundPallet = async function() {
            var input = document.getElementById('inbound-pallet-scan');
            var result = document.getElementById('inbound-scan-result');
            var rawInput = input.value.trim();
            
            if (!rawInput) {
                result.className = 'scan-result error';
                result.innerText = '請掃描板號';
                return;
            }
            
            var scanned = window.formatPalletId(rawInput);
            
            // 查找任務（同時比對格式化前後的值）
            var task = (window.inboundTasks || []).find(function(t) {
                if (t.status === 'done') return false;
                var taskPallet = window.formatPalletId(t.palletId || '');
                var taskOrder = window.formatPalletId(t.orderNo || '');
                return taskPallet === scanned || taskOrder === scanned || 
                       t.palletId === rawInput || t.orderNo === rawInput;
            });
            
            if (!task) {
                result.className = 'scan-result error';
                result.innerText = '❌ 找不到此板號的入庫任務: ' + scanned;
                input.value = '';
                input.focus();
                return;
            }
            
            // 檢查是否需要財務核准
            if (task.approvalStatus === 'pending') {
                result.className = 'scan-result error';
                result.innerText = '⚠️ 此入庫單尚未經財務核准';
                input.value = '';
                return;
            }
            
            window.currentInboundTask = task;
            
            // 顯示任務資訊
            document.getElementById('inbound-show-product').innerText = task.productName + (task.spec ? ' / ' + task.spec : '');
            document.getElementById('inbound-show-qty').innerText = (task.quantity || 0) + ' 件';
            document.getElementById('inbound-show-location').innerText = task.locationId || '-';
            
            // 切換到 Step 2
            document.getElementById('inbound-step1').style.display = 'none';
            document.getElementById('inbound-step2').style.display = 'block';
            
            result.className = 'scan-result info';
            result.innerText = '✓ 板號確認，請前往儲位: ' + task.locationId;
            
            setTimeout(() => document.getElementById('inbound-location-scan').focus(), 100);
            if (navigator.vibrate) navigator.vibrate(50);
        };
        
        window.confirmInboundLocation = async function() {
            
            var input = document.getElementById('inbound-location-scan');
            var result = document.getElementById('inbound-scan-result');
            var rawInput = input.value.trim();
            
            
            if (!rawInput) {
                result.className = 'scan-result error';
                result.innerText = '請掃描儲位條碼';
                return;
            }
            
            if (!window.currentInboundTask) {
                result.className = 'scan-result error';
                result.innerText = '❌ 請先選擇入庫任務';
                window.resetInboundStep();
                return;
            }
            
            // 格式化輸入的儲位
            var scanned = window.formatLocationId(rawInput);
            var expected = (window.currentInboundTask.locationId || '').toUpperCase();
            
            
            // 同時比對格式化後和原始格式
            if (scanned === expected || window.formatLocationId(expected) === scanned) {
                // 儲位正確，完成入庫
                try {
                    await window.updateDoc(window.doc(window.db, 'inboundTasks', window.currentInboundTask.id), {
                        status: 'done',
                        confirmedAt: new Date().toISOString(),
                        confirmedBy: window.currentUser ? window.currentUser.email : 'operator',
                        confirmedLocation: expected
                    });
                    
                    // 📝 記錄入庫異動
                    logInventoryChange({
                        type: 'inbound',
                        productName: window.currentInboundTask.productName,
                        spec: window.currentInboundTask.spec || '',
                        quantity: window.currentInboundTask.quantity,
                        quantityChange: window.currentInboundTask.quantity,
                        locationId: window.currentInboundTask.locationId,
                        batchNo: window.currentInboundTask.batchNo || '',
                        palletId: window.currentInboundTask.palletId || '',
                        expDate: window.currentInboundTask.expDate || '',
                        note: '手機版入庫確認'
                    });
                    
                    // 震動+音效
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    playBeep('success');
                    
                    // 顯示快速成功訊息
                    showToast('✅ ' + window.currentInboundTask.productName + ' 入庫完成');
                    
                    // 自動重置並載入下一個任務
                    window.resetInboundStep();
                    window.loadInboundTasks();
                    
                    // 檢查是否還有待辦任務
                    var remaining = (window.inboundTasks || []).filter(function(t) { 
                        return t.status !== 'done'; 
                    });
                    
                    if (remaining.length > 0) {
                        result.className = 'scan-result success';
                        result.innerHTML = '✅ 入庫完成！還有 ' + remaining.length + ' 筆待處理';
                    } else {
                        result.className = 'scan-result success';
                        result.innerHTML = '🎉 太棒了！所有入庫任務已完成';
                    }
                    
                } catch (err) {
                    result.className = 'scan-result error';
                    result.innerText = '❌ 確認失敗: ' + err.message;
                }
            } else {
                // 儲位錯誤
                result.className = 'scan-result error';
                result.innerText = '❌ 儲位錯誤！\n\n掃描的: ' + scanned + '\n正確的: ' + expected + '\n\n請移至正確儲位';
                input.value = '';
                input.focus();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
        };
        
        window.resetInboundStep = function() {
            window.currentInboundTask = null;
            document.getElementById('inbound-step1').style.display = 'block';
            document.getElementById('inbound-step2').style.display = 'none';
            document.getElementById('inbound-pallet-scan').value = '';
            document.getElementById('inbound-location-scan').value = '';
            var result = document.getElementById('inbound-scan-result');
            result.className = 'scan-result';
            result.innerText = '';
        };
        
        window.confirmInboundScan = async function() {
            const input = document.getElementById('inbound-scan');
            const result = document.getElementById('inbound-scan-result');
            const scanned = input.value.trim();
            
            if (!scanned) return;
            
            // 先檢查待入庫任務
            const task = (window.inboundTasks || []).find(t => 
                t.status !== 'done' && (t.palletId === scanned || t.orderNo === scanned)
            );
            
            if (task) {
                // 找到任務，確認入庫
                try {
                    await window.updateDoc(window.doc(window.db, 'inboundTasks', task.id), {
                        status: 'done',
                        confirmedAt: new Date().toISOString()
                    });
                    
                    result.className = 'scan-result success';
                    result.innerText = '✓ 入庫確認：' + task.productName + ' @ ' + task.locationId;
                    
                    window.loadInboundTasks();
                    if (navigator.vibrate) navigator.vibrate(100);
                } catch (err) {
                    result.className = 'scan-result error';
                    result.innerText = '❌ 確認失敗：' + err.message;
                }
            } else {
                // 檢查庫存是否已存在
                const found = window.pallets.find(p => p.palletId === scanned);
                
                if (found) {
                    result.className = 'scan-result success';
                    result.innerText = '✓ 已存在：' + found.productName + ' @ ' + found.locationId;
                } else {
                    result.className = 'scan-result error';
                    result.innerText = '❌ 找不到：' + scanned;
                }
            }
            
            input.value = '';
            input.focus();
        };
