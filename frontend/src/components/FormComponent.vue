<template>
    <div class="form-container" v-if="!formSuccess">
        <div class="form-title">
            Tell us about your project
        </div>
        <Form ref="form" :validation-schema="schema" @submit="submit" :initial-values="formData">
            <custom-input placeholder="Name" label="Name" name="name" type="text" />
            <custom-input placeholder="Email" label="Email" name="email" type="email" />
            <custom-input placeholder="Message" label="Message" name="message" type="message" />

            <div class="button-wrapper">
                <button class="btn btn-send" type="submit">Send</button>
                <!-- <button @click="reset" class="btn btn-reset" type="button">Reset</button> -->
            </div>
        </Form>
    </div>
    <transition>
        <div class="form-container success" v-if="formSuccess"> 
            <div class="form-title">
                Thank you!
            </div>
            <p>We will contact you soon.</p>
        </div>
    </transition>
</template>
<script setup>
import { Form } from 'vee-validate'
import { ref, watchEffect } from 'vue'
import * as yup from 'yup'
import CustomInput from '@/components/CustomInput.vue'
import { useReservationStore } from "../store/reservation";
const store = useReservationStore();
const formModalStateToggle = () => {
    store.setFormModalState()
}
// const formModalOpened = computed(() => store.getFormModalState)



const form = ref(null)
const formSuccess = ref(false)
const schema = yup.object().shape({
    name: yup.string().required(),
    email: yup.string().email().required(),
    // message: yup.string().required('J2121 field is required'),
})

const formData = ref({
    name: '',
    email: '',
    message: '',
})

const submit = (values) => {
    // implement your logic here
    console.log(values)
    formSuccess.value = true;
    setTimeout(() => {
        formModalStateToggle()
    }, 3000);
    setTimeout(() => {
        formSuccess.value = false;
    }, 4000);
}
const reset = () => {
    form.value.resetForm()
}

watchEffect(() => {  
   console.log('watchEffect ', store.getFormModalState);
   if (!store.getFormModalState && form.value) {
    form.value.resetForm()
   }
})

</script>
<style scoped>
.form-container {
    padding: 0 2rem;
    width: 500px;
}

.form-title {
    font-size: 3em;
    line-height: 1.1em;
    font-weight: 700;
    margin-bottom: 2rem;
    padding-right: 2rem;
}

.success .form-title {
    margin-bottom: 1rem;
}

.btn {
    padding: .75rem 3rem;
    border-radius: 100px;
    border: none;
    cursor: pointer;
}

.button-wrapper {
    display: flex;
    gap: 10px;
}

.btn-send {
    background-color: rgb(31, 31, 31);
    color: white;
}

.btn-reset {
    background-color: rgb(203, 203, 203);
    color: #333;
}

</style>