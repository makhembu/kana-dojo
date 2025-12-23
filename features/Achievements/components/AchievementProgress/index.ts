// Main component export
export { default } from './AchievementProgress';

// Sub-component exports for potential reuse
export { AchievementCard } from './AchievementCard';
export type { AchievementCardProps } from './AchievementCard';

export { AchievementManagement } from './AchievementManagement';

export { HeroSection } from './HeroSection';
export type { HeroSectionProps } from './HeroSection';

export { CategoryTabs } from './CategoryTabs';
export type { CategoryTabsProps } from './CategoryTabs';

export { AchievementGrid } from './AchievementGrid';
export type { AchievementGridProps } from './AchievementGrid';

// Hook export
export { useAchievementProgress } from './useAchievementProgress';

// Constants export
export { rarityConfig, categories } from './constants';
export type { CategoryId } from './constants';
