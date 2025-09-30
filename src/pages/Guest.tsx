import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { QrCode, Camera, MessageSquare } from 'lucide-react';

export function Guest() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Guest Portal</h1>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">QR Code Scanner</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col items-center">
                <QrCode className="h-12 w-12 text-gray-400 mb-4" />
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  Scan QR Code
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Photos</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col items-center">
                <Camera className="h-12 w-12 text-gray-400 mb-4" />
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                  Upload Photo
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Comments</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col items-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}