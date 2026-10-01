import React from 'react';
import { 
  Bike, 
  Navigation, 
  Zap, 
  Car, 
  Disc, 
  Package, 
  Tag, 
  ShoppingCart, 
  Cog,
  Sparkles
} from 'lucide-react';
import { VehicleIconType } from '../types';

interface VehicleIconProps {
  type: VehicleIconType | string;
  className?: string;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ type, className = 'w-5 h-5' }) => {
  const normalized = (type || '').toLowerCase().replace(/_/g, '-');
  switch (normalized) {
    case 'bicycle':
    case 'bike':
      return <Bike className={className} />;
    case 'motorcycle':
    case 'motorbike':
      return <Navigation className={className} />;
    case 'electric-bike':
    case 'electric_bike':
    case 'ebike':
    case 'scooter':
      return <Zap className={className} />;
    case 'quad':
    case 'car':
      return <Car className={className} />;
    case 'package':
    case 'box':
      return <Package className={className} />;
    case 'tag':
    case 'sale':
      return <Tag className={className} />;
    case 'cart':
    case 'merch':
      return <ShoppingCart className={className} />;
    case 'gear':
    case 'parts':
      return <Cog className={className} />;
    default:
      return <Disc className={className} />;
  }
};
