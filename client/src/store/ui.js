import { defineStore } from 'pinia';

export const useUi = defineStore('ui', {
    state: () => ({
        searchOpen: false,
        toast: { show: false, msg: '', type: 'ok' }
    }),
    actions: {
        openSearch() { this.searchOpen = true; },
        closeSearch() { this.searchOpen = false; },
        toastMsg(msg, type = 'ok') {
            this.toast = { show: true, msg, type };
            clearTimeout(this._t);
            this._t = setTimeout(() => { this.toast.show = false; }, 2600);
        }
    }
});
