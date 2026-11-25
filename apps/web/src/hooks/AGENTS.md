# hooks/

> L2 · [项目索引](../../../../AGENTS.md)

| 文件 | 职责 |
| --- | --- |
| `useAppRouting.ts` | 同步浏览器地址与平台视图。恢复详情页时保留来源场景。 |
| `useTaskRouteSync.ts` | 在任务页地址与当前对话之间同步会话 ID。 |
| `useFocusTrap.ts` | 在弹层打开时限制键盘焦点范围。 |
| `usePlatformStoreLoader.ts` | 按当前视图加载平台共享数据。 |
| `usePortalTrafficTracking.ts` | 记录门户访问事件。 |
| `useSpeechInput.ts` | 将浏览器语音识别结果交给输入组件。 |
| `useTemporaryWorkspaceBlobs.ts` | 跟踪编辑会话上传的临时文件，清理未保留的上传。 |

[PROTOCOL]: Update this header on change, then check AGENTS.md
