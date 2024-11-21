// src/components/InfoCard.tsx

"use client";

import React from 'react';
import { SiBluesky } from "react-icons/si";
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export default function InfoCard() {
  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <div className="flex items-center">
          <SiBluesky className="text-blue-500 mr-2" size={24} />
          <CardTitle className="text-gray-800">Welcome to BlockSky</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Blocksky is a streamlined tool for managing your Bluesky experience, allowing users to <strong>mass block an account's followers</strong> and curate their social space for a safer and more personalized environment.
        </p>
      </CardContent>
    </Card>
  );
}