<script setup>
import { RouterLink, RouterView } from "vue-router";
import { auth, logout } from "./auth";
</script>

<template>
  <div class="h-dvh w-full overflow-hidden pt-[84px] max-[800px]:pt-[70px]">
    <header class="fixed top-0 left-0 z-[1000] flex h-[84px] w-full items-center justify-between bg-[#000] px-7 max-[800px]:h-[70px] max-[800px]:px-[18px]">
      <RouterLink to="/" class="block w-[148px] p-0 max-[800px]:w-[132px]" aria-label="Skyharp Radio home">
        <img class="block" src="@/assets/logo.svg" alt="Skyharp Radio" />
      </RouterLink>
      <button v-if="auth.user" class="cursor-pointer rounded-[3px] border border-white/20 bg-white/5 px-[13px] py-2 text-[15px] leading-none text-white" type="button" @click="logout">{{ auth.user.username }} / Log out</button>
      <RouterLink v-else to="/login" class="rounded-[3px] border border-white/20 bg-white/5 px-[13px] py-2 text-[15px] leading-none text-white">Join</RouterLink>
    </header>
    <RouterView />
  </div>
</template>
