export interface RSSFeed {
  id?: number; // 自增ID
  name: string;
  url: string;
  cssSelector: string;
  subjectList: {
    title: string
    link: string
  }[];
  createdAt: Date;
  updatedAt: Date;
  latestCount: number;
}

export default class RSSDatabase {
  private dbName: string = 'RSSSubscribeDB';
  private dbVersion: number = 1;
  private storeName: string = 'feeds';
  private db: IDBDatabase | null = null;

  // 从follow.json导入数据
  public async importFeedsFromFollowJson(): Promise<void> {
    if (!this.db) return

    try {
      const response = await fetch(chrome.runtime.getURL('follow.json'));
      const { default: feeds } = await response.json();

      for (const feed of feeds) {
        const existingFeed = await this.getFeedByUrl(feed.url);
        if (!existingFeed) {
          await this.addFeed({ ...feed, subjectList: [] });
        }
      }
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }

  // 初始化数据库
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Database error:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBRequest).result as IDBDatabase;
        console.log('Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result as IDBDatabase;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
          
          // 创建索引
          store.createIndex('nameIndex', 'name', { unique: false });
          store.createIndex('urlIndex', 'url', { unique: true });
          store.createIndex('createdAtIndex', 'createdAt', { unique: false });
        }
      };
    });
  }

  // 添加订阅
  public async addFeed(feed: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt' | 'latestCount'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const completeFeed: RSSFeed = {
      ...feed,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.add(completeFeed);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 获取所有订阅
  public async getAllFeeds(): Promise<RSSFeed[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as RSSFeed[]);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 根据ID获取订阅
  public async getFeedById(id: number): Promise<RSSFeed | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as RSSFeed | undefined);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 根据URL获取订阅
  public async getFeedByUrl(url: string): Promise<RSSFeed | undefined> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('urlIndex');

      const request = index.get(url);

      request.onsuccess = () => {
        resolve(request.result as RSSFeed | undefined);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 更新订阅
  public async updateFeed(id: number, updates: Partial<RSSFeed>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise(async (resolve, reject) => {
      // 先获取现有数据
      const existingFeed = await this.getFeedById(id);
      if (!existingFeed) {
        reject(new Error('Feed not found'));
        return;
      }

      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const updatedFeed: RSSFeed = {
        ...existingFeed,
        ...updates,
        updatedAt: new Date()
      };

      const request = store.put(updatedFeed);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 更新最新发布数量
  public async updateLatestCount(id: number, newCount: number): Promise<void> {
    return this.updateFeed(id, { latestCount: newCount });
  }

  // 删除订阅
  public async deleteFeed(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // 清空所有订阅
  public async clearAllFeeds(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }
}