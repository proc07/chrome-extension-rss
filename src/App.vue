<template>
  <UApp>
    <div class="fixed inset-0 flex overflow-hidden">
      <div class="relative hidden lg:flex flex-col min-h-svh min-w-16 w-(--width) shrink-0 border-r border-default bg-elevated/25">
        <div class="flex flex-col gap-4 flex-1 overflow-y-auto px-4 py-2">
          <UNavigationMenu orientation="vertical" :items="navigationBarItems" class="data-[orientation=vertical]:w-48" />      
        </div>
      </div>
      <div class="overflow-y-auto relative flex flex-col min-w-0 min-h-svh lg:not-last:border-r lg:not-last:border-default flex-1">
        <div class="flex flex-col items-center gap-4 w-full max-w-xl mx-auto p-4">
          <!-- 搜索引擎切换按钮 -->
          <div class="flex gap-2">
            <UButton
              v-for="engine in searchEngines"
              :key="engine.name"
              :icon="engine.icon"
              :color="currentEngine === engine.name ? 'primary' : 'neutral'"
              variant="ghost"
              @click="switchEngine(engine.name)"
            />
          </div>

          <!-- 搜索框 -->
          <form class="flex w-full gap-2" @submit.prevent="handleSearch">
            <UInput
              v-model="searchQuery"
              size="xl"
              variant="outline"
              :placeholder="`在 ${searchEngines.find(e => e.name === currentEngine)?.label || ''} 中搜索...`"
              class="flex-1"
              icon="i-lucide-search"
            />
          </form>

          <!-- 刷新按钮和最后更新时间 -->
          <div class="flex items-center justify-between w-full gap-4">
            <UButton
              :loading="loadingFeeds"
              :disabled="loadingFeeds"
              icon="i-lucide-refresh-cw"
              variant="outline"
              @click="refreshFeeds"
            >
              {{ loadingFeeds ? 'Refreshing...' : 'Refresh Feeds' }}
            </UButton>
            <div class="text-sm text-gray-500 flex items-center gap-1">
              <UIcon name="i-lucide-clock" class="w-4 h-4" />
              <span v-if="lastUpdateTime">
                Last updated: {{ formatTime(lastUpdateTime) }}
              </span>
              <span v-else>
                No update records yet
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col h-full overflow-hidden">
          <!-- 使用UTabs组件替换左侧Feed标题列表 -->
          <UTabs
            v-model="selectedFeed"
            :items="feedTabItems"
            orientation="vertical"
            class="h-full items-start"
            :ui="{
              list: 'overflow-y-auto max-h-full',
              trigger: 'w-full h-auto py-2 px-3'
            }"
          >
            <template #default="{ item, index }">
              <div class="flex justify-between w-full">
                <UTooltip
                  arrow
                  :content="{ align: 'center', side: 'right', sideOffset: 8 }"
                  :text="item.label"
                >
                  <span class="truncate">{{ item.label }}</span>
                </UTooltip>
                <UBadge v-if="item.badge && item.badge > 0" color="primary" size="xs">{{ item.badge }}</UBadge>
              </div>
            </template>
            <template #content>
              <!-- 右侧 Feed 内容 -->
              <div class="flex-1 h-[calc(100vh-168px)] overflow-y-auto">
                <FeedList 
                  v-if="selectedFeed !== null && getFeedById(Number(selectedFeed))" 
                  :data="getFeedById(Number(selectedFeed))" 
                />
                <div v-else class="flex items-center justify-center h-full text-gray-500">
                  <p>请选择一个订阅源</p>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      
      </div>
    </div>

    <!-- 订阅编辑模态框 -->
    <UModal v-model:open="openSubscribeModal" :dismissible="false" title="Edit RSS" :description="subscribeInfo.name" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm
          id="settings"
          :state="subscribeInfo"
        >
          <UPageCard variant="subtle">
            <UFormField
              name="name"
              label="Name"
              required
              class="flex max-sm:flex-col justify-between items-start gap-4"
            >
              <UInput
                v-model="subscribeInfo.name"
                autocomplete="off"
                class="w-[300px]"
              />
            </UFormField>
            <USeparator />
            <UFormField
              name="url"
              label="Website url"
              required
              class="flex max-sm:flex-col justify-between items-start gap-4"
            >
              <UInput
                v-model="subscribeInfo.url"
                type="cssSelector"
                autocomplete="off"
                class="w-[300px]"
              />
            </UFormField>
            <USeparator />
            <UFormField
              name="cssSelector"
              label="Css Selector"
              class="flex max-sm:flex-col justify-between items-start gap-4"
            >
              <UTextarea
                v-model="subscribeInfo.cssSelector"
                :rows="5"
                autoresize
                 class="w-[300px]"
              />
            </UFormField>
          </UPageCard>
        </UForm>
      </template>

      <template #footer>
        <div class="w-full flex justify-between items-center">
          <UButton label="Delete" color="error" @click="onDelete" />
          <div>
            <UButton label="Cancel" color="neutral" variant="outline" @click="openSubscribeModal = false" />
            <UButton label="Submit" color="neutral" @click="onSubmit" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- 推荐订阅源模态框 -->
    <UModal v-model:open="openRecommendModal" :fullscreen="true" :dismissible="false" title="推荐订阅源">
      <template #body>
        <RecommendedFeeds :onClose="() => openRecommendModal = false" @update="updateFeeds" />
      </template>
    </UModal>

    <!-- 更新通知模态框 -->
    <UModal v-model:open="openUpdateModal" :dismissible="true" title="发现新的推荐订阅源">
      <template #body>
        <div class="p-4">
          <p class="mb-4">我们更新了推荐订阅源列表，您想查看并添加新的订阅源吗？</p>
          <div class="flex justify-end gap-2">
            <UButton label="稍后再说" variant="outline" @click="openUpdateModal = false" />
            <UButton label="查看更新" color="primary" @click="showRecommendModal" />
          </div>
        </div>
      </template>
    </UModal>
  </UApp>
