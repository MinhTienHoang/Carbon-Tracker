'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActivityInput } from '@/types';
import { calculateCarbonFootprint, calculateEquivalents } from '@/lib/calculations/carbonFootprint';
import { ACTIVITY_LABELS, ACTIVITY_DESCRIPTIONS } from '@/constants/co2Factors';

const ACTIVITY_LIST_STORAGE_KEY = 'carbon_tracker_visible_activities';
const CUSTOM_ACTIVITY_LIST_STORAGE_KEY = 'carbon_tracker_custom_activities';
const CUSTOM_ACTIVITY_VALUES_STORAGE_KEY = 'carbon_tracker_custom_activity_values';
const ALL_FIELD_KEYS: Array<keyof ActivityInput> = [
  'emails',
  'streamingHours',
  'codingHours',
  'videoCallHours',
  'cloudStorageGB',
  'gamingHours',
  'socialMediaHours',
];

type ActivityFieldConfig = {
  key: keyof ActivityInput;
  label: string;
  description: string;
  max: number;
  step: number;
  icon: string;
};

type CustomActivityEntry = {
  id: string;
  name: string;
  unit: string;
  emissionFactor: number;
  max: number;
  step: number;
  icon: string;
};

const allFormFields: ActivityFieldConfig[] = [
  {
    key: 'emails',
    label: ACTIVITY_LABELS.emails,
    description: ACTIVITY_DESCRIPTIONS.emails,
    max: 500,
    step: 1,
    icon: '📧',
  },
  {
    key: 'streamingHours',
    label: ACTIVITY_LABELS.streaming,
    description: ACTIVITY_DESCRIPTIONS.streaming,
    max: 24,
    step: 0.5,
    icon: '📺',
  },
  {
    key: 'codingHours',
    label: ACTIVITY_LABELS.coding,
    description: ACTIVITY_DESCRIPTIONS.coding,
    max: 24,
    step: 0.5,
    icon: '💻',
  },
  {
    key: 'videoCallHours',
    label: ACTIVITY_LABELS.video_calls,
    description: ACTIVITY_DESCRIPTIONS.video_calls,
    max: 24,
    step: 0.5,
    icon: '📹',
  },
  {
    key: 'cloudStorageGB',
    label: ACTIVITY_LABELS.cloud_storage,
    description: ACTIVITY_DESCRIPTIONS.cloud_storage,
    max: 1000,
    step: 1,
    icon: '☁️',
  },
  {
    key: 'gamingHours',
    label: ACTIVITY_LABELS.gaming,
    description: ACTIVITY_DESCRIPTIONS.gaming,
    max: 24,
    step: 0.5,
    icon: '🎮',
  },
  {
    key: 'socialMediaHours',
    label: ACTIVITY_LABELS.social_media,
    description: ACTIVITY_DESCRIPTIONS.social_media,
    max: 24,
    step: 0.5,
    icon: '📱',
  },
];

interface ActivityFormProps {
  onSubmit: (
    activities: ActivityInput,
    result: {
      totalCO2: number;
      breakdown: Record<string, number>;
      equivalents: Array<{ description: string; value: number; unit: string }>;
    },
    customToastMessage?: string
  ) => void;
  initialValues?: Partial<ActivityInput>;
}

