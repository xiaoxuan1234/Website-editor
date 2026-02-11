import { createRouter, createWebHistory } from "vue-router";

const Home = () => import("../views/Home.vue");
const Edit = () => import("../views/Edit/Edit.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/edit", name: "home", component: Home },
    { path: "/", name: "edit", component: Edit },
  ],
});

export default router;
