// ============================================================
// dispatch.js - 調度執行功能
// ============================================================

        // ========== 調度執行 ==========
        let currentDispatch = null;
        let dispatchItems = [];
        
        window.loadDispatchOrders = function() {
            const orders = (window.dispatchOrders || []).filter(o => o.status !== 'done');
            
            const select = document.getElementById('dispatch-order-select');
            select.innerHTML = '<option value="">-- 請選擇 --</option>';
            
            orders.forEach((order, idx) => {
                const ops = (order.operations || []).length;
                select.innerHTML += `<option value="${order.id}">${order.orderNo || '工單'} - ${order.productName || ''} (${ops}項)</option>`;
            });
        }
        
        window.loadDispatchOrder = function() {
            const orderId = document.getElementById('dispatch-order-select').value;
            if (!orderId) {
                document.getElementById('dispatch-scan-area').style.display = 'none';
                document.getElementById('dispatch-actions').style.display = 'none';
                return;
            }
            
            currentDispatch = (window.dispatchOrders || []).find(o => o.id === orderId);
            if (!currentDispatch) return;
            
            dispatchItems = (currentDispatch.operations || []).map((op, idx) => ({
                ...op,
                id: op.id || 'op-' + idx,
                completed: (currentDispatch.completedOps || []).includes(op.id || 'op-' + idx)
            }));
            
            renderDispatchList();
            document.getElementById('dispatch-scan-area').style.display = 'block';
            document.getElementById('dispatch-actions').style.display = 'block';
            document.getElementById('dispatch-scan').focus();
        };
        
        function renderDispatchList() {
            const list = document.getElementById('dispatch-list');
            const completed = dispatchItems.filter(i => i.completed).length;
            document.getElementById('dispatch-progress').innerText = completed + '/' + dispatchItems.length;
            
            if (dispatchItems.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>無調度項目</p></div>';
                return;
            }
            
            list.innerHTML = dispatchItems.map(item => {
                const cls = item.completed ? 'completed' : '';
                const status = item.completed ? '<span class="item-status done">✓ 完成</span>' :
                              '<span class="item-status pending">' + item.type + '</span>';
                return `
                    <div class="list-item ${cls}">
                        <div class="item-row">
                            <span class="item-location">${item.from}</span>
                            ${status}
                        </div>
                        <div class="item-product">${item.palletId || '-'} → ${item.to}</div>
                        <div class="item-row">
                            <span class="item-detail">${item.type}</span>
                            <span class="item-qty">${item.qty}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        window.confirmDispatchScan = async function() {
            const input = document.getElementById('dispatch-scan');
            const result = document.getElementById('dispatch-scan-result');
            const scanned = input.value.trim();
            
            if (!scanned) return;
            
            const found = dispatchItems.find(i => !i.completed && 
                (i.palletId === scanned || i.from === scanned));
            
            if (!found) {
                result.className = 'scan-result error';
                result.innerText = '❌ 找不到：' + scanned;
                input.select();
                return;
            }
            
            found.completed = true;
            
            // 儲存進度到 Firebase
            try {
                if (!currentDispatch.completedOps) currentDispatch.completedOps = [];
                currentDispatch.completedOps.push(found.id);
                
                await window.updateDoc(window.doc(window.db, 'dispatchOrders', currentDispatch.id), {
                    completedOps: currentDispatch.completedOps,
                    status: 'executing'
                });
            } catch (err) {
                console.error('儲存失敗:', err);
            }
            
            result.className = 'scan-result success';
            result.innerText = '✓ ' + found.from + ' → ' + found.to;
            
            // 📝 記錄調度異動
            logInventoryChange({
                type: 'move',
                productName: currentDispatch.productName || '',
                fromLocation: found.from,
                toLocation: found.to,
                locationId: found.to,
                palletId: found.palletId || scanned,
                note: '手機版調度執行'
            });
            
            renderDispatchList();
            input.value = '';
            input.focus();
            if (navigator.vibrate) navigator.vibrate(100);
        };
        
        window.completeDispatchOrder = async function() {
            const completed = dispatchItems.filter(i => i.completed).length;
            
            if (completed === 0) {
                alert('尚未執行任何操作');
                return;
            }
            
            if (!confirm(`完成工單？\n\n已執行：${completed}/${dispatchItems.length}`)) return;
            
            // 更新 Firebase
            try {
                await window.updateDoc(window.doc(window.db, 'dispatchOrders', currentDispatch.id), {
                    status: 'done',
                    completedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('更新失敗:', err);
            }
            
            alert('✅ 工單完成！');
            goBack();
        };
