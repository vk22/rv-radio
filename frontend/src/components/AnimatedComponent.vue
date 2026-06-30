<template>
    <div ref="target">
        <transition :name="animationType">
            <div v-appear="animate" class="animated-component">
                <slot />
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps({
    delay: Number,
    animationType: String
  })

// withDefaults(defineProps<{ animationType?: string }>(), { animationType: 'fade' });

const target = ref<Element>();
const animate = ref<boolean>(false);

const observer = new IntersectionObserver(
    ([entry]) => {
        // console.log('entry ', entry.isIntersecting, entry.intersectionRatio)
        if (entry.isIntersecting) {
            setTimeout(() => {
                animate.value = entry.isIntersecting;
                observer.unobserve(entry.target);
            }, props.delay);
        }
    },
    {
        threshold: 0.25
    }
);

onMounted(() => {
    observer.observe(target.value as Element);
});
</script>
