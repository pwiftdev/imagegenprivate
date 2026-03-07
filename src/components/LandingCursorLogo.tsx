import { useState, useEffect } from 'react';

/**
 * Small logo that follows the cursor on the landing page. Pointer-events none so it doesn't block clicks.
 */
export default function LandingCursorLogo() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [visible]);

  return (
    <div
      className="fixed z-[100] pointer-events-none transition-[opacity,transform] duration-150 ease-out"
      style={{
        left: pos.x + 28,
        top: pos.y + 28,
        transform: 'translate(-50%, -50%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <img
        src="/kreatorlogo.png"
        alt=""
        className="h-8 w-auto rounded-lg shadow-lg"
        aria-hidden
      />
    </div>
  );
}
