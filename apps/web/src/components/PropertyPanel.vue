<template>
  <aside class="wg-prop">
    <header class="panel-header">
      <h3>属性设置</h3>
      <div class="active-chip">
        <span class="type">{{ activeTypeLabel }}</span>
        <span class="id">{{ activeTargetId }}</span>
      </div>
    </header>

    <div class="panel-body">
      <el-tabs v-model="activeTab" class="tabs" stretch>
        <el-tab-pane label="布局" name="display" />
        <el-tab-pane label="盒模型" name="size" />
        <el-tab-pane label="间距" name="spacing" />
        <el-tab-pane label="排版" name="effects" />
      </el-tabs>

      <div class="panel-scroll">
        <template v-if="isPageTarget">
          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('pageMain')">
              <span>页面设置</span>
              <el-icon :class="{ folded: !isSectionOpen('pageMain') }"><ArrowDown /></el-icon>
            </div>

            <div v-show="isSectionOpen('pageMain')" class="field-stack">
              <div class="content-tip">点击画布空白区域可返回页面设置。</div>
              <div class="field">
                <label>页面背景色</label>
                <div class="color-line">
                  <el-input
                    v-model="pageDraft.backgroundColor"
                    :disabled="preview"
                    placeholder="例如 #ffffff / rgba(...)"
                  />
                  <el-color-picker
                    v-model="pageDraft.backgroundColor"
                    :disabled="preview"
                    show-alpha
                    color-format="rgb"
                  />
                </div>
              </div>

              <div class="field">
                <label>页面背景图</label>
                <div class="bg-image-line">
                  <button
                    class="mini-btn"
                    type="button"
                    :disabled="preview"
                    @click="triggerPageBgUpload"
                  >
                    上传
                  </button>
                  <button
                    class="mini-btn danger"
                    type="button"
                    :disabled="preview || !pageDraft.backgroundImage"
                    @click="clearPageBgImage"
                  >
                    清除
                  </button>
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>填充方式</label>
                    <el-select v-model="pageDraft.backgroundSize" :disabled="preview">
                      <el-option label="铺满页面" value="cover" />
                      <el-option label="完整显示" value="contain" />
                      <el-option label="原始尺寸" value="auto" />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>重复</label>
                    <el-select v-model="pageDraft.backgroundRepeat" :disabled="preview">
                      <el-option label="不重复" value="no-repeat" />
                      <el-option label="横纵重复" value="repeat" />
                      <el-option label="仅横向重复" value="repeat-x" />
                      <el-option label="仅纵向重复" value="repeat-y" />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>位置</label>
                    <el-select v-model="pageDraft.backgroundPosition" :disabled="preview">
                      <el-option label="居中" value="center center" />
                      <el-option label="顶部居中" value="top center" />
                      <el-option label="底部居中" value="bottom center" />
                      <el-option label="左侧居中" value="center left" />
                      <el-option label="右侧居中" value="center right" />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>固定背景</label>
                    <el-select v-model="pageDraft.backgroundAttachment" :disabled="preview">
                      <el-option label="跟随滚动" value="scroll" />
                      <el-option label="固定不动" value="fixed" />
                    </el-select>
                  </div>
                </div>
                <input
                  ref="pageBgFileRef"
                  class="file-input"
                  type="file"
                  accept="image/*"
                  @change="onPageBgFileChange"
                />
              </div>
            </div>
          </section>

          <div v-else class="empty-state">页面设置仅在“显示”标签中提供</div>
        </template>

        <template v-else>
          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('displayLayoutMain')">
              <span>布局</span>
              <el-icon :class="{ folded: !isSectionOpen('displayLayoutMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('displayLayoutMain')" class="field-grid cols-2">
              <div class="field">
                <label>显示模式</label>
                <el-select v-model="displayDraft.display" :disabled="preview">
                  <el-option
                    v-for="item in displayOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>可见性</label>
                <el-select v-model="styleDraft.visibility" :disabled="preview">
                  <el-option
                    v-for="item in visibilityOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>浮动</label>
                <div class="segmented">
                  <button type="button" :disabled="preview" :class="{ active: displayDraft.float === 'none' }" @click="displayDraft.float = 'none'">×</button>
                  <button type="button" :disabled="preview" :class="{ active: displayDraft.float === 'left' }" @click="displayDraft.float = 'left'"><span class="bars left"></span></button>
                  <button type="button" :disabled="preview" :class="{ active: displayDraft.float === 'right' }" @click="displayDraft.float = 'right'"><span class="bars right"></span></button>
                </div>
              </div>
              <div class="field">
                <label>光标样式</label>
                <el-select v-model="styleDraft.cursor" :disabled="preview">
                  <el-option
                    v-for="item in cursorOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('displayPositionMain')">
              <span>定位</span>
              <el-icon :class="{ folded: !isSectionOpen('displayPositionMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('displayPositionMain')" class="field-grid cols-2">
              <div class="field">
                <label>定位方式</label>
                <el-select v-model="displayDraft.position" :disabled="preview">
                  <el-option
                    v-for="item in positionOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>层级</label>
                <el-input v-model="styleDraft.zIndex" :disabled="preview" placeholder="auto / 10" />
              </div>
              <div class="field">
                <label>上</label>
                <UnitInput v-model="displayDraft.top" :disabled="preview" :allow-auto="true" />
              </div>
              <div class="field">
                <label>左</label>
                <UnitInput v-model="displayDraft.left" :disabled="preview" :allow-auto="true" />
              </div>
              <div class="field">
                <label>下</label>
                <UnitInput v-model="displayDraft.bottom" :disabled="preview" :allow-auto="true" />
              </div>
              <div class="field">
                <label>右</label>
                <UnitInput v-model="displayDraft.right" :disabled="preview" :allow-auto="true" />
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('displayVisualMain')">
              <span>视觉</span>
              <el-icon :class="{ folded: !isSectionOpen('displayVisualMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('displayVisualMain')" class="field">
              <div class="opacity-head">
                <label>透明度</label>
                <el-input-number v-model="displayDraft.opacity" :disabled="preview" :min="0" :max="1" :step="0.01" :precision="2" controls-position="right" />
              </div>
              <el-slider v-model="displayDraft.opacity" :disabled="preview" :min="0" :max="1" :step="0.01" :show-tooltip="false" />
            </div>
          </section>

          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('displayColorMain')">
              <span>颜色</span>
              <el-icon :class="{ folded: !isSectionOpen('displayColorMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('displayColorMain')" class="field">
              <label>背景色</label>
              <div class="color-line">
                <el-input v-model="displayDraft.backgroundColor" :disabled="preview" placeholder="rgba(0, 0, 0, 0)" />
                <el-color-picker v-model="displayDraft.backgroundColor" :disabled="preview" show-alpha color-format="rgb" />
              </div>
            </div>
            <div v-show="isSectionOpen('displayColorMain')" class="field">
              <label>文字颜色</label>
              <div class="color-line">
                <el-input v-model="displayDraft.color" :disabled="preview" placeholder="rgb(248, 249, 250)" />
                <el-color-picker v-model="displayDraft.color" :disabled="preview" show-alpha color-format="rgb" />
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'display'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('elementMain')">
              <span>元素属性</span>
              <el-icon :class="{ folded: !isSectionOpen('elementMain') }"><ArrowDown /></el-icon>
            </div>

            <div v-show="isSectionOpen('elementMain')" class="field-stack element-stack">
              <template
                v-if="
                  activeNodeType === 'text' ||
                  activeNodeType === 'title' ||
                  activeNodeType === 'paragraph' ||
                  activeNodeType === 'nav' ||
                  activeNodeType === 'li'
                "
              >
                <div class="field">
                  <label>{{ activeNodeType === "title" ? "标题内容" : "文本内容" }}</label>
                  <el-input
                    v-model="propsDraft.content"
                    :disabled="preview"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入文本内容"
                  />
                </div>
                <div v-if="activeNodeType === 'title'" class="field">
                  <label>标题级别</label>
                  <el-select v-model="propsDraft.titleLevel" :disabled="preview">
                    <el-option
                      v-for="item in titleLevelOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
              </template>

              <template v-else-if="activeNodeType === 'i'">
                <div class="field">
                  <label>图标资源</label>
                  <div class="upload-line">
                    <button class="mini-btn" type="button" :disabled="preview" @click="triggerIconUpload">
                      上传图标
                    </button>
                    <button
                      class="mini-btn danger"
                      type="button"
                      :disabled="preview || !propsDraft.iconSrc"
                      @click="clearIconUpload"
                    >
                      清除上传
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label>图标类名</label>
                  <el-input v-model="propsDraft.iconClass" :disabled="preview" placeholder="例如 icon-zujian" />
                </div>
                <div class="content-tip compact">支持上传图标图片；未上传时使用 iconfont 类名显示。</div>
                <input
                  ref="iconFileRef"
                  class="file-input"
                  type="file"
                  accept="image/*"
                  @change="onIconFileChange"
                />
              </template>

              <template v-else-if="activeNodeType === 'button'">
                <div class="field">
                  <label>按钮文字</label>
                  <el-input v-model="propsDraft.label" :disabled="preview" placeholder="请输入按钮文案" />
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>按钮风格</label>
                    <el-select v-model="propsDraft.buttonVariant" :disabled="preview">
                      <el-option
                        v-for="item in buttonVariantOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>按钮尺寸</label>
                    <el-select v-model="propsDraft.buttonSize" :disabled="preview">
                      <el-option
                        v-for="item in buttonSizeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>禁用状态</label>
                    <el-select v-model="propsDraft.buttonDisabled" :disabled="preview">
                      <el-option
                        v-for="item in enabledOptions"
                        :key="`btn-disabled-${item.label}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </div>
              </template>

              <template v-else-if="activeNodeType === 'link'">
                <div class="field">
                  <label>链接文字</label>
                  <el-input v-model="propsDraft.label" :disabled="preview" placeholder="请输入链接文案" />
                </div>
                <div class="field">
                  <label>链接地址</label>
                  <el-input v-model="propsDraft.href" :disabled="preview" placeholder="https://example.com" />
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>打开方式</label>
                    <el-select v-model="propsDraft.linkTarget" :disabled="preview">
                      <el-option
                        v-for="item in linkTargetOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>显示下划线</label>
                    <el-select v-model="propsDraft.linkUnderline" :disabled="preview">
                      <el-option
                        v-for="item in toggleOptions"
                        :key="`link-underline-${item.label}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>悬浮标题</label>
                    <el-input v-model="propsDraft.linkTitle" :disabled="preview" placeholder="鼠标悬浮提示文本" />
                  </div>
                  <div class="field">
                    <label>搜索引擎跟踪</label>
                    <el-select v-model="propsDraft.linkNoFollow" :disabled="preview">
                      <el-option
                        v-for="item in toggleOptions"
                        :key="`link-nofollow-${item.label}`"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </div>
              </template>

              <template v-else-if="activeNodeType === 'input'">
                <div class="field">
                  <label>占位文本</label>
                  <el-input
                    v-model="propsDraft.placeholder"
                    :disabled="preview"
                    placeholder="请输入输入框占位文本"
                  />
                </div>
                <div class="field">
                  <label>输入类型</label>
                  <el-select v-model="propsDraft.inputType" :disabled="preview">
                    <el-option
                      v-for="item in inputTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
                <div class="field">
                  <label>禁用状态</label>
                  <el-select v-model="propsDraft.inputDisabled" :disabled="preview">
                    <el-option
                      v-for="item in enabledOptions"
                      :key="`input-disabled-${item.label}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
                <div class="field">
                  <label>默认值</label>
                  <el-input v-model="propsDraft.inputValue" :disabled="preview" placeholder="预览时展示的默认值" />
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>字段名</label>
                    <el-input v-model="propsDraft.inputName" :disabled="preview" placeholder="例如 username" />
                  </div>
                  <div class="field">
                    <label>最大长度</label>
                    <el-input-number v-model="propsDraft.inputMaxLength" :disabled="preview" :min="0" :max="9999" />
                  </div>
                </div>
                <div class="field">
                  <label>是否必填</label>
                  <el-select v-model="propsDraft.inputRequired" :disabled="preview">
                    <el-option
                      v-for="item in toggleOptions"
                      :key="`input-required-${item.label}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
              </template>

              <template v-else-if="activeNodeType === 'image'">
                <div class="field">
                  <label>图片资源</label>
                  <div class="upload-line">
                    <button class="mini-btn" type="button" :disabled="preview" @click="triggerNodeImageUpload">
                      上传图片
                    </button>
                    <button
                      class="mini-btn danger"
                      type="button"
                      :disabled="preview || !propsDraft.src"
                      @click="clearNodeImage"
                    >
                      清除图片
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label>替代文本</label>
                  <el-input
                    v-model="propsDraft.imageAlt"
                    :disabled="preview"
                    placeholder="用于无障碍和图片加载失败时展示"
                  />
                </div>
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>填充方式</label>
                    <el-select v-model="propsDraft.imageFit" :disabled="preview">
                      <el-option
                        v-for="item in imageFitOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                  <div class="field">
                    <label>对齐位置</label>
                    <el-select v-model="propsDraft.imagePosition" :disabled="preview">
                      <el-option
                        v-for="item in imagePositionOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>
                </div>
                <input
                  ref="nodeImageFileRef"
                  class="file-input"
                  type="file"
                  accept="image/*"
                  @change="onNodeImageFileChange"
                />
              </template>

              <template v-else-if="activeNodeType === 'table'">
                <div class="field-grid cols-2">
                  <div class="field">
                    <label>行数</label>
                    <el-input-number v-model="propsDraft.rows" :disabled="preview" :min="1" :max="20" />
                  </div>
                  <div class="field">
                    <label>列数</label>
                    <el-input-number v-model="propsDraft.cols" :disabled="preview" :min="1" :max="12" />
                  </div>
                </div>
                <div class="field">
                  <label>隔行样式</label>
                  <el-select v-model="propsDraft.tableStriped" :disabled="preview">
                    <el-option
                      v-for="item in toggleOptions"
                      :key="`table-striped-${item.label}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
                <div class="field">
                  <label>首行表头</label>
                  <el-select v-model="propsDraft.tableShowHeader" :disabled="preview">
                    <el-option
                      v-for="item in toggleOptions"
                      :key="`table-header-${item.label}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
              </template>

              <template v-else-if="activeNodeType === 'list' || activeNodeType === 'ul' || activeNodeType === 'ol'">
                <div class="field">
                  <label>列表项（每行一个）</label>
                  <el-input
                    v-model="propsDraft.itemsText"
                    :disabled="preview"
                    type="textarea"
                    :rows="4"
                    placeholder="每行一个列表项"
                  />
                </div>
                <div class="field">
                  <label>列表样式</label>
                  <el-select v-model="propsDraft.listStyleType" :disabled="preview">
                    <el-option
                      v-for="item in listStyleTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
                <div class="field">
                  <label>列表项间距</label>
                  <el-input-number v-model="propsDraft.listItemSpacing" :disabled="preview" :min="0" :max="60" />
                </div>
              </template>

              <template v-else-if="activeNodeType === 'container'">
                <div class="field">
                  <label>布局模式</label>
                  <el-select v-model="propsDraft.layout" :disabled="preview">
                    <el-option label="流式" value="flow" />
                  </el-select>
                </div>
                <div class="field">
                  <label>空容器提示</label>
                  <el-input v-model="propsDraft.emptyText" :disabled="preview" placeholder="拖拽组件到容器内" />
                </div>
              </template>

              <div v-else class="content-tip">当前元素暂无可配置的专属属性。</div>
            </div>
          </section>

          <section v-if="activeTab === 'size'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('sizeMain')">
              <span>尺寸</span>
              <el-icon :class="{ folded: !isSectionOpen('sizeMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('sizeMain')" class="field-grid cols-2">
              <div class="field"><label>宽度</label><UnitInput v-model="styleDraft.width" :disabled="preview" :allow-auto="true" /></div>
              <div class="field"><label>高度</label><UnitInput v-model="styleDraft.height" :disabled="preview" :allow-auto="true" /></div>
              <div class="field"><label>最小宽度</label><UnitInput v-model="styleDraft.minWidth" :disabled="preview" /></div>
              <div class="field"><label>最小高度</label><UnitInput v-model="styleDraft.minHeight" :disabled="preview" /></div>
              <div class="field"><label>最大宽度</label><UnitInput v-model="styleDraft.maxWidth" :disabled="preview" /></div>
              <div class="field"><label>最大高度</label><UnitInput v-model="styleDraft.maxHeight" :disabled="preview" /></div>
            </div>
          </section>

          <section v-if="activeTab === 'size'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('borderMain')">
              <span>边框</span>
              <el-icon :class="{ folded: !isSectionOpen('borderMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('borderMain')" class="field-grid cols-2">
              <div class="field"><label>边框宽度</label><UnitInput v-model="styleDraft.borderWidth" :disabled="preview" /></div>
              <div class="field">
                <label>边框样式</label>
                <el-select v-model="styleDraft.borderStyle" :disabled="preview">
                  <el-option
                    v-for="item in borderStyleOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
            <div v-show="isSectionOpen('borderMain')" class="field">
              <label>边框颜色</label>
              <div class="color-line">
                <el-input
                  v-model="styleDraft.borderColor"
                  :disabled="preview"
                  placeholder="例如 #d8dce5 / rgba(...)"
                />
                <el-color-picker
                  v-model="styleDraft.borderColor"
                  :disabled="preview"
                  show-alpha
                  color-format="rgb"
                />
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'size'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('boxModelMain')">
              <span>盒模型</span>
              <el-icon :class="{ folded: !isSectionOpen('boxModelMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('boxModelMain')" class="field">
              <label>盒模型类型</label>
              <el-select v-model="styleDraft.boxSizing" :disabled="preview">
                <el-option
                  v-for="item in boxSizingOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
          </section>

          <section v-if="activeTab === 'size'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('overflowMain')">
              <span>溢出</span>
              <el-icon :class="{ folded: !isSectionOpen('overflowMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('overflowMain')" class="field-grid cols-2">
              <div class="field">
                <label>水平溢出</label>
                <el-select v-model="styleDraft.overflowX" :disabled="preview">
                  <el-option
                    v-for="item in overflowOptions"
                    :key="`x-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>垂直溢出</label>
                <el-select v-model="styleDraft.overflowY" :disabled="preview">
                  <el-option
                    v-for="item in overflowOptions"
                    :key="`y-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'size' && isContainerFlex" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('flexMain')">
              <span>Flex 布局</span>
              <el-icon :class="{ folded: !isSectionOpen('flexMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('flexMain')" class="field-grid cols-2">
              <div class="field">
                <label>主轴方向</label>
                <el-select v-model="styleDraft.flexDirection" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in flexDirectionOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>换行</label>
                <el-select v-model="styleDraft.flexWrap" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in flexWrapOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>主轴对齐</label>
                <el-select v-model="styleDraft.justifyContent" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in justifyContentOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>交叉轴对齐</label>
                <el-select v-model="styleDraft.alignItems" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in alignItemsOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>多行对齐</label>
                <el-select v-model="styleDraft.alignContent" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in alignContentOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'size' && isContainerGrid" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('gridMain')">
              <span>Grid 布局</span>
              <el-icon :class="{ folded: !isSectionOpen('gridMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('gridMain')" class="field-grid cols-2">
              <div class="field grid-count">
                <label>列数</label>
                <el-input-number
                  v-model="gridColumnCount"
                  :disabled="preview"
                  :min="1"
                  :max="24"
                  :step="1"
                  :controls="false"
                />
              </div>
              <div class="field grid-count">
                <label>行数</label>
                <el-input-number
                  v-model="gridRowCount"
                  :disabled="preview"
                  :min="1"
                  :max="24"
                  :step="1"
                  :controls="false"
                />
              </div>
              <div class="field">
                <label>自动流向</label>
                <el-select v-model="styleDraft.gridAutoFlow" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in gridAutoFlowOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>单元格水平对齐</label>
                <el-select v-model="styleDraft.justifyItems" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in gridItemAlignOptions"
                    :key="`justify-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>单元格垂直对齐</label>
                <el-select v-model="styleDraft.alignItems" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in gridItemAlignOptions"
                    :key="`align-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>整体水平对齐</label>
                <el-select v-model="styleDraft.justifyContent" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in gridContentAlignOptions"
                    :key="`grid-justify-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>整体垂直对齐</label>
                <el-select v-model="styleDraft.alignContent" :disabled="preview" placeholder="请选择">
                  <el-option
                    v-for="item in gridContentAlignOptions"
                    :key="`grid-align-content-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>
          <section v-if="activeTab === 'spacing' && isContainerFlexOrGrid" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('spacingGapMain')">
              <span>Gap 间距</span>
              <el-icon :class="{ folded: !isSectionOpen('spacingGapMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('spacingGapMain')" class="field-grid cols-2">
              <div class="field">
                <label>元素间距</label>
                <UnitInput v-model="styleDraft.gap" :disabled="preview" />
              </div>
              <div class="field">
                <label>行间距</label>
                <UnitInput v-model="styleDraft.rowGap" :disabled="preview" />
              </div>
              <div class="field">
                <label>列间距</label>
                <UnitInput v-model="styleDraft.columnGap" :disabled="preview" />
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'spacing'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('spacingMarginMain')">
              <span>外边距</span>
              <el-icon :class="{ folded: !isSectionOpen('spacingMarginMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('spacingMarginMain')" class="field-grid cols-2">
              <div class="field"><label>上</label><UnitInput v-model="styleDraft.marginTop" :disabled="preview" /></div>
              <div class="field"><label>右</label><UnitInput v-model="styleDraft.marginRight" :disabled="preview" /></div>
              <div class="field"><label>下</label><UnitInput v-model="styleDraft.marginBottom" :disabled="preview" /></div>
              <div class="field"><label>左</label><UnitInput v-model="styleDraft.marginLeft" :disabled="preview" /></div>
            </div>
          </section>

          <section v-if="activeTab === 'spacing'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('spacingPaddingMain')">
              <span>内边距</span>
              <el-icon :class="{ folded: !isSectionOpen('spacingPaddingMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('spacingPaddingMain')" class="field-grid cols-2">
              <div class="field"><label>上</label><UnitInput v-model="styleDraft.paddingTop" :disabled="preview" /></div>
              <div class="field"><label>右</label><UnitInput v-model="styleDraft.paddingRight" :disabled="preview" /></div>
              <div class="field"><label>下</label><UnitInput v-model="styleDraft.paddingBottom" :disabled="preview" /></div>
              <div class="field"><label>左</label><UnitInput v-model="styleDraft.paddingLeft" :disabled="preview" /></div>
            </div>
          </section>

          <section v-if="activeTab === 'effects'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('effectsRadiusMain')">
              <span>圆角</span>
              <el-icon :class="{ folded: !isSectionOpen('effectsRadiusMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('effectsRadiusMain')" class="field-grid cols-2">
              <div class="field"><label>圆角</label><UnitInput v-model="styleDraft.borderRadius" :disabled="preview" /></div>
              <div class="field"><label>左上圆角</label><UnitInput v-model="styleDraft.borderTopLeftRadius" :disabled="preview" /></div>
              <div class="field"><label>右上圆角</label><UnitInput v-model="styleDraft.borderTopRightRadius" :disabled="preview" /></div>
              <div class="field"><label>右下圆角</label><UnitInput v-model="styleDraft.borderBottomRightRadius" :disabled="preview" /></div>
              <div class="field"><label>左下圆角</label><UnitInput v-model="styleDraft.borderBottomLeftRadius" :disabled="preview" /></div>
            </div>
          </section>

          <section v-if="activeTab === 'effects'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('effectsTypographyMain')">
              <span>排版</span>
              <el-icon :class="{ folded: !isSectionOpen('effectsTypographyMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('effectsTypographyMain')" class="field-grid cols-2">
              <div class="field"><label>字号</label><UnitInput v-model="styleDraft.fontSize" :disabled="preview" /></div>
              <div class="field">
                <label>字体</label>
                <el-select v-model="styleDraft.fontFamily" :disabled="preview">
                  <el-option
                    v-for="item in fontFamilyOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>字重</label>
                <el-select v-model="styleDraft.fontWeight" :disabled="preview">
                  <el-option
                    v-for="item in fontWeightOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>对齐方式</label>
                <el-select v-model="styleDraft.textAlign" :disabled="preview">
                  <el-option
                    v-for="item in textAlignOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>垂直对齐</label>
                <el-select v-model="styleDraft.verticalAlign" :disabled="preview">
                  <el-option
                    v-for="item in verticalAlignOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field"><label>行高</label><UnitInput v-model="styleDraft.lineHeight" :disabled="preview" :units="['px', 'em', 'rem']" /></div>
              <div class="field"><label>字间距</label><UnitInput v-model="styleDraft.letterSpacing" :disabled="preview" /></div>
              <div class="field">
                <label>字体样式</label>
                <el-select v-model="styleDraft.fontStyle" :disabled="preview">
                  <el-option
                    v-for="item in fontStyleOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'effects'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('effectsTextMain')">
              <span>文本</span>
              <el-icon :class="{ folded: !isSectionOpen('effectsTextMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('effectsTextMain')" class="field-grid cols-2">
              <div class="field">
                <label>文本装饰</label>
                <el-select v-model="styleDraft.textDecoration" :disabled="preview">
                  <el-option
                    v-for="item in textDecorationOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>大小写转换</label>
                <el-select v-model="styleDraft.textTransform" :disabled="preview">
                  <el-option
                    v-for="item in textTransformOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>空白处理</label>
                <el-select v-model="styleDraft.whiteSpace" :disabled="preview">
                  <el-option
                    v-for="item in whiteSpaceOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
              <div class="field">
                <label>换行策略</label>
                <el-select v-model="styleDraft.wordBreak" :disabled="preview">
                  <el-option
                    v-for="item in wordBreakOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'effects'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('effectsShadowMain')">
              <span>阴影</span>
              <el-icon :class="{ folded: !isSectionOpen('effectsShadowMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('effectsShadowMain')" class="field">
              <label>阴影</label>
              <el-input
                v-model="styleDraft.boxShadow"
                :disabled="preview"
                placeholder="例如 0 8px 20px rgba(0,0,0,.15)"
              />
            </div>
          </section>

          <section v-if="activeTab === 'effects'" class="vv-card">
            <div class="section-head clickable" @click="toggleSection('effectsBackgroundMain')">
              <span>背景</span>
              <el-icon :class="{ folded: !isSectionOpen('effectsBackgroundMain') }"><ArrowDown /></el-icon>
            </div>
            <div v-show="isSectionOpen('effectsBackgroundMain')" class="field">
              <label>背景色</label>
              <div class="color-line">
                <el-input v-model="styleDraft.backgroundColor" :disabled="preview" placeholder="例如 #f7f9ff / rgba(...)" />
                <el-color-picker v-model="styleDraft.backgroundColor" :disabled="preview" show-alpha color-format="rgb" />
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { EditorNode, NodeType } from "@wg/schema";
import UnitInput from "@/components/UnitInput.vue";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();

