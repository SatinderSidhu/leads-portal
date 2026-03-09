"use client";

import { useRef, useEffect, useState } from "react";

interface EmailPreviewPanelProps {
  html: string;
  subject: string;
}

const DEVICES = [
  { name: "Desktop", width: 700, icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" },
  { name: "Tablet", width: 480, icon: "M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" },
  { name: "Mobile", width: 320, icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" },
];

function PreviewFrame({ html, width, name }: { html: string; width: number; name: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { margin: 0; padding: 16px; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${html || '<p style="color:#999;text-align:center;padding:40px;">No content to preview</p>'}</body>
      </html>
    `;

    doc.open();
    doc.write(wrappedHtml);
    doc.close();

    // Auto-resize iframe to content height
    const resize = () => {
      if (doc.body) {
        const newHeight = Math.max(200, doc.body.scrollHeight + 32);
        setHeight(Math.min(newHeight, 800));
      }
    };

    // Wait for content to render
    setTimeout(resize, 100);
    setTimeout(resize, 500);
  }, [html]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
        style={{ width: `${width}px`, maxWidth: "100%" }}
      >
        {/* Device chrome bar */}
        <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-500 font-medium">{name} — {width}px</span>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          title={`${name} preview`}
          className="w-full border-0"
          style={{ height: `${height}px` }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

export default function EmailPreviewPanel({ html, subject }: EmailPreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-500 dark:hover:text-teal-400 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Preview Email on All Devices
      </button>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-teal-600 dark:text-teal-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Email Preview — All Devices
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {subject && (
        <div className="bg-white dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Subject:</span> {subject}
          </p>
        </div>
      )}

      <div className="bg-gray-100 dark:bg-gray-900 p-6">
        <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
          {DEVICES.map((device) => (
            <div key={device.name} className="flex flex-col items-center gap-2 w-full xl:w-auto">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d={device.icon} />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wide">{device.name}</span>
              </div>
              <PreviewFrame html={html} width={device.width} name={device.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
