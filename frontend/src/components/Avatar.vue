<template>
  <div class="avatar" :data-tooltip="name" >
    <span class="name">{{ name.charAt(0) }}</span>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const IMAGE_SIZE = 20;

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.avatar {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 4px solid #fff;
  border-radius: 9999px;
  width: 30px;
  height: 30px;
  background: url(https://liveblocks.io/avatars/avatar-6.png)
}

.name {
    color: white;
}

.avatar:before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  opacity: 0;
  transition: opacity 0.15s ease;
  padding: 5px 10px;
  color: white;
  font-size: 0.75rem;
  border-radius: 8px;
  margin-bottom: 10px;
  z-index: 1;
  background: black;
  white-space: nowrap;
}

.avatar:hover:before {
  opacity: 1;
}

img {
  border-radius: 50%;
  width: 100%;
  height: 100%;
}
</style>