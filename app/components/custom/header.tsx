"use client";
import { useState } from "react";
import { SiCcleaner } from "react-icons/si";
import { Button } from "../ui/button";
import Image from "next/image";
import { X } from "lucide-react";


export default function Header({ onClearAll }) {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="header flex items-center justify-between border border-primary rounded-full h-14 mt-5 px-3">
        <Image
          className="rounded-full"
          src="/assets/logo.png"
          alt="logo"
          width={200}
          height={200}
        />

        <div className="flex items-center justify-center gap-5">
          {/* Cleaner button */}
          <SiCcleaner
            className="text-primary text-2xl cursor-pointer hover:scale-110 transition"
            onClick={onClearAll}
          />

          <Button
            onClick={() => setShowTutorial(true)}
            className="rounded-full text-background font-bold"
          >
            Enter Tutorial
          </Button>
        </div>
      </div>

      {/* Overlay YouTube Preview */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative w-[90%] max-w-3xl aspect-video">
            {/* Close button */}
            <button
              onClick={() => setShowTutorial(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-7 h-7" />
            </button>

            {/* YouTube iframe */}
            <iframe
              className="w-full h-full rounded-xl"
              src="https://www.youtube.com/embed/c2M-rlkkT5o?si=lj7a4KJ4ATFy5IVg"
              title="YouTube Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
}
