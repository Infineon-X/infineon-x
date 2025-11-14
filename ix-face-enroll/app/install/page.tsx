"use client";

import { Download, Smartphone, Share2, Plus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function InstallPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <main className="flex w-full max-w-4xl flex-col gap-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 mb-2">
            Install IX Face Enroll
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Add this app to your home screen for quick access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* iOS Instructions */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                iOS (iPhone/iPad)
              </h2>
            </div>
            <ol className="space-y-4 text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </span>
                <span>
                  Open this website in <strong>Safari</strong> (not Chrome or other browsers)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  2
                </span>
                <span>
                  Tap the <strong>Share</strong> button{" "}
                  <Share2 className="w-4 h-4 inline-block" /> at the bottom of the screen
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  3
                </span>
                <span>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>{" "}
                  <Plus className="w-4 h-4 inline-block" />
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  4
                </span>
                <span>
                  Tap <strong>"Add"</strong> in the top right corner
                </span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> The app will appear on your home screen and can be opened like a native app.
              </p>
            </div>
          </div>

          {/* Android Instructions */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Android
              </h2>
            </div>
            <ol className="space-y-4 text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </span>
                <span>
                  Open this website in <strong>Chrome</strong> browser
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                  2
                </span>
                <span>
                  Tap the <strong>menu</strong> button (three dots) in the top right corner
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                  3
                </span>
                <span>
                  Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>{" "}
                  <Download className="w-4 h-4 inline-block" />
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                  4
                </span>
                <span>
                  Tap <strong>"Install"</strong> in the popup dialog
                </span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Note:</strong> Some Android browsers may show an install banner automatically. You can also find the option in the browser menu.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
            Benefits of Installing
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-black dark:text-zinc-50">Quick Access</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Launch the app directly from your home screen
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-black dark:text-zinc-50">Works Offline</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Some features work without an internet connection
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-black dark:text-zinc-50">Native Feel</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Runs like a native app without browser UI
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-black dark:text-zinc-50">No App Store</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Install directly without downloading from stores
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to App Link */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <span>←</span>
            Back to App
          </Link>
        </div>
      </main>
    </div>
  );
}

