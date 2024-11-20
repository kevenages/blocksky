// src/components/InfoCard.tsx

"use client";

import React from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

export default function InfoCard() {
  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <div className="flex items-center">
          <AiOutlineInfoCircle className="text-blue-500 mr-2" size={24} />
          <CardTitle className="text-gray-800">More Info</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Welcome to BlockSky
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Fuck them. Block them all!
        </p>
      </CardContent>
    </Card>
  );
}