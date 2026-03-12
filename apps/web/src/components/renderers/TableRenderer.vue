<template>
  <div class="table-wrap" @click.stop="handleSelect">
    <div v-if="showTools" class="inline-tools">
      <button type="button" @mousedown.prevent @click.stop="addRow">+ 行</button>
      <button type="button" @mousedown.prevent @click.stop="removeRow">- 行</button>
      <button type="button" @mousedown.prevent @click.stop="addCol">+ 列</button>
      <button type="button" @mousedown.prevent @click.stop="removeCol">- 列</button>
    </div>

    <table ref="tableRef" class="table" :class="{ striped }">
      <tbody>
        <tr
          v-for="(row, rowIndex) in cellMatrix"
          :key="`r${rowIndex}`"
          :class="{ header: showHeader && rowIndex === 0 }"
        >
          <td
            v-for="(cell, colIndex) in row"
            :key="`c${colIndex}`"
            :class="{ editable }"
            :contenteditable="editable"
            spellcheck="false"
            @focus="handleSelect"
            @blur="commitCells"
            @keydown.enter.prevent="handleCellEnter"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();
const tableRef = ref<HTMLElement | null>(null);

const defaultCell = "单元格";
const striped = computed(() => Boolean(props.node.props.striped ?? false));
const showHeader = computed(() => Boolean(props.node.props.showHeader ?? false));
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));
const showTools = computed(
  () => editable.value && editorStore.selectedNodeId === props.node.id
);

const rows = computed(() => {
  const raw = Number(props.node.props.rows ?? 2);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2;
});

const cols = computed(() => {
  const raw = Number(props.node.props.cols ?? 2);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2;
});

const buildMatrix = (rowCount: number, colCount: number) => {
  const raw = props.node.props.cells;

  if (Array.isArray(raw)) {
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from({ length: colCount }, (_, colIndex) => {
        const row = Array.isArray(raw[rowIndex]) ? (raw[rowIndex] as unknown[]) : [];
        const value = row[colIndex];
        return typeof value === "string" ? value : defaultCell;
      })
    );
  }

  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => defaultCell)
  );
};

const cellMatrix = computed(() => buildMatrix(rows.value, cols.value));

const handleSelect = () => {
  if (!editable.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const getDomCells = (): string[][] => {
  const host = tableRef.value;
  if (!host) {
    return buildMatrix(rows.value, cols.value);
  }

  const trList = Array.from(host.querySelectorAll("tr"));
  if (trList.length === 0) {
    return buildMatrix(rows.value, cols.value);
  }

  return trList.map((tr) =>
    Array.from(tr.querySelectorAll("td")).map(
      (td) => td.innerText.replace(/\r?\n/g, "").trim() || defaultCell
    )
  );
};

const syncDomCells = (nextMatrix: string[][]) => {
  const host = tableRef.value;
  if (!host) {
    return;
  }

  const trList = Array.from(host.querySelectorAll("tr"));
  trList.forEach((tr, rowIndex) => {
    const tdList = Array.from(tr.querySelectorAll("td"));
    tdList.forEach((td, colIndex) => {
      const nextValue = nextMatrix[rowIndex]?.[colIndex] ?? defaultCell;
      if (document.activeElement !== td && td.innerText !== nextValue) {
        td.innerText = nextValue;
      }
    });
  });
};

const isSameMatrix = (a: string[][], b: string[][]) =>
  a.length === b.length &&
  a.every(
    (row, rowIndex) =>
      row.length === (b[rowIndex]?.length ?? 0) &&
      row.every((cell, colIndex) => cell === b[rowIndex]?.[colIndex])
  );

const updateMatrix = (matrix: string[][]) => {
  editorStore.selectNode(props.node.id);
  editorStore.updateSelectedProps({
    rows: matrix.length,
    cols: matrix[0]?.length ?? 1,
    cells: matrix,
  });
};

const commitCells = () => {
  if (!editable.value) {
    return;
  }

  const nextMatrix = getDomCells();
  syncDomCells(nextMatrix);

  if (!isSameMatrix(nextMatrix, cellMatrix.value)) {
    updateMatrix(nextMatrix);
  }
};

const addRow = () => {
  const current = getDomCells();
  const colCount = current[0]?.length ?? cols.value;
  const next = [...current, Array.from({ length: colCount }, () => defaultCell)];
  updateMatrix(next);
};

const removeRow = () => {
  const current = getDomCells();
  if (current.length <= 1) {
    return;
  }
  updateMatrix(current.slice(0, -1));
};

const addCol = () => {
  const current = getDomCells();
  const next = current.map((row) => [...row, defaultCell]);
  updateMatrix(next);
};

const removeCol = () => {
  const current = getDomCells();
  const colCount = current[0]?.length ?? 1;
  if (colCount <= 1) {
    return;
  }
  const next = current.map((row) => row.slice(0, -1));
  updateMatrix(next);
};

const handleCellEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  target?.blur();
};

watch(
  cellMatrix,
  (next) => {
    syncDomCells(next);
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.table-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  gap: 8px;
}

.inline-tools {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.inline-tools button {
  height: 24px;
  border: 1px solid #c4ccda;
  border-radius: 0;
  background: #f5f7fb;
  color: #394356;
  font-size: 12px;
  line-height: 1;
  padding: 0 8px;
  cursor: pointer;
}

.inline-tools button:hover {
  border-color: #aeb8ca;
  background: #edf2fb;
}

.table {
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  min-width: 240px;
  border: 1px solid #cdd6e4;
  border-radius: inherit;
  overflow: hidden;
  background: transparent;
}

.table td {
  border: 1px solid #d7deea;
  padding: 9px 12px;
  color: inherit;
  font-size: 13px;
}

.table.striped tr:nth-child(even) td {
  background: rgba(130, 152, 190, 0.08);
}

.table tr.header td {
  font-weight: 700;
  background: rgba(94, 125, 190, 0.14);
}

.table td.editable {
  cursor: text;
}

.table td.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: -3px;
}
</style>
