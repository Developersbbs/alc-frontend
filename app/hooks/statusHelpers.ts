// utils/statusHelpers.ts
import { UploadedImage } from '../types';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export const getStatusIcon = (status: UploadedImage["status"]) => {
  switch (status) {
    case "validating":
      return Loader;
    case "valid":
      return CheckCircle;
    case "invalid":
      return AlertCircle;
    default:
      return null;
  }
};

export const getStatusIconProps = (status: UploadedImage["status"]) => {
  const baseClasses = "w-3 h-3 sm:w-4 sm:h-4";
  
  switch (status) {
    case "validating":
      return { className: `${baseClasses} animate-spin text-yellow-400` };
    case "valid":
      return { className: `${baseClasses} text-green-400` };
    case "invalid":
      return { className: `${baseClasses} text-red-400` };
    default:
      return { className: baseClasses };
  }
};