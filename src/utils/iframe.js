let _iframeWindow = null

function clearIframeWindow() {
    _iframeWindow = null
}

export function onIframeLoad(event, onSelectGroup = (elementGroups) => {}) {
    const iframe = event.target
    // 获取iframe的contentWindow
    _iframeWindow = iframe?.contentWindow;

    if (!_iframeWindow) {
        return;
    }
    _iframeWindow.addEventListener('unload', clearIframeWindow);
    
    // 创建并注入样式
    const style = _iframeWindow.document.createElement("style");
    style.innerHTML = `
    .feedly-hovered--0 {
      background-color: rgb(57, 121, 204, 0.16) !important;
      outline: 2px dashed #3979CC !important;
      outline-offset: -2px !important;
    }
    .feedly-hovered--1 {
      background-color: rgba(244, 67, 54, 0.16) !important;
      outline: 2px dashed #F44336 !important;
      outline-offset: -2px !important;
    }
    .feedly-hovered--2 {
      background-color: rgba(255, 238, 85, 0.16) !important;
      outline: 2px dashed #FFEE55 !important;
      outline-offset: -2px !important;
    }
    .feedly-selected {
      background-color: rgba(43, 178, 76, 0.16) !important;
      outline: 2px dashed #2bb24c !important;
      outline-offset: -2px !important;
    }
    `;
    _iframeWindow.document.head.appendChild(style);
    
    // 初始化选择器缓存
    const selectorCache = {};
    const selectorMap = {};
    
    // 处理所有链接元素
    _iframeWindow.document.querySelectorAll("a").forEach(link => {
        if (!link.href) {
            return;
        }
        
        // 验证URL协议
        try {
            const url = new URL(link.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return;
            }
        } catch (error) {
            console.warn(error);
            return;
        }
  
        // 获取相似元素并绑定事件
        const similarElements = _getSimilarElements(link, selectorCache, selectorMap);
        if (similarElements.length) {
            link.addEventListener("click", (event) => {
                _onClickElement(event, similarElements, onSelectGroup);
            });
            
            link.addEventListener("mouseenter", () => {
                _onMouseEnter(similarElements);
            });
            
            link.addEventListener("mouseleave", () => {
                _onMouseLeave(similarElements);
            });
        }
    });
  }

/**
 * 获取与给定元素结构相似的元素
 * @param {HTMLElement} element - 目标元素
 * @param {Object} selectorCache - 选择器缓存对象
 * @param {Object} selectorMap - 选择器映射对象
 * @returns {Array} 包含相似元素信息的数组
 */
function _getSimilarElements(element, selectorCache, selectorMap) {
  let currentElement = element;
  let level = 0;
  const pathElements = [currentElement];
  
  // 向上遍历DOM树最多4层
  while (level < 4 && (level += 1, currentElement = currentElement.parentNode, currentElement && currentElement.tagName !== "HTML")) {
      pathElements.unshift(currentElement);
  }
  
  // 如果只有一个子元素且不是SVG或BR标签，则加入子元素
  const firstChild = element.firstElementChild;
  if (element.children && element.children.length === 1 && 
      firstChild && 
      firstChild.tagName.toLowerCase() !== "svg" && 
      firstChild.tagName.toLowerCase() !== "br") {
      pathElements.push(firstChild);
  }
  
  // 生成CSS选择器路径
  const selectorPath = _getSelector(pathElements);
  const fullSelector = selectorPath.join(", ");
  
  let matchedElements, bestSelector;
  
  // 检查缓存
  if (selectorMap[fullSelector]) {
      bestSelector = selectorMap[fullSelector];
      matchedElements = selectorCache[bestSelector];
  } else {
      try {
          // 获取完整选择器匹配的所有元素数量
          const totalMatches = _iframeWindow.document.querySelectorAll(fullSelector).length;
          const selectorParts = [...selectorPath];
          let currentSelectorParts = [];
          let currentMatchCount = 0;
          
          do {
              // 逐步构建选择器
              currentSelectorParts = [...currentSelectorParts, selectorParts.shift()];
              bestSelector = currentSelectorParts.join(", ");
              matchedElements = selectorCache[bestSelector];
              
              // 如果缓存中没有，则查询DOM并缓存结果
              if (!matchedElements) {
                  matchedElements = _iframeWindow.document.querySelectorAll(bestSelector);
                  selectorCache[bestSelector] = matchedElements;
              }
              
              // 如果匹配数量没有增加，则回退一步
              if (currentMatchCount === matchedElements.length) {
                  currentSelectorParts.pop();
              }
              
              currentMatchCount = matchedElements.length;
          } while (totalMatches > matchedElements.length);
          
          // 缓存最佳选择器
          selectorMap[fullSelector] = bestSelector;
      } catch (error) {
          console.warn("Selector error: ", error);
          return [];
      }
  }
  
  return [{
      elements: matchedElements,
      cssSelector: bestSelector
  }];
}

/**
 * 为DOM元素路径生成CSS选择器
 * @param {Array<HTMLElement>} elements - DOM元素数组（通常是从子到父的路径）
 * @returns {Array<string>} 可能的CSS选择器数组
 */
