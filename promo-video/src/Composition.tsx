import { Composition } from "remotion";
import {
  PROMO_DURATION_IN_FRAMES,
  PROMO_FPS,
  PromoVideo,
} from "./PromoVideo";
import {
  K3_PROMO_DURATION_IN_FRAMES,
  K3_PROMO_FPS,
  PromoVideoK3,
} from "./PromoVideoK3";

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="MSS-AI-Promo-K3"
        component={PromoVideoK3}
        durationInFrames={K3_PROMO_DURATION_IN_FRAMES}
        fps={K3_PROMO_FPS}
        width={1280}
        height={720}
      />
      <Composition
        id="MSS-AI-Promo"
        component={PromoVideo}
        durationInFrames={PROMO_DURATION_IN_FRAMES}
        fps={PROMO_FPS}
        width={1280}
        height={720}
      />
    </>
  );
};
