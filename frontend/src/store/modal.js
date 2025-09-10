import { defineStore } from "pinia";

export const useModalStore = defineStore("ModalStore", {
    state: () => {
        return {
          state: {
            type: undefined,
            isOpen: false,
            item: 0
          },
        };
    },
    actions: {
      setModalState(data) {
        this.state.type = data.type
        this.state.isOpen = !this.state.isOpen
        this.state.item = this.news[data.newsItemIndex]
      },
      resetModalState() {
        this.state.type = undefined
        this.state.isOpen = false
        this.state.item = 0
      },
      setNewsModalState(data) {
        this.newsModalState.isOpen = !this.newsModalState.isOpen
        this.newsModalState.newsItem = this.news[data.newsItemIndex]
      }
    },
    getters: {
      getModalState(state) {
        return state.state
      },

    }

});