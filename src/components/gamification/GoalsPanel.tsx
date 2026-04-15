'use client';

import { useState } from 'react';
import { WeeklyGoal } from '@/types';

interface GoalsPanelProps {
  currentGoal?: WeeklyGoal;
  currentWeekCO2: number;
  lastWeekCO2: number;
  onSetGoal: (targetReduction: number) => Promise<void>;
  className?: string;
}

interface GoalCardProps {
  title: string;
  description: string;
  targetReduction: number;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}

function GoalCard({
  title,
  description,
  targetReduction,
  difficulty,
  icon,
  isSelected,
  onClick,
}: GoalCardProps) {
  const difficultyColors = {
    easy: 'border-green-300 bg-green-50',
    medium: 'border-yellow-300 bg-yellow-50',
    hard: 'border-red-300 bg-red-50',
  };

  const selectedStyle = 'border-blue-500 bg-blue-50 ring-2 ring-blue-200';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
        isSelected ? selectedStyle : difficultyColors[difficulty]
      }`}
    >
      <div className="mb-2 flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              difficulty === 'easy'
                ? 'bg-green-200 text-green-800'
                : difficulty === 'medium'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-red-200 text-red-800'
            }`}
          >
            {difficulty.toUpperCase()}
          </span>
        </div>
      </div>
      <p className="mb-2 text-sm text-gray-600">{description}</p>
      <div className="text-lg font-bold text-gray-900">
        {targetReduction}% reduction
      </div>
    </div>
  );
}

export default function GoalsPanel({
  currentGoal,
  currentWeekCO2,
  lastWeekCO2,
  onSetGoal,
  className = '',
}: GoalsPanelProps) {
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const predefinedGoals = [
    {
      title: 'Eco Starter',
      description: 'Perfect for beginners looking to make their first impact',
      targetReduction: 10,
      difficulty: 'easy' as const,
      icon: 'ðŸŒ±',
    },
    {
      title: 'Green Guardian',
      description: 'Take a meaningful step towards sustainability',
      targetReduction: 25,
      difficulty: 'medium' as const,
      icon: 'ðŸŒ¿',
    },
    {
      title: 'Climate Champion',
      description: 'Ambitious goal for serious environmental advocates',
      targetReduction: 50,
      difficulty: 'hard' as const,
      icon: 'ðŸ†',
    },
  ];

  const currentProgress =
    currentGoal && lastWeekCO2 > 0
      ? Math.max(0, ((lastWeekCO2 - currentWeekCO2) / lastWeekCO2) * 100)
      : 0;

  const isGoalAchieved =
    !!currentGoal && currentProgress >= currentGoal.targetReduction;

  const handleSetGoal = async () => {
    const targetReduction = selectedGoal || parseInt(customGoal, 10);
    if (!targetReduction || targetReduction <= 0 || targetReduction > 100) {
      return;
    }

    setIsLoading(true);
    try {
      await onSetGoal(targetReduction);
      setSelectedGoal(null);
      setCustomGoal('');
    } catch (error) {
      console.error('Failed to set goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMotivationalMessage = () => {
    if (!currentGoal) return 'Set your first weekly goal to start your journey!';

    if (isGoalAchieved) {
      return "ðŸŽ‰ Congratulations! You've achieved your weekly goal!";
    }
    if (currentProgress >= currentGoal.targetReduction * 0.75) {
      return "ðŸ”¥ You're so close! Keep pushing towards your goal!";
    }
    if (currentProgress >= currentGoal.targetReduction * 0.5) {
      return "ðŸ’ª Great progress! You're halfway to your goal!";
    }
    if (currentProgress > 0) {
      return 'ðŸŒ± Good start! Every step counts towards your goal!';
    }
    return 'âš¡ It is time to take action! You can do this!';
  };

  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-6 ${className}`}
    >
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          ðŸŽ¯ Weekly Goals
        </h2>
        <p className="text-gray-600">{getMotivationalMessage()}</p>
      </div>

      {!currentGoal && (
        <div className="mb-6 rounded-lg bg-white p-6 text-center">
          <div className="mb-3 text-5xl">ðŸŽ¯</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Set your first carbon reduction goal!
          </h3>
          <p className="text-sm text-gray-600">
            Choose a weekly target below to start your journey towards a lower
            carbon footprint
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">
          {currentGoal ? 'Set New Weekly Goal' : 'Choose Your Weekly Goal'}
        </h3>

        <div className="grid gap-3 md:grid-cols-3">
          {predefinedGoals.map((goal) => (
            <GoalCard
              key={goal.targetReduction}
              {...goal}
              isSelected={selectedGoal === goal.targetReduction}
              onClick={() => {
                setSelectedGoal(goal.targetReduction);
                setCustomGoal('');
              }}
            />
          ))}
        </div>

        <div className="rounded-lg bg-white p-4">
          <div className="mb-2 flex items-center space-x-3">
            <span className="text-2xl">âš™ï¸</span>
            <h4 className="font-semibold text-gray-900">Custom Goal</h4>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="100"
              value={customGoal}
              onChange={(e) => {
                setCustomGoal(e.target.value);
                setSelectedGoal(null);
              }}
              placeholder="Enter percentage"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-600">% reduction</span>
          </div>
        </div>

        <button
          onClick={handleSetGoal}
          disabled={(!selectedGoal && !customGoal) || isLoading}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Setting Goal...</span>
            </div>
          ) : currentGoal ? (
            'Update Goal'
          ) : (
            'Set Goal'
          )}
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-white p-4">
        <h4 className="mb-2 font-semibold text-gray-900">ðŸ’¡ Tips for Success</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>â€¢ Start with small, achievable goals and gradually increase</li>
          <li>â€¢ Focus on one activity type at a time for better results</li>
          <li>â€¢ Use the tips section to find specific reduction strategies</li>
          <li>â€¢ Track your progress daily to stay motivated</li>
        </ul>
      </div>
    </div>
  );
}
