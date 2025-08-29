<script setup lang="ts">
import '../assets/css/main.css'

import { useInfiniteScroll, debouncedWatch } from '@vueuse/core'
import { useSortable } from '@vueuse/integrations/useSortable.mjs'

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
    const params = new URLSearchParams()
    params.append('page', page.value.toString())
    if (search.value) {
      params.append('search', search.value)
    }

    const url = `${API_BASE}/items?${params.toString()}`

    // Используем $fetch напрямую
    const result = await $fetch<{ items: Item[], total: number, hasMore: boolean }>(url, {
      method: 'GET',
      // При необходимости добавь headers и др.
    })

    if (reset) {
      items.value = [...result.items]
    } else {
      items.value.push(...result.items)
    }
    hasMore.value = result.hasMore
  } catch (err: any) {
    console.error('Ошибка загрузки данных:', err)
    // Можно обработать err.data, err.status и т.д.
  } finally {
    loading.value = false
  }
}

onMounted(
  loadItems
)

useSortable('.sortable-tbody', items, {
  animation: 150,
})

useInfiniteScroll(
  container,
  () => {
    if (hasMore.value && !loading.value) {
      page.value++
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

// Отслеживаем изменения в порядке элементов
watch(items, async (newItems, oldItems) => {
  // Проверяем, что массив изменился (не первоначальный рендер)
  if (oldItems && newItems !== oldItems) {
    try {
      await $fetch(`${API_BASE}/state`, {
        method: 'PATCH',
        body: {
          oldPageOrder: oldItems.map(item => item.id), // старый порядок (id)
          newPageOrder: newItems.map(item => item.id), // новый порядок (id)
        },
      })
      console.log('Порядок элементов сохранён на сервере')
    } catch (err) {
      console.error('Ошибка при сохранении порядка:', err)
      // При необходимости можно откатить изменения
      // items.value = oldItems
    }
  }
}, { deep: true })

</script>
<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Таблица (1 000 000 записей)</h1>

    <div class="grid grid-cols-4 items-center mb-4">
      <div class="col-span-1 text-sm">
        Поиск на сервере
      </div>
      <div class="col-span-3">
        <!-- Поисковое поле -->
        <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Поиск по ID..." class="w-full" />
      </div>
    </div>

    <!-- Таблица с виртуальным скроллом -->
    <div ref="container" class="max-h-96 overflow-y-auto border rounded-lg">
      <UTable :data="items" :columns="columns" :loading="loading && items.length === 0" class="flex-1"
        :ui="{ tbody: 'sortable-tbody' }">
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