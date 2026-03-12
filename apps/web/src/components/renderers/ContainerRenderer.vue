<template>
  <div class="container">
    <slot />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.container {
  width: 100%;
  min-height: 0;
  border: 1px dashed #bdc9de;
  border-radius: inherit;
  background: transparent;
  padding: 0;
  box-sizing: border-box;
}

.container > :first-child {
  margin-top: 0;
}

.container > :last-child {
  margin-bottom: 0;
}
</style>
