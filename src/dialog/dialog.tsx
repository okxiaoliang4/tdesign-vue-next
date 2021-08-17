import { defineComponent, h, Transition } from 'vue';
import { prefix } from '../config';
import TIconClose from '../icon/close';
import TButton, { ButtonProps } from '../button';
import TIconInfoCircleFilled from '../icon/info-circle-filled';
import TIconCheckCircleFilled from '../icon/check-circle-filled';
import { getAttach } from '../utils/dom';
import TransferDom from '../utils/transfer-dom';
import { DialogCloseContext } from './type';
import props from './props';
import { ClassName } from '../common';

const name = `${prefix}-dialog`;

function GetCSSValue(v: string | number) {
  return isNaN(Number(v)) ? v : `${Number(v)}px`;
}


// 注册元素的拖拽事件
function InitDragEvent(dragBox: HTMLElement) {
  const target = dragBox;
  target.addEventListener('mousedown', (targetEvent: MouseEvent) => {
    // 算出鼠标相对元素的位置
    const disX = targetEvent.clientX - target.offsetLeft;
    const disY = targetEvent.clientY - target.offsetTop;
    function mouseMoverHander(documentEvent: MouseEvent) {
      // 用鼠标的位置减去鼠标相对元素的位置，得到元素的位置
      const left = documentEvent.clientX - disX;
      const top = documentEvent.clientY - disY;
      // 移动当前元素
      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
    }
    function mouseUpHandler() {
      // 鼠标弹起来的时候不再移动
      document.removeEventListener('mousemove', mouseMoverHander);
      // 预防鼠标弹起来后还会循环（即预防鼠标放上去的时候还会移动）
      document.removeEventListener('mouseup', mouseUpHandler);
    }
    // 元素按下时注册document鼠标监听事件
    document.addEventListener('mousemove', mouseMoverHander);
    // 鼠标弹起来移除document鼠标监听事件
    document.addEventListener('mouseup', mouseUpHandler);
  });
}
export default defineComponent({
  name,
  components: {
    TButton,
    Transition,
    TIconClose,
    TIconInfoCircleFilled,
  },
  // 注册v-draggable指令,传入ture时候初始化拖拽事件
  directives: {
    TransferDom,
    draggable(el, binding) {
      // el 指令绑定的元素
      if (el && binding && binding.value) {
        InitDragEvent(el);
      }
    },
  },
  props: { ...props },
  emits: ['close', 'update:visible', 'keydown-esc', 'click-overlay', 'click-close-btn', 'click-cancel', 'click-confirm', 'opened', 'closed'],
  data() {
    return {
      attachTarget: null,
    };
  },
  computed: {
    // 是否模态形式的对话框
    isModal(): boolean {
      return this.mode === 'modal';
    },
    // 是否非模态对话框
    isModeless(): boolean {
      return this.mode === 'modeless';
    },

    maskClass(): ClassName {
      return [`${name}-mask`, !this.showOverlay && `${name}-mask--hidden`];
    },

    dialogClass(): ClassName {
      const dialogClass = [`${name}`, `${name}--default`, `${name}--${this.placement}`];
      if (['modeless', 'modal'].includes(this.mode)) {
        dialogClass.push(`${name}--fixed`);
      }
      return dialogClass;
    },

    dialogStyle(): Record<string, string | number> {
      const { top, placement } = this;
      let topStyle = {};

      // 设置了top属性
      if (top) {
        const topValue = GetCSSValue(top);
        topStyle = {
          top: topValue,
          transform: 'translate(-50%, 0)',
          transformOrigin: '25% 25%',
          maxHeight: `calc(100% - ${topValue})`,
        };
      } else if (placement === 'top') {
        topStyle = {
          maxHeight: 'calc(100% - 20%)',
        };
      }
      return { width: GetCSSValue(this.width), ...topStyle };
    },
  },
  watch: {
    visible(value) {
      this.disPreventScrollThrough(value);
      this.addKeyboardEvent(value);
    },
  },
  beforeUnmount() {
    this.disPreventScrollThrough(false);
    this.addKeyboardEvent(false);
  },
  mounted() {
    const { attach } = this;
    // attach默认值为空''，返回false才不会被重新挂载
    if (!attach) return false;
    this.attachTarget = getAttach(attach);
  },

  methods: {
    disPreventScrollThrough(disabled: boolean) {
      // 防止滚动穿透,modal形态才需要
      if (this.preventScrollThrough && this.isModal) {
        document.body.style.overflow = disabled ? 'hidden' : '';
      }
    },
    addKeyboardEvent(status: boolean) {
      if (status) {
        document.addEventListener('keydown', this.keyboardEvent);
      } else {
        document.removeEventListener('keydown', this.keyboardEvent);
      }
    },
    keyboardEvent(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        this.$emit('keydown-esc', e);
        // 根据closeOnKeydownEsc判断按下ESC时是否触发close事件
        if (this.closeOnKeydownEsc) {
          this.emitCloseEvent({
            trigger: 'esc',
            e,
          });
        }
      }
    },
    overlayAction(e: MouseEvent) {
      this.$emit('click-overlay', e);
      // 根据closeOnClickOverlay判断点击蒙层时是否触发close事件
      if (this.closeOnOverlayClick) {
        this.emitCloseEvent({
          trigger: 'overlay',
          e,
        });
      }
    },
    closeBtnAcion(e: MouseEvent) {
      this.$emit('click-close-btn', e);
      this.emitCloseEvent({
        trigger: 'close-btn',
        e,
      });
    },

    cancelBtnAction(e: MouseEvent) {
      this.$emit('click-cancel', e);
      this.emitCloseEvent({
        trigger: 'cancel',
        e,
      });
    },
    confirmBtnAction(e: MouseEvent) {
      this.$emit('click-confirm', e);
    },
    // 打开弹窗动画结束时事件
    afterEnter() {
      this.$emit('opened');
    },
    // 关闭弹窗动画结束时事件
    afterLeave() {
      this.$emit('closed');
    },

    emitCloseEvent(context: DialogCloseContext) {
      this.$emit('close', context);
      // 默认关闭弹窗
      this.$emit('update:visible', false);
    },

    // Vue在引入阶段对事件的处理还做了哪些初始化操作。Vue在实例上用一个_events属性存贮管理事件的派发和更新，
    // 暴露出$on, $once, $off, $emit方法给外部管理事件和派发执行事件
    // 所以通过判断_events某个事件下监听函数数组是否超过一个，可以判断出组件是否监听了当前事件
    hasEventOn(name: string) {
      // _events 因没有被暴露在vue实例接口中，只能把这个规则注释掉
      // eslint-disable-next-line dot-notation
      const eventFuncs = this['_events']?.[name];
      return !!eventFuncs?.length;
    },
    getIcon() {
      const icon = {
        info: <TIconInfoCircleFilled class="t-is-info" />,
        warning: <TIconInfoCircleFilled class="t-is-warning" />,
        error: <TIconInfoCircleFilled class="t-is-error" />,
        success: <TIconCheckCircleFilled class="t-is-success" />,
      };
      return icon[this.theme];
    },
    renderHeader() {
      const target = this.header;
      let view;
      let isShow = true;
      if (typeof target === 'boolean') {
        isShow = target;
      }
      if (typeof target === 'string') {
        view = <h5 class="title">{target}</h5>;
      } else if (typeof target === 'function') {
        // @ts-ignore: TODO
        view = target(h);
      } else if (typeof this.$slots.header === 'function') {
        view = this.$slots.header(null);
      }
      return (
        isShow && (
          <div class={`${name}__header`}>
            {this.getIcon()}
            {view}
          </div>
        )
      );
    },
    renderBody() {
      const target = this.body;
      let view;
      if (typeof target === 'string' && target) {
        view = target;
      } else if (typeof target === 'function') {
        // @ts-ignore: TODO
        view = target(h);
      } else if (typeof this.$slots.body === 'function') {
        view = this.$slots.body(null);
      }
      return view && <div class={`${name}__body`}>{view}</div>;
    },
    renderDefaultBtn(type: string, btnNode: string | ((c: typeof h) => void) | ButtonProps) {
      if (!btnNode) return null;
      const r = {
        confirm: {
          theme: 'primary',
          variant: 'base',
          onClick: this.confirmBtnAction,
        },
        cancel: {
          theme: 'default',
          variant: 'outline',
          onClick: this.cancelBtnAction,
        },
      }[type];
      if (typeof btnNode === 'function') {
        return btnNode(h);
      }
      if (typeof btnNode === 'object') {
        return (
          <TButton variant={r.variant as ('base' | 'outline')} onClick={r.onClick} { ...btnNode }>
            {btnNode.content}
          </TButton>
        );
      }
      return (
        <TButton variant={r.variant as ('base' | 'outline')} onClick={r.onClick}>
          {btnNode}
        </TButton>
      );
    },

    renderFooter() {
      const defaultView = (
        <div>
          {this.renderDefaultBtn('cancel', this.cancelBtn)}
          {this.renderDefaultBtn('confirm', this.confirmBtn)}
        </div>
      );
      const target = this.footer;
      let view;
      if (target === false) return;

      if (target === true) {
        view = typeof this.$slots.footer === 'function' ? this.$slots.footer(null) : defaultView;
      } else if (typeof target === 'function') {
        // @ts-ignore: TODO
        view = target(h);
      }

      return <div class={`${name}__footer`}>{view || defaultView}</div>;
    },
    renderCloseBtn() {
      const defaultView = <t-icon-close name="close"></t-icon-close>;
      const target = this.closeBtn;
      let view;
      let isShow = true;
      if (typeof target === 'boolean') {
        isShow = target;
      }

      if (typeof target === 'string') {
        view = target;
      } else if (typeof target === 'function') {
        // @ts-ignore: TODO
        view = target(h);
      } else if (typeof this.$slots.closeBtn === 'function') {
        view = this.$slots.closeBtn(null);
      }

      return (
        isShow && (
          <span class={`${name}__close`} onClick={this.closeBtnAcion}>
            {view || defaultView}
          </span>
        )
      );
    },
    renderDialog() {
      return (
        // /* 非模态形态下draggable为true才允许拖拽 */
        <div
          key="dialog"
          class={this.dialogClass}
          style={this.dialogStyle}
          v-draggable={this.isModeless && this.draggable}
        >
          {this.renderHeader()}
          {this.renderBody()}
          {this.renderFooter()}
          {this.renderCloseBtn()}
        </div>
      );
    },
  },
  render() {
    const maskView = this.isModal && <div key="mask" class={this.maskClass} onClick={this.overlayAction}></div>;
    const dialogView = this.renderDialog();
    const view = [maskView, dialogView];
    const ctxStyle: any = { zIndex: this.zIndex };
    const ctxClass = [`${name}-ctx`, { 't-dialog-ctx--fixed': this.mode === 'modal' }];
    return (
      <transition
        duration={300}
        name={`${name}-zoom__vue`}
        onAfterEnter={this.afterEnter}
        onAfterLeave={this.afterLeave}
      >
        {(!this.destroyOnClose || this.visible) && (
          <div v-show={this.visible} class={ctxClass} style={ctxStyle} v-transfer-dom={this.attachTarget || false}>
            {view}
          </div>
        )}
      </transition>
    );
  },
});
