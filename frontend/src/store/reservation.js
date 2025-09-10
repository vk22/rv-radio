import { defineStore } from 'pinia'

export const useReservationStore = defineStore('reservation', {
  state: () => ({
    messages: {
      'success': {
        title: "Your reservation has been accepted",
        subtitle: "We look forward to seeing you in our restaurant."
      },
      'error': {
        title: "There was an error",
        subtitle: "The error has been sent to our quality officer."
      },
    },
    sendEmailResponse: {
      mode: false,
      status: undefined,
      message: ''
    },
    formModalIsOpen: false,
  }),
  actions: {
    async postData(values) {
      const { data } = await useFetch("/api/reservations", {
        method: "POST",
        body: values,
        headers: { "cache-control": "no-cache" }
      });
      let response = data._rawValue
      this.afterSubmit({
        mode: true,
        status: response.status,
        message: response.message
      })
      return response
    },
    afterSubmit (data) {
      this.setFormModalState()
      this.setSendmailResponse(data);
      setTimeout(() => {
        this.setSendmailResponse({
          mode: false,
          message: ''
        });
      }, 4000);
    },
    setSendmailResponse(response) {
      this.sendEmailResponse = response;
    },
    setFormModalState(state) {
      this.formModalIsOpen = !this.formModalIsOpen
    },
  },
  getters: {
    getSendEmailResponse(state) {
      return state.sendEmailResponse
    },
    getFormModalState(state) {
      return state.formModalIsOpen
    },
  }
})