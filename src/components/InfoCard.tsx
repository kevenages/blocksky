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
          <strong>BlockSky.app</strong> is a streamlined tool for managing your Bluesky experience, allowing you to mass block an account's followers or the accounts they follow. Take control of your social space and create a safer, more personalized environment.
        </p>
        <p className="text-gray-600 mt-4">
          <strong>To get started</strong>, type the handle of the account whose followers or following you want to block (not your own!) in the search bar.
        </p>
      </CardContent>
    </Card>
  );
}