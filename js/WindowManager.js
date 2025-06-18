/**
 * 窗口管理器对象
 * @namespace
 */
const WindowManager = (function() {
  // 全局状态
  const state = {
    windows: [], // 所有打开的窗口 {id, element, appPath}
    maxZIndex: 100, // 当前最大z-index值
    activeWindow: null, // 当前活动窗口
    currentMove: null // 当前移动的窗口信息
  };
  
  // 日志记录函数
  const log = (message) => {
    console.log(`窗口管理器：${message}`);
  };
  
  /**
   * 生成唯一窗口ID
   * @returns {string} 唯一窗口ID
   */
  const generateWindowId = () => {
    return `win_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  };
  
  /**
   * 创建新窗口
   * @param {string} appPath - 应用路径
   * @param {string|number} [width=400] - 窗口宽度（默认400）
   * @param {string|number} [height=300] - 窗口最大高度（默认300）
   * @param {string|number} [top=auto] - 窗口顶边
   * @param {string|number} [left=auto] - 窗口左边
   * @param {string|number} [bottom=auto] - 窗口底边
   * @param {string|number} [right=auto] - 窗口右边
   * @param {boolean} [checkDuplicate=false] - 是否检查重复窗口
   * @returns {Promise<HTMLElement>} 创建的窗口元素
   */
  const createWindow = async (
    appPath,
    width = '400',
    height = '300',
    top = 'auto',
    left = 'auto',
    bottom = 'auto',
    right = 'auto',
    checkDuplicate = false
  ) => {
    try {
      log(`创建：${appPath}`);
      
      // 检查重复窗口
      if (checkDuplicate) {
        const existingWindow = state.windows.find(win => win.appPath === appPath);
        if (existingWindow) {
          log(`创建：检测到重复窗口：${existingWindow.id}`);
          activateWindow(existingWindow.element);
          return existingWindow.element;
        }
      }
      
      // 获取应用内容
      const response = await fetch(appPath);
      if (!response.ok) throw new Error(`创建：错误：${response.status} ${response.statusText}`);
      const appContent = await response.text();
      log(`创建：${appPath}：找到`);
      
      // 创建窗口元素
      const windowElement = document.createElement('div');
      const windowId = generateWindowId();
      windowElement.dataset.windowId = windowId;
      
      Object.assign(windowElement.style, {
        position: 'absolute',
        width: typeof width === 'number' ? `${width}px` : width,
        maxHeight: typeof height === 'number' ? `${height}px` : height,
        top: typeof top === 'number' ? `${top}px` : top,
        left: typeof left === 'number' ? `${left}px` : left,
        bottom: typeof bottom === 'number' ? `${bottom}px` : bottom,
        right: typeof right === 'number' ? `${right}px` : right,
        zIndex: state.maxZIndex + 1
      });
      state.maxZIndex += 1;
      
      // 填充内容并添加到DOM
      windowElement.innerHTML = appContent;
      document.body.appendChild(windowElement);
      log(`创建：${windowId}：添加到DOM：完成`);
      
      // 管理窗口状态
      const windowData = {
        id: windowId,
        element: windowElement,
        appPath: appPath
      };
      state.windows.push(windowData);
      bindWindowEvents(windowElement);
      activateWindow(windowElement);
      
      log(`创建：${windowId}：完成`);
      return windowElement;
    } catch (error) {
      log(`创建：失败：${error.message}`);
      console.error(error);
      return null;
    }
  };
  
  /**
   * 创建居中窗口
   * @param {string} appPath - 应用路径
   * @param {number} [width=400] - 窗口宽度（默认400）
   * @param {number} [height=300] - 窗口高度（默认300）
   * @param {boolean} [checkDuplicate=false] - 是否检查重复窗口
   * @returns {Promise<HTMLElement>} 创建的窗口元素
   */
  const createCenteredWindow = async (
    appPath,
    width = 400,
    height = 300,
    checkDuplicate = false
  ) => {
    try {
      // 计算居中位置
      const top = (window.innerHeight - height) / 2;
      const left = (window.innerWidth - width) / 2;
      
      // 调用通用窗口创建函数
      return await createWindow(
        appPath,
        width,
        height,
        top,
        left,
        'auto',
        'auto',
        checkDuplicate
      );
    } catch (error) {
      log(`居中创建：失败：${error.message}`);
      console.error(error);
      return null;
    }
  };
  
  /**
   * 激活指定窗口
   * @param {HTMLElement} windowElement - 要激活的窗口元素
   */
  const activateWindow = (windowElement) => {
    const windowId = windowElement.dataset.windowId || '未知窗口';
    log(`激活：${windowId}`);
    
    // 更新窗口状态
    state.activeWindow = windowElement;
    
    // 增加z-index使其位于顶部
    state.maxZIndex += 1;
    windowElement.style.zIndex = state.maxZIndex;
    
    log(`激活：${windowId}：zIndex：${state.maxZIndex}`);
    
    // 移除所有窗口的激活状态
    state.windows.forEach(win => {
      const titleBar = win.element.querySelector('.title-bar');
      if (titleBar) {
        titleBar.classList.add('inactive');
      }
    });
    
    // 设置当前窗口为激活状态
    const currentTitleBar = windowElement.querySelector('.title-bar');
    if (currentTitleBar) {
      currentTitleBar.classList.remove('inactive');
    }
    
    log(`激活：${windowId}：完成`);
  };
  
  /**
   * 开始移动窗口
   * @param {HTMLElement} windowElement - 要移动的窗口元素
   * @param {MouseEvent|TouchEvent} event - 触发事件
   */
  const startMove = (windowElement, event) => {
    const windowId = windowElement.dataset.windowId || '未知窗口';
    // 激活窗口
    activateWindow(windowElement);
    
    log(`窗口：${windowId}：移动：开始`);
    
    // 获取初始位置
    const rect = windowElement.getBoundingClientRect();
    let clientX, clientY;
    
    if (event.type === 'touchstart') {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    // 保存移动状态
    state.currentMove = {
      windowElement,
      startX: clientX,
      startY: clientY,
      windowStartX: rect.left,
      windowStartY: rect.top,
      isTouch: event.type === 'touchstart'
    };
    
    // 添加事件监听器
    const eventTypes = state.currentMove.isTouch ? ['touchmove', 'touchend'] : ['mousemove', 'mouseup'];
    
    eventTypes.forEach(type => {
      document.addEventListener(type, type === 'touchmove' || type === 'mousemove' ? handleMove : endMove);
    });
  };
  
  /**
   * 处理窗口移动
   * @param {MouseEvent|TouchEvent} event - 移动事件
   */
  const handleMove = (event) => {
    if (!state.currentMove) return;
    
    let clientX, clientY;
    
    if (state.currentMove.isTouch) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    // 计算移动距离
    const deltaX = clientX - state.currentMove.startX;
    const deltaY = clientY - state.currentMove.startY;
    
    // 更新窗口位置
    state.currentMove.windowElement.style.left = `${state.currentMove.windowStartX + deltaX}px`;
    state.currentMove.windowElement.style.top = `${state.currentMove.windowStartY + deltaY}px`;
  };
  
  /**
   * 结束窗口移动
   */
  const endMove = () => {
    if (!state.currentMove) return;
    
    const windowId = state.currentMove.windowElement.dataset.windowId || '未知窗口';
    log(`移动：${windowId}：结束`);
    
    // 移除事件监听器
    const eventTypes = state.currentMove.isTouch ? ['touchmove', 'touchend'] : ['mousemove', 'mouseup'];
    
    eventTypes.forEach(type => {
      document.removeEventListener(type, type === 'touchmove' || type === 'mousemove' ? handleMove : endMove);
    });
    
    state.currentMove = null;
  };
  
  /**
   * 关闭窗口
   * @param {HTMLElement} windowElement - 要关闭的窗口元素
   */
  const closeWindow = (windowElement) => {
    const windowId = windowElement.dataset.windowId || '未知窗口';
    log(`关闭：${windowId}`);
    
    // 从DOM中移除
    windowElement.remove();
    
    // 从窗口列表中移除
    const index = state.windows.findIndex(win => win.element === windowElement);
    if (index !== -1) {
      state.windows.splice(index, 1);
    }
    
    // 如果关闭的是活动窗口，尝试激活另一个窗口
    if (state.activeWindow === windowElement) {
      state.activeWindow = null;
      if (state.windows.length > 0) {
        activateWindow(state.windows[state.windows.length - 1].element);
      }
    }
    
    log(`关闭：${windowId}：完成`);
  };
  
  /**
   * 绑定窗口事件
   * @param {HTMLElement} windowElement - 窗口元素
   */
  const bindWindowEvents = (windowElement) => {
    const windowId = windowElement.dataset.windowId || '未知窗口';
    log(`绑定事件：${windowId}`);
    
    const titleBar = windowElement.querySelector('.title-bar');
    const closeButton = windowElement.querySelector('.title-bar-controls [aria-label="Close"]');
    
    if (!titleBar) {
      log('绑定事件：缺少标题栏');
      return;
    }
    
    // 事件处理器工厂函数
    const createEventHandler = (handler) => (e) => {
      if (closeButton && (e.target === closeButton || closeButton.contains(e.target))) {
        return;
      }
      handler(e);
    };
    
    // 标题栏点击激活窗口
    const activateHandler = () => activateWindow(windowElement);
    titleBar.addEventListener('mousedown', createEventHandler(activateHandler));
    titleBar.addEventListener('touchstart', createEventHandler(activateHandler));
    
    // 窗口内容点击激活窗口
    const windowBody = windowElement.querySelector('.window-body');
    if (windowBody) {
      windowBody.addEventListener('mousedown', activateHandler);
      windowBody.addEventListener('touchstart', activateHandler);
    }
    
    // 窗口状态栏点击激活窗口
    const windowStatusBar = windowElement.querySelector('.status-bar');
    if (windowBody) {
      windowStatusBar.addEventListener('mousedown', activateHandler);
      windowStatusBar.addEventListener('touchstart', activateHandler);
    }

    // 标题栏拖动事件
    const startMoveHandler = (e) => startMove(windowElement, e);
    titleBar.addEventListener('mousedown', createEventHandler(startMoveHandler));
    titleBar.addEventListener('touchstart', createEventHandler(startMoveHandler));
    
    // 关闭按钮事件
    if (closeButton) {
      const closeHandler = () => closeWindow(windowElement);
      closeButton.addEventListener('click', closeHandler);
      
      // 添加触摸关闭支持
      closeButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        closeHandler();
      });
    } else {
      log('绑定事件：缺少关闭按钮');
    }
  };
  
  // 公共API
  return {
    createWindow,
    createCenteredWindow,
    activateWindow,
    closeWindow,
    getWindows: () => state.windows.map(win => win.element),
    getActiveWindow: () => state.activeWindow
  };
})();