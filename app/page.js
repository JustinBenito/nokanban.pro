'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const generateRandomAlias = () => {
    const adjectives = ['swift', 'bright', 'clever', 'quick', 'smart', 'bold', 'cool', 'fresh', 'sharp', 'keen'];
    const nouns = ['panda', 'tiger', 'eagle', 'shark', 'wolf', 'falcon', 'lion', 'bear', 'fox', 'hawk'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj}${randomNoun}`;
  };

  useEffect(() => {
    // Redirect to a random alias board on initial load
    const randomAlias = generateRandomAlias();
    router.push(`/${randomAlias}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your kanban board...</p>
      </div>
    </div>
  );
}