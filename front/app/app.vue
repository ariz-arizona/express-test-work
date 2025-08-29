<script setup lang="ts">
import '../assets/css/main.css'

import { useInfiniteScroll, debouncedWatch } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase as string

const search = ref('')
const page = ref(1)
const items = ref<Item[]>([])
const hasMore = ref(true)
const loading = ref(false)

const container = useTemplateRef('container')

const columns: TableColumn<Item>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all rows'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'category',
    header: 'Category'
  }
]

// Загрузка данных
const loadItems = async (reset = false) => {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  if (loading.value || !hasMore.value) return

  loading.value = true

  try {
    const { data, error } = await useFetch<{ items: Item[], total: number, hasMore: boolean }>(
      `${API_BASE}/items`,
      {
        query: {
          page: page.value,
          search: search.value || undefined
        },
        key: `items-page-${page.value}-${search.value}`
      }
    )

    if (error.value) {
      console.error('Ошибка загрузки данных:', error.value)
      return
    }

    const result = data.value
    if (result) {
      if (reset) {
        items.value = [...result.items]
      } else {
        items.value.push(...result.items)
      }
      hasMore.value = result.hasMore
      page.value++
    }
  } catch (err) {
    console.error('Неожиданная ошибка:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)

useInfiniteScroll(
  container,
  () => {
    if (hasMore.value && !loading.value) {
      loadItems()
    }
  },
  { distance: 200 }
)

debouncedWatch(
  search,
  (value) => {
    if (value.length >= 3) {
      items.value = []
      page.value = 1
      hasMore.value = true
      loadItems()
    } else if (value.length === 0) {
      items.value = []
      page.value = 1
      hasMore.value = true
      loadItems()
    }
    // При 1–2 символах — ничего не делаем
  },
  { debounce: 300 }
)
</script>
<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Таблица (1 000 000 записей)</h1>

    <!-- Поисковое поле -->
    <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Поиск по ID..." class="mb-4" />

    <!-- Таблица с виртуальным скроллом -->
    <div ref="container" class="max-h-96 overflow-y-auto border rounded-lg">
      <UTable :data="items" :columns="columns" :loading="loading && items.length === 0" class="flex-1">
        <!-- Можно кастомизировать ячейки, если нужно -->
      </UTable>

      <!-- Индикатор подгрузки -->
      <div v-if="loading" class="flex justify-center py-4">
        <span class="ml-2 text-sm text-gray-500">Загрузка...</span>
      </div>

      <!-- Конец списка -->
      <div v-if="!hasMore && !loading" class="text-center py-4 text-sm text-gray-400">
        Все записи загружены
      </div>
    </div>
  </div>
</template>