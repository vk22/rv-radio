<template>
  <div class="relative mt-2 flex flex-col">
    <div class="mb-2 w-full">
      <a class="opacity-[0.85] hover:opacity-100" :href="link" target="_blank">
        <slot name="image"></slot>
      </a>
    </div>
    <div class="flex flex-1 flex-col justify-center text-center text-white">
      <div>
        <slot name="artist"></slot>
      </div>
      <div>
        <slot name="title"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  link: String,
});
</script>