const activeTab = ref<"display" | "size" | "spacing" | "effects">("display");
const node = computed(() => editorStore.selectedNode);
const activeNodeType = computed<NodeType | null>(() => node.value?.type ?? null);
const isPageTarget = computed(() => !node.value);
const preview = computed(() => editorStore.previewMode);

type SectionKey =
  | "displayLayoutMain"
  | "displayPositionMain"
  | "displayVisualMain"
  | "displayColorMain"
  | "elementMain"
  | "sizeMain"
  | "borderMain"
  | "boxModelMain"
  | "overflowMain"
  | "flexMain"
  | "gridMain"
  | "spacingGapMain"
  | "spacingMarginMain"
  | "spacingPaddingMain"
  | "effectsRadiusMain"
  | "effectsTypographyMain"
  | "effectsTextMain"
  | "effectsShadowMain"
  | "effectsBackgroundMain"
  | "pageMain";
const sectionOpen = reactive<Record<SectionKey, boolean>>({
  displayLayoutMain: true,
  displayPositionMain: true,
  displayVisualMain: true,
  displayColorMain: true,
  elementMain: true,
  sizeMain: true,
  borderMain: true,
  boxModelMain: true,
  overflowMain: true,
  flexMain: true,
  gridMain: true,
  spacingGapMain: true,
  spacingMarginMain: true,
  spacingPaddingMain: true,
  effectsRadiusMain: true,
  effectsTypographyMain: true,
  effectsTextMain: true,
  effectsShadowMain: true,
  effectsBackgroundMain: true,
  pageMain: true,
});

