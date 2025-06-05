async function getFollows() {
  const response = await fetch("https://raw.githubusercontent.com/proc07/chrome-extension-rss/refs/heads/main/public/follow.json");
  const data = await response.json();
  return data;
}
class RSSDatabase {
  constructor() {
    this.dbName = "RSSSubscribeDB";
    this.dbVersion = 1;
    this.storeName = "feeds";
    this.db = null;
  }
  // 从follow.json导入数据
  async importFeedsFromFollowJson() {
    if (!this.db) return;
    try {
      const data = await getFollows();
      const { default: feeds } = data;
      for (const feed of feeds) {
        const existingFeed = await this.getFeedByUrl(feed.url);
        if (!existingFeed) {
          await this.addFeed({ ...feed, subjectList: [] });
        }
      }
    } catch (error) {
      throw error;
    }
  }
  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = (event) => {
        console.error("Database error:", event.target.error);
        reject(event.target.error);
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("Database initialized");
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db2 = event.target.result;
        if (!db2.objectStoreNames.contains(this.storeName)) {
          const store = db2.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true
          });
          store.createIndex("nameIndex", "name", { unique: false });
          store.createIndex("urlIndex", "url", { unique: true });
          store.createIndex("createdAtIndex", "createdAt", { unique: false });
        }
      };
    });
  }
  // 添加订阅
  async addFeed(feed) {
    if (!this.db) throw new Error("Database not initialized");
    const completeFeed = {
      ...feed,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      latestCount: 0
    };
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(completeFeed);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 获取所有订阅
  async getAllFeeds() {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 根据ID获取订阅
  async getFeedById(id) {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 根据URL获取订阅
  async getFeedByUrl(url) {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("urlIndex");
      const request = index.get(url);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 更新订阅
  async updateFeed(id, updates) {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise(async (resolve, reject) => {
      const existingFeed = await this.getFeedById(id);
      if (!existingFeed) {
        reject(new Error("Feed not found"));
        return;
      }
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const updatedFeed = {
        ...existingFeed,
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const request = store.put(updatedFeed);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 更新最新发布数量
  async updateLatestCount(id, newCount) {
    return this.updateFeed(id, { latestCount: newCount });
  }
  // 删除订阅
  async deleteFeed(id) {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  // 清空所有订阅
  async clearAllFeeds() {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}
let isInitialized = false;
const db = new RSSDatabase();
(async () => {
  await db.init();
  isInitialized = true;
  console.log("Background.js: IndexedDB initialized");
  try {
    await db.importFeedsFromFollowJson();
  } catch (error) {
    console.error("导入数据失败:", error);
  }
})();
chrome.runtime.onMessage.addListener(async (message) => {
  if (!isInitialized) {
    await db.init();
    isInitialized = true;
  }
  chrome.runtime.sendMessage({ type: "FEEDS_UPDATE_START" });
  if (message.type === "PAGE_REFRESH") {
    try {
      const concurrentNumber = 3;
      const allFeeds = await db.getAllFeeds();
      for (let i = 0; i < allFeeds.length; i += concurrentNumber) {
        const batch = allFeeds.slice(i, i + concurrentNumber);
        await Promise.allSettled(batch.map((feed) => handleFeedsUpdate(feed)));
      }
      chrome.runtime.sendMessage({ type: "FEEDS_UPDATE_END", success: true });
    } catch (error) {
      chrome.runtime.sendMessage({ type: "FEEDS_UPDATE_END", success: false });
    }
  } else if (message.type === "ADD_FEED") {
    try {
      const feedId = await db.addFeed({
        ...message.payload,
        subjectList: []
      });
      await handleFeedsUpdate({
        ...message.payload,
        id: feedId
      });
      chrome.runtime.sendMessage({ type: "FEED_UPDATE_END", success: true });
    } catch (error) {
      chrome.runtime.sendMessage({ type: "FEED_UPDATE_END", success: false });
    }
  }
});
async function handleFeedsUpdate(feed) {
  var _a;
  const { id, name, url, cssSelector } = feed;
  if (!url || !cssSelector || !id) {
    console.log(`跳过无效订阅（id: ${id}）: 缺少url或cssSelector`);
    return;
  }
  try {
    const newTab = await chrome.tabs.create({ url, active: false });
    if (!newTab.id) {
      console.error("创建新标签页失败");
      return;
    }
    const [result] = await Promise.race([
      // 页面加载完成事件
      new Promise((resolve) => {
        const onTabUpdated = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            resolve([true]);
          }
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);
      }),
      // 超时处理
      new Promise((resolve) => setTimeout(() => resolve([false]), 5500))
    ]);
    if (!result) {
      console.log(`页面超时未加载（url: ${url}）`);
      chrome.tabs.remove(newTab.id);
      return;
    }
    const [queryResult] = await chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      func: async (selector) => {
        const maxAttempts = 5;
        let attempts = 0;
        while (attempts < maxAttempts) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).map((el) => {
              var _a2;
              return {
                title: ((_a2 = el.textContent) == null ? void 0 : _a2.trim()) || "",
                link: el.href || ""
              };
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          attempts++;
        }
        return [];
      },
      args: [cssSelector]
      // 传递cssSelector参数
    });
    let newAddedCount = 0;
    if (queryResult.result && ((_a = queryResult.result) == null ? void 0 : _a.length) > 0) {
      const oldSubjectList = feed.subjectList || [];
      const newSubjectList = queryResult.result;
      const merged = [...oldSubjectList];
      const existTitles = new Set(oldSubjectList.map((item) => item.title));
      for (const item of newSubjectList) {
        if (!existTitles.has(item.title)) {
          merged.push(item);
          existTitles.add(item.title);
          newAddedCount++;
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
    chrome.tabs.remove(newTab.id);
  } catch (error) {
    console.error(`处理订阅（id: ${id}）失败:`, error);
  }
}
