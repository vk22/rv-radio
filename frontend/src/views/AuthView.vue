<template>
  <main class="grid min-h-full place-items-center px-6 py-12">
    <form class="w-full max-w-[440px]" @submit.prevent="submit">
      <!-- <p class="mb-[14px] font-mono text-xs tracking-[0.18em] uppercase opacity-55">Skyharp community</p> -->
      <h1 class="text-[clamp(48px,7vw,78px)] leading-[.95] tracking-[0.005em]">{{ isRegister ? "Create account" : "Login" }}</h1>
      <p class="mt-[22px] mb-9 text-[#aaa]">
        {{ isRegister ? "Join the conversation around every channel." : "Sign in to like channels and leave comments." }}
      </p>

      <label v-if="isRegister" class="mt-[18px] block font-mono text-[13px]">Name<input class="mt-[7px] block w-full rounded-sm border border-[#3a3a3a] bg-transparent px-[14px] py-[13px] text-white outline-none focus:border-[#aaa]" v-model.trim="form.username" autocomplete="name" required minlength="2" maxlength="50" /></label>
      <label class="mt-[18px] block font-mono text-[13px]">Email<input class="mt-[7px] block w-full rounded-sm border border-[#3a3a3a] bg-transparent px-[14px] py-[13px] text-white outline-none focus:border-[#aaa]" v-model.trim="form.email" type="email" autocomplete="email" required /></label>
      <label class="mt-[18px] block font-mono text-[13px]">Password<input class="mt-[7px] block w-full rounded-sm border border-[#3a3a3a] bg-transparent px-[14px] py-[13px] text-white outline-none focus:border-[#aaa]" v-model="form.password" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" required minlength="8" /></label>
      <p v-if="error" class="mt-[18px] text-[#ff8989]">{{ error }}</p>
      <button class="mt-6 mb-4 w-full cursor-pointer border-0 bg-white p-[14px] text-[#050505] disabled:opacity-50" :disabled="submitting">{{ submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in" }}</button>

      <RouterLink class="text-[#aaa]" :to="isRegister ? '/login' : '/register'">
        {{ isRegister ? "Already have an account? Sign in" : "New here? Create an account" }}
      </RouterLink>
    </form>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiRequest, setCurrentUser } from "../auth";

const route = useRoute();
const router = useRouter();
const isRegister = computed(() => route.name === "register");
const form = reactive({ username: "", email: "", password: "" });
const error = ref("");
const submitting = ref(false);

const submit = async () => {
  error.value = "";
  submitting.value = true;
  try {
    const path = isRegister.value ? "/auth/register" : "/auth/login";
    const result = await apiRequest(path, { method: "POST", body: JSON.stringify(form) });
    setCurrentUser(result.data);
    await router.push(String(route.query.redirect || "/"));
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    submitting.value = false;
  }
};
</script>
