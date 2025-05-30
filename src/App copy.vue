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
              <div v-show="isUrl">
                <UButton size="xl" @click="onSubscribe">Subscribe</UButton>
              </div>
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
                最后更新: {{ formatTime(lastUpdateTime) }}
              </span>
              <span v-else>
                暂无更新记录
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FeedList v-for="feeds in allFeeds" :key="feeds.id" :data="feeds" />
        </div>
      
      </div>

      <PreviewModal
        v-if="showModal"
        :url="searchQuery"
        :preview-items="previewWebsiteSubjectItems"
        @add-subscribe="_onAddSubscribe"
        @close="showModal = false"
      >
        <template #preview>
          <!-- <div v-if="loadingIframe">Loading...</div> -->
          <UInput v-model="articleTitle" class="w-full" placeholder="Please website title" />
          <UInput v-model="saveRSSCssSelector" class="w-full" placeholder="Please add css selector" />
          <!-- <iframe
            :srcdoc="searchHtmlCode"
            sandbox="allow-same-origin"
            frameborder="0"
            width="100%"
            height="100%"
            @load="_onIframeLoad"
          /> -->
        </template>
      </PreviewModal>
    </div>

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
              required
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
        <UButton label="Cancel" color="neutral" variant="outline" @click="openSubscribeModal = false" />
        <UButton label="Submit" color="neutral" @click="onSubmit" />
      </template>
    </UModal>
  </UApp>
</template>

<script setup lang="ts">
import { useColorMode, useLocalStorage } from '@vueuse/core'
import { ref, computed, effect, onMounted } from 'vue'
import type { FormSubmitEvent, NavigationMenuItem } from '@nuxt/ui'
import FeedList from '~/components/FeedList.vue'
import RSSDatabase from '~/utils/IndexedDB'
import type { RSSFeed } from '~/utils/IndexedDB'

const toast = useToast()
const allFeeds = ref<RSSFeed[]>([])
const db = new RSSDatabase();
// 初始化数据库
(async () => {
  await db.init();
  // 获取所有订阅
  const data = await db.getAllFeeds();
  allFeeds.value = data;
})()

const articleTitle = ref('') 
const saveRSSCssSelector = ref('')
const previewWebsiteSubjectItems = ref<{id: number; title: string; link: string}[]>([])

async function _onAddSubscribe() {
  try {
    // 添加订阅
    const feedId = await db.addFeed({
      name: articleTitle.value,
      url: searchQuery.value.trim(),
      cssSelector: saveRSSCssSelector.value,
      subjectList: []
    });
    console.log('Added feed with ID:', feedId);
  } catch (error) {
    console.log('Add feed failure', error)
  }
}

const showModal = ref(false)
// 判断字符串是否为URL
const isUrl = computed(() => {
  const url = searchQuery.value.trim()

  if(url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.')) {
    return true
  }

  return false
})

const colorMode = useColorMode()
const navigationBarItems = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'RSS Focus',
      type: 'label'
    },
    {
      label: 'Home',
      icon: 'i-lucide-house',
      to: '/',
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
      label: 'Subscribe',
      icon: 'i-lucide-database',
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
      badge: '3.8k',
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
async function onSubmit(event) {
  // 保存订阅信息到数据库
  try {
    if (subscribeInfo.value.id === -1) {
      const feedId = await db.addFeed({
        name: subscribeInfo.value.name.trim(),
        url: subscribeInfo.value.url.trim(),
        cssSelector: subscribeInfo.value.cssSelector.trim(),
        subjectList: [],
      })
      chrome.runtime.sendMessage({ type: 'ADD_FEED', payload: {
          id: feedId,
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

const subscribeIndex = navigationBarItems.value[0].findIndex(item => item.label === 'Subscribe')
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

// ------------------------------------------
const searchHtmlCode = ref('')
const loadingIframe = ref(false)
const onSubscribe = () => {
  // const url = searchQuery.value.trim()
  // loadingIframe.value = true
  // searchHtmlCode.value = ''

  // fetch("http://api.scrape.do?token=6cf9eee2ee0441c2b51dc636fd4a71a03736d743f41&url=" + url, {
  //   method: "get",
  // })
  // .then(response => response.text())
  // .then(html => {
  //   const URLData = new URL(url)
  //   searchHtmlCode.value = addBaseTag(html, URLData.origin)
  // }).finally(() => {
  //   loadingIframe.value = false
  // })

  showModal.value = true
}
// --------------------------------------------------

const loadingFeeds = ref(false);
const lastUpdateTime = ref<number|null>(null);

function refreshFeeds() {
  chrome.runtime.sendMessage({ type: 'PAGE_REFRESH' });
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
  chrome.runtime.onMessage.addListener((message) => {
    console.log('Received message:', message);
    if (message.type === 'FEEDS_UPDATE_START') {
      loadingFeeds.value = true;
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
