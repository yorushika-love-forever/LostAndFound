<script lang="ts" setup>
import { ref } from 'vue'
const msg = ref('')
const user = { name: '张三', age: 18, city: '北京' }
// 初始数据
const list = ref([{ name: 'A' }, { name: 'B' }, { name: 'C' }])

function handleClick ( ) { alert ( '被点了' )}
</script>



<template>
  <div class="container">
    <h2>lost and found platform</h2>
    <input v-model="msg" /><br>
    <p>你输入的是：{{ msg }}</p>
  </div>
  <div v-for="(value, key, index) in user">
    {{ index }}. {{ key }} = {{ value }}
  </div>


  <button @click="handleClick">点我</button>
  <div v-for="item in list">
    <span>{{ item.name }}:</span>
    <input />
  </div>
  
</template>

