/**
 * 联盟跟踪自动化脚本
 * 使用方法：在HTML中添加 <script src="affiliate-tracking.js"></script>
 */

(function() {
    'use strict';
    
    // ===================== 配置区域 =====================
    const CONFIG = {
        // 联盟链接列表
        affiliateLinks: [
            {
                url: 'https://kiwi.tpk.mx/c3p3hsnR',
                name: 'Kiwi合作伙伴'
            }
            // 可以添加更多联盟链接
            // {
            //     url: 'https://partner2.com/track?id=xxx',
            //     name: '合作伙伴2'
            // }
        ],
        
        // 跟踪配置
        settings: {
            autoTriggerDelay: 800,        // 自动触发延迟(毫秒)
            showCookieBanner: true,       // 是否显示Cookie横幅
            requireConsent: true,         // 是否需要用户同意
            debugMode: true,              // 调试模式
            trackPageExit: true,          // 跟踪页面退出
            trackVisibilityChange: true   // 跟踪页面可见性变化
        }
    };
    
    // ===================== 核心功能 =====================
    
    // 日志函数
    function log(message, type = 'info') {
        if (!CONFIG.settings.debugMode) return;
        
        const prefix = '🔗 [联盟跟踪]';
        const styles = {
            info: 'color: #2196f3',
            success: 'color: #4caf50', 
            warning: 'color: #ff9800',
            error: 'color: #f44336'
        };
        
        console.log(`%c${prefix} ${message}`, styles[type] || styles.info);
    }
    
    // 检查Cookie同意状态
    function getCookieConsent() {
        return localStorage.getItem('affiliateTrackingConsent');
    }
    
    // 设置Cookie同意状态
    function setCookieConsent(status) {
        localStorage.setItem('affiliateTrackingConsent', status);
        log(`Cookie同意状态已设置: ${status}`);
    }
    
    // 创建Cookie同意横幅
    function createCookieBanner() {
        if (!CONFIG.settings.showCookieBanner || getCookieConsent()) {
            return;
        }
        
        const banner = document.createElement('div');
        banner.id = 'affiliate-cookie-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                text-align: center;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            ">
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="margin-bottom: 15px;">
                        <strong>🍪 网站使用说明</strong><br>
                        我们使用技术手段改善您的浏览体验，并可能与合作伙伴分享匿名化信息以提供相关服务。
                    </div>
                    <div>
                        <button onclick="window.affiliateTracking.acceptCookies()" style="
                            background: #4caf50;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            margin: 0 10px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        ">接受</button>
                        <button onclick="window.affiliateTracking.declineCookies()" style="
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: 1px solid rgba(255,255,255,0.3);
                            padding: 10px 20px;
                            margin: 0 10px;
                            border-radius: 25px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">仅必要</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // 显示横幅
        setTimeout(() => {
            banner.firstElementChild.style.transform = 'translateY(0)';
        }, 1000);
        
        log('Cookie横幅已创建');
    }
    
    // 触发单个联盟跟踪
    function triggerSingleTracking(partner, index) {
        return new Promise((resolve) => {
            try {
                log(`开始跟踪: ${partner.name}`);
                
                // 构建跟踪URL
                const params = new URLSearchParams({
                    ref: window.location.href,
                    utm_source: 'direct',
                    utm_medium: 'website',
                    t: Date.now()
                });
                
                const trackingUrl = partner.url + 
                    (partner.url.includes('?') ? '&' : '?') + 
                    params.toString();
                
                let completed = false;
                
                // 方法1: 图片像素跟踪
                const img = new Image();
                const timeout = setTimeout(() => {
                    if (!completed) {
                        completed = true;
                        log(`${partner.name} 跟踪超时，使用备用方法`);
                        fallbackTracking(trackingUrl, partner.name).then(resolve);
                    }
                }, 3000);
                
                img.onload = img.onerror = () => {
                    if (!completed) {
                        completed = true;
                        clearTimeout(timeout);
                        log(`${partner.name} 图片跟踪完成`, 'success');
                        resolve();
                    }
                };
                
                img.src = trackingUrl;
                
                // 方法2: sendBeacon 并行执行
                if (navigator.sendBeacon) {
                    const beaconData = JSON.stringify({
                        partner: partner.name,
                        ref: window.location.href,
                        timestamp: Date.now()
                    });
                    
                    const success = navigator.sendBeacon(trackingUrl, beaconData);
                    if (success) {
                        log(`${partner.name} sendBeacon已发送`, 'success');
                    }
                }
                
            } catch (error) {
                log(`${partner.name} 跟踪异常: ${error.message}`, 'error');
                resolve();
            }
        });
    }
    
    // 备用跟踪方法
    function fallbackTracking(url, partnerName) {
        return fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            credentials: 'include',
            cache: 'no-cache'
        }).then(() => {
            log(`${partnerName} 备用跟踪成功`, 'success');
        }).catch((error) => {
            log(`${partnerName} 备用跟踪失败: ${error.message}`, 'warning');
        });
    }
    
    // 执行所有联盟跟踪
    function executeAllTracking() {
        if (!shouldTrack()) {
            log('跟踪被跳过 - 用户未同意或配置禁用');
            return;
        }
        
        log(`开始执行联盟跟踪，共${CONFIG.affiliateLinks.length}个合作伙伴`);
        
        const trackingPromises = CONFIG.affiliateLinks.map((partner, index) => {
            return triggerSingleTracking(partner, index);
        });
        
        Promise.allSettled(trackingPromises).then((results) => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            log(`联盟跟踪完成: ${successful}/${CONFIG.affiliateLinks.length} 成功`, 'success');
        });
    }
    
    // 判断是否应该执行跟踪
    function shouldTrack() {
        if (!CONFIG.settings.requireConsent) {
            return true;
        }
        
        const consent = getCookieConsent();
        return consent === 'accepted';
    }
    
    // 页面退出跟踪
    function setupExitTracking() {
        if (!CONFIG.settings.trackPageExit) return;
        
        window.addEventListener('beforeunload', () => {
            if (!shouldTrack() || !navigator.sendBeacon) return;
            
            CONFIG.affiliateLinks.forEach(partner => {
                const exitUrl = partner.url + 
                    (partner.url.includes('?') ? '&' : '?') + 
                    'event=page_exit&ref=' + encodeURIComponent(window.location.href);
                
                navigator.sendBeacon(exitUrl);
            });
            
            log('页面退出跟踪已发送');
        });
    }
    
    // 页面可见性跟踪
    function setupVisibilityTracking() {
        if (!CONFIG.settings.trackVisibilityChange) return;
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && shouldTrack()) {
                CONFIG.affiliateLinks.forEach(partner => {
                    if (navigator.sendBeacon) {
                        const hiddenUrl = partner.url + 
                            (partner.url.includes('?') ? '&' : '?') + 
                            'event=page_hidden&ref=' + encodeURIComponent(window.location.href);
                        
                        navigator.sendBeacon(hiddenUrl);
                    }
                });
                
                log('页面隐藏跟踪已发送');
            }
        });
    }
    
    // ===================== 公共API =====================
    
    // 创建全局API对象
    window.affiliateTracking = {
        // 手动触发跟踪
        trigger: function() {
            log('手动触发联盟跟踪');
            executeAllTracking();
        },
        
        // 接受Cookie
        acceptCookies: function() {
            setCookieConsent('accepted');
            const banner = document.getElementById('affiliate-cookie-banner');
            if (banner) {
                banner.style.display = 'none';
            }
            
            // 立即执行跟踪
            executeAllTracking();
        },
        
        // 拒绝Cookie
        declineCookies: function() {
            setCookieConsent('declined');
            const banner = document.getElementById('affiliate-cookie-banner');
            if (banner) {
                banner.style.display = 'none';
            }
            
            log('用户拒绝了联盟跟踪');
        },
        
        // 获取配置
        getConfig: function() {
            return CONFIG;
        },
        
        // 检查跟踪状态
        isTrackingEnabled: function() {
            return shouldTrack();
        }
    };
    
    // ===================== 初始化 =====================
    
    function initialize() {
        log('联盟跟踪脚本初始化开始');
        
        // 设置退出跟踪
        setupExitTracking();
        
        // 设置可见性跟踪
        setupVisibilityTracking();
        
        // 检查是否需要显示Cookie横幅
        createCookieBanner();
        
        // 如果用户之前已同意，或不需要同意，则自动触发跟踪
        if (shouldTrack()) {
            setTimeout(() => {
                executeAllTracking();
            }, CONFIG.settings.autoTriggerDelay);
        }
        
        log('联盟跟踪脚本初始化完成');
    }
    
    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();