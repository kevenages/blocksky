// src/components/InfoCard.tsx

"use client";

import React from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export default function InfoCard() {
  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <div className="flex items-center">
          <AiOutlineInfoCircle className="text-blue-500 mr-2" size={24} />
          <CardTitle className="text-gray-800">More Info</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Detailed information about this application and its purpose.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
          scelerisque ipsum a venenatis ultricies. Sed ut erat vitae eros
          consequat sollicitudin vel eget augue. Suspendisse potenti. Nulla
          facilisi. Curabitur blandit nunc at urna finibus, et bibendum arcu
          posuere. Vestibulum auctor urna vel eros sollicitudin, nec venenatis
          erat gravida.
        </p>
      </CardContent>
    </Card>
  );
}