const nodeTypeLabelMap: Record<NodeType, string> = {
  text: "文本",
  image: "图片",
  title: "标题",
  container: "容器",
  paragraph: "段落",
  button: "按钮",
  input: "输入框",
  link: "超链接",
  table: "表格",
  list: "列表",
  nav: "导航",
  i: "图标",
  li: "列表项",
  ul: "无序列表",
  ol: "有序列表",
};

const activeTypeLabel = computed(() => {
  const target = node.value;
  return target ? nodeTypeLabelMap[target.type] : "页面";
});
const activeTargetId = computed(() =>
  node.value ? node.value.id : editorStore.currentPageId || "-"
);

const displayOptions = [
  { label: "block", value: "block" },
  { label: "inline", value: "inline" },
  { label: "inline-block", value: "inline-block" },
  { label: "flex", value: "flex" },
  { label: "grid", value: "grid" },
  { label: "none", value: "none" },
];
const positionOptions = [
  { label: "默认流", value: "static" },
  { label: "相对定位", value: "relative" },
  { label: "绝对定位", value: "absolute" },
  { label: "固定定位", value: "fixed" },
  { label: "粘性定位", value: "sticky" },
];
const visibilityOptions = [
  { label: "默认", value: "" },
  { label: "可见", value: "visible" },
  { label: "隐藏", value: "hidden" },
];
const titleLevelOptions = [
  { label: "一级标题", value: "h1" },
  { label: "二级标题", value: "h2" },
  { label: "三级标题", value: "h3" },
  { label: "四级标题", value: "h4" },
  { label: "五级标题", value: "h5" },
  { label: "六级标题", value: "h6" },
];
const borderStyleOptions = [
  { label: "默认", value: "" },
  { label: "无", value: "none" },
  { label: "实线", value: "solid" },
  { label: "虚线", value: "dashed" },
  { label: "点线", value: "dotted" },
  { label: "双线", value: "double" },
];
const boxSizingOptions = [
  { label: "Default", value: "" },
  { label: "Border-box", value: "border-box" },
  { label: "Content-box", value: "content-box" },
];
const overflowOptions = [
  { label: "默认", value: "" },
  { label: "可见", value: "visible" },
  { label: "隐藏", value: "hidden" },
  { label: "自动", value: "auto" },
  { label: "滚动", value: "scroll" },
  { label: "裁剪", value: "clip" },
];
const fontWeightOptions = [
  { label: "默认", value: "" },
  { label: "正常 (400)", value: "400" },
  { label: "中等 (500)", value: "500" },
  { label: "半粗 (600)", value: "600" },
  { label: "加粗 (700)", value: "700" },
  { label: "特粗 (800)", value: "800" },
];
const fontStyleOptions = [
  { label: "默认", value: "" },
  { label: "正常", value: "normal" },
  { label: "斜体", value: "italic" },
  { label: "倾斜", value: "oblique" },
];
const textDecorationOptions = [
  { label: "默认", value: "" },
  { label: "无", value: "none" },
  { label: "下划线", value: "underline" },
  { label: "删除线", value: "line-through" },
  { label: "上划线", value: "overline" },
];
const textTransformOptions = [
  { label: "默认", value: "" },
  { label: "无", value: "none" },
  { label: "全大写", value: "uppercase" },
  { label: "全小写", value: "lowercase" },
  { label: "首字母大写", value: "capitalize" },
];
const whiteSpaceOptions = [
  { label: "默认", value: "" },
  { label: "正常换行", value: "normal" },
  { label: "不换行", value: "nowrap" },
  { label: "保留空白并换行", value: "pre-wrap" },
  { label: "合并空白并保留换行", value: "pre-line" },
];
const wordBreakOptions = [
  { label: "默认", value: "" },
  { label: "正常", value: "normal" },
  { label: "强制断词", value: "break-all" },
  { label: "保持整词", value: "keep-all" },
  { label: "单词边界断行", value: "break-word" },
];
const cursorOptions = [
  { label: "默认", value: "" },
  { label: "自动", value: "auto" },
  { label: "手型", value: "pointer" },
  { label: "文本", value: "text" },
  { label: "移动", value: "move" },
  { label: "抓取", value: "grab" },
  { label: "十字准星", value: "crosshair" },
  { label: "禁止", value: "not-allowed" },
];
const textAlignOptions = [
  { label: "默认", value: "" },
  { label: "左对齐", value: "left" },
  { label: "居中", value: "center" },
  { label: "右对齐", value: "right" },
  { label: "两端对齐", value: "justify" },
];
const fontFamilyOptions = [
  { label: "默认", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times New Roman", value: "'Times New Roman'" },
  { label: "Courier New", value: "'Courier New'" },
  { label: "微软雅黑", value: "'Microsoft YaHei'" },
  { label: "苹方", value: "'PingFang SC'" },
  { label: "思源黑体", value: "'Noto Sans SC'" },
  { label: "思源宋体", value: "'Noto Serif SC'" },
  { label: "黑体", value: "SimHei" },
  { label: "宋体", value: "SimSun" },
];
const verticalAlignOptions = [
  { label: "默认", value: "" },
  { label: "基线", value: "baseline" },
  { label: "顶部", value: "top" },
  { label: "中间", value: "middle" },
  { label: "底部", value: "bottom" },
  { label: "文本顶部", value: "text-top" },
  { label: "文本底部", value: "text-bottom" },
  { label: "下标", value: "sub" },
  { label: "上标", value: "super" },
];
const flexDirectionOptions = [
  { label: "默认", value: "" },
  { label: "水平", value: "row" },
  { label: "水平反向", value: "row-reverse" },
  { label: "垂直", value: "column" },
  { label: "垂直反向", value: "column-reverse" },
];
const flexWrapOptions = [
  { label: "默认", value: "" },
  { label: "不换行", value: "nowrap" },
  { label: "换行", value: "wrap" },
  { label: "反向换行", value: "wrap-reverse" },
];
const justifyContentOptions = [
  { label: "默认", value: "" },
  { label: "起始", value: "flex-start" },
  { label: "结束", value: "flex-end" },
  { label: "居中", value: "center" },
  { label: "两端对齐", value: "space-between" },
  { label: "环绕分布", value: "space-around" },
  { label: "平均分布", value: "space-evenly" },
];
const alignItemsOptions = [
  { label: "默认", value: "" },
  { label: "拉伸", value: "stretch" },
  { label: "起始", value: "flex-start" },
  { label: "结束", value: "flex-end" },
  { label: "居中", value: "center" },
  { label: "基线", value: "baseline" },
];
const alignContentOptions = [
  { label: "默认", value: "" },
  { label: "拉伸", value: "stretch" },
  { label: "起始", value: "flex-start" },
  { label: "结束", value: "flex-end" },
  { label: "居中", value: "center" },
  { label: "两端对齐", value: "space-between" },
  { label: "环绕分布", value: "space-around" },
];
const gridAutoFlowOptions = [
  { label: "默认", value: "" },
  { label: "按行", value: "row" },
  { label: "按列", value: "column" },
  { label: "按行紧凑", value: "row dense" },
  { label: "按列紧凑", value: "column dense" },
];
const gridItemAlignOptions = [
  { label: "默认", value: "" },
  { label: "拉伸", value: "stretch" },
  { label: "起始", value: "start" },
  { label: "结束", value: "end" },
  { label: "居中", value: "center" },
  { label: "基线", value: "baseline" },
];
const gridContentAlignOptions = [
  { label: "默认", value: "" },
  { label: "拉伸", value: "stretch" },
  { label: "起始", value: "start" },
  { label: "结束", value: "end" },
  { label: "居中", value: "center" },
  { label: "两端对齐", value: "space-between" },
  { label: "环绕分布", value: "space-around" },
  { label: "平均分布", value: "space-evenly" },
];
const buttonVariantOptions = [
  { label: "主按钮", value: "primary" },
  { label: "描边按钮", value: "outline" },
  { label: "浅色按钮", value: "soft" },
];
const buttonSizeOptions = [
  { label: "小", value: "sm" },
  { label: "中", value: "md" },
  { label: "大", value: "lg" },
];
const linkTargetOptions = [
  { label: "当前页打开", value: "_self" },
  { label: "新窗口打开", value: "_blank" },
];
const inputTypeOptions = [
  { label: "文本", value: "text" },
  { label: "邮箱", value: "email" },
  { label: "密码", value: "password" },
  { label: "数字", value: "number" },
  { label: "电话", value: "tel" },
  { label: "链接", value: "url" },
];
const imageFitOptions = [
  { label: "裁剪填充", value: "cover" },
  { label: "完整显示", value: "contain" },
  { label: "拉伸铺满", value: "fill" },
  { label: "原始尺寸", value: "none" },
  { label: "缩小适配", value: "scale-down" },
];
const imagePositionOptions = [
  { label: "居中", value: "center center" },
  { label: "左上", value: "left top" },
  { label: "上中", value: "center top" },
  { label: "右上", value: "right top" },
  { label: "左中", value: "left center" },
  { label: "右中", value: "right center" },
  { label: "左下", value: "left bottom" },
  { label: "下中", value: "center bottom" },
  { label: "右下", value: "right bottom" },
];
const listStyleTypeOptions = [
  { label: "圆点", value: "disc" },
  { label: "空心圆", value: "circle" },
  { label: "方块", value: "square" },
  { label: "数字", value: "decimal" },
  { label: "无", value: "none" },
];
const enabledOptions = [
  { label: "启用", value: false },
  { label: "禁用", value: true },
];
const toggleOptions = [
  { label: "开启", value: true },
  { label: "关闭", value: false },
];

const isSectionOpen = (key: SectionKey) => sectionOpen[key];

const toggleSection = (key: SectionKey) => {
  sectionOpen[key] = !sectionOpen[key];
};

const propsDraft = reactive({
  content: "",
  iconClass: "icon-zujian",
  iconSrc: "",
  titleLevel: "h2",
  label: "",
  buttonVariant: "primary",
  buttonSize: "md",
  buttonDisabled: false,
  href: "",
  linkTarget: "_blank",
  linkTitle: "",
  linkNoFollow: false,
  linkUnderline: true,
  placeholder: "",
  inputType: "text",
  inputDisabled: false,
  inputName: "",
  inputRequired: false,
  inputMaxLength: 0,
  inputValue: "",
  src: "",
  imageAlt: "图片",
  imageFit: "cover",
  imagePosition: "center center",
  rows: 2,
  cols: 2,
  tableStriped: false,
  tableShowHeader: false,
  itemsText: "",
  listStyleType: "disc",
  listItemSpacing: 2,
  layout: "flow",
  emptyText: "拖拽组件到容器内",
});

const displayDraft = reactive({
  display: "block",
  position: "static",
  top: "auto",
  left: "auto",
  bottom: "auto",
  right: "auto",
  float: "none",
  opacity: 1,
  backgroundColor: "",
  color: "",
});

const pageDraft = reactive({
  backgroundColor: "#ffffff",
  backgroundImage: "",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center center",
  backgroundAttachment: "scroll",
});
const pageBgFileRef = ref<HTMLInputElement | null>(null);
const nodeImageFileRef = ref<HTMLInputElement | null>(null);
const iconFileRef = ref<HTMLInputElement | null>(null);

const styleDraft = reactive({
  width: "",
  height: "",
  minWidth: "",
  minHeight: "",
  maxWidth: "",
  maxHeight: "",
  zIndex: "",
  visibility: "",
  borderWidth: "",
  borderStyle: "",
  borderColor: "",
  boxSizing: "",
  overflowX: "",
  overflowY: "",
  marginTop: "",
  marginRight: "",
  marginBottom: "",
  marginLeft: "",
  paddingTop: "",
  paddingRight: "",
  paddingBottom: "",
  paddingLeft: "",
  gap: "",
  rowGap: "",
  columnGap: "",
  flexDirection: "",
  flexWrap: "",
  gridTemplateColumns: "",
  gridTemplateRows: "",
  gridAutoFlow: "",
  justifyContent: "",
  justifyItems: "",
  alignItems: "",
  alignContent: "",
  borderRadius: "",
  borderTopLeftRadius: "",
  borderTopRightRadius: "",
  borderBottomRightRadius: "",
  borderBottomLeftRadius: "",
  backgroundColor: "",
  fontSize: "",
  fontWeight: "",
  fontFamily: "",
  fontStyle: "",
  textAlign: "",
  verticalAlign: "",
  textDecoration: "",
  textTransform: "",
  whiteSpace: "",
  wordBreak: "",
  boxShadow: "",
  cursor: "",
  lineHeight: "",
  letterSpacing: "",
});
const isContainerFlexOrGrid = computed(
  () =>
    activeNodeType.value === "container" &&
    ["flex", "inline-flex", "grid", "inline-grid"].includes(displayDraft.display)
);
const isContainerFlex = computed(
  () =>
    activeNodeType.value === "container" &&
    ["flex", "inline-flex"].includes(displayDraft.display)
);
const isContainerGrid = computed(
  () =>
    activeNodeType.value === "container" &&
    ["grid", "inline-grid"].includes(displayDraft.display)
);

const parseGridTemplateCount = (value: string, fallback: number): number => {
  const match = value.trim().match(/^repeat\(\s*(\d+)\s*,/i);
  if (!match) {
    return fallback;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const gridColumnCount = computed<number>({
  get: () => parseGridTemplateCount(styleDraft.gridTemplateColumns, 2),
  set: (value) => {
    const next = Math.max(1, Math.floor(Number(value) || 1));
    styleDraft.gridTemplateColumns = `repeat(${next}, minmax(0, 1fr))`;
  },
});

const gridRowCount = computed<number>({
  get: () => parseGridTemplateCount(styleDraft.gridTemplateRows, 1),
  set: (value) => {
    const next = Math.max(1, Math.floor(Number(value) || 1));
    styleDraft.gridTemplateRows = `repeat(${next}, minmax(0, auto))`;
  },
});
const styleKeys = Object.keys(styleDraft) as Array<keyof typeof styleDraft>;
const syncingDraft = ref(false);

let propsTimer: ReturnType<typeof setTimeout> | null = null;
let displayTimer: ReturnType<typeof setTimeout> | null = null;
let styleTimer: ReturnType<typeof setTimeout> | null = null;
let pageTimer: ReturnType<typeof setTimeout> | null = null;

const clearTimers = () => {
  if (propsTimer) {
    clearTimeout(propsTimer);
    propsTimer = null;
  }
  if (displayTimer) {
    clearTimeout(displayTimer);
    displayTimer = null;
  }
  if (styleTimer) {
    clearTimeout(styleTimer);
    styleTimer = null;
  }
  if (pageTimer) {
    clearTimeout(pageTimer);
    pageTimer = null;
  }
};

onBeforeUnmount(clearTimers);

const readScopedStyle = (target: EditorNode, key: string): string => {
  const style = editorStore.getNodeStyleByMode(target, editorStore.styleScope) as Record<
    string,
    unknown
  >;
  const value = style[key];
  return value === undefined || value === null ? "" : String(value);
};

const fillDraft = (target: EditorNode | null) => {
  syncingDraft.value = true;

  if (!target) {
    pageDraft.backgroundColor = String(editorStore.pageStyle.backgroundColor ?? "#ffffff");
    pageDraft.backgroundImage = String(editorStore.pageStyle.backgroundImage ?? "");
    pageDraft.backgroundSize = String(editorStore.pageStyle.backgroundSize ?? "cover");
    pageDraft.backgroundRepeat = String(editorStore.pageStyle.backgroundRepeat ?? "no-repeat");
    pageDraft.backgroundPosition = String(
      editorStore.pageStyle.backgroundPosition ?? "center center"
    );
    pageDraft.backgroundAttachment = String(editorStore.pageStyle.backgroundAttachment ?? "scroll");

    propsDraft.content = "";
    propsDraft.iconClass = "icon-zujian";
    propsDraft.iconSrc = "";
    propsDraft.titleLevel = "h2";
    propsDraft.label = "";
    propsDraft.buttonVariant = "primary";
    propsDraft.buttonSize = "md";
    propsDraft.buttonDisabled = false;
    propsDraft.href = "";
    propsDraft.linkTarget = "_blank";
    propsDraft.linkTitle = "";
    propsDraft.linkNoFollow = false;
    propsDraft.linkUnderline = true;
    propsDraft.placeholder = "";
    propsDraft.inputType = "text";
    propsDraft.inputDisabled = false;
    propsDraft.inputName = "";
    propsDraft.inputRequired = false;
    propsDraft.inputMaxLength = 0;
    propsDraft.inputValue = "";
    propsDraft.src = "";
    propsDraft.imageAlt = "图片";
    propsDraft.imageFit = "cover";
    propsDraft.imagePosition = "center center";
    propsDraft.rows = 2;
    propsDraft.cols = 2;
    propsDraft.tableStriped = false;
    propsDraft.tableShowHeader = false;
    propsDraft.itemsText = "";
    propsDraft.listStyleType = "disc";
    propsDraft.listItemSpacing = 2;
    propsDraft.layout = "flow";
    propsDraft.emptyText = "拖拽组件到容器内";

    displayDraft.display = "block";
    displayDraft.position = "static";
    displayDraft.top = "auto";
    displayDraft.left = "auto";
    displayDraft.bottom = "auto";
    displayDraft.right = "auto";
    displayDraft.float = "none";
    displayDraft.opacity = 1;
    displayDraft.backgroundColor = "";
    displayDraft.color = "";

    styleKeys.forEach((key) => {
      styleDraft[key] = "";
    });

    syncingDraft.value = false;
    return;
  }

  propsDraft.content = String(target.props.content ?? "");
  propsDraft.iconClass = String(target.props.icon ?? "icon-zujian");
  propsDraft.iconSrc = String(target.props.iconSrc ?? "");
  propsDraft.titleLevel = String(target.props.level ?? "h2");
  propsDraft.label = String(target.props.label ?? "");
  propsDraft.buttonVariant = String(target.props.variant ?? "primary");
  propsDraft.buttonSize = String(target.props.size ?? "md");
  propsDraft.buttonDisabled = Boolean(target.props.disabled ?? false);
  propsDraft.href = String(target.props.href ?? "");
  propsDraft.linkTarget = String(target.props.target ?? "_blank");
  propsDraft.linkTitle = String(target.props.title ?? "");
  propsDraft.linkNoFollow = Boolean(target.props.nofollow ?? false);
  propsDraft.linkUnderline = target.props.underline !== false;
  propsDraft.placeholder = String(target.props.placeholder ?? "");
  propsDraft.inputType = String(target.props.type ?? "text");
  propsDraft.inputDisabled = Boolean(target.props.disabled ?? false);
  propsDraft.inputName = String(target.props.name ?? "");
  propsDraft.inputRequired = Boolean(target.props.required ?? false);
  propsDraft.inputMaxLength = Math.max(0, Number(target.props.maxLength ?? 0) || 0);
  propsDraft.inputValue = String(target.props.value ?? "");
  propsDraft.src = String(target.props.src ?? "");
  propsDraft.imageAlt = String(target.props.alt ?? "图片");
  const imageFitValue = String(target.props.fit ?? "cover");
  propsDraft.imageFit = ["cover", "contain", "fill", "none", "scale-down"].includes(imageFitValue)
    ? imageFitValue
    : "cover";
  propsDraft.imagePosition = String(target.props.position ?? "center center");
  propsDraft.rows = Number(target.props.rows ?? 2);
  propsDraft.cols = Number(target.props.cols ?? 2);
  propsDraft.tableStriped = Boolean(target.props.striped ?? false);
  propsDraft.tableShowHeader = Boolean(target.props.showHeader ?? false);
  propsDraft.itemsText = Array.isArray(target.props.items)
    ? target.props.items.map((item) => String(item)).join("\n")
    : "";
  propsDraft.listStyleType = String(
    target.props.listStyleType ?? (target.type === "ol" ? "decimal" : "disc")
  );
  propsDraft.listItemSpacing = Math.max(0, Number(target.props.itemSpacing ?? 2) || 2);
  propsDraft.layout = String(target.props.layout ?? "flow");
  propsDraft.emptyText = String(target.props.emptyText ?? "拖拽组件到容器内");

  displayDraft.display = readScopedStyle(target, "display") || "block";
  displayDraft.position = readScopedStyle(target, "position") || "static";
  displayDraft.top = readScopedStyle(target, "top") || "auto";
  displayDraft.left = readScopedStyle(target, "left") || "auto";
  displayDraft.bottom = readScopedStyle(target, "bottom") || "auto";
  displayDraft.right = readScopedStyle(target, "right") || "auto";
  displayDraft.float = readScopedStyle(target, "float") || "none";
  displayDraft.opacity = Number(readScopedStyle(target, "opacity") || 1);
  displayDraft.backgroundColor = readScopedStyle(target, "backgroundColor");
  displayDraft.color = readScopedStyle(target, "color");

  styleKeys.forEach((key) => {
    styleDraft[key] = readScopedStyle(target, key);
  });

  pageDraft.backgroundColor = String(editorStore.pageStyle.backgroundColor ?? "#ffffff");
  pageDraft.backgroundImage = String(editorStore.pageStyle.backgroundImage ?? "");
  pageDraft.backgroundSize = String(editorStore.pageStyle.backgroundSize ?? "cover");
  pageDraft.backgroundRepeat = String(editorStore.pageStyle.backgroundRepeat ?? "no-repeat");
  pageDraft.backgroundPosition = String(editorStore.pageStyle.backgroundPosition ?? "center center");
  pageDraft.backgroundAttachment = String(editorStore.pageStyle.backgroundAttachment ?? "scroll");

  syncingDraft.value = false;
};

watch(node, (value) => fillDraft(value), { immediate: true });

watch(
  () => editorStore.styleScope,
  () => {
    if (!node.value) {
      return;
    }
    fillDraft(node.value);
  }
);

const buildPropsPatch = (current: EditorNode): Record<string, unknown> => {
  if (current.type === "title") {
    return {
      content: propsDraft.content,
      level: propsDraft.titleLevel,
    };
  }
  if (["text", "paragraph", "nav", "li"].includes(current.type)) {
    return { content: propsDraft.content };
  }
  if (current.type === "i") {
    return {
      icon: propsDraft.iconClass.trim() || "icon-zujian",
      iconSrc: propsDraft.iconSrc.trim() || null,
    };
  }
  if (current.type === "button") {
    return {
      label: propsDraft.label,
      variant: propsDraft.buttonVariant,
      size: propsDraft.buttonSize,
      disabled: propsDraft.buttonDisabled,
    };
  }
  if (current.type === "link") {
    return {
      label: propsDraft.label,
      href: propsDraft.href,
      target: propsDraft.linkTarget,
      underline: propsDraft.linkUnderline,
      title: propsDraft.linkTitle,
      nofollow: propsDraft.linkNoFollow,
    };
  }
  if (current.type === "input") {
    return {
      placeholder: propsDraft.placeholder,
      type: propsDraft.inputType,
      disabled: propsDraft.inputDisabled,
      name: propsDraft.inputName,
      required: propsDraft.inputRequired,
      maxLength: propsDraft.inputMaxLength > 0 ? Math.floor(propsDraft.inputMaxLength) : null,
      value: propsDraft.inputValue,
    };
  }
  if (current.type === "image") {
    return {
      src: propsDraft.src,
      alt: propsDraft.imageAlt.trim() || "图片",
      fit: propsDraft.imageFit || "cover",
      position: propsDraft.imagePosition.trim() || "center center",
    };
  }
  if (current.type === "table") {
    return {
      rows: Math.max(1, Math.floor(propsDraft.rows || 1)),
      cols: Math.max(1, Math.floor(propsDraft.cols || 1)),
      striped: propsDraft.tableStriped,
      showHeader: propsDraft.tableShowHeader,
    };
  }
  if (current.type === "list" || current.type === "ul" || current.type === "ol") {
    return {
      items: propsDraft.itemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      listStyleType: propsDraft.listStyleType,
      itemSpacing: Math.max(0, Math.floor(propsDraft.listItemSpacing || 0)),
    };
  }
  if (current.type === "container") {
    return { layout: propsDraft.layout, emptyText: propsDraft.emptyText };
  }
  return {};
};

const normalizeStyleValue = (value: string): string | null => {
  const next = value.trim();
  return next === "" ? null : next;
};

const normalizeColorValue = (value: string): string | null => {
  const next = value.trim();
  return next === "" ? null : next;
};

const normalizePageImageValue = (value: string): string | null => {
  const next = value.trim();
  return next === "" ? null : next;
};

const triggerPageBgUpload = () => {
  if (preview.value) {
    return;
  }
  pageBgFileRef.value?.click();
};

const onPageBgFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    ElMessage.warning("只能上传图片文件");
    input.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    ElMessage.warning("图片大小不能超过 8MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result ?? "");
    if (!dataUrl) {
      ElMessage.error("图片读取失败");
      input.value = "";
      return;
    }
    pageDraft.backgroundImage = dataUrl;
    if (!pageDraft.backgroundSize) {
      pageDraft.backgroundSize = "cover";
    }
    if (!pageDraft.backgroundPosition) {
      pageDraft.backgroundPosition = "center center";
    }
    if (!pageDraft.backgroundRepeat) {
      pageDraft.backgroundRepeat = "no-repeat";
    }
    ElMessage.success("页面背景图已更新");
    input.value = "";
  };

  reader.onerror = () => {
    ElMessage.error("图片读取失败");
    input.value = "";
  };

  reader.readAsDataURL(file);
};

const clearPageBgImage = () => {
  if (preview.value) {
    return;
  }
  pageDraft.backgroundImage = "";
};

const triggerIconUpload = () => {
  if (preview.value || activeNodeType.value !== "i") {
    return;
  }
  iconFileRef.value?.click();
};

const onIconFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    ElMessage.warning("只能上传图标图片文件");
    input.value = "";
    return;
  }

  if (file.size > 4 * 1024 * 1024) {
    ElMessage.warning("图标大小不能超过 4MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result ?? "");
    if (!dataUrl) {
      ElMessage.error("图标读取失败");
      input.value = "";
      return;
    }
    propsDraft.iconSrc = dataUrl;
    ElMessage.success("图标已更新");
    input.value = "";
  };

  reader.onerror = () => {
    ElMessage.error("图标读取失败");
    input.value = "";
  };

  reader.readAsDataURL(file);
};

const clearIconUpload = () => {
  if (preview.value || activeNodeType.value !== "i") {
    return;
  }
  propsDraft.iconSrc = "";
};

const triggerNodeImageUpload = () => {
  if (preview.value || activeNodeType.value !== "image") {
    return;
  }
  nodeImageFileRef.value?.click();
};

const onNodeImageFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    ElMessage.warning("只能上传图片文件");
    input.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    ElMessage.warning("图片大小不能超过 8MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result ?? "");
    if (!dataUrl) {
      ElMessage.error("图片读取失败");
      input.value = "";
      return;
    }
    propsDraft.src = dataUrl;
    if (!propsDraft.imageAlt.trim()) {
      propsDraft.imageAlt = file.name;
    }
    ElMessage.success("图片已更新");
    input.value = "";
  };

  reader.onerror = () => {
    ElMessage.error("图片读取失败");
    input.value = "";
  };

  reader.readAsDataURL(file);
};

const clearNodeImage = () => {
  if (preview.value || activeNodeType.value !== "image") {
    return;
  }
  propsDraft.src = "";
};

const buildDisplayPatch = (): Record<string, string | number | null> => ({
  display: displayDraft.display,
  position: displayDraft.position,
  top: displayDraft.top || "auto",
  left: displayDraft.left || "auto",
  bottom: displayDraft.bottom || "auto",
  right: displayDraft.right || "auto",
  float: displayDraft.float,
  opacity: Number(displayDraft.opacity.toFixed(2)),
  backgroundColor: normalizeStyleValue(displayDraft.backgroundColor),
  color: normalizeStyleValue(displayDraft.color),
});

const buildStylePatch = (): Record<string, string | null> => {
  const patch: Record<string, string | null> = {};
  styleKeys.forEach((key) => {
    patch[key] = normalizeStyleValue(styleDraft[key]);
  });
  return patch;
};

const isPatchDifferent = (current: Record<string, unknown>, patch: Record<string, unknown>) =>
  Object.entries(patch).some(([key, value]) => current[key] !== value);

const applyPropsNow = () => {
  const current = node.value;
  if (!current || preview.value || syncingDraft.value) {
    return;
  }

  const patch = buildPropsPatch(current);
  if (Object.keys(patch).length > 0 && isPatchDifferent(current.props as Record<string, unknown>, patch)) {
    editorStore.updateSelectedProps(patch);
  }
};

const applyDisplayNow = () => {
  const current = node.value;
  if (!current || preview.value || syncingDraft.value) {
    return;
  }

  const patch = buildDisplayPatch();
  const currentStyle = editorStore.getNodeStyleByMode(current, editorStore.styleScope) as Record<
    string,
    unknown
  >;
  if (isPatchDifferent(currentStyle, patch)) {
    editorStore.updateSelectedStyle(patch);
  }
};

const applyStyleNow = () => {
  const current = node.value;
  if (!current || preview.value || syncingDraft.value) {
    return;
  }

  const patch = buildStylePatch();
  const currentStyle = editorStore.getNodeStyleByMode(current, editorStore.styleScope) as Record<
    string,
    unknown
  >;
  if (isPatchDifferent(currentStyle, patch)) {
    editorStore.updateSelectedStyle(patch);
  }
};

const applyPageNow = () => {
  if (!isPageTarget.value || preview.value || syncingDraft.value) {
    return;
  }

  const nextBackgroundColor = normalizeColorValue(pageDraft.backgroundColor);
  const nextBackgroundImage = normalizePageImageValue(pageDraft.backgroundImage);
  const nextBackgroundSize = pageDraft.backgroundSize || "cover";
  const nextBackgroundRepeat = pageDraft.backgroundRepeat || "no-repeat";
  const nextBackgroundPosition = pageDraft.backgroundPosition || "center center";
  const nextBackgroundAttachment = pageDraft.backgroundAttachment || "scroll";

  const unchanged =
    editorStore.pageStyle.backgroundColor === nextBackgroundColor &&
    editorStore.pageStyle.backgroundImage === nextBackgroundImage &&
    editorStore.pageStyle.backgroundSize === nextBackgroundSize &&
    editorStore.pageStyle.backgroundRepeat === nextBackgroundRepeat &&
    editorStore.pageStyle.backgroundPosition === nextBackgroundPosition &&
    editorStore.pageStyle.backgroundAttachment === nextBackgroundAttachment;

  if (unchanged) {
    return;
  }

  editorStore.updatePageStyle({
    backgroundColor: nextBackgroundColor,
    backgroundImage: nextBackgroundImage,
    backgroundSize: nextBackgroundSize,
    backgroundRepeat: nextBackgroundRepeat,
    backgroundPosition: nextBackgroundPosition,
    backgroundAttachment: nextBackgroundAttachment,
  });
};

watch(
  propsDraft,
  () => {
    if (propsTimer) {
      clearTimeout(propsTimer);
    }
    propsTimer = setTimeout(applyPropsNow, 120);
  },
  { deep: true }
);

watch(
  displayDraft,
  () => {
    if (displayTimer) {
      clearTimeout(displayTimer);
    }
    displayTimer = setTimeout(applyDisplayNow, 80);
  },
  { deep: true }
);

watch(
  styleDraft,
  () => {
    if (styleTimer) {
      clearTimeout(styleTimer);
    }
    styleTimer = setTimeout(applyStyleNow, 80);
  },
  { deep: true }
);

watch(
  () => styleDraft.borderRadius,
  (value, previous) => {
    if (syncingDraft.value || preview.value) {
      return;
    }

    if (value === previous || !value.trim()) {
      return;
    }

    // Keep the shorthand radius effective: clear corner overrides when shorthand changes.
    styleDraft.borderTopLeftRadius = "";
    styleDraft.borderTopRightRadius = "";
    styleDraft.borderBottomRightRadius = "";
    styleDraft.borderBottomLeftRadius = "";
  },
  { flush: "sync" }
);

watch(
  pageDraft,
  () => {
    if (pageTimer) {
      clearTimeout(pageTimer);
    }
    pageTimer = setTimeout(applyPageNow, 80);
  },
  { deep: true }
);

watch(
  () => editorStore.pageStyle,
  (value) => {
    if (!isPageTarget.value || syncingDraft.value) {
      return;
    }

    syncingDraft.value = true;
    pageDraft.backgroundColor = String(value.backgroundColor ?? "#ffffff");
    pageDraft.backgroundImage = String(value.backgroundImage ?? "");
    pageDraft.backgroundSize = String(value.backgroundSize ?? "cover");
    pageDraft.backgroundRepeat = String(value.backgroundRepeat ?? "no-repeat");
    pageDraft.backgroundPosition = String(value.backgroundPosition ?? "center center");
    pageDraft.backgroundAttachment = String(value.backgroundAttachment ?? "scroll");
    syncingDraft.value = false;
  },
  { deep: true }
);
</script>

<style scoped>
.wg-prop {
  --vv-bg: #eceff3;
  --vv-panel: #f3f4f6;
  --vv-card: #ffffff;
  --vv-border: #d5d9df;
  --vv-border-strong: #c6ccd5;
  --vv-text: #2f3440;

  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vv-bg);
  border-left: 1px solid #d8dde5;
}

