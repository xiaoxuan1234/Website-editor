import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./style.css";
import "./assets/font_5118948_l4z2vj6wm9p/iconfont.css";
import App from "./App.vue";
import router from "./router";

createApp(App).use(createPinia()).use(ElementPlus).use(router).mount("#app");
