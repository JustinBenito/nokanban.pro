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
    // Add a random number to make it more unique
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  useEffect(() => {
    const createUniqueBoard = async () => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        const randomAlias = generateRandomAlias();
        const randomPassword = Math.random().toString(36).substring(2, 15);
        
        try {
          // Check if board exists by making a quick API call
          const response = await fetch(`/api/boards/${randomAlias}`);
          
          if (response.status === 404 || response.status === 500) {
            // Board doesn't exist, safe to use this alias
            router.push(`/${randomAlias}?pwd=${randomPassword}&new=true`);
            return;
          }
          
          // Board exists, try again
          attempts++;
        } catch (err) {
          // Network error, just use the alias anyway
          router.push(`/${randomAlias}?pwd=${randomPassword}&new=true`);
          return;
        }
      }
      
      // If all attempts failed, use timestamp to ensure uniqueness
      const timestampAlias = `board${Date.now()}`;
      const randomPassword = Math.random().toString(36).substring(2, 15);
      router.push(`/${timestampAlias}?pwd=${randomPassword}&new=true`);
    };
    
    createUniqueBoard();
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