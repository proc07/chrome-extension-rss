<script setup lang="ts">
import type {RSSFeed} from '~/utils/IndexedDB'

defineProps<{
  data: RSSFeed
}>()

</script>

<template>
  <div class="overflow-y-auto divide-y divide-default bg-elevated/50">
    <h3 class="text-center p-2 bg-elevated/100">{{ data.name }}</h3>
    <div
      v-for="(subject, index) in data.subjectList"
      :key="index"
    >
      <div
        class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors"
        :class="[
          true ? 'text-highlighted' : 'text-toned)',
          'border-(--ui-bg) hover:border-primary hover:bg-primary/5'
        ]"
      >
        <a :href="subject.link" class="truncate" :class="['font-semibold']">
          {{ subject.title }}
        </a>
      </div>
    </div>
  </div>
</template>