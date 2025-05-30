<script setup lang="ts">
import type {RSSFeed} from '~/utils/IndexedDB'

defineProps<{
  data: RSSFeed
}>()

</script>

<template>
  <div class="mb-[10px]">
    <h3 class="text-center p-4 bg-elevated/100 text-sm font-bold border-r border-[#e2e8f1]">{{ data.name }}</h3>
    <div class="h-[500px] overflow-y-auto divide-y divide-default bg-elevated/50">
      <div
        v-for="(subject, index) in data.subjectList"
        :key="index"
      >
        <div
          class="flex items-center p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors"
          :class="[
            true ? 'text-highlighted' : 'text-toned)',
            'border-(--ui-bg) hover:border-primary hover:bg-primary/5'
          ]"
        >
          <UKbd :value="String(data.subjectList.length - index)" />
          <UTooltip
            arrow
            :content="{ align: 'center', side: 'top', sideOffset: 8 }"
            :text="subject.title"
          >
            <a :href="subject.link" target="_blank" class="truncate ml-[5px]" :class="['font-semibold']">
              {{ subject.title }}
            </a>
            <template v-if="index < data.latestCount">
              <UIcon name="i-lucide-sparkles" class="ml-2 text-primary" />
            </template>
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>