<template>
  <div class="flow-container">
    <UserInfoDialog v-if="showDialog" @info-saved="handleInfoSaved" />
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
          :x="getClientX(state.mouse?.x)"
          :y="getClientY(state.mouse?.y)"
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
import { throttle } from 'lodash-es';
import { defineComponent, onMounted, ref, onUnmounted, computed, watch, nextTick } from 'vue';
import { Graph, Node, Point } from '@antv/x6';
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Transform } from '@antv/x6-plugin-transform'
import { Scroller } from '@antv/x6-plugin-scroller'
import { Selection } from '@antv/x6-plugin-selection'
import { Dnd } from '@antv/x6-plugin-dnd'
import UserInfoDialog from './UserInfoDialog.vue';
import { storageService } from '../utils/storage';

import { Collaboration } from '../utils/collaboration';
import Cursor from './Cursor.vue';
import Avatar from './Avatar.vue';
import Toolbar from './Toolbar.vue';

export default defineComponent({
  name: 'GraphComponent',
  components: { Cursor, Avatar, Toolbar, UserInfoDialog },
  setup() {
    const container = ref<HTMLDivElement | null>(null);
    let graph: Graph | null = null;
    let collaboration: Collaboration | null = null;
    const userColor = ref('');
    const otherUsers = ref<any[]>([]);
    const dnd = ref<Dnd | null>(null);
    const graphRef = ref<Graph | null>(null);
    const showDialog = ref(true);
    const userInfo = ref(null);

    const cursorStyle = computed(() => ({
      cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="fill: ${userColor.value};"><circle cx="8" cy="8" r="8"/></svg>') 8 8, auto`
    }));

    const handleMouseMove = (e: MouseEvent) => {
      if (collaboration && graphRef.value && container.value) {
        const rect = container.value.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const localPoint: Point = graphRef.value.clientToLocal({ x, y });
        collaboration.updateMousePosition(localPoint.x, localPoint.y);
      }
    };

    const throttledHandleMouseMove = throttle(handleMouseMove, 50);

    const handleInfoSaved = (info) => {
      userInfo.value = info;
      showDialog.value = false;
      userColor.value = info.userColor;
      nextTick(() => {
        initCollaboration();
      });
    };

    const initCollaboration = () => {
      if (userInfo.value && graphRef.value) {
        collaboration = new Collaboration(
          graphRef.value,
          userInfo.value.roomName,
          userInfo.value.username,
          userInfo.value.userColor
        );
        collaboration.onReady(() => {
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
          }
          collaboration.onAwarenessChange((users) => {
            otherUsers.value = users;
          });
        });
      }
    };

    const initGraph = () => {
      if (!container.value) {
        return;
      }

      graphRef.value = new Graph({
        container: container.value,
        grid: true,
        resizing: true,
        rotating: false,
        snapline: true,
        history: true,
        virtual: true,
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

      graphRef.value.use(new Transform({ resizing: true }));
      graphRef.value.use(new Snapline({ enabled: true }));
      graphRef.value.use(new Clipboard({ enabled: true }));
      graphRef.value.use(new Scroller({ enabled: true, pannable: true }));
      graphRef.value.use(new Selection({
        enabled: true,
        multiple: true,
        movable: true,
        showNodeSelectionBox: true,
      }));

      dnd.value = new Dnd({
        target: graphRef.value,
        scaled: false,
        animation: true,
      });

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

      window.addEventListener('mousemove', throttledHandleMouseMove);
    };

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

    onMounted(() => {
      const storedInfo = storageService.getItem('userInfo');
      if (storedInfo) {
        userInfo.value = storedInfo;
        userColor.value = userInfo.value.userColor;
        showDialog.value = false;
        initGraph();
        initCollaboration();
      } else {
        initGraph();
      }
    });

    onUnmounted(() => {
      if (graphRef.value) {
        graphRef.value.dispose();
      }
      if (collaboration) {
        collaboration.destroy();
      }
      window.removeEventListener('mousemove', throttledHandleMouseMove);
      if (dnd.value) {
        dnd.value.dispose();
      }
    });

    const getClientX = (x: number | undefined) => {
      if (x === undefined || !graphRef.value || !container.value) return 0;
      const point = graphRef.value.localToClient({ x, y: 0 });
      return point.x;
    };

    const getClientY = (y: number | undefined) => {
      if (y === undefined || !graphRef.value || !container.value) return 0;
      const point = graphRef.value.localToClient({ x: 0, y });
      return point.y;
    };

    return {
      container,
      cursorStyle,
      otherUsers,
      dnd,
      graph: graphRef,
      getClientX,
      getClientY,
      showDialog,
      handleInfoSaved,
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