// ============================================================
// feedback.js - 震動與音效回饋
// ============================================================

        // ========== 回饋工具 ==========
        // 震動回饋
        window.vibrate = function(pattern) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern || 100);
            }
        };
        
        // 成功震動（短）
        window.vibrateSuccess = function() { vibrate(100); };
        
        // 錯誤震動（長-短-長）
        window.vibrateError = function() { vibrate([200, 100, 200]); };
        
        // 音效播放
        window.playBeep = function(type) {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                if (type === 'success') {
                    osc.frequency.value = 880; // 高音
                    gain.gain.value = 0.3;
                    osc.start();
                    setTimeout(function() { osc.stop(); ctx.close(); }, 150);
                } else if (type === 'error') {
                    osc.frequency.value = 220; // 低音
                    gain.gain.value = 0.3;
                    osc.start();
                    setTimeout(function() { osc.stop(); ctx.close(); }, 300);
                } else {
                    osc.frequency.value = 660; // 中音（普通嗶）
                    gain.gain.value = 0.2;
                    osc.start();
                    setTimeout(function() { osc.stop(); ctx.close(); }, 100);
                }
            } catch (e) { console.log('Audio not supported'); }
        };
        
        // 成功回饋（震動+音效）
        window.feedbackSuccess = function() {
            vibrateSuccess();
            playBeep('success');
        };
        
        // 錯誤回饋
        window.feedbackError = function() {
            vibrateError();
            playBeep('error');
        };
        


