'use client';
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  motion,
  AnimatePresence,
  type Variants,
  type MotionStyle
} from 'framer-motion';
import clsx from 'clsx';
import useVocabStore, {
  IVocabObj
} from '@/features/Vocabulary/store/useVocabStore';
import { Random } from 'random-js';
import { useCorrect, useError, useClick } from '@/shared/hooks/useAudio';
import { getGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';
import Stars from '@/shared/components/Game/Stars';
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import { useStatsStore } from '@/features/Progress';
import { useShallow } from 'zustand/react/shallow';
import { useStopwatch } from 'react-timer-hook';
import { useSmartReverseMode } from '@/shared/hooks/useSmartReverseMode';
import { GameBottomBar } from '@/shared/components/Game/GameBottomBar';
import FuriganaText from '@/shared/components/text/FuriganaText';
import AnswerSummary from '@/shared/components/Game/AnswerSummary';
import { CircleCheck } from 'lucide-react';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';

const random = new Random();
const adaptiveSelector = getGlobalAdaptiveSelector();

// Duolingo-like spring animation config
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

// Premium entry animation variants for option tiles
const tileContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15
    }
  }
};

const tileEntryVariants = {
  hidden: {
    opacity: 0,
    scale: 0.7,
    y: 20,
    rotateX: -15
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 25,
      mass: 0.8
    }
  }
};

// Duolingo-like slide animation for game content transitions
const gameContentVariants = {
  hidden: {
    opacity: 0,
    x: 80
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      x: {
        type: 'spring' as const,
        stiffness: 350,
        damping: 30,
        mass: 0.7
      },
      opacity: {
        duration: 0.25,
        ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number]
      }
    }
  },
  exit: {
    opacity: 0,
    x: -80,
    transition: {
      x: {
        type: 'spring' as const,
        stiffness: 350,
        damping: 30,
        mass: 0.7
      },
      opacity: {
        duration: 0.25,
        ease: [0.4, 0.0, 1, 1] as [number, number, number, number]
      }
    }
  }
};

// Celebration bounce animation for correct answers - Duolingo-style sequential jump
const celebrationContainerVariants = {
  idle: {},
  celebrate: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.08
    }
  }
};

const celebrationBounceVariants = {
  idle: {
    y: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1
  },
  celebrate: {
    y: [0, -32, -35, 0, -10, 0],
    scaleX: [1, 0.94, 0.96, 1.06, 0.98, 1],
    scaleY: [1, 1.08, 1.04, 0.92, 1.02, 1],
    // Use keyframe array to prevent interpolation flicker on last/single tile
    opacity: [1, 1, 1, 1, 1, 1],
    transition: {
      duration: 1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      times: [0, 0.25, 0.35, 0.6, 0.8, 1]
    }
  }
};

// Tile styles shared between active and blank tiles
const tileBaseStyles =
  'relative flex items-center justify-center rounded-3xl px-6 sm:px-8 py-3 border-b-10 transition-all duration-150';

interface TileProps {
  id: string;
  char: string;
  onClick: () => void;
  isDisabled?: boolean;
  isJapanese?: boolean;
  variants?: Variants;
  motionStyle?: MotionStyle;
}

// Active tile - uses layoutId for smooth position animations
const ActiveTile = memo(
  ({
    id,
    char,
    onClick,
    isDisabled,
    isJapanese,
    variants,
    motionStyle
  }: TileProps) => {
    return (
      <motion.button
        layoutId={id}
        layout='position'
        type='button'
        onClick={onClick}
        disabled={isDisabled}
        variants={variants}
        className={clsx(
          tileBaseStyles,
          'cursor-pointer transition-colors',
          'active:mb-[10px] active:translate-y-[10px] active:border-b-0',
          'border-[var(--secondary-color-accent)] bg-[var(--secondary-color)] text-[var(--background-color)]',
          isDisabled && 'cursor-not-allowed opacity-50',
          // Larger font for Japanese tiles, smaller for meaning tiles
          isJapanese ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
        )}
        transition={springConfig}
        lang={isJapanese ? 'ja' : undefined}
        style={motionStyle}
      >
        {char}
      </motion.button>
    );
  }
);

