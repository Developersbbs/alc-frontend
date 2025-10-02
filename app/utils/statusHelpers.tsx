import { UploadedImage } from "../types";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

export const getStatusIcon = (status: UploadedImage["status"]) => {
  const baseClasses = "w-3 h-3 sm:w-4 sm:h-4";

  switch (status) {
    case "validating":
      return <Loader className={`${baseClasses} animate-spin text-yellow-400`} />;
    case "valid":
      return <CheckCircle className={`${baseClasses} text-green-400`} />;
    case "invalid":
      return <AlertCircle className={`${baseClasses} text-red-400`} />;
    default:
      return null;
  }
};
