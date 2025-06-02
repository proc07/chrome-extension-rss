<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RSSDatabase from '~/utils/IndexedDB'
import type { RSSFeed } from '~/utils/IndexedDB'

const props = defineProps<{
  onClose: () => void
}>()

const emit = defineEmits(['update'])

const toast = useToast()
const recommendedFeeds = ref<any[]>([])
const selectedFeeds = ref<number[]>([])
const db = new RSSDatabase()
const loading = ref(false)
const followVersion = ref('')
const dbVersion = ref('')

// 从follow.json获取推荐订阅源
async function fetchRecommendedFeeds() {
  try {
    loading.value = true
    const response = await fetch(chrome.runtime.getURL('follow.json'))
    const data = await response.json()
    followVersion.value = data.version || '1'
    recommendedFeeds.value = data.default || []
    
    // 检查哪些订阅源已经存在于数据库中
    for (let i = 0; i < recommendedFeeds.value.length; i++) {
      const feed = recommendedFeeds.value[i]
      const existingFeed = await db.getFeedByUrl(feed.url)
      if (existingFeed) {
        feed.exists = true
      } else {
        feed.exists = false
      }
    }
  } catch (error) {
    console.error('获取推荐订阅源失败:', error)
    toast.add({
      color: 'error',
      title: '获取推荐订阅源失败',
      description: error?.toString()
    })
  } finally {
    loading.value = false
  }
}

// 切换选择状态
function toggleSelect(index: number) {
  const position = selectedFeeds.value.indexOf(index)
  if (position === -1) {
    selectedFeeds.value.push(index)
  } else {
    selectedFeeds.value.splice(position, 1)
  }
}

// 添加选中的订阅源到数据库
async function addSelectedFeeds() {
  if (selectedFeeds.value.length === 0) {
    toast.add({
      color: 'warning',
      title: '请至少选择一个订阅源'
    })
    return
  }

  try {
    loading.value = true
    let addedCount = 0

    for (const index of selectedFeeds.value) {
      const feed = recommendedFeeds.value[index]
      if (!feed.exists) {
        await db.addFeed({
          name: feed.name,
          url: feed.url,
          cssSelector: feed.cssSelector,
          subjectList: []
        })
        addedCount++
      }
    }

    // 触发刷新以获取内容
    chrome && chrome.runtime.sendMessage({ type: 'PAGE_REFRESH' })

    toast.add({
      color: 'success',
      title: `成功添加${addedCount}个订阅源`,
      description: '正在获取内容，请稍候...'
    })

    // 通知父组件更新
    emit('update')
    
    // 关闭弹窗
    props.onClose()
  } catch (error) {
    toast.add({
      color: 'error',
      title: '添加订阅源失败',
      description: error?.toString()
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRecommendedFeeds()
})
</script>

<template>
  <div>
    <p class="text-sm text-gray-600 mb-4">
      <span class="text-sm text-gray-500" v-if="followVersion">
        版本: [{{ followVersion }}]
        <span v-if="dbVersion && dbVersion !== followVersion" class="ml-2 text-primary">
          <UIcon name="i-lucide-alert-circle" class="inline-block" /> 有新版本
        </span>
      </span>
      选择您感兴趣的订阅源，我们将为您自动获取最新内容。
    </p>
    
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8" />
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div 
        v-for="(feed, index) in recommendedFeeds" 
        :key="index"
        class="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
        :class="{
          'border-primary': selectedFeeds.includes(index),
          'opacity-50': feed.exists
        }"
        @click="!feed.exists && toggleSelect(index)"
      >
        <div class="flex justify-between items-start">  
          <div class="flex-1 min-w-0 mr-2">  
            <h3 class="font-medium">{{ feed.name }}</h3>
            <p class="text-sm text-gray-500 truncate">{{ feed.url }}</p>
          </div>
          <div class="flex-shrink-0">
            <UCheckbox 
              v-if="!feed.exists" 
              :modelValue="selectedFeeds.includes(index)" 
              @update:modelValue="toggleSelect(index)"
            />
            <UBadge v-else color="gray" variant="subtle">已添加</UBadge>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex justify-end gap-2 mt-6">
      <UButton label="取消" variant="outline" @click="onClose" />
      <UButton
        label="添加所选"
        color="primary"
        :loading="loading"
        :disabled="selectedFeeds.length === 0 || loading"
        @click="addSelectedFeeds" 
      />
    </div>
  </div>
</template>