.panel-header {
  padding: 14px 14px 10px;
  border-bottom: 1px solid #d8dde5;
  background: linear-gradient(180deg, #f7f8fb 0%, #f0f2f5 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--vv-text);
}

.active-chip {
  min-height: 34px;
  border: 1px solid var(--vv-border);
  border-radius: 9px;
  background: var(--vv-card);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.active-chip .type {
  font-size: 12px;
  font-weight: 700;
  color: #293241;
}

.active-chip .id {
  margin-left: auto;
  max-width: 140px;
  font-size: 11px;
  color: #7a8498;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-chip.empty .type {
  color: #7a8498;
  font-weight: 600;
}

.panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs {
  background: var(--vv-panel);
  border-bottom: 1px solid #d8dde5;
}

.tabs :deep(.el-tabs__header) {
  margin: 0;
}

.tabs :deep(.el-tabs__nav-wrap)::after {
  display: none;
}

.tabs :deep(.el-tabs__item) {
  height: 38px;
  padding: 0 4px;
  font-size: 12px;
  color: #6f798d;
}

.tabs :deep(.el-tabs__item.is-active) {
  color: #214fb5;
  font-weight: 700;
}

.tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  background: #4a7df2;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 12px 96px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  min-height: 180px;
  border: 1px dashed #cdd4de;
  border-radius: 10px;
  background: #f8f9fb;
  color: #728198;
  font-size: 12px;
  display: grid;
  place-items: center;
}

.vv-card {
  border: 1px solid var(--vv-border);
  border-radius: 10px;
  background: var(--vv-card);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #2c3442;
}

.section-head.clickable {
  cursor: pointer;
  user-select: none;
}

.section-head .el-icon {
  transition: transform 0.2s ease;
}

.section-head .el-icon.folded {
  transform: rotate(-90deg);
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-grid {
  display: grid;
  gap: 10px;
}

.field-grid.cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > label {
  font-size: 12px;
  color: #3c4557;
  font-weight: 600;
}

.grid-count :deep(.el-input-number) {
  width: 100%;
}

.grid-count :deep(.el-input__inner) {
  text-align: center;
  font-weight: 600;
}

.element-stack {
  gap: 12px;
}

.element-stack .field {
  padding: 8px;
  border: 1px solid #e1e6ef;
  border-radius: 8px;
  background: #fafbfd;
}

.element-stack .field > label {
  color: #344057;
}

.element-stack :deep(.el-input-number) {
  width: 100%;
}

.content-tip {
  border: 1px dashed #c9d5e7;
  border-radius: 10px;
  background: #f7faff;
  padding: 10px 12px;
  color: #5f6f89;
  font-size: 12px;
  line-height: 1.55;
}

.content-tip.compact {
  padding: 8px 10px;
  line-height: 1.4;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--vv-border-strong);
  border-radius: 8px;
  overflow: hidden;
}

.segmented button {
  border: 0;
  border-right: 1px solid var(--vv-border-strong);
  height: 34px;
  cursor: pointer;
  background: #f2f4f7;
  color: #404a5d;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.segmented button:last-child {
  border-right: 0;
}

.segmented button.active {
  background: #dfe5ee;
}

.segmented button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bars {
  width: 12px;
  height: 10px;
  display: inline-block;
  background:
    linear-gradient(#50576a, #50576a) 0 1px / 100% 1px no-repeat,
    linear-gradient(#50576a, #50576a) 0 5px / 100% 1px no-repeat,
    linear-gradient(#50576a, #50576a) 0 9px / 100% 1px no-repeat;
}

.bars.left {
  transform: translateX(-2px);
}

.bars.right {
  transform: translateX(2px);
}

.opacity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opacity-head :deep(.el-input-number) {
  width: 92px;
}

.color-line {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.bg-image-line {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
}

.upload-line {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mini-btn {
  height: 32px;
  border: 1px solid #c8cfdb;
  border-radius: 8px;
  background: #f7f9fc;
  color: #38445a;
  font-size: 12px;
  padding: 0 10px;
  cursor: pointer;
}

.mini-btn:hover:not(:disabled) {
  border-color: #a9bbdd;
  background: #eef3fb;
}

.mini-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mini-btn.danger:hover:not(:disabled) {
  border-color: #d5a2a2;
  color: #b34848;
}

.file-input {
  display: none;
}

.color-line :deep(.el-color-picker__trigger) {
  width: 32px;
  height: 32px;
  border-radius: 7px;
}

.wg-prop :deep(.el-input__wrapper),
.wg-prop :deep(.el-select__wrapper),
.wg-prop :deep(.el-textarea__inner),
.wg-prop :deep(.el-input-number) {
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 0 0 1px var(--vv-border) inset;
}

.wg-prop :deep(.el-input__wrapper.is-focus),
.wg-prop :deep(.el-select__wrapper.is-focused),
.wg-prop :deep(.el-textarea__inner:focus),
.wg-prop :deep(.el-input-number.is-focus) {
  box-shadow: 0 0 0 1px #9dbaf8 inset;
}

.wg-prop :deep(.el-textarea__inner) {
  padding-top: 8px;
  padding-bottom: 8px;
}

.wg-prop :deep(.el-slider__runway) {
  height: 6px;
  background: #dee4ee;
}

.wg-prop :deep(.el-slider__bar) {
  height: 6px;
  background: #2b6ef5;
}

.wg-prop :deep(.el-slider__button) {
  width: 14px;
  height: 14px;
  border: 2px solid #2b6ef5;
}

@media (max-width: 1360px) {
  .field-grid.cols-2 {
    grid-template-columns: 1fr;
  }

  .active-chip .id {
    max-width: 110px;
  }
}
</style>
