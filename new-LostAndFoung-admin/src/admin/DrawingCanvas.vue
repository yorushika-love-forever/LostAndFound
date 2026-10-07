<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  change: [file: File | null]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let context: CanvasRenderingContext2D | null = null
let drawing = false

onMounted(() => {
  const element = canvas.value
  if (!element) return

  context = element.getContext('2d')
  if (!context) return

  context.lineWidth = 3
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#111827'
})

function getPoint(event: PointerEvent) {
  const element = canvas.value
  if (!element) return { x: 0, y: 0 }

  const rect = element.getBoundingClientRect()

  return {
    x: ((event.clientX - rect.left) / rect.width) * element.width,
    y: ((event.clientY - rect.top) / rect.height) * element.height,
  }
}

function startDrawing(event: PointerEvent) {
  const element = canvas.value
  if (!element || !context) return

  event.preventDefault()
  drawing = true
  element.setPointerCapture(event.pointerId)

  const point = getPoint(event)
  context.beginPath()
  context.moveTo(point.x, point.y)
}

function draw(event: PointerEvent) {
  if (!drawing || !context) return

  event.preventDefault()
  const point = getPoint(event)
  context.lineTo(point.x, point.y)
  context.stroke()
}

function stopDrawing() {
  if (!drawing) return

  drawing = false
  exportDrawing()
}

function exportDrawing() {
  const element = canvas.value
  if (!element) return

  element.toBlob((blob) => {
    if (!blob) return

    emit(
      'change',
      new File([blob], 'announcement-drawing.png', {
        type: 'image/png',
      }),
    )
  }, 'image/png')
}

function clearDrawing() {
  const element = canvas.value
  if (!element || !context) return

  context.clearRect(0, 0, element.width, element.height)
  emit('change', null)
}
</script>

<template>
  <div class="drawing-box">
    <p class="drawing-tip">
      按住鼠标或手指在白色区域绘制。画完后可以直接提交公告。
    </p>

    <canvas
      ref="canvas"
      width="600"
      height="320"
      @pointerdown="startDrawing"
      @pointermove="draw"
      @pointerup="stopDrawing"
      @pointercancel="stopDrawing"
      @pointerleave="stopDrawing"
    />

    <button class="button small" type="button" @click="clearDrawing">
      清空画板
    </button>
  </div>
</template>

<style scoped>
.drawing-box {
  margin-top: 10px;
}

.drawing-tip {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 13px;
}

canvas {
  display: block;
  width: 100%;
  max-width: 600px;
  height: auto;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  background: #fff;
  cursor: crosshair;
  touch-action: none;
}

.button {
  margin-top: 10px;
}
</style>
