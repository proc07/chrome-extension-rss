// 引入 RSSDatabase
import RSSDatabase, {RSSFeed} from './utils/IndexedDB';

let isInitialized = false;
const db = new RSSDatabase();
// Initialize database immediately
(async () => {
  await db.init();
  isInitialized = true;

  // 初始化后自动导入follow.json数据
  try{
    await db.importFeedsFromFollowJson();
  } catch (error) {
    console.error('导入数据失败:', error);
  }
})();

// 新增消息监听
chrome.runtime.onMessage.addListener(async (message) => {
  // 发送开始loading状态
  chrome.runtime.sendMessage({type: 'FEEDS_UPDATE_START'});

  if (message.type === 'PAGE_REFRESH') {
    console.log('PAGE_REFRESH -> ', isInitialized);
    if (!isInitialized) {
      await db.init();
      isInitialized = true;
    }

    try {
      const concurrentNumber = 3;
      const allFeeds = await db.getAllFeeds();

      for (let i = 0; i < allFeeds.length; i += concurrentNumber) {
        const batch = allFeeds.slice(i, i + concurrentNumber);
        await Promise.allSettled(batch.map(feed => handleFeedsUpdate(feed)));
      }
      // 发送结束loading状态
      chrome.runtime.sendMessage({type: 'FEEDS_UPDATE_END', success: true});
    } catch (error) {
      // 发送错误状态
      chrome.runtime.sendMessage({type: 'FEEDS_UPDATE_END', success: false});
    }
  } else if (message.type === 'ADD_FEED') {
    try {
      await handleFeedsUpdate(message.payload as RSSFeed)
      chrome.runtime.sendMessage({type: 'FEED_UPDATE_END', success: true});
    } catch (error) {
      chrome.runtime.sendMessage({type: 'FEED_UPDATE_END', success: false});
    }
  }
});

async function handleFeedsUpdate(feed: RSSFeed) {
  const { id, name, url, cssSelector } = feed;
  if (!url || !cssSelector || !id) {
    console.log(`跳过无效订阅（id: ${id}）: 缺少url或cssSelector`);
    return;
  }

  try {
    // 打开目标页面
    const newTab = await chrome.tabs.create({ url, active: false });

    if (!newTab.id) {
      console.error('创建新标签页失败');
      return;
    }

    // 等待页面加载完成或超时（5秒）
    const [result] = await Promise.race([
      // 页面加载完成事件
      new Promise((resolve) => {
        const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            resolve([true]); // 页面加载完成标记
          }
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);
      }),
      // 超时处理
      new Promise(resolve => setTimeout(() => resolve([false]), 5500))
    ]);

    if (!result) {
      console.log(`页面超时未加载（url: ${url}）`);
      chrome.tabs.remove(newTab.id);
      return;
    }

    // 执行脚本获取元素
    type ScriptResult = Promise<Array<{ title: string; link: string }>>
    const [queryResult] = await chrome.scripting.executeScript<[string], ScriptResult>({
      target: { tabId: newTab.id },
      func: async (selector) => {
        // 定义最大尝试次数，这里设置为10次，即最多尝试10秒
        const maxAttempts = 5;
        let attempts = 0;

        while (attempts < maxAttempts) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).map(el => ({
              title: el.textContent?.trim() || '',
              link: el.href || ''
            }));
          }
          // 等待1秒后再次尝试
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        // 如果尝试了最大次数仍未找到元素，返回空数组
        return [];
      },
      args: [cssSelector] // 传递cssSelector参数
    });
    // 处理获取结果
    let newAddedCount = 0;
    if (queryResult.result && queryResult.result?.length > 0) {
      // 合并去重 oldSubjectList 和 queryResult.result
      const oldSubjectList = feed.subjectList || [];
      const newSubjectList = queryResult.result;
      const merged = [...oldSubjectList];
      const existTitles = new Set(oldSubjectList.map(item => item.title));
      for (const item of newSubjectList) {
        if (!existTitles.has(item.title)) {
          merged.push(item);
          existTitles.add(item.title);
          newAddedCount++
        }
      }
      await db.updateFeed(id, {
        ...feed,
        subjectList: merged,
        latestCount: newAddedCount
      });
      console.log(`成功更新订阅（${name}），获取到${queryResult.result.length}个元素，合并后共${merged.length}个元素`);
    } else {
      console.error(`未找到匹配元素（selector: ${cssSelector}）`);
    }

    // 关闭临时标签页
    chrome.tabs.remove(newTab.id);
  } catch (error) {
    console.error(`处理订阅（id: ${id}）失败:`, error);
  }
}


// 原标签页监听逻辑（根据实际需求保留或移除）
// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => { ... });