ActiveTile.displayName = 'ActiveTile';

// Blank placeholder - no layoutId, just takes up space
const BlankTile = memo(
  ({ char, isJapanese }: { char: string; isJapanese?: boolean }) => {
    return (
      <div
        className={clsx(
          tileBaseStyles,
          'border-transparent bg-[var(--border-color)]/30',
          'select-none',
          isJapanese ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
        )}
      >
        <span className='opacity-0'>{char}</span>
      </div>
    );
  }
);

BlankTile.displayName = 'BlankTile';

// Bottom bar states
type BottomBarState = 'check' | 'correct' | 'wrong';

interface VocabWordBuildingGameProps {
  selectedWordObjs: IVocabObj[];
  isHidden: boolean;
  /** Optional: externally controlled reverse mode. If not provided, uses internal useSmartReverseMode */
  isReverse?: boolean;
  /** Optional: number of distractor tiles. Defaults to 3 (so 4 total options) */
  distractorCount?: number;
  /** Optional: callback when answer is correct */
  onCorrect?: (chars: string[]) => void;
  /** Optional: callback when answer is wrong */
  onWrong?: () => void;
}

const VocabWordBuildingGame = ({
  selectedWordObjs,
  isHidden,
  isReverse: externalIsReverse,
  distractorCount: externalDistractorCount = 3,
  onCorrect: externalOnCorrect,
  onWrong: externalOnWrong
}: VocabWordBuildingGameProps) => {
  // Smart reverse mode - used when not controlled externally
  const {
    isReverse: internalIsReverse,
    decideNextMode: decideNextReverseMode,
    recordWrongAnswer: recordReverseModeWrong
  } = useSmartReverseMode();

  // Use external isReverse if provided, otherwise use internal smart mode
  const isReverse = externalIsReverse ?? internalIsReverse;
  const distractorCount = Math.min(
    externalDistractorCount,
    selectedWordObjs.length - 1
  );

  // Get the current vocabulary collection from the Vocab store
  const selectedVocabCollection = useVocabStore(
    state => state.selectedVocabCollection
  );

  // Answer timing for speed achievements
  const speedStopwatch = useStopwatch({ autoStart: false });
  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { playClick } = useClick();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    score,
    setScore,
    incrementVocabularyCorrect,
    incrementWrongStreak,
    resetWrongStreak,
    recordAnswerTime,
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    incrementCharacterScore,
    addCorrectAnswerTime
  } = useStatsStore(
    useShallow(state => ({
      score: state.score,
      setScore: state.setScore,
      incrementVocabularyCorrect: state.incrementVocabularyCorrect,
      incrementWrongStreak: state.incrementWrongStreak,
      resetWrongStreak: state.resetWrongStreak,
      recordAnswerTime: state.recordAnswerTime,
      incrementCorrectAnswers: state.incrementCorrectAnswers,
      incrementWrongAnswers: state.incrementWrongAnswers,
      addCharacterToHistory: state.addCharacterToHistory,
      incrementCharacterScore: state.incrementCharacterScore,
      addCorrectAnswerTime: state.addCorrectAnswerTime
    }))
  );

  // Create Map for O(1) lookups
  const wordObjMap = useMemo(
    () => new Map(selectedWordObjs.map(obj => [obj.word, obj])),
    [selectedWordObjs]
  );

  const [bottomBarState, setBottomBarState] = useState<BottomBarState>('check');

  // Generate question: 1 word with multiple answer options
  const generateQuestion = useCallback(() => {
    if (selectedWordObjs.length === 0) {
      return { word: '', correctAnswer: '', allTiles: [] };
    }

    // Select a word using adaptive selection
    const words = selectedWordObjs.map(obj => obj.word);
    const selectedWord = adaptiveSelector.selectWeightedCharacter(words);
    adaptiveSelector.markCharacterSeen(selectedWord);

    const selectedWordObj = wordObjMap.get(selectedWord);
    if (!selectedWordObj) {
      return { word: '', correctAnswer: '', allTiles: [] };
    }

    // In normal mode: show word, answer with meaning
    // In reverse mode: show meaning, answer with word
    const correctAnswer = isReverse
      ? selectedWord
      : selectedWordObj.meanings[0];

    // Generate distractors
    const distractorSource = isReverse
      ? selectedWordObjs
          .filter(obj => obj.word !== selectedWord)
          .map(obj => obj.word)
      : selectedWordObjs
          .filter(obj => obj.word !== selectedWord)
          .map(obj => obj.meanings[0]);

    const distractors = distractorSource
      .sort(() => random.real(0, 1) - 0.5)
      .slice(0, distractorCount);

    // Shuffle all tiles
    const allTiles = [correctAnswer, ...distractors].sort(
      () => random.real(0, 1) - 0.5
    );

    return {
      word: selectedWord,
      correctAnswer,
      allTiles,
      displayChar: isReverse ? selectedWordObj.meanings[0] : selectedWord
    };
  }, [isReverse, selectedWordObjs, distractorCount, wordObjMap]);

  const [questionData, setQuestionData] = useState(() => generateQuestion());
  const [placedTiles, setPlacedTiles] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [displayAnswerSummary, setDisplayAnswerSummary] = useState(false);
  const [currentWordObjForSummary, setCurrentWordObjForSummary] =
    useState<IVocabObj | null>(null);
  const [feedback, setFeedback] = useState<React.ReactElement>(
    <>{'feedback ~'}</>
  );

  const resetGame = useCallback(() => {
    const newQuestion = generateQuestion();
    setQuestionData(newQuestion);
    setPlacedTiles([]);
    setIsChecking(false);
    setIsCelebrating(false);
    setBottomBarState('check');
    setDisplayAnswerSummary(false);
    // Start timing for the new question
    speedStopwatch.reset();
    speedStopwatch.start();
  }, [generateQuestion]);

  useEffect(() => {
    resetGame();
  }, [isReverse, resetGame]);

  // Pause stopwatch when game is hidden
  useEffect(() => {
    if (isHidden) {
      speedStopwatch.pause();
    }
  }, [isHidden]);

  // Keyboard shortcut for Enter/Space to trigger button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Enter' ||
        event.code === 'Space' ||
        event.key === ' '
      ) {
        buttonRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Check button
  const handleCheck = useCallback(() => {
    if (placedTiles.length === 0) return;

    // Stop timing and record answer time
    speedStopwatch.pause();
    const answerTimeMs = speedStopwatch.totalMilliseconds;

    playClick();
    setIsChecking(true);

    // Correct if exactly one tile placed and it matches the correct answer
    const isCorrect =
      placedTiles.length === 1 && placedTiles[0] === questionData.correctAnswer;

    // Get the selected word object for correct answer handling
    const selectedWordObj = wordObjMap.get(questionData.word);

    if (isCorrect) {
      // Record answer time for speed achievements
      addCorrectAnswerTime(answerTimeMs / 1000);
      recordAnswerTime(answerTimeMs);
      speedStopwatch.reset();

      playCorrect();
      triggerCrazyMode();
      resetWrongStreak();

      // Track stats for the word
      addCharacterToHistory(questionData.word);
      incrementCharacterScore(questionData.word, 'correct');
      adaptiveSelector.updateCharacterWeight(questionData.word, true);
      incrementVocabularyCorrect();

      incrementCorrectAnswers();
      setScore(score + 1);
      setBottomBarState('correct');
      setIsCelebrating(true);
      setDisplayAnswerSummary(true);
      // Store the current word object for summary display
      setCurrentWordObjForSummary(selectedWordObj || null);
      // Set feedback for the summary
      const displayText = isReverse
        ? selectedWordObj?.meanings[0]
        : questionData.word;
      setFeedback(
        <>
          <span className='text-[var(--secondary-color)]'>{`${displayText} = ${questionData.correctAnswer} `}</span>
          <CircleCheck className='inline text-[var(--main-color)]' />
        </>
      );

      // Advance smart reverse mode if not externally controlled
      if (externalIsReverse === undefined) {
        decideNextReverseMode();
      }
    } else {
      speedStopwatch.reset();
      playErrorTwice();
      triggerCrazyMode();
      incrementWrongStreak();
      incrementWrongAnswers();

      incrementCharacterScore(questionData.word, 'wrong');
      adaptiveSelector.updateCharacterWeight(questionData.word, false);

      if (score - 1 >= 0) {
        setScore(score - 1);
      }

      setBottomBarState('wrong');

      // Reset smart reverse mode streak if not externally controlled
      if (externalIsReverse === undefined) {
        recordReverseModeWrong();
      }

      externalOnWrong?.();
    }
  }, [
    placedTiles,
    questionData,
    playClick,
    playCorrect,
    playErrorTwice,
    triggerCrazyMode,
    resetWrongStreak,
    incrementWrongStreak,
    addCharacterToHistory,
    incrementCharacterScore,
    incrementVocabularyCorrect,
    incrementCorrectAnswers,
    incrementWrongAnswers,
    score,
    setScore,
    externalOnWrong,
    externalIsReverse,
    decideNextReverseMode,
    recordReverseModeWrong,
    addCorrectAnswerTime,
    recordAnswerTime,
    wordObjMap,
    isReverse
  ]);

  // Handle Continue button (only for correct answers)
  const handleContinue = useCallback(() => {
    playClick();
    setDisplayAnswerSummary(false);
    externalOnCorrect?.([questionData.word]);
    resetGame();
  }, [playClick, externalOnCorrect, questionData.word, resetGame]);

  // Handle Try Again button (for wrong answers)
  const handleTryAgain = useCallback(() => {
    playClick();
    setPlacedTiles([]);
    setIsChecking(false);
    setBottomBarState('check');
    speedStopwatch.reset();
    speedStopwatch.start();
  }, [playClick]);

  // Handle tile click - add or remove from placed tiles
  const handleTileClick = useCallback(
    (char: string) => {
      if (isChecking && bottomBarState !== 'wrong') return;

      playClick();

      // If in wrong state, reset to check state and continue with normal tile logic
      if (bottomBarState === 'wrong') {
        setIsChecking(false);
        setBottomBarState('check');
        speedStopwatch.reset();
        speedStopwatch.start();
      }

      // Toggle tile in placed tiles array
      if (placedTiles.includes(char)) {
        setPlacedTiles(prev => prev.filter(c => c !== char));
      } else {
        setPlacedTiles(prev => [...prev, char]);
      }
    },
    [isChecking, bottomBarState, placedTiles, playClick]
  );

  // Not enough words
  if (selectedWordObjs.length < 2 || !questionData.word) {
    return null;
  }

  const canCheck = placedTiles.length > 0 && !isChecking;
  const showContinue = bottomBarState === 'correct';
  const showTryAgain = bottomBarState === 'wrong';

  // Get the current word object for display
  const currentWordObj = wordObjMap.get(questionData.word);

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center gap-6 sm:w-4/5 sm:gap-10',
        isHidden && 'hidden'
      )}
    >
      <AnimatePresence mode='wait'>
        {/* Answer Summary - displayed after correct answer */}
        {displayAnswerSummary && currentWordObjForSummary && (
          <AnswerSummary
            payload={currentWordObjForSummary}
            setDisplayAnswerSummary={setDisplayAnswerSummary}
            feedback={feedback}
            isEmbedded={true}
          />
        )}

        {/* Game Content - Question, Answer Row, and Tiles */}
        {!displayAnswerSummary && (
          <motion.div
            key='game-content'
            variants={gameContentVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            className='flex w-full flex-col items-center gap-6 sm:gap-10'
          >
            {/* Question Display - shows word in normal mode, meaning in reverse mode */}
            <div className='flex flex-row items-center gap-1'>
              <motion.div
                className='flex flex-row items-center gap-2'
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                key={questionData.word}
              >
                <span
                  className={clsx(
                    isReverse ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-8xl'
                  )}
                  lang={!isReverse ? 'ja' : undefined}
                >
                  {!isReverse ? (
                    <FuriganaText
                      text={questionData.word}
                      reading={currentWordObj?.reading}
                    />
                  ) : (
                    currentWordObj?.meanings[0]
                  )}
                </span>
                {!isReverse && (
                  <SSRAudioButton
                    text={questionData.word}
                    variant='icon-only'
                    size='sm'
                    className='bg-[var(--card-color)] text-[var(--secondary-color)]'
                  />
                )}
              </motion.div>
            </div>

            {/* Answer Row Area - shows placed tiles */}
            <div className='flex w-full flex-col items-center'>
              <div
                className={clsx(
                  'flex w-full items-center border-b-2 border-[var(--border-color)] px-2 pb-2 md:w-3/4 lg:w-2/3 xl:w-1/2',
                  // Use taller min-height when in reverse mode (Japanese tiles have larger font size)
                  isReverse ? 'min-h-[5.5rem]' : 'min-h-[5rem]'
                )}
              >
                <motion.div
                  className='flex flex-row flex-wrap justify-start gap-3'
                  variants={celebrationContainerVariants}
                  initial='idle'
                  animate={isCelebrating ? 'celebrate' : 'idle'}
                >
                  {/* Render placed tiles in the answer row */}
                  {placedTiles.map(char => (
                    <ActiveTile
                      key={`answer-tile-${char}`}
                      id={`tile-${char}`}
                      char={char}
                      onClick={() => handleTileClick(char)}
                      isDisabled={isChecking && bottomBarState !== 'wrong'}
                      isJapanese={isReverse}
                      variants={celebrationBounceVariants}
                      motionStyle={{ transformOrigin: '50% 100%' }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Available Tiles - 2 rows */}
            {(() => {
              const tilesPerRow = 2;
              const topRowTiles = questionData.allTiles.slice(0, tilesPerRow);
              const bottomRowTiles = questionData.allTiles.slice(tilesPerRow);

              const renderTile = (char: string) => {
                const isPlaced = placedTiles.includes(char);
                const isJapaneseTile = isReverse;

                return (
                  <motion.div
                    key={`tile-slot-${char}`}
                    className='relative'
                    variants={tileEntryVariants}
                    style={{ perspective: 1000 }}
                  >
                    {/* Blank tile underneath */}
                    <BlankTile char={char} isJapanese={isJapaneseTile} />

                    {/* Active tile on top when NOT placed */}
                    {!isPlaced && (
                      <div className='absolute inset-0 z-10'>
                        <ActiveTile
                          id={`tile-${char}`}
                          char={char}
                          onClick={() => handleTileClick(char)}
                          isDisabled={isChecking && bottomBarState !== 'wrong'}
                          isJapanese={isJapaneseTile}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              };

              return (
                <motion.div
                  key={questionData.word}
                  className='flex flex-col items-center gap-3 sm:gap-4'
                  variants={tileContainerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  <motion.div className='flex flex-row justify-center gap-3 sm:gap-4'>
                    {topRowTiles.map(char => renderTile(char))}
                  </motion.div>
                  {bottomRowTiles.length > 0 && (
                    <motion.div className='flex flex-row justify-center gap-3 sm:gap-4'>
                      {bottomRowTiles.map(char => renderTile(char))}
                    </motion.div>
                  )}
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <Stars />

      <GameBottomBar
        state={bottomBarState}
        onAction={
          showContinue
            ? handleContinue
            : showTryAgain
              ? handleTryAgain
              : handleCheck
        }
        canCheck={canCheck}
        feedbackContent={questionData.correctAnswer}
        buttonRef={buttonRef}
      />

      {/* Spacer */}
      <div className='h-32' />
    </div>
  );
};

export default VocabWordBuildingGame;
