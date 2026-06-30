<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <header class="fixed left-0 top-0 z-[999] flex w-screen items-center justify-center px-8 py-10 font-sans">
    <img class="block w-[155px]" src="@/assets/logo.svg"/>
  </header>
  <RouterView />
</template>
