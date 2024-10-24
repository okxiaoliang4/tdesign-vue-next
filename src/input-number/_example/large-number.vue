<template>
  <t-space direction="vertical">
    <t-input-number
      v-model="value1"
      large-number
      :allow-input-over-limit="false"
      :decimal-places="4"
      step="1"
      style="width: 300px"
    ></t-input-number>
  </t-space>
</template>

<script setup>
import { ref } from 'vue';

const value1 = ref('');
</script>
