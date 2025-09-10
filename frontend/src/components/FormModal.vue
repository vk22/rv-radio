<template>
    <div class="form-modal modal-window" v-show="formModalOpened">
        <div class="close" @click="formModalStateToggle()">
            <svg width="30px" height="30px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink">
                <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="square">
                    <g id="LandingPopup" transform="translate(-983.000000, -267.000000)" stroke="#111">
                        <g id="Group-6">
                            <g id="Group-5" transform="translate(420.000000, 243.000000)">
                                <path
                                    d="M571.87315,32.8400752 L582.911677,32.8400752 L571.87315,32.8400752 L571.87315,21.6856907 L571.87315,32.8400752 Z M571.87315,32.8400752 L560.911677,32.8400752 L571.87315,32.8400752 L571.87315,44.0437203 L571.87315,32.8400752 Z"
                                    id="Combined-Shape"
                                    transform="translate(571.911677, 32.864706) rotate(-315.000000) translate(-571.911677, -32.864706) ">
                                </path>
                            </g>
                        </g>
                    </g>
                </g>
            </svg>
        </div>
        <div class="form-wrap">
            <FormComponent></FormComponent>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import FormComponent from '../components/FormComponent.vue'
import { useReservationStore } from "../store/reservation";
const store = useReservationStore();
const formModalOpened = computed(() => store.getFormModalState)
const formModalStateToggle = () => {
    store.setFormModalState()
}

</script>


<style>
.form-modal {
    background: #fff;
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    border-left: 1px solid #ddd;
}


.form-wrap {
    position: relative;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-direction: column;
}

.close {
    position: absolute;
    z-index: 9999;
    cursor: pointer;
    right: 2rem;
    top: 2rem;
}
@media (min-width: 1024px) {
    .form-modal {
        width: 50%;
    }

}
</style>