function _getSelector(elements) {
    // 提取每个元素的有效class列表
    const validClassesPerElement = elements.map(element => {
        const { classList, tagName } = element;
        
        // 跳过TR元素（表格行可能有动态类）
        if (tagName === 'TR') return [];
        
        // 过滤并转义有效的class名
        return [...classList].reduce((acc, className) => {
            if (_isValidClassName(className)) {
                acc.push(CSS.escape(className.trim()));
            }
            return acc;
        }, []);
    });
    
    const resultSelectors = [];
    const lastIndex = elements.length - 1;
    
    // 递归生成选择器组合
    function buildSelector(currentPath, currentIndex) {
        const currentClasses = validClassesPerElement[currentIndex];
        
        if (currentClasses.length > 0) {
            // 有有效class的情况：生成带class的选择器分支
            for (const cls of currentClasses) {
                const newPath = [...currentPath, `${elements[currentIndex].tagName}.${cls}`];
                
                if (currentIndex === lastIndex) {
                    resultSelectors.push(newPath);
                } else {
                    buildSelector(newPath, currentIndex + 1);
                }
            }
        } else {
            // 无有效class的情况：只用标签名
            const newPath = [...currentPath, elements[currentIndex].tagName];
            
            if (currentIndex === lastIndex) {
                resultSelectors.push(newPath);
            } else {
                buildSelector(newPath, currentIndex + 1);
            }
        }
    }
    
    // 从第一个元素(index=0)开始构建
    buildSelector([], 0);
    
    // 将路径数组转换为字符串（用 > 连接）
    return resultSelectors.map(selectorParts => selectorParts.join(' > '));
}
const f = /(\.|\[|\]|,|=|@|!|#|\$|%|&|'|\*|\+|\/|\?|\^|\{|\||\}|~|;)/;
const g = /\d{6}$/
const S = /[0-9a-f]{32}/
const E = ["[", "]", "(", ")", "spacing", "font", "footer", "header", "hide", "copyright", "poweredby", "center", "theme", "odd", "even"];
/**
 * 检查类名是否有效
 * @param {string} className - 要检查的CSS类名
 * @returns {boolean} 类名是否有效
 */
function _isValidClassName(className) {
    // 预定义的排除规则（假设这些已在外部定义）
    const excludeRegex1 = f;  // 第一个排除正则
    const excludeRegex2 = g;  // 第二个排除正则 
    const excludeRegex3 = S;  // 第三个排除正则
    const excludeSubstrings = E; // 排除的子字符串数组
    
    // 1. 检查空值
    if (!className) {
        return false;
    }
    
    // 2. 检查排除的正则表达式
    if (excludeRegex1.test(className) || 
        excludeRegex2.test(className) || 
        excludeRegex3.test(className)) {
        return false;
    }
    
    // 3. 检查排除的子字符串
    for (let i = 0; i < excludeSubstrings.length; i += 1) {
        if (className.includes(excludeSubstrings[i])) {
            return false;
        }
    }
    
    // 通过所有检查
    return true;
}

/**
* 处理元素点击事件
* @param {Event} event - 点击事件对象
* @param {Array} elementGroups - 通过_getSimilarElements获取的元素组数组
*/
function _onClickElement(event, elementGroups, onSelectGroup) {
   // 阻止默认行为（如链接跳转）
   event.preventDefault();

   // 确保有有效的元素组
   if (elementGroups.length) {
       // 移除所有现有的高亮
       _iframeWindow.document.querySelectorAll(".feedly-selected").forEach(element => {
           element.classList.remove("feedly-selected");
       });

       // 获取第一个元素组中的所有元素
       const { elements } = elementGroups[0];
       
       // 为这些元素添加高亮类（如果尚未添加）
       elements.forEach(element => {
           if (!element.className.includes("feedly-selected")) {
               element.classList.add("feedly-selected");
           }
       });
       
       // 调用父组件的回调函数，传递选择的元素组
       onSelectGroup && onSelectGroup(elementGroups[0]);
   }
}

/**
 * 处理鼠标移入事件，添加悬停高亮
 * @param {Array} elementGroups - 通过_getSimilarElements获取的元素组数组
 */
function _onMouseEnter(elementGroups) {
    elementGroups.forEach((group, index) => {
        const { elements } = group;
        elements.forEach(element => {
            // 如果元素没有悬停类，则添加对应索引的悬停类
            if (!element.className.includes("feedly-hovered")) {
                element.classList.add(`feedly-hovered--${index}`);
            }
        });
    });
}

/**
 * 处理鼠标移出事件，移除悬停高亮
 * @param {Array} elementGroups - 通过_getSimilarElements获取的元素组数组
 */
function _onMouseLeave(elementGroups) {
    elementGroups.forEach((group, index) => {
        const { elements } = group;
        elements.forEach(element => {
            // 移除对应索引的悬停类
            element.classList.remove(`feedly-hovered--${index}`);
        });
    });
}