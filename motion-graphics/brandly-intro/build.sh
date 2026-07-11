#!/bin/bash
# Brandly Motion Graphics Build Script
# Generated: 2026-07-11T18:23:06+01:00

set -e

echo "Building motion graphic..."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Rendering video..."
npx remotion render src/index.ts MotionGraphic out/motion-graphic.mp4 --codec h264

echo "Build complete: out/motion-graphic.mp4"
