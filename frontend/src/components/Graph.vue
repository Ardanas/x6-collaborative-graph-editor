<template>
  <div class="flow-container">
    <div
      ref="container"
      class="graph-container"
      :style="cursorStyle"
    />
    <template v-if="otherUsers.length">
      <div v-for="state in otherUsers" :key="state.id">
        <Cursor
          :color="state.color"
          :x="state.mouse?.x || 0"
          :y="state.mouse?.y || 0"
          :message="state.name"
        />
      </div>
    </template>

    <div v-for="state in otherUsers" :key="state.id" class="avatar-container">
           <Avatar :name="state.name" />
      </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, onUnmounted, computed } from 'vue';
import { Graph } from '@antv/x6';
import { Collaboration } from '../utils/collaboration';
import Cursor from './Cursor.vue';
import Avatar from './Avatar.vue';

export default defineComponent({
  name: 'GraphComponent',
  components: { Cursor, Avatar },
  setup() {
    const container = ref<HTMLDivElement | null>(null);
    let graph: Graph | null = null;
    let collaboration: Collaboration | null = null;
    const userColor = ref('');
    const otherUsers = ref<any[]>([]);

    const cursorStyle = computed(() => ({
      cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="fill: ${userColor.value};"><circle cx="8" cy="8" r="8"/></svg>') 8 8, auto`
    }));

    const handleMouseMove = (e: MouseEvent) => {
      if (collaboration && container.value) {
        const rect = container.value.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        collaboration.updateMousePosition(x, y);
      }
    };

    onMounted(() => {
      graph = new Graph({
        container: container.value,
        grid: true,
        resizing: true,
        rotating: false,
        snapline: true,
        history: true,
        interacting: {},
      });

      collaboration = new Collaboration(graph, 'x6-demo-room');

      collaboration.onReady(() => {
        userColor.value = collaboration.getCurrentUserColor();
        if (graph && graph.getNodes().length === 0) {
          collaboration?.addNode({
            shape: 'rect',
            x: 100,
            y: 100,
            width: 80,
            height: 40,
            label: '矩形',
            attrs: {
              body: {
                fill: '#f5f5f5',
                stroke: '#d9d9d9',
                strokeWidth: 1,
              },
            },
          });

          collaboration?.addNode({
            shape: 'circle',
            x: 300,
            y: 100,
            width: 60,
            height: 60,
            label: '圆形',
            attrs: {
              body: {
                fill: '#f5f5f5',
                stroke: '#d9d9d9',
                strokeWidth: 1,
              },
            },
          });
        }

        collaboration.onAwarenessChange((users) => {
          otherUsers.value = users;
        });
      });

      graph.on('node:selected', ({ node }) => {
        if (collaboration && collaboration.isNodeLocked(node.id)) {
          node.unselect();
        }
      });

      // 添加全局事件监听器
      window.addEventListener('mousemove', handleMouseMove);
    });

    onUnmounted(() => {
      if (graph) {
        graph.dispose();
      }
      if (collaboration) {
        collaboration.destroy();
      }
      // 移除全局事件监听器
      window.removeEventListener('mousemove', handleMouseMove);
    });

    return { container, cursorStyle, otherUsers };
  },
});
</script>

<style scoped>
.flow-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.graph-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.avatar-container {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
}
</style>