"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function InstallSimulator() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [installed, setInstalled] =
    useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    if (standalone) {
      setInstalled(true);
    }

    function handleBeforeInstallPrompt(
      event: Event
    ) {
      event.preventDefault();

      setInstallPrompt(
        event as BeforeInstallPromptEvent
      );
    }

    function handleAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();

    const choice =
      await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  if (installed) {
    return (
      <div className="border rounded-xl p-4 bg-green-50">
        <div className="font-semibold">
          ✓ Portfolio Simulator installed
        </div>

        <p className="text-sm text-gray-600 mt-1">
          You can open it directly from your
          desktop or applications menu.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-gray-50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="font-semibold">
            Desktop app
          </h2>

          <p className="text-sm text-gray-600 mt-1">
            Install the Portfolio Simulator on
            your computer and open it like a
            standalone application.
          </p>
        </div>

        <button
          type="button"
          onClick={installApp}
          disabled={!installPrompt}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Install Portfolio Simulator
        </button>
      </div>

      {!installPrompt && (
        <p className="text-xs text-gray-500 mt-3">
          Installation will become available
          when your browser confirms that the
          app is installable.
        </p>
      )}
    </div>
  );
}