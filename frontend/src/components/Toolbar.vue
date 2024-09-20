<template>
  <div class="toolbar">
    <div
      v-for="shape in shapes"
      :key="shape.type"
      class="toolbar-item"
      @mousedown="startDrag($event, shape)"
    >
      {{ shape.label }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Dnd } from '@antv/x6-plugin-dnd';
import { Graph } from '@antv/x6';

export default defineComponent({
  name: 'Toolbar',
  props: {
    dnd: {
      type: Object as PropType<Dnd | null>,
      required: true,
    },
    graph: {
      type: Object as PropType<Graph | null>,
      required: true,
    },
  },
  setup(props) {
    const shapes = [
      { type: 'custom-rect', label: '矩形' },
      { type: 'circle', label: '圆形' },
      { type: 'ellipse', label: '椭圆' },
    ];

    const startDrag = (e: MouseEvent, shape: any) => {
      if (props.dnd && props.graph) {
        const node = props.graph.createNode({
          shape: shape.type,
          width: 80,
          height: 40,
          label: shape.label,
          attrs: {
            body: {
              fill: '#f5f5f5',
              stroke: '#333333',
              strokeWidth: 2,
            },
          },
          data: {}, // 添加初始的空 data 对象
        });
        props.dnd.start(node, e);
      }
    };

    return {
      shapes,
      startDrag,
    };
  },
});
</script>

<style scoped>
.toolbar {
  position: fixed;
  top: 10px;
  left: 10px;
  display: flex;
  padding: 6px;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  z-index: 1000;
}

.toolbar-item {
  margin-right: 10px;
  padding: 2px 6px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: move;
  user-select: none;
  transition: background-color 0.2s;
  font-size: 14px;
}

.toolbar-item:hover {
  background-color: #e0e0e0;
}

.toolbar-item:last-child {
  margin-right: 0;
}
</style>