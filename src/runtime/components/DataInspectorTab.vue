<template>
  <div
    border="t"
    border-color="gray-100"
    relative
    n-bg="base"
    flex="~ col"
    h="screen"
    overflow="hidden"
  >
    <SplitterGroup id="splitter-group-1" class="h-full" direction="horizontal">
      <SplitterPanel
        id="splitter-group-1-panel-1"
        :min-size="20"
        :default-size="20"
        class="border flex flex-col overflow-hidden"
      >
        <div class="flex-1 overflow-y-auto">
          <TreeRoot
            v-if="treeData && treeData.length > 0"
            v-model="selectedEntry"
            :items="treeData"
            :get-key="(item) => item.name"
            :get-children="(item) => item.children || undefined"
            class="h-full"
            v-slot="{ flattenItems }"
          >
            <TreeItem
              v-for="item in flattenItems"
              :key="item._id"
              v-bind="item.bind"
              v-slot="{ isExpanded, isSelected }"
              @select="
                (event) => {
                  if (item.value.type !== 'folder') {
                    selectEntry(item.value);
                  }
                }
              "
            >
              <div
                class="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                :class="{
                  'bg-gray-300 dark:bg-gray-700 font-semibold':
                    isSelected && item.value.type !== 'folder',
                  'font-medium': item.value.type === 'folder',
                }"
                :style="{ paddingLeft: `${item.level * 16 + 8}px` }"
              >
                <!-- Folder/Item Icon -->
                <NIcon
                  :icon="
                    item.value.type === 'folder'
                      ? isExpanded
                        ? 'carbon:folder-open'
                        : 'carbon:folder'
                      : item.value.icon
                  "
                  class="flex-shrink-0"
                  :class="
                    item.value.type === 'folder'
                      ? 'text-blue-500'
                      : 'text-gray-500'
                  "
                />

                <!-- Name -->
                <span class="truncate">{{ item.value.name }}</span>

                <!-- Expand/Collapse indicator for folders -->
                <NIcon
                  v-if="item.value.type === 'folder'"
                  :icon="
                    isExpanded ? 'carbon:chevron-down' : 'carbon:chevron-right'
                  "
                  class="flex-shrink-0 ml-auto text-gray-400"
                />
              </div>
            </TreeItem>
          </TreeRoot>
        </div>
      </SplitterPanel>
      <SplitterResizeHandle
        id="splitter-group-1-resize-handle-1"
        class="w-px bg-gray-200"
      />
      <SplitterPanel id="splitter-group-1-panel-2" :min-size="20">
        <div
          v-if="!selectedEntry"
          class="flex w-full h-full justify-center items-center align-middle"
        >
          <div text="sm gray-500" flex="~ gap-2 items-center">
            <NIcon icon="carbon:document-blank" />
            <span>No Selection</span>
          </div>
        </div>
        <SplitterGroup v-else id="splitter-group-2" direction="vertical">
          <SplitterPanel
            id="splitter-group-2-panel-1"
            :min-size="10"
            :default-size="10"
            class="border"
          >
            <!-- Custom Code Editor with Syntax Highlighting -->
            <div class="relative h-full w-full">
              <!-- Syntax Highlighted Background -->
              <div
                ref="highlightContainer"
                class="absolute inset-0 pointer-events-none overflow-auto"
                :style="{ scrollBehavior: 'auto' }"
              >
                <div v-html="html" class="syntax-highlight-bg" />
              </div>

              <!-- Transparent Textarea Overlay -->
              <textarea
                ref="textareaRef"
                v-model="query"
                class="absolute inset-0 w-full h-full resize-none bg-transparent outline-none border-none overflow-auto editor-textarea"
                style="
                  color: rgba(0, 0, 0, 0.01);
                  text-shadow: 0 0 0 transparent;
                "
                placeholder="Enter SQL query..."
                spellcheck="false"
                autocorrect="off"
                autocomplete="off"
                autocapitalize="off"
                data-gramm="false"
                @keydown.enter.meta.prevent="executeQuery"
                @keydown.enter.ctrl.prevent="executeQuery"
                @scroll="syncScroll"
                @input="syncScroll"
              />

              <!-- Cursor/Selection Overlay -->
              <div
                ref="cursorOverlay"
                class="absolute inset-0 pointer-events-none overflow-hidden"
              >
                <!-- This will show cursor and selection -->
              </div>
            </div>
          </SplitterPanel>
          <SplitterResizeHandle
            id="splitter-group-2-resize-handle-1"
            class="h-px bg-gray-200"
          />
          <SplitterPanel
            id="splitter-group-2-panel-2"
            :min-size="40"
            class="border flex flex-col"
          >
            <!-- Query Results Table -->
            <div
              v-if="isLoading"
              class="flex justify-center items-center h-full"
            >
              <NLoading />
            </div>

            <div
              v-else-if="queryError"
              class="flex-1 flex flex-col overflow-hidden"
            >
              <div
                class="px-3 py-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
              >
                <NButton n="xs" icon="carbon:play" @click="executeQuery">
                  Execute Query
                </NButton>
              </div>
              <div
                class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
              >
                <div class="text-red-800 dark:text-red-200 font-medium">
                  Query Error:
                </div>
                <div class="text-red-700 dark:text-red-300 text-sm mt-1">
                  {{ queryError }}
                </div>
              </div>
            </div>

            <div
              v-else-if="currentTableRows && currentTableRows.length > 0"
              class="flex-1 flex flex-col overflow-hidden"
            >
              <!-- Results summary -->
              <div
                class="px-3 py-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
              >
                <NButton n="xs green" icon="carbon:play" @click="executeQuery">
                  Execute Query
                </NButton>
                <div class="flex items-center gap-1">
                  <div class="text-xs text-gray-600 dark:text-gray-400">
                    {{ currentTableRows.length }} row{{
                      currentTableRows.length !== 1 ? "s" : ""
                    }}
                    returned
                  </div>
                  <NButton
                    n="xs"
                    icon="carbon:chevron-left"
                    :disabled="!table.getCanPreviousPage()"
                    @click="table.previousPage()"
                  />
                  <span class="text-xs text-gray-600 dark:text-gray-400 px-2">
                    {{ table.getState().pagination.pageIndex + 1 }} of
                    {{ table.getPageCount() }}
                  </span>
                  <NButton
                    n="xs"
                    icon="carbon:chevron-right"
                    :disabled="!table.getCanNextPage()"
                    @click="table.nextPage()"
                  />
                </div>
              </div>

              <!-- Data Table -->
              <div
                class="flex-1 border border-gray-200 dark:border-gray-700 rounded-b-lg overflow-auto"
              >
                <table class="w-full min-w-max">
                  <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th
                        v-for="header in table.getFlatHeaders()"
                        :key="header.id"
                        class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative overflow-hidden"
                        :class="
                          header.column.getCanSort()
                            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                            : ''
                        "
                        :style="{
                          width: `${header.getSize()}px`,
                          maxWidth: `${header.getSize()}px`,
                          minWidth: `${header.getSize()}px`,
                        }"
                        @click="
                          header.column.getToggleSortingHandler()?.($event)
                        "
                      >
                        <div class="flex items-center gap-1 min-w-0">
                          <div class="truncate flex-1 min-w-0">
                            <FlexRender
                              :render="header.column.columnDef.header"
                              :props="header.getContext()"
                            />
                          </div>
                          <span
                            v-if="header.column.getIsSorted()"
                            class="text-xs flex-shrink-0"
                          >
                            {{
                              header.column.getIsSorted() === "asc" ? "▲" : "▼"
                            }}
                          </span>
                        </div>
                        <!-- Column Resize Handle -->
                        <div
                          v-if="header.column.getCanResize()"
                          class="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-gray-500 hover:bg-opacity-50 group"
                          @mousedown="header.getResizeHandler()?.($event)"
                          @touchstart="header.getResizeHandler()?.($event)"
                          @click.stop
                        >
                          <div
                            class="w-full h-full group-hover:bg-gray-500 transition-colors duration-150"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700"
                  >
                    <tr
                      v-for="row in table.getRowModel().rows"
                      :key="row.id"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td
                        v-for="cell in row.getVisibleCells()"
                        :key="cell.id"
                        class="px-2 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0 overflow-hidden"
                        :style="{
                          width: `${cell.column.getSize()}px`,
                          maxWidth: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.getSize()}px`,
                        }"
                      >
                        <div
                          class="truncate w-full"
                          :title="String(cell.getValue())"
                        >
                          <FlexRender
                            :render="cell.column.columnDef.cell"
                            :props="cell.getContext()"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-else-if="currentTableRows && currentTableRows.length === 0"
              class="flex-1 flex flex-col overflow-hidden"
            >
              <div
                class="px-3 py-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
              >
                <NButton n="xs" icon="carbon:play" @click="executeQuery">
                  Execute Query
                </NButton>
              </div>
              <div class="text-center py-8">
                <div class="text-gray-500 dark:text-gray-400">
                  No results found
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8">
              <div class="text-gray-500 dark:text-gray-400">
                Execute a query to see results
              </div>
            </div>
          </SplitterPanel>
        </SplitterGroup>
      </SplitterPanel>
    </SplitterGroup>
  </div>
</template>

<script setup lang="ts">
import { usePowerSyncInspectorDiagnostics } from "#imports";
import {
  SplitterGroup,
  SplitterPanel,
  SplitterResizeHandle,
  TreeItem,
  TreeRoot,
} from "reka-ui";

import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/vue-table";

import { codeToHtml } from "shiki";

const ENTRIES_QUERY = `
SELECT name, type 
FROM sqlite_schema
WHERE type IN ('table', 'view')
ORDER BY type, name;
`;

const { db } = usePowerSyncInspectorDiagnostics();

const entriesRows = ref<{ name: string; type: string }[] | null>(null);
const _tableInfo = ref<any | null>(null);

// Create hierarchical tree structure
const treeData = computed(() => {
  if (!entriesRows.value) return [];

  const tables = entriesRows.value.filter((entry) => entry.type === "table");
  const views = entriesRows.value.filter((entry) => entry.type === "view");

  const treeItems = [];

  if (tables.length > 0) {
    treeItems.push({
      name: "Tables",
      type: "folder",
      icon: "carbon:folder",
      children: tables.map((table) => ({
        ...table,
        icon: "carbon:data-base",
      })),
    });
  }

  if (views.length > 0) {
    treeItems.push({
      name: "Views",
      type: "folder",
      icon: "carbon:view",
      children: views.map((view) => ({
        ...view,
        icon: "carbon:data-view",
      })),
    });
  }

  return treeItems;
});

onMounted(async () => {
  entriesRows.value = await db.value.getAll(ENTRIES_QUERY);
});

const selectedEntry = ref<{ name: string; type: string } | undefined>(
  undefined
);
const query = ref<string>("");
const isLoading = ref(false);
const queryError = ref<string | null>(null);
const _hasLimitOrOffset = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentTableRows = ref<any[] | null>(null);

// Editor refs for scroll synchronization
const textareaRef = ref<HTMLTextAreaElement>();
const highlightContainer = ref<HTMLDivElement>();
const cursorOverlay = ref<HTMLDivElement>();

// Create dynamic columns based on query results
const columns = computed(() => {
  if (!currentTableRows.value || currentTableRows.value.length === 0) return [];

  const firstRow = currentTableRows.value[0];
  const dataColumns = Object.keys(firstRow);

  // Create columns array with row number column first
  const columnsArray = [
    // Row number column (no header name)
    {
      id: "rowNumber",
      header: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: ({ row }: any) => row.index + 1,
      size: 60,
      enableSorting: false,
      enableResizing: false,
    },
    // Data columns
    ...dataColumns.map((key) => ({
      accessorKey: key,
      header: key,
      size: 150,
      minSize: 20,
      maxSize: 800,
      enableResizing: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: ({ getValue }: any) => {
        const value = getValue();
        if (value === null) return "NULL";
        if (value === undefined) return "UNDEFINED";
        return String(value);
      },
    })),
  ];

  return columnsArray;
});

const table = useVueTable({
  get data() {
    return currentTableRows.value || [];
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  enableColumnResizing: true,
  columnResizeMode: "onChange",
  defaultColumn: {
    size: 150,
    minSize: 20,
    maxSize: 800,
  },
  initialState: {
    pagination: {
      pageSize: 50, // Show 50 rows per page
    },
  },
});

const html = asyncComputed(
  async () =>
    await codeToHtml(query.value, {
      lang: "sql",
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-frappe",
      },
    })
);

// Scroll synchronization between textarea and highlight background
const syncScroll = () => {
  if (textareaRef.value && highlightContainer.value) {
    highlightContainer.value.scrollTop = textareaRef.value.scrollTop;
    highlightContainer.value.scrollLeft = textareaRef.value.scrollLeft;
  }
};

const selectEntry = (entry: { name: string; type: string }) => {
  selectedEntry.value = entry;
  query.value = `SELECT * FROM ${selectedEntry.value.name};`;
  executeQuery();
};

const executeQuery = async () => {
  if (!query.value.trim() || !db.value) return;

  isLoading.value = true;
  queryError.value = null;

  try {
    const result = await db.value.getAll(query.value);
    currentTableRows.value = result;
  } catch (error) {
    queryError.value =
      error instanceof Error ? error.message : "Unknown error occurred";
    currentTableRows.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Auto-execute when selected table changes
watch(selectedEntry, () => {
  if (selectedEntry.value) {
    executeQuery();
  }
});
</script>

<style>
/* Syntax highlighting background */
.syntax-highlight-bg {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 0;
  margin: 0;
  padding-top: 0.25rem;
}

.syntax-highlight-bg pre {
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.syntax-highlight-bg code {
  counter-reset: step;
  counter-increment: step 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  display: block;
  padding: 0;
  margin: 0;
}

.syntax-highlight-bg code .line {
  display: block;
  min-height: 1.5em;
  padding-left: 3rem;
}

.syntax-highlight-bg code .line::before {
  content: counter(step);
  counter-increment: step;
  position: absolute;
  left: 0;
  width: 2.5rem;
  margin-top: 0;
  margin-right: 0;
  display: inline-block;
  text-align: right;
  color: rgba(115, 138, 148, 0.4);
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  padding-right: 0.5rem;
}

/* Textarea styling to match exactly */
.editor-textarea {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  padding: 0 !important;
  margin: 0 !important;
  padding-left: 3rem !important;
  tab-size: 2;
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
  scrollbar-width: thin;
  padding-top: 0.25rem !important;
}

/* Cursor visibility - make it more prominent */
.editor-textarea {
  caret-color: #2563eb !important; /* Blue cursor for visibility */
}

.dark .editor-textarea {
  caret-color: #60a5fa !important; /* Light blue cursor for dark mode */
}

/* Ensure cursor is always visible with near-transparent text */
.editor-textarea:focus {
  caret-color: #2563eb !important;
}

.dark .editor-textarea:focus {
  caret-color: #60a5fa !important;
}

/* Selection visibility */
.editor-textarea::selection {
  background-color: rgba(59, 130, 246, 0.3);
}

.dark .editor-textarea::selection {
  background-color: rgba(96, 165, 250, 0.3);
}

/* Placeholder styling */
.editor-textarea::placeholder {
  color: rgba(115, 138, 148, 0.6);
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}
</style>
