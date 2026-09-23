<script setup lang="ts"></script>

<template>
  <div class="container">
    <h2>lost and found platform</h2>
    <p>{{message}}</p>
  </divdiv>   
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const message = ref('欢迎来到失物招领平台')

</script>

<style scoped></style>