</template>

<script setup lang="ts">
import {getFollows } from '~/utils/request'
import { useColorMode, useLocalStorage } from '@vueuse/core'
import { ref, computed, effect, onMounted } from 'vue'
import type { FormSubmitEvent, NavigationMenuItem, TabsItem } from '@nuxt/ui'
import FeedList from '~/components/FeedList.vue'
import RecommendedFeeds from '~/components/RecommendedFeeds.vue'
import RSSDatabase from '~/utils/IndexedDB'
import type { RSSFeed } from '~/utils/IndexedDB'

const toast = useToast()
const allFeeds = ref<RSSFeed[]>([])
const db = new RSSDatabase();
const openRecommendModal = ref(false);
const openUpdateModal = ref(false);
const isFirstVisit = ref(false);
const selectedFeed = ref<string | null>(null);

// 根据ID获取Feed
function getFeedById(id: number) {
  return allFeeds.value.find(feed => feed.id === id);
}

// 将allFeeds转换为TabsItem数组
const feedTabItems = computed<TabsItem[]>(() => {
  return allFeeds.value.map(feed => ({
    label: feed.name,
    value: String(feed.id),
    badge: feed.latestCount
  }));
});

// 初始化数据库
(async () => {
  await db.init();
  // 获取所有订阅
  const data = await db.getAllFeeds();
  allFeeds.value = data;
  
  // 如果有订阅源，默认选择第一个
  if (allFeeds.value.length > 0) {
    selectedFeed.value = String(allFeeds.value[0].id);
  }

  // 检查是否是首次访问
  const visited = localStorage.getItem('visited');
  if (!visited) {
    isFirstVisit.value = true;
    localStorage.setItem('visited', 'true');
    openRecommendModal.value = true;
  } else {
    // 检查推荐源是否有更新
    checkFollowJsonUpdate();
  }
})();

// 检查follow.json是否有更新
async function checkFollowJsonUpdate() {
  try {
    // 从localStorage获取已保存的版本号
    const savedVersion = localStorage.getItem('followJsonVersion') || '';
    
    // 获取当前follow.json的版本号
    const data = await getFollows()
    const currentVersion = data.version;
    
    // 如果版本不同且不是首次访问，显示更新通知
    if (savedVersion && savedVersion !== currentVersion) {
      openUpdateModal.value = true;
      localStorage.setItem('followJsonVersion', currentVersion) 
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

// 显示推荐模态框
function showRecommendModal() {
  openUpdateModal.value = false;
  openRecommendModal.value = true;
}

// 更新订阅列表
async function updateFeeds() {
  const data = await db.getAllFeeds();
  allFeeds.value = data;
}
const SUBSCRIBES = 'Subscribes'
const colorMode = useColorMode()
const navigationBarItems = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'RSS Focus',
      type: 'label'
    },
    {
      label: 'Add Feed',
      icon: 'i-lucide-plus',
      onSelect(e: Event) {
        e.preventDefault()
        openSubscribeModal.value = true
        subscribeInfo.value = {
          id: -1,
          name: '',
          url: '',
          cssSelector: '',
          subjectList: [],
          latestCount: 0
        }
      }
    },
    {
      label: 'Recommended',
      icon: 'i-lucide-star',
      onSelect(e: Event) {
        e.preventDefault()
        openRecommendModal.value = true
      }
    },
    {
      label: SUBSCRIBES,
      icon: 'i-lucide-database',
      defaultOpen: true,
      children: []
    },
  ],
  [
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [{
        label: 'Light',
        icon: 'i-lucide-sun',
        type: 'checkbox',
        checked: colorMode.value === 'light',
        onSelect(e: Event) {
          e.preventDefault()
          colorMode.value = 'light'
        }
      }, {
        label: 'Dark',
        icon: 'i-lucide-moon',
        type: 'checkbox',
        checked: colorMode.value === 'dark',
        onUpdateChecked(checked: boolean) {
          if (checked) {
            colorMode.value = 'dark'
          }
        },
        onSelect(e: Event) {
          e.preventDefault()
          colorMode.value = 'dark'
        }
      }]
    },
    {
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      badge: '0.1k',
      to: 'https://github.com/proc07',
      target: '_blank'
    },
    {
      label: 'Help & Support',
      icon: 'i-lucide-circle-help',
      to: 'https://github.com/proc07',
      target: '_blank'
    }
  ]
])
const openSubscribeModal = ref(false)
const subscribeInfo = ref<Omit<RSSFeed, 'createdAt' | 'updatedAt'>>({
  id: -1,
  name: '',
  url: '',
  cssSelector: '',
  subjectList: [],
  latestCount: 0
})

