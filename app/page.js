'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [alias, setAlias] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (alias.trim()) {
      router.push(`/${alias.trim().toLowerCase()}`);
    }
  };

  const generateRandomAlias = () => {
    const adjectives = ['swift', 'bright', 'clever', 'quick', 'smart', 'bold', 'cool', 'fresh', 'sharp', 'keen'];
    const nouns = ['panda', 'tiger', 'eagle', 'shark', 'wolf', 'falcon', 'lion', 'bear', 'fox', 'hawk'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj}${randomNoun}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NoKn Kanban</h1>
          <p className="text-gray-600">Create your personal kanban board</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-2">
              Choose your alias
            </label>
            <input
              type="text"
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. squishypotato"
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores and hyphens are allowed"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!alias.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Create Board
            </button>
            <button
              type="button"
              onClick={() => setAlias(generateRandomAlias())}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Random
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your board will be available at:</p>
          <p className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">
            nokn.pro/{alias || 'your-alias'}
          </p>
        </div>
      </div>
    </div>
  );
}