// ============================================================
// scanner.js - 相機掃描功能
// ============================================================

        // ========== 相機掃描功能 ==========
        let html5QrCode = null;
        let currentScanTarget = null;
        
        window.openCameraScanner = function(targetInputId) {
            currentScanTarget = targetInputId;
            document.getElementById('camera-modal').classList.add('active');
            
            html5QrCode = new Html5Qrcode("qr-reader");
            
            // 優化掃描設定 - 支援遠距離掃描
            var config = {
                fps: 15,                              // 提高掃描頻率
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    // 動態計算掃描框大小 - 使用更大的掃描區域
                    var minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    var qrboxSize = Math.floor(minEdge * 0.85);  // 使用 85% 的可視區域
                    return { width: qrboxSize, height: qrboxSize };
                },
                aspectRatio: 1.0,                     // 1:1 比例更適合 QR Code
                disableFlip: false,                   // 允許鏡像
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true  // 使用原生條碼偵測（如果支援）
                }
            };
            
            // 嘗試使用高解析度相機
            var cameraConfig = {
                facingMode: "environment",
                advanced: [
                    { focusMode: "continuous" },      // 持續自動對焦
                    { zoom: 1.0 }                     // 預設縮放
                ]
            };
            
            // 先嘗試取得高解析度
            Html5Qrcode.getCameras().then(function(cameras) {
                if (cameras && cameras.length > 0) {
                    // 找後置相機
                    var backCamera = cameras.find(function(c) {
                        return c.label.toLowerCase().includes('back') || 
                               c.label.toLowerCase().includes('rear') ||
                               c.label.toLowerCase().includes('環境');
                    }) || cameras[cameras.length - 1];  // 通常最後一個是後置
                    
                    html5QrCode.start(
                        backCamera.id,
                        config,
                        function(decodedText) {
                            // 掃描成功
                            if (currentScanTarget) {
                                document.getElementById(currentScanTarget).value = decodedText.toUpperCase();
                            }
                            if (navigator.vibrate) navigator.vibrate(100);
                            var target = currentScanTarget;
                            window.stopCameraScanner();
                            
                            // 自動觸發確認
                            setTimeout(function() {
                                if (target === 'inbound-pallet-scan') window.confirmInboundPallet();
                                else if (target === 'inbound-location-scan') window.confirmInboundLocation();
                                else if (target === 'picking-location-scan') window.confirmPickingLocation();
                                else if (target === 'picking-pallet-scan') window.confirmPickingPallet();
                                else if (target === 'picking-scan') window.confirmPickingScan();
                                else if (target === 'dispatch-scan') window.confirmDispatchScan();
                                else if (target === 'query-input') window.doInventoryQuery();
                                else if (target === 'scan-in-location') window.scanInboundStep1();
                                else if (target === 'scan-in-pallet') window.scanInboundStep2();
                                else if (target === 'scan-out-pallet') window.scanOutboundStep1();
                                else if (target === 'scan-move-pallet') window.scanMoveStep1();
                                else if (target === 'scan-move-new-loc') window.scanMoveStep2();
                                else if (target === 'scan-merge-less') window.scanMergeStep1();
                                else if (target === 'scan-merge-more') window.scanMergeStep2();
                                else if (target === 'st-scan-input') window.stScan();
                                else if (target === 'st-batch-scan') window.stBatchScan();
                            }, 100);
                        },
                        function(errorMessage) { /* 忽略掃描錯誤 */ }
                    ).catch(fallbackStart);
                } else {
                    fallbackStart();
                }
            }).catch(fallbackStart);
            
            // 備用啟動方式
            function fallbackStart(err) {
                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    function(decodedText) {
                        if (currentScanTarget) {
                            document.getElementById(currentScanTarget).value = decodedText.toUpperCase();
                        }
                        if (navigator.vibrate) navigator.vibrate(100);
                        var target = currentScanTarget;
                        window.stopCameraScanner();
                        
                        setTimeout(function() {
                            if (target === 'inbound-pallet-scan') window.confirmInboundPallet();
                            else if (target === 'inbound-location-scan') window.confirmInboundLocation();
                            else if (target === 'picking-location-scan') window.confirmPickingLocation();
                            else if (target === 'picking-pallet-scan') window.confirmPickingPallet();
                            else if (target === 'picking-scan') window.confirmPickingScan();
                            else if (target === 'dispatch-scan') window.confirmDispatchScan();
                            else if (target === 'query-input') window.doInventoryQuery();
                            else if (target === 'scan-in-location') window.scanInboundStep1();
                            else if (target === 'scan-in-pallet') window.scanInboundStep2();
                            else if (target === 'scan-out-pallet') window.scanOutboundStep1();
                            else if (target === 'scan-move-pallet') window.scanMoveStep1();
                            else if (target === 'scan-move-new-loc') window.scanMoveStep2();
                            else if (target === 'scan-merge-less') window.scanMergeStep1();
                            else if (target === 'scan-merge-more') window.scanMergeStep2();
                            else if (target === 'st-scan-input') window.stScan();
                            else if (target === 'st-batch-scan') window.stBatchScan();
                        }, 100);
                    },
                    function(errorMessage) { /* 忽略掃描錯誤 */ }
                ).catch(function(err) {
                    console.error('相機啟動失敗:', err);
                    alert('無法啟動相機，請確認已授予相機權限');
                    window.stopCameraScanner();
                });
            }
        }
        
        window.stopCameraScanner = function() {
            document.getElementById('camera-modal').classList.remove('active');
            if (html5QrCode) {
                html5QrCode.stop().then(function() {
                    html5QrCode.clear();
                    html5QrCode = null;
                }).catch(function(err) { console.log('停止相機錯誤:', err); });
            }
            currentScanTarget = null;
        }
