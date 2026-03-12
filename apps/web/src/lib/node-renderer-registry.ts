import type { Component } from "vue";
import type { NodeType } from "@wg/schema";
import TextRenderer from "@/components/renderers/TextRenderer.vue";
import ImageRenderer from "@/components/renderers/ImageRenderer.vue";
import TitleRenderer from "@/components/renderers/TitleRenderer.vue";
import ContainerRenderer from "@/components/renderers/ContainerRenderer.vue";
import ParagraphRenderer from "@/components/renderers/ParagraphRenderer.vue";
import ButtonRenderer from "@/components/renderers/ButtonRenderer.vue";
import InputRenderer from "@/components/renderers/InputRenderer.vue";
import LinkRenderer from "@/components/renderers/LinkRenderer.vue";
import TableRenderer from "@/components/renderers/TableRenderer.vue";
import ListRenderer from "@/components/renderers/ListRenderer.vue";
import NavRenderer from "@/components/renderers/NavRenderer.vue";
import IRenderer from "@/components/renderers/IRenderer.vue";
import LiRenderer from "@/components/renderers/LiRenderer.vue";

const registry: Record<NodeType, Component> = {
  text: TextRenderer,
  image: ImageRenderer,
  title: TitleRenderer,
  container: ContainerRenderer,
  paragraph: ParagraphRenderer,
  button: ButtonRenderer,
  input: InputRenderer,
  link: LinkRenderer,
  table: TableRenderer,
  list: ListRenderer,
  nav: NavRenderer,
  i: IRenderer,
  li: LiRenderer,
  ul: ListRenderer,
  ol: ListRenderer,
};

export const getRenderer = (type: NodeType): Component => registry[type];
