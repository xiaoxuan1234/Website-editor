<template>
  <div class="logo">ED</div>
  <div class="name">
    <div class="text">{{ name }}</div>
    <div class="save-text">1 分钟前已自动保存</div>
  </div>
  <div class="actions">
    <i
      v-for="item in icons"
      :key="item"
      class="iconfont"
      :class="[{ 'actions-select': activeIcon === item }, item]"
      @click="selectIcon(item)"
    ></i>
  </div>
  <div class="operation">
    <div class="preview" @click="handpreview">预览</div>
    <div class="save" @click="handsave">保存</div>
    <div class="issue" @click="handissue">发布</div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useStyleSetStore } from "../../stores/styleSet.ts";
const store = useStyleSetStore();
const name = ref("设计编辑器");
const icons = ref(["icon-diannao", "icon-flat-full", "icon-shouji"]);
const activeIcon = ref(icons.value[0]);

const selectIcon = (icon: string) => {
  activeIcon.value = icon;
  console.log(icon);
};
const handpreview = () => {
  console.log("预览");
};

const handsave = () => {
  console.log("保存");
  console.log(store.typographyform);
  console.log(store.borderform);
};

const handissue = () => {
  console.log("发布");
};
</script>
<style scoped>
.logo {
  background: linear-gradient(135deg, #2b6ef5, #5aa2ff);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
}

.name {
  margin-left: 10px;
}

.text {
  font-weight: bold;
}

.save-text {
  color: #838282;
  font-size: 10px;
}

.actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
  background-color: #e1e1e2;
  padding: 4px;
  border-radius: 5px;
  margin-right: 15px;
}

.actions .iconfont {
  font-size: 16px;
  color: #666565;
  padding: 0px 4px;
  border-radius: 5px;
}

.actions:hover .iconfont:hover {
  font-size: 16px;
  color: #2b6ef5;
  background-color: #fff;
}

.actions .iconfont.actions-select {
  color: #2b6ef5;
  background-color: #fff;
}

.operation {
  display: flex;
  gap: 10px;
  padding-left: 15px;
  border-left: 2px solid #61616136;
}

.preview,
.save,
.issue {
  border: 1px solid #dae8f7;
  padding: 6px 12px;
  border-radius: 10px;
  background: white;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.075);
}

.issue {
  background: linear-gradient(135deg, #2b6ef5, #5aa2ff);
  color: white;
  border-color: transparent;
  box-shadow: 0 6px 14px rgba(43, 110, 245, 0.25);
}
</style>
