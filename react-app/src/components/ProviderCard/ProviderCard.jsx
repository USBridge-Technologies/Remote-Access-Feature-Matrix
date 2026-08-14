import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Globe, Edit2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import './ProviderCard.css';

export function ProviderCard({ provider, onClose, onEdit, onHide }) {
  const isMobile = useIsMobile();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [images, setImages] = useState([]);

  // Reset index and load images when provider changes
  useEffect(() => {
    if (!provider) return;
    
    setCurrentImgIndex(0);
    const typeFolder = provider.type === 'software' ? 'soft' : 'kvm';
    const firstImg = `asset/${typeFolder}/${provider.key}/1.png`;
    setImages([firstImg]); // Show first image immediately

    const loadImages = async () => {
      const validImages = [firstImg];
      
      for (let i = 2; i <= 10; i++) {
        const imgPath = `asset/${typeFolder}/${provider.key}/${i}.png`;
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}${imgPath}`, { method: 'HEAD' });
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('image')) {
            validImages.push(imgPath);
          } else {
            break; // Stop at first missing image
          }
        } catch (e) {
          break;
        }
      }
      // If we didn't find any more images, we don't need to update state
      // unless we want to trigger a re-render. We update it anyway.
      setImages(validImages);
    };

    loadImages();
  }, [provider]);

  if (!provider) return null;

  const handlePrevImg = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImg = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="provider-modal-overlay" onClick={onClose}>
      <div className="provider-card" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="provider-card-header">
          <div className="provider-card-logo-container">
            {provider.key === 'draft' ? (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#4caf50', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', borderRadius: '50%' }}>
                {provider.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <img 
                src={provider.icon} 
                alt={provider.name} 
                className="provider-card-logo" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>
          <h2 className="provider-card-title">{provider.name}</h2>
        </div>

        {provider.description && (
          <p className="provider-card-description">{provider.description}</p>
        )}

        {isMobile && (
          <div className="provider-card-mobile-actions">
            <button className="btn-mobile-edit" onClick={() => onEdit(provider.key)}>
              <Edit2 size={16} /> Edit
            </button>
            <button className="btn-mobile-hide" onClick={() => onHide(provider.key)}>
              <X size={16} /> Hide
            </button>
          </div>
        )}

        {images.length > 0 && (
          <div className="provider-carousel">
            <button className="carousel-nav left" onClick={handlePrevImg}>
              <ChevronLeft size={24} />
            </button>
            <div className="carousel-img-container">
              <img 
                src={`${import.meta.env.BASE_URL}${images[currentImgIndex]}`} 
                alt={`${provider.name} screenshot ${currentImgIndex + 1}`} 
                className="carousel-img"
                onError={(e) => {
                  if (currentImgIndex === 0 && images.length === 1) {
                    setImages([]);
                  }
                }}
              />
            </div>
            <button className="carousel-nav right" onClick={handleNextImg}>
              <ChevronRight size={24} />
            </button>

            {images.length > 1 && (
              <div className="carousel-dots">
                {images.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`carousel-dot ${idx === currentImgIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImgIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="provider-card-actions">
          {provider.website && (
            <a href={provider.website} target="_blank" rel="noopener noreferrer" className="btn-website">
              Website
            </a>
          )}
          {provider.github && (
            <a href={provider.github} target="_blank" rel="noopener noreferrer" className="btn-github">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
              </svg> GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