export default function ActivityForm({ onSubmit, initialValues }: ActivityFormProps) {
  const [activities, setActivities] = useState<ActivityInput>({
    emails: initialValues?.emails || 0,
    streamingHours: initialValues?.streamingHours || 0,
    codingHours: initialValues?.codingHours || 0,
    videoCallHours: initialValues?.videoCallHours || 0,
    cloudStorageGB: initialValues?.cloudStorageGB || 0,
    gamingHours: initialValues?.gamingHours || 0,
    socialMediaHours: initialValues?.socialMediaHours || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<Array<keyof ActivityInput>>(ALL_FIELD_KEYS);
  const [selectedFieldToAdd, setSelectedFieldToAdd] = useState<keyof ActivityInput | ''>('');
  const [customActivities, setCustomActivities] = useState<CustomActivityEntry[]>([]);
  const [customActivityValues, setCustomActivityValues] = useState<Record<string, number>>({});
  const [customActivityName, setCustomActivityName] = useState('');
  const [customActivityUnit, setCustomActivityUnit] = useState('hrs');
  const [customActivityFactor, setCustomActivityFactor] = useState<number>(0);
  const [customActivityMax, setCustomActivityMax] = useState<number>(24);
  const [customActivityStep, setCustomActivityStep] = useState<number>(0.5);

  useEffect(() => {
    const raw = localStorage.getItem(ACTIVITY_LIST_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const validKeys = parsed.filter((key): key is keyof ActivityInput =>
        typeof key === 'string' && ALL_FIELD_KEYS.includes(key as keyof ActivityInput)
      );

      if (validKeys.length > 0) {
        setVisibleFieldKeys(validKeys);
      }
    } catch {
      // If parsing fails, keep defaults.
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(CUSTOM_ACTIVITY_LIST_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const validEntries = parsed.filter((entry): entry is CustomActivityEntry => {
        const hasNewShape =
          entry &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          typeof entry.unit === 'string' &&
          typeof entry.emissionFactor === 'number' &&
          entry.emissionFactor >= 0 &&
          typeof entry.max === 'number' &&
          entry.max > 0 &&
          typeof entry.step === 'number' &&
          entry.step > 0 &&
          typeof entry.icon === 'string';

        if (hasNewShape) {
          return true;
        }

        // Backward compatibility for old one-off custom format.
        return (
          entry &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          typeof entry.emission === 'number' &&
          entry.emission >= 0
        );
      });

      const migratedEntries = validEntries.map((entry) => {
        if ('emissionFactor' in entry) {
          return entry;
        }

        return {
          id: entry.id,
          name: entry.name,
          unit: 'units',
          emissionFactor: entry.emission,
          max: 100,
          step: 1,
          icon: '🧩',
        };
      });

      setCustomActivities(migratedEntries);
    } catch {
      // If parsing fails, keep defaults.
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(CUSTOM_ACTIVITY_VALUES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const validValues: Record<string, number> = {};

      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof value === 'number' && value >= 0) {
          validValues[key] = value;
        }
      });

      setCustomActivityValues(validValues);
    } catch {
      // If parsing fails, keep defaults.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ACTIVITY_LIST_STORAGE_KEY, JSON.stringify(visibleFieldKeys));
  }, [visibleFieldKeys]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_ACTIVITY_LIST_STORAGE_KEY, JSON.stringify(customActivities));
  }, [customActivities]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_ACTIVITY_VALUES_STORAGE_KEY, JSON.stringify(customActivityValues));
  }, [customActivityValues]);

  const formFields = useMemo(
    () => allFormFields.filter((field) => visibleFieldKeys.includes(field.key)),
    [visibleFieldKeys]
  );

  const hiddenFields = useMemo(
    () => allFormFields.filter((field) => !visibleFieldKeys.includes(field.key)),
    [visibleFieldKeys]
  );

  const customActivitiesTotal = useMemo(
    () => customActivities.reduce((sum, activity) => {
      const value = customActivityValues[activity.id] || 0;
      return sum + value * activity.emissionFactor;
    }, 0),
    [customActivities, customActivityValues]
  );

  const validateField = (field: keyof ActivityInput, value: number) => {
    if (touched[field] && value < 0) {
      if (field.includes('Hours')) {
        return 'Duration cannot be negative';
      } else if (field === 'emails' || field === 'cloudStorageGB') {
        return 'Quantity cannot be negative';
      }
    }
    return '';
  };

  const validateForm = () => {
    if (formFields.length === 0) {
      setErrors({ form: 'Please add at least one activity to track' });
      return false;
    }

    const hasActivity = formFields.some(field => activities[field.key] > 0) || customActivitiesTotal > 0;
    if (!hasActivity) {
      setErrors({ form: 'Please select at least one activity or add a custom activity' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleInputChange = (field: keyof ActivityInput, value: number) => {
    setActivities(prev => ({ ...prev, [field]: Math.max(0, value) }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: keyof ActivityInput) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, activities[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleRemoveField = (field: keyof ActivityInput) => {
    if (visibleFieldKeys.length <= 1) {
      setErrors((prev) => ({
        ...prev,
        form: 'At least one activity must remain in your list',
      }));
      return;
    }

    setVisibleFieldKeys((prev) => prev.filter((key) => key !== field));
    setActivities((prev) => ({ ...prev, [field]: 0 }));
    setTouched((prev) => ({ ...prev, [field]: false }));
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
  };

  const handleAddField = () => {
    if (!selectedFieldToAdd) {
      return;
    }

    setVisibleFieldKeys((prev) => {
      if (prev.includes(selectedFieldToAdd)) {
        return prev;
      }
      return [...prev, selectedFieldToAdd];
    });

    setErrors((prev) => ({ ...prev, form: '' }));
    setSelectedFieldToAdd('');
  };

  const handleAddCustomActivity = () => {
    const trimmedName = customActivityName.trim();

    if (!trimmedName) {
      setErrors((prev) => ({ ...prev, form: 'Custom activity name is required' }));
      return;
    }

    if (customActivityFactor <= 0) {
      setErrors((prev) => ({ ...prev, form: 'CO2 factor must be greater than 0' }));
      return;
    }

    if (!customActivityUnit.trim()) {
      setErrors((prev) => ({ ...prev, form: 'Custom activity unit is required' }));
      return;
    }

    if (customActivityMax <= 0 || customActivityStep <= 0) {
      setErrors((prev) => ({ ...prev, form: 'Max and step must be greater than 0' }));
      return;
    }

    const newEntry: CustomActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      unit: customActivityUnit.trim(),
      emissionFactor: customActivityFactor,
      max: customActivityMax,
      step: customActivityStep,
      icon: '🧩',
    };

    setCustomActivities((prev) => [...prev, newEntry]);
    setCustomActivityValues((prev) => ({ ...prev, [newEntry.id]: 0 }));
    setCustomActivityName('');
    setCustomActivityUnit('hrs');
    setCustomActivityFactor(0);
    setCustomActivityMax(24);
    setCustomActivityStep(0.5);
    setErrors((prev) => ({ ...prev, form: '' }));
  };

  const handleRemoveCustomActivity = (id: string) => {
    setCustomActivities((prev) => prev.filter((item) => item.id !== id));
    setCustomActivityValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleCustomValueChange = (id: string, value: number) => {
    setCustomActivityValues((prev) => ({ ...prev, [id]: Math.max(0, value) }));
    setErrors((prev) => ({ ...prev, form: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {};
    formFields.forEach(field => {
      allTouched[field.key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const baseResult = calculateCarbonFootprint(activities);
      const totalCO2 = baseResult.totalCO2 + customActivitiesTotal;
      
      // Add custom activities to breakdown
      const breakdown = { ...baseResult.breakdown };
      customActivities.forEach((activity) => {
        const value = customActivityValues[activity.id] || 0;
        if (value > 0) {
          breakdown[activity.name] = value * activity.emissionFactor;
        }
      });
      
      const result = {
        ...baseResult,
        breakdown,
        totalCO2,
        equivalents: calculateEquivalents(totalCO2),
      };
      onSubmit(activities, result);

      setTimeout(() => {
        setActivities({
          emails: 0,
          streamingHours: 0,
          codingHours: 0,
          videoCallHours: 0,
          cloudStorageGB: 0,
          gamingHours: 0,
          socialMediaHours: 0,
        });
        setCustomActivityValues((prev) => {
          const resetValues: Record<string, number> = {};
          customActivities.forEach((activity) => {
            resetValues[activity.id] = 0;
          });
          return { ...prev, ...resetValues };
        });
        setErrors({});
        setTouched({});
        setCustomActivityName('');
        setCustomActivityUnit('hrs');
        setCustomActivityFactor(0);
        setCustomActivityMax(24);
        setCustomActivityStep(0.5);
        setIsSubmitting(false);
      }, 500);

    } catch (error) {
      console.error('Error submitting activities:', error);
      setIsSubmitting(false);
    }
  };

  const hasActivity = formFields.some((field) => activities[field.key] > 0) || customActivitiesTotal > 0;
  return (
    <div className="max-w-4xl mx-auto p-6 ">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Track Your Daily Digital Activities
          </h2>
          <p className="text-gray-600">
            Enter your digital activities for today to calculate your carbon footprint
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Customize Activity List</h3>
                <p className="text-xs text-gray-600">Remove activities you do not track or add them back anytime.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedFieldToAdd}
                  onChange={(e) => setSelectedFieldToAdd(e.target.value as keyof ActivityInput | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Select activity to add"
                >
                  <option value="">Select activity</option>
                  {hiddenFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddField}
                  disabled={!selectedFieldToAdd}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Activity
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Add Custom Activity</h3>
              <p className="text-xs text-gray-600">Create your own activity card and adjust its value like the built-in list.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 items-center">
              <input
                type="text"
                value={customActivityName}
                onChange={(e) => setCustomActivityName(e.target.value)}
                placeholder="Activity name"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Custom activity name"
              />
              <div className="flex items-center border border-gray-300 rounded-md bg-white">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customActivityFactor}
                  onChange={(e) => setCustomActivityFactor(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  aria-label="Custom activity CO2 factor in grams"
                />
                <span className="px-2 text-xs text-gray-500 border-l border-gray-200">g/unit</span>
              </div>
              <input
                type="text"
                value={customActivityUnit}
                onChange={(e) => setCustomActivityUnit(e.target.value)}
                placeholder="Unit (e.g. hrs)"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Custom activity unit"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={customActivityMax}
                onChange={(e) => setCustomActivityMax(parseFloat(e.target.value) || 24)}
                placeholder="Max"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Custom activity max value"
              />
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={customActivityStep}
                onChange={(e) => setCustomActivityStep(parseFloat(e.target.value) || 0.5)}
                placeholder="Step"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Custom activity step"
              />
              <button
                type="button"
                onClick={handleAddCustomActivity}
                className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
              >
                Add Custom
              </button>
            </div>

            {customActivities.length > 0 && (
              <div className="space-y-2">
                {customActivities.map((item) => {
                  const value = customActivityValues[item.id] || 0;
                  const emission = value * item.emissionFactor;

                  return (
                    <div key={item.id} className="bg-white border border-emerald-100 rounded-md px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{item.icon} {item.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomActivity(item.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                          aria-label={`Remove custom activity ${item.name}`}
                        >
                          Delete
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max={item.max}
                          step={item.step}
                          value={value}
                          onChange={(e) => handleCustomValueChange(item.id, parseFloat(e.target.value) || 0)}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          aria-label={`${item.name} value`}
                        />
                        <input
                          type="number"
                          min="0"
                          max={item.max}
                          step={item.step}
                          value={value}
                          onChange={(e) => handleCustomValueChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded-md text-sm text-gray-900"
                          aria-label={`${item.name} number value`}
                        />
                        <span className="text-xs text-gray-500 min-w-fit">{item.unit}</span>
                      </div>

                      <p className="text-xs text-emerald-700 font-medium">
                        {emission.toFixed(1)} g CO2 ({item.emissionFactor.toFixed(1)} g/{item.unit})
                      </p>
                    </div>
                  );
                })}

                <p className="text-xs text-gray-700">
                  Custom activity total: <span className="font-semibold text-emerald-700">{customActivitiesTotal.toFixed(1)} g CO2</span>
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {formFields.map((field) => (
              <div key={field.key} className="space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{field.icon}</span>
                    <label className="text-lg font-medium text-gray-900">
                      {field.label}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(field.key)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                    aria-label={`Remove ${field.label}`}
                  >
                    Delete
                  </button>
                  {/* Info Icon with Tooltip */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredField(field.key)}
                    onMouseLeave={() => setHoveredField(null)}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs text-gray-500 hover:text-blue-600 cursor-help transition-colors">
                      ℹ️
                    </span>
                    {/* Tooltip */}
                    {hoveredField === field.key && (
                      <div className="absolute z-10 left-0 top-full mt-1 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                        {field.description}
                        <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500 ml-10">
                  {field.description}
                </p>

                <div className="ml-10">
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max={field.max}
                      step={field.step}
                      value={activities[field.key]}
                      onChange={(e) => handleInputChange(field.key, parseFloat(e.target.value))}
                      onBlur={() => handleBlur(field.key)}
                      className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${errors[field.key] ? 'border border-red-500' : ''
                        }`}
                      aria-invalid={!!errors[field.key]}
                      aria-describedby={`${field.key}-error ${field.key}-hint`}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={field.max}
                        step={field.step}
                        value={activities[field.key]}
                        onChange={(e) => handleInputChange(field.key, parseFloat(e.target.value) || 0)}
                        onBlur={() => handleBlur(field.key)}
                        className={`w-20 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${errors[field.key]
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-green-500'
                          }`}
                        aria-invalid={!!errors[field.key]}
                        aria-describedby={`${field.key}-error ${field.key}-hint`}
                      />
                      <span className="text-sm text-gray-500 min-w-fit">
                        {field.key.includes('Hours') ? 'hrs' :
                          field.key.includes('GB') ? 'GB' :
                            field.key === 'emails' ? 'emails' : 'units'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-green-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${(activities[field.key] / field.max) * 100}%` }}
                    ></div>
                  </div>

                  {/* Hint */}
                  <p id={`${field.key}-hint`} className="text-xs text-gray-500 mt-1">
                    {field.key.includes('Hours')
                      ? `Enter duration in hours (e.g., 2.5)`
                      : field.key === 'emails'
                        ? 'Enter number of emails sent today'
                        : field.key === 'cloudStorageGB'
                          ? 'Enter storage used in GB'
                          : 'Enter quantity'}
                  </p>

                  {/* Error message */}
                  {errors[field.key] && (
                    <p id={`${field.key}-error`} className="text-sm text-red-600 mt-1" role="alert">
                      {errors[field.key]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form error message */}
          {errors.form && (
            <div className="text-center">
              <p className="text-sm text-red-600" role="alert">
                {errors.form}
              </p>
            </div>
          )}

          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={isSubmitting || Object.values(errors).some((msg) => msg && msg.trim() !== '') || !hasActivity}
              className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>Calculate Carbon Footprint</span>
                  <span className="ml-2">🌱</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #059669;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}