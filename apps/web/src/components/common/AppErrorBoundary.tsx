import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/** 登录后渲染崩溃时避免整页白屏，方便回到登录或重试 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message || '页面渲染失败';
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#fbfbfd] px-6">
        <p className="text-[15px] font-semibold text-zinc-900">工作台未能打开</p>
        <p className="max-w-md text-center text-[12px] leading-6 text-zinc-500">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-[#e0122f] px-4 py-2 text-[13px] font-semibold text-white"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
              window.location.hash = '#/home';
              window.location.reload();
            }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
}
