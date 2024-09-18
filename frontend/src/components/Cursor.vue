<template>
  <div
    class="pointer-events-none absolute top-0 left-0"
    :style="{ transform: `translateX(${x}px) translateY(${y}px)` }"
  >
    <svg
      class="relative"
      width="24"
      height="36"
      viewBox="0 0 24 36"
      fill="none"
      stroke="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        :fill="color"
      />
    </svg>

    <div
      v-if="message"
      class="absolute top-5 left-2 rounded-3xl px-4 "
      :style="{ backgroundColor: color, borderRadius: '20px' }"
    >
      <span class="whitespace-nowrap text-sm leading-relaxed text-white">
        {{ message }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  props: {
    color: {
      type: String,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    message: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
});
</script>

<style scoped>
.pointer-events-none{pointer-events:none;}
.absolute{position:absolute;}
.relative{position:relative;}
.left-0{left:0;}
.left-2{left:0.5rem;}
.top-0{top:0;}
.top-5{top:1.25rem;}
.transform{transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.whitespace-nowrap{white-space:nowrap;}
.rounded-3xl{border-radius:1.5rem;}
[stroke~="white"]{--un-stroke-opacity:1;stroke:rgb(255 255 255 / var(--un-stroke-opacity));}
.px-4{padding-left:1rem;padding-right:1rem;}
.py-2{padding-top:0.5rem;padding-bottom:0.5rem;}
.text-sm{font-size:0.875rem;line-height:1.25rem;}
.text-white{--un-text-opacity:1;color:rgb(255 255 255 / var(--un-text-opacity));}
.leading-relaxed{line-height:1.625;}
</style>