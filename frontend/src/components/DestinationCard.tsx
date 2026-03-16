import React from 'react';

interface Destination {
  _id: string;
  title: string;
  country: string;
  budget: string;
  tags: string[];
  description: string;
  imageUrl: string;
  bestMonths: number[];
}

interface DestinationCardProps {
  destination: Destination;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DestinationCard: React.FC<DestinationCardProps> = ({ 
  destination, 
  onToggleFavorite,
  isFavorite = false 
}) => {
  return (
    <div className="card">
      <img 
        src={destination.imageUrl} 
        alt={destination.title}
        style={{
          width: '100%',
          height: '200px',
          objectFit: 'cover',
          borderRadius: '12px',
          marginBottom: '16px'
        }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px' }}>{destination.title}</h3>
          <p className="muted" style={{ fontSize: '14px', margin: '4px 0' }}>{destination.country}</p>
        </div>
        
        {onToggleFavorite && (
          <button 
            onClick={() => onToggleFavorite(destination._id)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              padding: '4px',
            }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      <p style={{ fontSize: '14px', color: '#d7def5', marginBottom: '12px', lineHeight: '1.6' }}>
        {destination.description}
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {destination.tags.map((tag, index) => (
          <span 
            key={index}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(122,167,255,0.12)',
              border: '1px solid rgba(122,167,255,0.25)',
              fontSize: '12px',
              color: '#cfe0ff'
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
        <span className="muted">
          Budget: <strong style={{color: '#e6ebff'}}>{destination.budget}</strong>
        </span>
        <span className="muted">
          Best: {destination.bestMonths.slice(0, 3).map(m => monthNames[m]).join(', ')}
          {destination.bestMonths.length > 3 && '...'}
        </span>
      </div>
    </div>
  );
};

export default DestinationCard;
