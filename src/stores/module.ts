import { defineStore } from "pinia";
import { ref } from "vue";

export const usemoduleStore = defineStore("module", () => {
  const elements = ref([
    { icon: "icon-danhangwenben", text: "文本" },
    { icon: "icon-tupian", text: "图片" },
    { icon: "icon-biaotizhengwenqiehuan", text: "标题" },
    { icon: "icon-yk_fangkuai", text: "容器" },
    { icon: "icon-duanluo", text: "段落" },
    { icon: "icon-button", text: "按钮" },
    { icon: "icon-shurukuang", text: "输入框" },
    { icon: "icon-chaolianjie", text: "超链接" },
    { icon: "icon-biaoge", text: "表格" },
    { icon: "icon-liebiao", text: "列表" },
  ]);

  return { elements };
});
