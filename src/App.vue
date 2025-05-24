<template>
  <div class="fixed inset-0 flex overflow-hidden">
    <div class="relative hidden lg:flex flex-col min-h-svh min-w-16 w-(--width) shrink-0 border-r border-default bg-elevated/25">
      <div class="flex flex-col gap-4 flex-1 overflow-y-auto px-4 py-2">
        <UNavigationMenu orientation="vertical" :items="navigationBarItems" class="data-[orientation=vertical]:w-48" />      
      </div>
    </div>
    <div class="relative flex flex-col min-w-0 min-h-svh lg:not-last:border-r lg:not-last:border-default flex-1">
      <div class="flex flex-col items-center gap-4 w-full max-w-xl mx-auto p-4">
        <!-- 搜索引擎切换按钮 -->
        <div class="flex gap-2">
          <UButton
            v-for="engine in searchEngines"
            :key="engine.name"
            :icon="engine.icon"
            :color="currentEngine === engine.name ? 'primary' : 'secondary'"
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
      </div>

      <div v-for="feeds in allFeeds" :key="feeds.id" class="grid grid-cols-3 gap-10">
        <FeedList :data="feeds" />
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
</template>

<script setup lang="ts">
import { useColorMode, useLocalStorage } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import FeedList from '~/components/FeedList.vue'
import RSSDatabase from '~/utils/IndexedDB'

const allFeeds = ref([])
const db = new RSSDatabase();
// 初始化数据库
(async () => {
  await db.init();
  // 获取所有订阅
  const data = await db.getAllFeeds();
  allFeeds.value = data;
})()

console.log('All feeds:', allFeeds.value);

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
      label: 'Subscribe',
      icon: 'i-lucide-database',
      children: [
        {
          label: 'defineShortcuts',
          icon: 'i-lucide-file-text',
          description: 'Define shortcuts for your application.',
          to: '/composables/define-shortcuts'
        },
        {
          label: 'useOverlay',
          icon: 'i-lucide-file-text',
          description: 'Display a modal/slideover within your application.',
          to: '/composables/use-overlay'
        },
        {
          label: 'useToast',
          icon: 'i-lucide-file-text',
          description: 'Display a toast within your application.',
          to: '/composables/use-toast'
        }
      ]
    },
    {
      label: 'Favorites',
      icon: 'i-lucide-box',
      to: '/components',
      children: [
        {
          label: 'Link',
          icon: 'i-lucide-file-text',
          description: 'Use NuxtLink with superpowers.',
          to: '/components/link'
        },
        {
          label: 'Modal',
          icon: 'i-lucide-file-text',
          description: 'Display a modal within your application.',
          to: '/components/modal'
        },
      ]
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


const searchQuery = ref('')
const searchEngines = [
  {
    name: 'google',
    label: '谷歌',
    icon: 'i-simple-icons-google',
    url: 'https://www.google.com/search?q='
  },
  {
    name: 'baidu',
    label: '百度',
    icon: 'i-simple-icons-baidu',
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
</script>
