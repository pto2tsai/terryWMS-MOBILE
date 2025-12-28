// ============================================================
// query.js - 庫存快查功能
// ============================================================

        // ========== 庫存快查 ==========
        window.doInventoryQuery = function() {
            const input = document.getElementById('query-input');
            const result = document.getElementById('query-result');
            const keyword = input.value.trim().toLowerCase();
            
            if (!keyword) return;
            
            const matches = window.pallets.filter(p => 
                (p.productName && p.productName.toLowerCase().includes(keyword)) ||
                (p.palletId && p.palletId.toLowerCase().includes(keyword)) ||
                (p.batchNo && p.batchNo.toLowerCase().includes(keyword))
            );
            
            if (matches.length === 0) {
                result.innerHTML = '<div class="empty-state"><i class="fa-solid fa-search"></i><p>找不到：' + keyword + '</p></div>';
                return;
            }
            
            // 按品名分組
            const grouped = {};
            matches.forEach(p => {
                const key = p.productName;
                if (!grouped[key]) grouped[key] = { name: p.productName, spec: p.spec, items: [] };
                grouped[key].items.push(p);
            });
            
            result.innerHTML = Object.values(grouped).map(g => `
                <div class="result-card">
                    <div class="result-product">${g.name}</div>
                    <div class="result-spec">${g.spec || ''}</div>
                    ${g.items.map(p => `
                        <div class="result-row">
                            <span class="result-loc">${p.locationId}</span>
                            <span class="result-qty">${p.quantity} 件</span>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        };
