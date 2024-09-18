<template>
  <div ref="container" class="graph-container"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, onUnmounted } from 'vue';
import { Graph } from '@antv/x6';
import { Collaboration } from '../utils/collaboration';

export default defineComponent({
  name: 'GraphComponent',
  setup() {
    const container = ref<HTMLDivElement | null>(null);
    let graph: Graph | null = null;
    let collaboration: Collaboration | null = null;

    onMounted(() => {
      if (container.value) {
        graph = new Graph({
          container: container.value,
          width: 800,
          height: 600,
          grid: true,
          resizing: true,
          rotating: false,
          snapline: true,
          history: true,
        });

        // 初始化协同功能
        collaboration = new Collaboration(graph, 'x6-demo-room');

        // 等待协同数据同步完成
        collaboration.onReady(() => {
          // 检查是否已有节点
          if (graph.getNodes().length === 0) {
            // 只有在没有节点时才创建初始节点
            collaboration.addNode({
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

            collaboration.addNode({
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
        });

        // 启用节点的拖拽和调整大小功能
        graph.on('node:mousedown', ({ node }) => {
          node.toFront();
        });
      }
    });

    onUnmounted(() => {
      if (graph) {
        graph.dispose();
      }
      if (collaboration) {
        collaboration.destroy();
      }
    });

    return { container };
  },
});
</script>

<style scoped>
.graph-container {
  border: 1px solid #d9d9d9;
}
</style>