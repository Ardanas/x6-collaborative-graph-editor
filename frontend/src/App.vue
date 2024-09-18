<template>
   <GraphComponent />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import GraphComponent from './components/Graph.vue';

export default defineComponent({
  name: 'App',
  components: {
    GraphComponent,
  },
});
</script>

