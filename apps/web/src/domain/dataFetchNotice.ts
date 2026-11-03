import { create } from 'zustand';

/** 接口失败或后端异常时，页面上只显示这一句。 */
export const DATA_FETCH_FAILED_MESSAGE = '数据获取失败，请稍候重试';

interface DataFetchNoticeState {
  failed: boolean;
  markFailed: () => void;
  markOk: () => void;
}

export const useDataFetchNotice = create<DataFetchNoticeState>((set) => ({
  failed: false,
  markFailed: () => set({ failed: true }),
  markOk: () => set({ failed: false }),
}));
