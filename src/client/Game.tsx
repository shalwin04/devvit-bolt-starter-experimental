import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OracleCharacter } from './components/OracleCharacter';
import { FlyComponent } from './components/FlyComponent';
import { ProphecyDisplay } from './components/ProphecyDisplay';
import { GameInstructions } from './components/GameInstructions';
import { NetCursor } from './components/NetCursor';

type GameStage = 'sleeping' | 'awakening' | 'fly-hunting' | 'fly-caught' | 'feeding' | 'prophecy-brewing' | 'prophecy-reveal';

interface FlyPosition {
  x: number;
  y: number;
}

export const Game: React.FC = () => {
  const [gameStage, setGameStage] = useState<GameStage>('sleeping');
  const [rubCount, setRubCount] = useState(0);
  const [flyPosition, setFlyPosition] = useState<FlyPosition>({ x: 200, y: 150 });
  const [flyCaught, setFlyCaught] = useState(false);
  const [prophecy, setProphecy] = useState('');
  const [isRubbing, setIsRubbing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showNetCursor, setShowNetCursor] = useState(false);
  const [draggedFly, setDraggedFly] = useState(false);
  const [oracleAwake, setOracleAwake] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const flyIntervalRef = useRef<NodeJS.Timeout>();

  // Move fly randomly
  useEffect(() => {
    if (gameStage === 'fly-hunting' && !flyCaught) {
      flyIntervalRef.current = setInterval(() => {
        setFlyPosition({
          x: Math.random() * 400 + 50,
          y: Math.random() * 300 + 100,
        });
      }, 2000);
    }
    return () => {
      if (flyIntervalRef.current) {
        clearInterval(flyIntervalRef.current);
      }
    };
  }, [gameStage, flyCaught]);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleEyeRub = useCallback(() => {
    if (gameStage !== 'sleeping') return;
    
    setIsRubbing(true);
    setRubCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 6) {
        setTimeout(() => {
          setGameStage('awakening');
          setOracleAwake(true);
          setTimeout(() => {
            setGameStage('fly-hunting');
            setShowNetCursor(true);
          }, 3000);
        }, 500);
      }
      return newCount;
    });
    
    setTimeout(() => setIsRubbing(false), 200);
  }, [gameStage]);

  const handleFlyCatch = useCallback(() => {
    if (gameStage !== 'fly-hunting' || flyCaught) return;
    
    setFlyCaught(true);
    setShowNetCursor(false);
    setDraggedFly(true);
    setGameStage('fly-caught');
    setMouthOpen(true);
    
    setTimeout(() => {
      setGameStage('feeding');
    }, 1000);
  }, [gameStage, flyCaught]);

  const handleFlyFeed = useCallback(async () => {
    if (gameStage !== 'feeding') return;
    
    setDraggedFly(false);
    setMouthOpen(false);
    setGameStage('prophecy-brewing');
    
    try {
      const response = await fetch('/api/prophecy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fed: 'fly',
          rubCount,
          oracleSkin: 'Classic Oracle'
        }),
      });
      
      const result = await response.json();
      
      setTimeout(() => {
        setProphecy(result.oracle || 'The prophecy is unclear... try again.');
        setGameStage('prophecy-reveal');
      }, 3000);
    } catch (error) {
      setTimeout(() => {
        setProphecy('The oracle choked on the fly. Your future remains mysterious.');
        setGameStage('prophecy-reveal');
      }, 3000);
    }
  }, [gameStage, rubCount]);

  const resetGame = useCallback(() => {
    setGameStage('sleeping');
    setRubCount(0);
    setFlyCaught(false);
    setProphecy('');
    setOracleAwake(false);
    setMouthOpen(false);
    setDraggedFly(false);
    setShowNetCursor(false);
    setFlyPosition({ x: 200, y: 150 });
  }, []);

  const getCurrentInstruction = () => {
    switch (gameStage) {
      case 'sleeping':
        return 'Rub His Eyes to Wake Him';
      case 'awakening':
        return 'The Oracle Has Awakened...';
      case 'fly-hunting':
        return 'Catch the Fly With Your Net!';
      case 'fly-caught':
        return 'The Oracle Hungers...';
      case 'feeding':
        return 'Drag the Fly Into His Mouth!';
      case 'prophecy-brewing':
        return 'Prophecy Brewing...';
      case 'prophecy-reveal':
        return 'Your Fate is Revealed!';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={gameAreaRef}
      className="relative w-full h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black overflow-hidden"
      style={{ 
        cursor: showNetCursor ? 'none' : 'default',
        fontFamily: '"Press Start 2P", monospace'
      }}
    >
      {/* CRT Static Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
      </div>

      {/* Pixel Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, #fff 1px, transparent 1px),
            linear-gradient(180deg, #fff 1px, transparent 1px)
          `,
          backgroundSize: '4px 4px'
        }}
      ></div>

      {/* Game Instructions */}
      <GameInstructions instruction={getCurrentInstruction()} />

      {/* Oracle Character */}
      <OracleCharacter
        isAwake={oracleAwake}
        isRubbing={isRubbing}
        mouthOpen={mouthOpen}
        onEyeRub={handleEyeRub}
        gameStage={gameStage}
      />

      {/* Fly Component */}
      <AnimatePresence>
        {(gameStage === 'fly-hunting' || gameStage === 'fly-caught' || gameStage === 'feeding') && !draggedFly && (
          <FlyComponent
            position={flyPosition}
            caught={flyCaught}
            onCatch={handleFlyCatch}
            onFeed={handleFlyFeed}
            gameStage={gameStage}
          />
        )}
      </AnimatePresence>

      {/* Dragged Fly */}
      <AnimatePresence>
        {draggedFly && (
          <motion.div
            className="fixed pointer-events-none z-50"
            style={{
              left: mousePosition.x - 10,
              top: mousePosition.y - 10,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, rotate: { repeat: Infinity, duration: 0.5 } }}
          >
            <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-green-300 shadow-lg">
              <div className="w-1 h-1 bg-red-500 rounded-full mx-auto mt-1"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Net Cursor */}
      {showNetCursor && <NetCursor position={mousePosition} />}

      {/* Prophecy Display */}
      <AnimatePresence>
        {gameStage === 'prophecy-brewing' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.div
                className="text-green-400 text-lg mb-4"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                [CHEWING FLY...]
              </motion.div>
              <motion.div
                className="text-yellow-400 text-lg"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
              >
                [PROPHECY BREWING...]
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prophecy Reveal */}
      <ProphecyDisplay
        prophecy={prophecy}
        visible={gameStage === 'prophecy-reveal'}
        onReset={resetGame}
      />

      {/* Debug Info */}
      <div className="absolute top-4 left-4 text-xs text-white opacity-50">
        Stage: {gameStage} | Rubs: {rubCount}
      </div>
    </div>
  );
};