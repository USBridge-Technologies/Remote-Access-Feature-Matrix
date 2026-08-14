import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

export function Tooltip({ text, children }) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, arrowOffset: 0 });
  const tooltipId = useId();

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const idealLeft = rect.left + rect.width / 2;
      let left = idealLeft;
      let arrowOffset = 0;
      
      const margin = 10;
      const halfWidth = 125; // max-width is 250px

      if (left < halfWidth + margin) {
        left = halfWidth + margin;
        arrowOffset = idealLeft - left;
      } else if (left > window.innerWidth - halfWidth - margin) {
        left = window.innerWidth - halfWidth - margin;
        arrowOffset = idealLeft - left;
      }

      setCoords({
        left,
        top: rect.top,
        arrowOffset
      });
    }
  }, [isVisible]);

  if (!text) return <>{children}</>;

  return (
    <>
      <div 
        ref={triggerRef}
        className="tooltip-container"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        aria-describedby={tooltipId}
      >
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(
        <div 
          id={tooltipId}
          className={`tooltip-box ${isVisible ? 'visible' : ''}`} 
          style={{ 
            left: coords.left, 
            top: coords.top,
            '--arrow-offset': `${coords.arrowOffset}px`
          }}
          role="tooltip"
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
