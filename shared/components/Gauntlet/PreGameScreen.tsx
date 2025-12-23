'use client';

import { useCallback } from 'react';
import clsx from 'clsx';
import { Link, useRouter } from '@/core/i18n/routing';
import {
  Swords,
  ArrowLeft,
  Play,
  MousePointerClick,
  Keyboard,
  Shield,
  Skull,
  Zap
} from 'lucide-react';
import { useClick } from '@/shared/hooks/useAudio';
import {
  DIFFICULTY_CONFIG,
  REPETITION_OPTIONS,
  type GauntletDifficulty,
  type GauntletGameMode,
  type RepetitionCount
} from './types';
import { ActionButton } from '@/shared/components/ui/ActionButton';

interface PreGameScreenProps {
  dojoType: 'kana' | 'kanji' | 'vocabulary';
  dojoLabel: string;
  itemsCount: number;
  selectedSets: string[];
  gameMode: GauntletGameMode;
  setGameMode: (mode: GauntletGameMode) => void;
  difficulty: GauntletDifficulty;
  setDifficulty: (difficulty: GauntletDifficulty) => void;
  repetitions: RepetitionCount;
  setRepetitions: (reps: RepetitionCount) => void;
  pickModeSupported: boolean;
  onStart?: () => void; // Kept for backwards compatibility but no longer used
  onCancel?: () => void; // Optional callback to handle back/cancel in modal mode
}

const difficultyIcons: Record<GauntletDifficulty, React.ReactNode> = {
  normal: <Shield size={24} />,
  hard: <Zap size={24} />,
  'instant-death': <Skull size={24} />
};

