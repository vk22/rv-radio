<script setup>
import { useReservationStore } from "@/store/reservation";
const reservationStore = useReservationStore();
const getFormModalStateToggle = () => {
  reservationStore.setFormModalState();
};
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <img class="logo" src="@/assets/logo.svg"/>
    <!-- <div class="btn" @click="getFormModalStateToggle">Get a quote</div> -->
  </header>
  <RouterView />
</template>

<style scoped>
header {
  /* background: #f8f8f8; */
  font-family: 'Montserrat', sans-serif;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: fixed;
  z-index: 999;
  width: 100vw;
  padding: 2.5rem 2rem;
  top: 0;
  left: 0;
}

@media (max-width: 600px) {
header {
  justify-content: center;
}
}

.logo {
  display: block;
  width: 155px;
}

.btn {
  font-family: 'Montserrat', sans-serif;
  font-size: .9em;
  font-weight: 600;
  border-radius: 100px;
  background: #111;
  color: #fff;
  padding: .35rem .75rem;
  border: 1px solid #111;
  cursor: pointer;
  transition: all .3s ease-in-out;
}
.btn:hover {
  background: #c0c0c0;
    border: 1px solid #c0c0c0;
}

@media (min-width: 1024px) {
  header {

  }

  .logo {
    /* margin: 0 2rem 0 0; */
  }

  header .wrapper {

  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
