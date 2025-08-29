<script setup lang="ts">
import '../assets/css/main.css'

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase as string

const search = ref('')
const page = ref(1)
const items = ref<Item[]>([])
const hasMore = ref(true)
const loading = ref(false)

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
</script>
<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Таблица (1 000 000 записей)</h1>

    <!-- Поисковое поле -->
    <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Поиск по ID..." class="mb-4" />

    <!-- Таблица с виртуальным скроллом -->
    <div ref="container" class="max-h-96 overflow-y-auto border rounded-lg">
      <UTable :data="items" :loading="loading && items.length === 0" class="flex-1">
        <!-- Можно кастомизировать ячейки, если нужно -->
      </UTable>

      <!-- Индикатор подгрузки -->
      <div v-if="loading" class="flex justify-center py-4">
        <USpinner class="w-5 h-5" />
        <span class="ml-2 text-sm text-gray-500">Загрузка...</span>
      </div>

      <!-- Конец списка -->
      <div v-if="!hasMore && !loading" class="text-center py-4 text-sm text-gray-400">
        Все записи загружены
      </div>
    </div>
  </div>
</template>