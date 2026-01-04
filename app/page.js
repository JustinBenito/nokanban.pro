'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const generateRandomAlias = () => {
    const adjectives = ['swift', 'bright', 'clever', 'quick', 'smart', 'bold', 'cool', 'fresh', 'sharp', 'keen', 'wise', 'fast', 'sleek', 'agile', 'brave'];
    const nouns = ['panda', 'tiger', 'eagle', 'shark', 'wolf', 'falcon', 'lion', 'bear', 'fox', 'hawk', 'dragon', 'phoenix', 'lynx', 'jaguar', 'leopard'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  useEffect(() => {
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
