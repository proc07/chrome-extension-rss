<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <!-- 模态窗口 -->
    <div class="relative bg-white rounded-lg shadow-lg w-full max-w-5xl overflow-hidden">
      <!-- 顶部地址栏 -->
      <div class="bg-gray-200 p-3 flex items-center gap-2">
        <button class="text-gray-500 hover:text-gray-700" @click="$emit('close')">
          <UIcon name="i-lucide-x" class="w-5 h-5" />
        </button>
        <div class="bg-white rounded px-3 py-1.5 flex-1 text-gray-700 text-sm">
          {{ url }}
        </div>
      </div>
      
      <!-- 主要内容区域 -->
      <div class="flex h-[600px]">
        <!-- 左侧预览区域（黑色背景） -->
        <div class="w-3/4 relative overflow-auto">
          <!-- 真实内容将在这里显示 -->
          <div class="preview-container p-4">
            <slot name="preview"/>
          </div>
        </div>
        
        <!-- 右侧预览选项列表 -->
        <div class="w-1/4 bg-white pt-4 pr-4 pb-4 overflow-auto">
          <div class="text-base font-medium mb-4">Preview</div>
          
          <div class="space-y-4">
            <div 
              v-for="(item, index) in previewItems" 
              :key="index"
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
            >
              <div class="w-6 h-6 bg-gray-200 rounded"/>
              <div class="text-sm font-medium">{{ item.name }}</div>
            </div>
          </div>

          <UButton color="secondary" @click="$emit('add-subscribe')">Add subscribe</UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  url: {
    type: String,
    default: ''
  },
  previewItems: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'add-subscribe'])

</script>

<style scoped>
/* 添加高亮效果的样式 */
:deep(.highlighted) {
  outline: 2px solid #3fb950 !important;
  outline-offset: 2px;
  background-color: rgba(63, 185, 80, 0.1);
  transition: all 0.2s ease;
}

.preview-container {
  height: 100%;
}
</style> 

