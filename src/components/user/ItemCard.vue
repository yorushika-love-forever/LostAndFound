<!--
  components/user/ItemCard.vue —— 物品卡片组件（可复用的展示单元）。
  列表页用 v-for 循环渲染它，把一条 LostItem 数据显示成一张卡片。
  被谁用：HomeView / MyView 等列表页，通过 :item="某个物品对象" 传入数据。
  依赖：@/types 的 LostItem 类型、@/utils/format 的 itemStatusText。
  对外：默认导出组件，唯一的对外接口是名为 item 的 prop；不含自己的状态与逻辑。
-->
<script setup lang="ts">
import type { LostItem } from '@/types'
import { itemStatusText } from '@/utils/format'

// defineProps 声明父组件传进来的数据。
// 这里要求父组件必须传入一个名为 item、类型为 LostItem 的对象。
// 采用「类型参数」写法（<{ item: LostItem }>）而非运行时对象写法，是 <script setup> + TS 的推荐方式：
// 可以自动获得类型提示，且模板里能直接用 item（无需 props. 前缀）。
defineProps<{ item: LostItem }>()

// 根据物品类型返回用户看得懂的中文文字。
// 用箭头函数而不是 computed：它只依赖传入参数、是纯计算，
// 无需响应式缓存（computed 更适合依赖响应式数据、需要缓存的场景）。
const typeText = (type: LostItem['type']) => type === 'lost' ? '我丢失的' : '我捡到的'
</script>

<template>
  <!-- article 表示一张独立的物品卡片。 -->
  <article class="item-card">
    <!-- :src 和 :alt 前面的冒号表示“绑定 JavaScript 数据”。 -->
    <!-- 注意必须用 :src：写成 src="item.imageUrl" 只会当成字符串字面量，拿不到真实图片地址。 -->
    <img :src="item.imageUrl" :alt="item.title" class="item-image" />
    <div class="item-body">
      <div class="item-heading">
        <!-- :class 会把 item.type 的值添加成 CSS 类名，用来区分颜色。 -->
        <!-- 最终类名形如 type-label lost / type-label found，对应两套配色。 -->
        <span class="type-label" :class="item.type">{{ typeText(item.type) }}</span>
        <!-- 三目运算符：已完成就显示“已完成”，否则按审核状态显示对应中文。 -->
        <span class="status">{{ item.isFinished ? '已完成' : itemStatusText(item.status) }}</span>
      </div>
      <!-- {{ }} 是 Vue 插值语法，用来把数据放到 HTML 文本中。 -->
      <h3>{{ item.title }}</h3>
      <!-- v-if 控制元素的增删：只有存在补充说明时才渲染这段（含前面的分隔符 ·）。
           比渲染一个空标签更干净，也避免出现孤零零的 “·”。 -->
      <p class="muted">{{ item.location }}<span v-if="item.supplement"> · {{ item.supplement }}</span></p>
      <p class="description">{{ item.description }}</p>
      <!-- 动态拼出详情页地址 /items/{id}，点击后由路由跳到对应详情页（不刷新整页）。
           这里用模板字符串而非常量，是因为每张卡片指向的 id 都不同。 -->
      <RouterLink class="detail-link" :to="`/items/${item.id}`">查看详情 →</RouterLink>
    </div>
  </article>
</template>
