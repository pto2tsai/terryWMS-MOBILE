// ============================================================
// ui.js - UI 控制與頁面切換
// ============================================================

        window.showInboundOptions = function() {
            var modal = document.getElementById('inbound-options-modal');
            if (modal) modal.style.display = 'flex';
        };
        
        window.hideInboundOptions = function() {
            var modal = document.getElementById('inbound-options-modal');
            if (modal) modal.style.display = 'none';
        };
        
        // 頁面切換
        window.openPage = function(page) {
            document.getElementById('app-main').classList.remove('active');
            document.getElementById('page-' + page).classList.add('active');
            
            if (page === 'picking') window.loadPickingWaves();
            if (page === 'inbound') window.loadInboundTasks();
            if (page === 'dispatch') window.loadDispatchOrders();
            if (page === 'scan-move') window.loadMoveOrders();
            if (page === 'scan-merge') window.loadMergeOrders();
        }
        
        window.goBack = function() {
            document.querySelectorAll('.func-page').forEach(p => p.classList.remove('active'));
            document.getElementById('app-main').classList.add('active');
        }
