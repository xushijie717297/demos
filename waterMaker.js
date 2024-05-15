import type { Directive, App } from 'vue';
import { nextTick } from 'vue';

const watermarkDirective: Directive = {
  // 在绑定元素的父组件
  // 及他自己的所有子节点都挂载完成后调用
  async mounted(el, binding) {
    await createWatermark(el, binding.value.text);
  },
  // 绑定元素的父组件卸载后调用
  unmounted(el) {
    removeWatermark(el);
  },
};

async function createWatermark(el, text: string) {
  const canvasEl = el.querySelector('canvas') || document.createElement('canvas');
  const newCanvas = !el.querySelector('canvas');

  if (!el.dataset.mutationObserverParent) {
    const mutationObserver = new MutationObserver((records) =>
      parentCheckWatermark(records, el, text),
    );
    mutationObserver.observe(el, {
      childList: true,
    });
    el.dataset.mutationObserverParent = mutationObserver;
  }
  canvasEl.id = 'watermark-canvas';
  canvasEl.style.position = 'absolute';
  canvasEl.style.top = '0';
  canvasEl.style.left = '0';
  canvasEl.style.zIndex = '99';
  canvasEl.style.pointerEvents = 'none';
  newCanvas && el.appendChild(canvasEl);
  canvasEl.width = window.screen.width * 3;
  canvasEl.height = window.screen.height * 3;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  ctx.rotate((-20 * Math.PI) / 180); //旋转角度
  ctx.font = '24px serif';
  ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = -canvasEl.width / 100; i < canvasEl.width / 100; i++) {
    for (let j = -canvasEl.height / 200; j < canvasEl.height / 200; j++) {
      ctx.fillText(text, i * 300, j * 300);
    }
  }

  if (newCanvas) {
    // 水印属性监听
    const mutationObserver = new MutationObserver(() => canvasCheckWatermark(el, text));
    mutationObserver.observe(canvasEl, {
      attributes: true,
    });
    el.dataset.mutationObserverCanvas = mutationObserver;
  }
}

/** 检查水印是否被删除 */
async function parentCheckWatermark(records, el, text) {
  // 主动删除水印不处理
  if (el.dataset.focusRemove) return;
  const removedNodes = records[0].removedNodes;
  let hasDelWatermark = false;
  removedNodes.forEach((el) => {
    if (el.id === 'watermark-canvas') {
      hasDelWatermark = true;
    }
  });
  // 水印被删除了
  hasDelWatermark && createWatermark(el, text);
}

/** 检查水印属性是否变化了 */
async function canvasCheckWatermark(el, text) {
  // 防止多次触发
  if (el.dataset.canvasRending) return;
  el.dataset.canvasRending = 'rending';

  // 水印canvas属性变化了，重新创建
  await createWatermark(el, text);
  el.dataset.canvasRending = '';
}

async function removeWatermark(el) {
  el.dataset.focusRemove = true;
  el.dataset.mutationObserverParent?.disconnect?.();
  await nextTick();
  const canvasEl = el.querySelector('#watermark-canvas');
  if (canvasEl) {
    canvasEl.dataset.mutationObserverCanvas?.disconnect?.();
    canvasEl.remove();
  }
}
export default watermarkDirective;
