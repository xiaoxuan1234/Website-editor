import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";

export const useStyleSetStore = defineStore("styleSet", () => {
  type TabKey = "dispaly" | "size" | "padding" | "radius";
  const activeName = ref<TabKey>("dispaly");
  const activeElem = ref<string>("容器");
  const activeID = ref<string>("#xiaoxuan");
  const displayShow = ref(true);
  const typographyShow = ref(true);
  const sizeShow = ref(true);
  const marginShow = ref(true);
  const paddingShow = ref(true);
  const borderShow = ref(true);
  const radiusShow = ref(true);
  const backgroundShow = ref(true);

  type ElementStyle = {
    display: Record<string, any>;
    typography: Record<string, any>;
    size: Record<string, any>;
    border: Record<string, any>;
    margin: Record<string, any>;
    padding: Record<string, any>;
    radius: Record<string, any>;
    background: Record<string, any>;
  };

  const createDefaultStyle = (): ElementStyle => ({
    display: {
      display: "",
      position: "static",
      top: { value: "", unit: "px" },
      left: { value: "", unit: "px" },
      bottom: { value: "", unit: "px" },
      right: { value: "", unit: "px" },
      float: "none",
      opacity: 1,
      background: "",
      textColor: "",
    },
    typography: {
      fontSize: { value: "16", unit: "px" },
      fontWeight: "500",
      fontFamily: "",
      fontStyle: "normal",
      textAlign: "left",
      letterSpacing: { value: "", unit: "px" },
      lineHeight: { value: "", unit: "px" },
      textDecoration: "none",
      decorationColor: "",
    },
    size: {
      width: { value: "", unit: "px" },
      height: { value: "", unit: "px" },
      maxWidth: { value: "", unit: "px" },
      maxHeight: { value: "", unit: "px" },
      minWidth: { value: "", unit: "px" },
      minHeight: { value: "", unit: "px" },
    },
    border: {
      borderWidth: { value: "", unit: "px" },
      borderStyle: "none",
      borderColor: "",
    },
    margin: {
      top: { value: "", unit: "px" },
      left: { value: "", unit: "px" },
      bottom: { value: "", unit: "px" },
      right: { value: "", unit: "px" },
    },
    padding: {
      top: { value: "", unit: "px" },
      left: { value: "", unit: "px" },
      bottom: { value: "", unit: "px" },
      right: { value: "", unit: "px" },
    },
    radius: {
      leftTop: { value: "", unit: "px" },
      rightTop: { value: "", unit: "px" },
      leftBottom: { value: "", unit: "px" },
      rightBottom: { value: "", unit: "px" },
    },
    background: {
      color: "",
      img: "",
    },
  });

  const elements = reactive<Record<string, ElementStyle>>({});

  const ensureStyle = (id: string) => {
    if (!elements[id]) {
      elements[id] = createDefaultStyle();
    }
    return elements[id];
  };

  const currentStyle = computed(() => ensureStyle(activeID.value));
  const dispalyform = computed(() => currentStyle.value.display);
  const typographyform = computed(() => currentStyle.value.typography);
  const sizeform = computed(() => currentStyle.value.size);
  const marginform = computed(() => currentStyle.value.margin);
  const paddingform = computed(() => currentStyle.value.padding);
  const borderform = computed(() => currentStyle.value.border);
  const radiusform = computed(() => currentStyle.value.radius);
  const backgroundform = computed(() => currentStyle.value.background);

  return {
    displayShow,
    typographyShow,
    activeName,
    activeElem,
    activeID,
    elements,
    currentStyle,
    dispalyform,
    typographyform,
    sizeShow,
    sizeform,
    marginShow,
    marginform,
    paddingShow,
    paddingform,
    borderShow,
    borderform,
    radiusShow,
    radiusform,
    backgroundShow,
    backgroundform,
  };
});
