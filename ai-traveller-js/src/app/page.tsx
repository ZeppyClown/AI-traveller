'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('Moderate ($$)');
  const [date, setDate] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!destination) return;
    setLoading(true);

    // Store in URL params or Context. URL params is easier for sharing.
    const params = new URLSearchParams({
      destination,
      days: days.toString(),
      budget,
      date,
      preferences
    });

    router.push(`/travel?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">

        {/* Left Column: Input Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              AI Travel Planner ✈️
            </h1>
            <p className="text-lg text-gray-600">
              Plan your perfect trip with AI-powered itinerary generation tailored just for you.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl space-y-4 border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Paris, France"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option>Budget ($)</option>
                  <option>Moderate ($$)</option>
                  <option>Luxury ($$$)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferences</label>
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Museums, food, hiking..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
              />
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !destination}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-xl">◌</span> Planning...
                </>
              ) : (
                '🚀 Start Planning'
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Features/Visual */}
        <div className="hidden md:block space-y-8">
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span>✨</span> Why use AI Planner?
            </h3>
            <ul className="space-y-4">
              {[
                { icon: '🗺️', title: 'Interactive Maps', desc: 'Visualize your trip with detailed markers' },
                { icon: '🤖', title: 'AI Curated', desc: 'Personalized schedules based on your taste' },
                { icon: '🌤️', title: 'Weather Smart', desc: 'Adapts activities to the forecast' },
                { icon: '💰', title: 'Budget Aware', desc: 'Keeps track of estimated costs' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </main>
  );
}
