import React from 'react';
import {
  Utensils,
  ShoppingBag,
  Car,
  Zap,
  Home,
  HeartPulse,
  GraduationCap,
  Film,
  TrendingUp,
  MoreHorizontal,
  LucideProps,
} from 'lucide-react';
import { CategoryId } from '../types';

interface CategoryIconProps extends LucideProps {
  categoryId: CategoryId;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, ...props }) => {
  switch (categoryId) {
    case 'food':
      return <Utensils {...props} />;
    case 'shopping':
      return <ShoppingBag {...props} />;
    case 'transport':
      return <Car {...props} />;
    case 'bills':
      return <Zap {...props} />;
    case 'housing':
      return <Home {...props} />;
    case 'health':
      return <HeartPulse {...props} />;
    case 'education':
      return <GraduationCap {...props} />;
    case 'entertainment':
      return <Film {...props} />;
    case 'investment':
      return <TrendingUp {...props} />;
    case 'other':
    default:
      return <MoreHorizontal {...props} />;
  }
};
