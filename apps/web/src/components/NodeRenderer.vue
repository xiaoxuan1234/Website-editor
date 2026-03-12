<template>
  <component :is="renderer" :node="node">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EditorNode } from "@wg/schema";
import { getRenderer } from "@/lib/node-renderer-registry";

const props = defineProps<{ node: EditorNode }>();

const renderer = computed(() => getRenderer(props.node.type));
</script>
