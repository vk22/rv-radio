<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <header class="fixed left-0 top-0 z-[999] flex w-screen items-center justify-center px-2 py-2 font-sans">
    <img class="block w-full" src="@/assets/logo2.svg"/>
  </header>
  <RouterView />
</template>
