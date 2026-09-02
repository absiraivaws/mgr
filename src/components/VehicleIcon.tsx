import React from 'react';
import { Bike, Navigation, Zap, Car, ShieldAlert, Disc } from 'lucide-react';
import { VehicleIconType } from '../types';

interface VehicleIconProps {
  type: VehicleIconType | string;
  className?: string;
}

export const VehicleIcon: React.FC<VehicleIconProps> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'bicycle':
      return <Bike className={className} />;
    case 'motorcycle':
      return <Navigation className={className} />;
    case 'electric-bike':
    case 'scooter':
      return <Zap className={className} />;
    case 'quad':
      return <Car className={className} />;
    default:
      return <Disc className={className} />;
  }
};