export default function PreGameScreen({
  dojoType,
  dojoLabel,
  itemsCount,
  selectedSets,
  gameMode,
  setGameMode,
  difficulty,
  setDifficulty,
  repetitions,
  setRepetitions,
  pickModeSupported,
  onCancel
}: PreGameScreenProps) {
  const { playClick } = useClick();
  const router = useRouter();

  // Handle back button - close modal if in modal mode, navigate if on route
  const handleBack = () => {
    playClick();
    if (onCancel) {
      // In modal mode - just close the modal
      onCancel();
    } else {
      // On route - navigate back to dojo
      router.push(`/${dojoType}`);
    }
  };

  const totalQuestions = itemsCount * repetitions;
  const estimatedMinutes = Math.ceil((totalQuestions * 3) / 60);

  const gameModes = [
    {
      id: 'Pick' as GauntletGameMode,
      title: 'Pick',
      description: 'Pick the correct answer from multiple options',
      icon: MousePointerClick
    },
    {
      id: 'Type' as GauntletGameMode,
      title: 'Type',
      description: 'Type the correct answer',
      icon: Keyboard
    }
  ];

  const handleDifficultyClick = useCallback(
    (diff: GauntletDifficulty) => {
      playClick();
      setDifficulty(diff);
    },
    [playClick, setDifficulty]
  );

  return (
    <div className='fixed inset-0 z-[70] overflow-y-auto bg-[var(--background-color)]'>
      <div className='flex min-h-[100dvh] flex-col items-center justify-center p-4'>
        <div className='w-full max-w-lg space-y-4'>
          {/* Header */}
          <div className='space-y-3 text-center'>
            <Swords size={56} className='mx-auto text-[var(--main-color)]' />
            <h1 className='text-2xl font-bold text-[var(--main-color)]'>
              {dojoLabel} Gauntlet
            </h1>
            <p className='text-[var(--secondary-color)]'>
              Master every character. No random help.
            </p>
          </div>

          {/* Selected Sets */}
          <div className='rounded-lg bg-[var(--card-color)] p-4'>
            <div className='flex flex-col gap-2'>
              <span className='text-sm font-medium text-[var(--main-color)]'>
                Selected:
              </span>
              <span className='text-sm text-[var(--secondary-color)]'>
                {selectedSets.length > 0 ? selectedSets.join(', ') : 'None'}
              </span>
              <span className='text-xs text-[var(--secondary-color)]'>
                {itemsCount} characters × {repetitions} = {totalQuestions}{' '}
                questions (~{estimatedMinutes} min)
              </span>
            </div>
          </div>

          {/* Difficulty Selection */}
          {(() => {
            // Toggle between old and new difficulty selector designs
            const useNewDifficultySelector = true;

            if (useNewDifficultySelector) {
              return (
                <div className='space-y-3'>
                  <h3 className='text-sm font-medium text-[var(--main-color)]'>
                    Difficulty
                  </h3>
                  <div className='flex w-full justify-center gap-2 rounded-3xl border-1 border-[var(--border-color)] bg-[var(--card-color)] p-2'>
                    {(
                      Object.entries(DIFFICULTY_CONFIG) as [
                        GauntletDifficulty,
                        (typeof DIFFICULTY_CONFIG)[GauntletDifficulty]
                      ][]
                    ).map(([key, config]) => {
                      const isSelected = key === difficulty;
                      return (
                        <ActionButton
                          key={key}
                          onClick={() => handleDifficultyClick(key)}
                          colorScheme={isSelected ? 'main' : undefined}
                          borderColorScheme={isSelected ? 'main' : undefined}
                          borderBottomThickness={isSelected ? 8 : 0}
                          borderRadius='3xl'
                          className={clsx(
                            'flex-1 gap-1.5 px-4 py-2.5 text-sm',
                            !isSelected &&
                              'bg-transparent text-[var(--secondary-color)] hover:bg-[var(--border-color)]/50 hover:text-[var(--main-color)]'
                          )}
                        >
                          {difficultyIcons[key]}
                          <span>{config.label}</span>
                        </ActionButton>
                      );
                    })}
                  </div>
                  <p className='text-center text-xs text-[var(--secondary-color)]'>
                    {DIFFICULTY_CONFIG[difficulty].description}
                  </p>
                </div>
              );
            }

            // Old difficulty selector design
            return (
              <div className='space-y-3'>
                <h3 className='text-sm font-medium text-[var(--secondary-color)]'>
                  Difficulty
                </h3>
                <div className='grid grid-cols-3 gap-2'>
                  {(
                    Object.entries(DIFFICULTY_CONFIG) as [
                      GauntletDifficulty,
                      (typeof DIFFICULTY_CONFIG)[GauntletDifficulty]
                    ][]
                  ).map(([key, config]) => {
                    const isSelected = key === difficulty;
                    return (
                      <button
                        key={key}
                        onClick={() => handleDifficultyClick(key)}
                        className={clsx(
                          'flex flex-col items-center gap-1 rounded-xl p-3',
                          'border-2 transition-all duration-200',
                          'hover:cursor-pointer',
                          isSelected
                            ? 'border-[var(--main-color)] bg-[var(--main-color)]/10'
                            : 'border-[var(--border-color)] bg-[var(--card-color)] hover:border-[var(--secondary-color)]/50'
                        )}
                      >
                        <div
                          className={clsx(
                            'text-lg',
                            isSelected
                              ? 'text-[var(--main-color)]'
                              : 'text-[var(--muted-color)]'
                          )}
                        >
                          {difficultyIcons[key]}
                        </div>
                        <span
                          className={clsx(
                            'text-xs font-medium',
                            isSelected
                              ? 'text-[var(--main-color)]'
                              : 'text-[var(--secondary-color)]'
                          )}
                        >
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className='text-center text-xs text-[var(--muted-color)]'>
                  {DIFFICULTY_CONFIG[difficulty].description}
                </p>
              </div>
            );
          })()}

          {/* Game Mode Cards */}
          <div className='space-y-3'>
            <h3 className='text-sm font-medium text-[var(--main-color)]'>
              Mode
            </h3>
            {gameModes.map(mode => {
              const isSelected = mode.id === gameMode;
              const Icon = mode.icon;
              const isDisabled = mode.id === 'Pick' && !pickModeSupported;

              return (
                <button
                  key={mode.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      playClick();
                      setGameMode(mode.id);
                    }
                  }}
                  className={clsx(
                    'w-full rounded-xl p-4 text-left',
                    'flex items-center gap-4 border-2 bg-[var(--card-color)]',
                    isDisabled && 'cursor-not-allowed opacity-50',
                    !isDisabled && 'hover:cursor-pointer',
                    isSelected
                      ? 'border-[var(--main-color)]'
                      : 'border-[var(--border-color)]'
                  )}
                >
                  <div
                    className={clsx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isSelected
                        ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                        : 'bg-[var(--border-color)] text-[var(--muted-color)]'
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h4 className='font-medium text-[var(--secondary-color)]'>
                      {mode.title}
                    </h4>
                    <p className='text-xs text-[var(--muted-color)]'>
                      {mode.description}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-[var(--main-color)] bg-[var(--main-color)]'
                        : 'border-[var(--border-color)]'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className='h-3 w-3 text-[var(--background-color)]'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={3}
                          d='M5 13l4 4L19 7'
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Repetitions per character */}
          <div className='space-y-3 rounded-lg bg-[var(--card-color)] p-4'>
            <p className='text-sm font-medium text-[var(--secondary-color)]'>
              Repetitions per character:
            </p>
            <div className='flex flex-wrap justify-center gap-2'>
              {REPETITION_OPTIONS.map(rep => (
                <ActionButton
                  key={rep}
                  onClick={() => {
                    playClick();
                    setRepetitions(rep);
                  }}
                  colorScheme={repetitions === rep ? 'main' : 'secondary'}
                  borderColorScheme={repetitions === rep ? 'main' : 'secondary'}
                  borderBottomThickness={8}
                  borderRadius='3xl'
                  className={clsx(
                    'w-auto px-4 py-2',
                    repetitions !== rep && 'opacity-60'
                  )}
                >
                  {rep}×
                </ActionButton>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-row items-center justify-center gap-2 pt-2 md:gap-4'>
            <button
              onClick={handleBack}
              className={clsx(
                'flex h-12 w-1/2 flex-row items-center justify-center gap-2 px-2 sm:px-6',
                'bg-[var(--secondary-color)] text-[var(--background-color)]',
                'rounded-2xl transition-colors duration-200',
                'border-b-8 border-[var(--secondary-color-accent)] ',
                'hover:cursor-pointer'
              )}
            >
              <ArrowLeft size={20} />
              <span className='whitespace-nowrap'>Back</span>
            </button>

            {/* Start button: Navigate to gauntlet route to start the game */}
            <Link href={`/${dojoType}/gauntlet`} className='w-1/2'>
              <button
                onClick={() => playClick()}
                className={clsx(
                  'flex h-12 w-full flex-row items-center justify-center gap-2 px-2 sm:px-6',
                  'rounded-2xl transition-colors duration-200',
                  'border-b-8 font-medium ',
                  'hover:cursor-pointer',
                  'border-[var(--main-color-accent)] bg-[var(--main-color)] text-[var(--background-color)]'
                )}
              >
                <span className='whitespace-nowrap'>Start Gauntlet</span>
                <Play className='fill-current' size={20} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
