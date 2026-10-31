import brand from "./brand";

export const features = {
  showPureFilter: brand.features?.showPureFilter !== false,
  showTeenageFilter: brand.features?.showTeenageFilter !== false,
  showVoiceTransform: brand.features?.showVoiceTransform !== false,
  showAudioFilter: brand.features?.showAudioFilter !== false,
  showProfileTab: brand.features?.showProfileTab !== false,
} as const;

export default features;