async function onDelete() {
  try {
    if (subscribeInfo.value.id !== -1) {
      await db.deleteFeed(subscribeInfo.value.id)
      allFeeds.value = await db.getAllFeeds()
      selectedFeed.value = allFeeds.value[0]?.id?.toString() || null
      toast.add({ color: 'primary', title: 'Deleted successfully' })
    }
    openSubscribeModal.value = false
  } catch (error) {
    toast.add({ color: 'error', title: 'Failed to delete', description: error?.toString() })
  }
}
async function onSubmit(event) {
  // 保存订阅信息到数据库
  try {
    if (subscribeInfo.value.id === -1) {
      chrome && chrome.runtime.sendMessage({ type: 'ADD_FEED', payload: {
          name: subscribeInfo.value.name.trim(),
          url: subscribeInfo.value.url.trim(),
          cssSelector: subscribeInfo.value.cssSelector.trim(),
        }
      });
    } else {
      await db.updateFeed(subscribeInfo.value.id, {
        name: subscribeInfo.value.name,
        url: subscribeInfo.value.url,
        cssSelector: subscribeInfo.value.cssSelector,
      })
    }
    openSubscribeModal.value = false
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Submit Fail',
      description: `${error.toString()}`,
    })
  }
}

const subscribeIndex = navigationBarItems.value[0].findIndex(item => item.label === SUBSCRIBES)
effect(() => {
  const newChildren = allFeeds.value.map(feed => ({
    label: feed.name,
    icon: 'i-lucide-rss',
    description: feed.url,
    badge: feed.subjectList.length.toString(),
    onSelect(e: Event) {
      e.preventDefault()
      openSubscribeModal.value = true
      subscribeInfo.value = feed
    }
  }))
  navigationBarItems.value[0][subscribeIndex].children = newChildren;
})
const searchQuery = ref('')
const searchEngines = [
  {
    name: 'google',
    label: '谷歌',
    icon: 'simple-icons:google',
    url: 'https://www.google.com/search?q='
  },
  {
    name: 'baidu',
    label: '百度',
    icon: 'simple-icons:baidu',
    url: 'https://www.baidu.com/s?wd='
  }
]
// 使用 useState 来保持状态的持久化
const PREFERRED_SEARCH_ENGINE = 'preferred-search-engine'
const currentEngine = useLocalStorage('search-engine', () => {
  return window.localStorage.getItem(PREFERRED_SEARCH_ENGINE) || searchEngines[0].name
})
// 切换搜索引擎并保存到 localStorage
const switchEngine = (engineName: string) => {
  currentEngine.value = engineName
  window.localStorage.setItem(PREFERRED_SEARCH_ENGINE, engineName)
}
const handleSearch = () => {
  if (!searchQuery.value.trim()) return

  const engine = searchEngines.find(e => e.name === currentEngine.value)
  if (engine) {
    window.open(engine.url + encodeURIComponent(searchQuery.value), '_blank')
  }
}

const loadingFeeds = ref(false);
const lastUpdateTime = ref<number|null>(null);

function refreshFeeds() {
  chrome && chrome.runtime.sendMessage({ type: 'PAGE_REFRESH' });
}

function formatTime(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2,'0')}`;
}
// 初始化时读取本地更新时间
const LAST_UPDATE_TIME = 'lastUpdateTime'
const stored = localStorage.getItem(LAST_UPDATE_TIME);
if (stored) lastUpdateTime.value = Number(stored);

onMounted(() => {
  chrome && chrome.runtime.onMessage.addListener((message) => {
    console.log('Received message:', message);
    if (message.type === 'FEEDS_UPDATE_START') {
      loadingFeeds.value = true;
    } else if (message.type === 'FEED_UPDATE_END') {
      loadingFeeds.value = false;
      if (message.success) {
        db.getAllFeeds().then(data => {
          allFeeds.value = data;
        });
      } else {
        toast.add({
          color: 'error',
          title: 'Add Feed Fail',
        })
      }
    } else if (message.type === 'FEEDS_UPDATE_END') {
      loadingFeeds.value = false;
      if (message.success) {
        db.getAllFeeds().then(data => {
          allFeeds.value = data;
          lastUpdateTime.value = Date.now();
          localStorage.setItem(LAST_UPDATE_TIME, lastUpdateTime.value.toString());
        });
      } else {
        toast.add({
          color: 'error',
          title: 'Refresh Feeds Fail',
        })
      }
    }
  });
});
</script>
