<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <header class="fixed left-0 top-0 z-[999] flex w-screen items-center justify-center px-2 py-8 font-sans">
    <img class="block w-[125px] opacity-80" src="@/assets/logo.svg"/>
  </header>
  <RouterView />
</template>
