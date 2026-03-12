import { createRouter, createWebHistory } from "vue-router";
import EditorPage from "@/components/EditorPage.vue";
import LoginPage from "@/components/LoginPage.vue";
import PreviewPage from "@/components/PreviewPage.vue";

const hasSavedAuth = () => Boolean(localStorage.getItem("wg_auth_v2"));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: () => (hasSavedAuth() ? "/editor" : "/login"),
    },
    {
      path: "/login",
      component: LoginPage,
    },
    {
      path: "/editor",
      component: EditorPage,
    },
    {
      path: "/preview/:slug",
      component: PreviewPage,
    },
  ],
});
