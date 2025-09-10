<script setup>
import IndexComponent from '../components/IndexComponent.vue'
import FormModal from '../components/FormModal.vue'
</script>

<template>
  <main>
    <transition>
      <FormModal></FormModal>
    </transition>
    <IndexComponent />
  </main>
</template>
