'use client';
import { useCallback } from 'react';
import { statsApi, achievementApi } from '@/shared/events';
import { useStatsDisplay } from '@/features/Progress/facade';

/**
 * Stats Hook - Compatibility layer for existing code
 *
 * NOTE: New code should use statsApi directly instead of this hook.
 * This hook exists for backwards compatibility during migration.
 *
 * @deprecated Prefer using statsApi.recordCorrect() and statsApi.recordIncorrect() directly
 */
const useStats = () => {
  const { characterHistory } = useStatsDisplay();

  // Compatibility wrappers for old API
  const incrementCorrectAnswers = useCallback(() => {
    // Legacy method - new code should use statsApi.recordCorrect()
    console.warn(
      'useStats().incrementCorrectAnswers() is deprecated. Use statsApi.recordCorrect() instead.'
    );
    // Trigger achievement check
    achievementApi.triggerCheck();
  }, []);

  const incrementWrongAnswers = useCallback(() => {
    // Legacy method - new code should use statsApi.recordIncorrect()
    console.warn(
      'useStats().incrementWrongAnswers() is deprecated. Use statsApi.recordIncorrect() instead.'
    );
    // Trigger achievement check
    achievementApi.triggerCheck();
  }, []);

  const addCharacterToHistory = useCallback((character: string) => {
    console.warn(
      'useStats().addCharacterToHistory() is deprecated. Character history is now managed automatically via statsApi events.'
    );
  }, []);

  const addCorrectAnswerTime = useCallback((time: number) => {
    console.warn(
      'useStats().addCorrectAnswerTime() is deprecated. Use statsApi metadata instead.'
    );
  }, []);

  const incrementCharacterScore = useCallback(
    (character: string, field: 'correct' | 'wrong') => {
      console.warn(
        'useStats().incrementCharacterScore() is deprecated. Character scoring is now managed automatically via statsApi events.'
      );
    },
    []
  );

  return {
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    characterHistory,
    addCorrectAnswerTime,
    correctAnswerTimes: [], // No longer tracked
    incrementCharacterScore
  };
};

export default useStats;
