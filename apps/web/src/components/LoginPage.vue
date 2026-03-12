<template>
  <div class="login-page">
    <div class="card">
      <h1>网页生成器 V2</h1>
      <p>默认账号：admin / admin123</p>

      <el-input v-model="username" data-testid="login-username" placeholder="用户名" />
      <el-input
        v-model="password"
        data-testid="login-password"
        type="password"
        placeholder="密码"
        show-password
      />

      <el-button data-testid="login-submit" type="primary" :loading="loading" @click="onSubmit">
        登录
      </el-button>

      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useEditorStore } from "@/stores/editor";

const router = useRouter();
const editorStore = useEditorStore();

const username = ref("admin");
const password = ref("admin123");
const loading = ref(false);
const error = ref("");

const onSubmit = async () => {
  loading.value = true;
  error.value = "";
  try {
    await editorStore.login(username.value, password.value);
    await router.replace("/editor");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  height: 100%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top left, #edf4ff, #f7f9fd 45%, #ffffff);
}

.card {
  width: 360px;
  border: 1px solid #e1e8f5;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 10px 24px rgba(24, 39, 75, 0.08);
}

h1 {
  margin: 0;
  font-size: 20px;
}

p {
  margin: 0;
  color: #667088;
  font-size: 12px;
}

.error {
  color: #d04f4f;
  font-size: 12px;
}
</style>
