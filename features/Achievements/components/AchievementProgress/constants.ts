import { Trophy, Star, Zap, Crown, Gem } from 'lucide-react';
import { LucideProps } from 'lucide-react';
import { type AchievementRarity } from '@/features/Achievements/store/useAchievementStore';

/**
 * Configuration for achievement rarity levels
 * Maps each rarity to its visual styling and metadata
 */
export const rarityConfig: Record<
  AchievementRarity,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.FC<LucideProps>;
    label: string;
  }
> = {
  common: {
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    icon: Star,
    label: 'Common'
  },
  uncommon: {
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: Zap,
    label: 'Uncommon'
  },
  rare: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#93C5FD',
    icon: Trophy,
    label: 'Rare'
  },
  epic: {
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#C4B5FD',
    icon: Crown,
    label: 'Epic'
  },
  legendary: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: Gem,
    label: 'Legendary'
  }
};

/**
 * Category filter options for achievement display
 */
export const categories = [
  { id: 'all', label: 'All Achievements', icon: Trophy },
  { id: 'milestone', label: 'Milestones', icon: Star },
  { id: 'streak', label: 'Streaks', icon: Zap },
  { id: 'consistency', label: 'Consistency', icon: Crown },
  { id: 'mastery', label: 'Mastery', icon: Gem }
] as const;

export type CategoryId = (typeof categories)[number]['id'];
