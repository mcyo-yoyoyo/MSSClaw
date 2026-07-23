import { useNavPresentationStore } from '@/stores/navPresentationStore';

/**
 * 紧急总闸（默认 true）。业务「场景专家」主联动看「能力运营」是否开放「配置专家」。
 * 仅在需要整站临时隐藏时改为 false。
 */
export const SHOW_SCENE_EXPERTS_IN_DO_TASK = true;

/**
 * 业务「做任务」是否展示场景专家区：
 * 只跟展示配置里「能力运营」角色的「配置专家」联动（不看超管）。
 * 超管菜单常开用于治理，不应单独把业务橱窗拉亮。
 */
export function isDoTaskSceneExpertsVisible(): boolean {
  if (!SHOW_SCENE_EXPERTS_IN_DO_TASK) return false;
  return useNavPresentationStore.getState().isSlotEnabled('agents', 'capability_ops');
}
