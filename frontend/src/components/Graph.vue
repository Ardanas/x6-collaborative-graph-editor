<template>
  <div class="flow-container">
    <Toolbar :dnd="dnd" :graph="graph" />
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
import { Graph, Node } from '@antv/x6';
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Transform } from '@antv/x6-plugin-transform'
import { Scroller } from '@antv/x6-plugin-scroller'
import { Selection } from '@antv/x6-plugin-selection'
import { Dnd } from '@antv/x6-plugin-dnd'

import { Collaboration } from '../utils/collaboration';
import Cursor from './Cursor.vue';
import Avatar from './Avatar.vue';
import Toolbar from './Toolbar.vue';

export default defineComponent({
  name: 'GraphComponent',
  components: { Cursor, Avatar, Toolbar },
  setup() {
    const container = ref<HTMLDivElement | null>(null);
    let graph: Graph | null = null;
    let collaboration: Collaboration | null = null;
    const userColor = ref('');
    const otherUsers = ref<any[]>([]);
    const dnd = ref<Dnd | null>(null);
    const graphRef = ref<Graph | null>(null);

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

    function initGraph() {
      graphRef.value = new Graph({
        container: container.value,
        grid: true,
        resizing: true,
        rotating: false,
        snapline: true,
        history: true,
        background: {
          color: '#F2F7FA',
        },
        mousewheel: {
          enabled: true,
          minScale: 0.2,
          maxScale: 4,
        },
        interacting: {
          nodeMovable: ({ cell }) => collaboration?.canOperate(cell) ?? false,
          magnetConnectable: ({ cell }) => collaboration?.canOperate(cell) ?? false,
          edgeMovable: (edge) => {
            const sourceNode = edge.getSourceNode();
            const targetNode = edge.getTargetNode();
            return (sourceNode && targetNode)
              ? (collaboration?.canOperate(sourceNode) && collaboration?.canOperate(targetNode)) ?? false
              : false;
          },
        },
      });

      graphRef.value.use(
        new Transform({
          resizing: true,
        }),
      )

      graphRef.value.use(
        new Snapline({
          enabled: true,
        }),
      )

      graphRef.value.use(
        new Clipboard({
          enabled: true,
        }),
      )

      graphRef.value.use(
        new Scroller({
          enabled: true,
          pannable: true,
        }),
      )

      graphRef.value.use(
        new Selection({
          enabled: true,
          multiple: true,
          movable: true,
          showNodeSelectionBox: true,
        }),
      )

      // 初始化 DND 插件
      dnd.value = new Dnd({
        target: graphRef.value,
        scaled: false,
        animation: true,
      });

      // 添加自定义节点
      Graph.registerNode(
        'custom-rect',
        {
          inherit: 'rect',
          attrs: {
            body: {
              strokeWidth: 2,
              stroke: '#333'
            },
            label: {
              fill: '#333',
              fontSize: 13,
            },
          },
        },
        true
      );

      // 移除 node:mousedown 和 node:mouseup 事件监听器
      // 添加 node:mousemove 事件监听器
      graphRef.value.on('node:mousemove', ({ node }) => {
        if (!graphRef.value.isSelected(node) && collaboration?.canOperate(node)) {
          collaboration.setNodeOperator(node);
        }
      });

      graphRef.value.on('node:moved', ({ node }) => {
        if (collaboration?.canOperate(node)) {
          collaboration.updateNodePosition(node);
        }
        if (!graphRef.value.isSelected(node)) {
          collaboration?.clearNodeOperator(node);
        }
      });

      graphRef.value.on('selection:changed', ({ selected, removed }) => {
        selected.forEach((cell) => {
          if (cell.isNode() && collaboration?.canOperate(cell)) {
            collaboration.setNodeOperator(cell);
          }
        });
        console.log('removed',removed);

        removed.forEach((cell) => {
          if (cell.isNode()) {
            collaboration?.clearNodeOperator(cell);
          }
        });
      });

      graphRef.value.on('cell:change:*', ({ cell, key, current, previous, options }) => {
        if (cell.isNode()) {
          const node = cell as Node;
          if (key === 'position' || key === 'size') {
            collaboration?.updateNodePosition(node);
          } else if (key === 'data') {
            updateNodeAppearance(node);
          } else if (key === 'attrs') {
            // 不同步外观相关的属性
            if (!options?.ignoreSync && !['body/stroke', 'body/strokeWidth'].includes(current.path)) {
              collaboration?.updateNode(node);
            }
          }
        }
      });

      graphRef.value.on('node:added', ({ node }) => {
        if (collaboration?.canOperate(node)) {
          collaboration.setNodeOperator(node);
          updateNodeAppearance(node);
        }
      });

      // 添加全局事件监听器
      window.addEventListener('mousemove', handleMouseMove);
    }

    function updateNodeAppearance(node: Node) {
      if (collaboration) {
        const data = node.getData();
        if (data.operator && !collaboration.isCurrentUserOperator(data)) {
          node.attr('body/stroke', data.operator.color, { ignoreSync: true });
          node.attr('body/strokeWidth', 3, { ignoreSync: true });
        } else {
          node.attr('body/stroke', '#333333', { ignoreSync: true });
          node.attr('body/strokeWidth', 2, { ignoreSync: true });
        }
      }
    }

    // 移除 onDrop 函数，因为我们不再需要它

    onMounted(() => {

      initGraph()

      collaboration = new Collaboration(graphRef.value, 'x6-demo-room');

      collaboration.onReady(() => {
        userColor.value = collaboration.getCurrentUserColor();
        if (graphRef.value && graphRef.value.getNodes().length === 0) {
          collaboration?.addNode({
            shape: 'custom-rect',
            x: 100,
            y: 100,
            width: 80,
            height: 40,
            label: '矩形',
            attrs: {
              body: {
                fill: '#f5f5f5',
              },
            },
            data: {}
          });

          collaboration?.addNode({
            shape: 'custom-rect',
            x: 300,
            y: 100,
            width: 60,
            height: 60,
            label: '圆形',
            attrs: {
              body: {
                fill: '#f5f5f5',
              },
            },
            data: {}
          });
        }

        // 更新所有现有节点的外观
        // graphRef.value.getNodes().forEach(updateNodeAppearance);

        collaboration.onAwarenessChange((users) => {
          otherUsers.value = users;
        });
      });

      // 添加全局事件监听器
      window.addEventListener('mousemove', handleMouseMove);
    });

    onUnmounted(() => {
      if (graphRef.value) {
        graphRef.value.dispose();
      }
      if (collaboration) {
        collaboration.destroy();
      }
      // 移除全局事件监听器
      window.removeEventListener('mousemove', handleMouseMove);
      if (dnd.value) {
        dnd.value.dispose();
      }
    });

    return {
      container,
      cursorStyle,
      otherUsers,
      dnd, // 确保返回 dnd
      graph: graphRef, // 确保返回 graph
    };
  },
});
</script>

<style scoped>
.flow-container {
  width: 100vw;
  height: 100vh;
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