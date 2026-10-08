<script setup>
import { useUi } from '../store/ui';
const ui = useUi();
</script>

<template>
    <div class="toast-box" v-if="ui.toast.show">
        <div class="toast-item show" :class="{ error: ui.toast.type === 'error' }">
            <i class="fas" :class="ui.toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'"></i>
            <span>{{ ui.toast.msg }}</span>
        </div>
    </div>
</template>
