import React, { type ElementType } from 'react';

interface IconProps {
  as: ElementType;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ as: IconComponent, className }) => {
  return <IconComponent className={className} />;
};

export default Icon;