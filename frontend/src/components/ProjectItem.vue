<template>
  <div class="item">
    <div class="project-img">
      <a :href="link" target="_blank">
        <slot name="image"></slot>
      </a>
    </div>
    <div class="project-details">
      <div class="artist">
        <slot name="artist"></slot>
      </div>
      <div class="title">
        <slot name="title"></slot>
      </div>
      <div class="media">
        Media Condition: <slot name="media"></slot>
      </div>
      <div class="sleeve">
        Sleeve Condition: <slot name="sleeve"></slot>
      </div>
      <div class="price">
        <slot name="price"></slot>
      </div>
      <div class="link">
        <a :href="link" target="_blank"> Buy vinyl </a>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  link: String,
});
</script>

<style scoped>
.item {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.project-img {
  width: 100%;
  margin-bottom: 0.5rem;
}

.project-img a {
  opacity: 0.85;
}

.project-img a:hover {
  opacity: 1;
}

.project-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  color: #fff;
}

.project-details a {
  color: #fff;
  font-weight: 700;
}


h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

@media (min-width: 1024px) {
}
</style>
