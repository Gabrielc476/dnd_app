// src/components/combat/CombatControls.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  Square,
  RotateCcw,
  Timer,
  Play,
  Pause,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import { Combat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CombatControlsProps {
  combat: Combat;
  onNextTurn: () => void;
  onEndCombat: () => void;
  isLoading: boolean;
}

export function CombatControls({
  combat,
  onNextTurn,
  onEndCombat,
  isLoading,
}: CombatControlsProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [turnTimer, setTurnTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Default turn time in seconds (6 minutes = 360 seconds)
  const DEFAULT_TURN_TIME = 360;
  const WARNING_TIME = 60; // Show warning when 1 minute left

  // Initialize timer on component mount
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []);

  // Start timer
  const startTimer = () => {
    if (!timerRunning && turnTimer > 0) {
      setTimerRunning(true);

      const interval = setInterval(() => {
        setTurnTimer((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimerInterval(interval);
    }
  };

  // Pause timer
  const pauseTimer = () => {
    setTimerRunning(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Reset timer
  const resetTimer = () => {
    pauseTimer();
    setTurnTimer(DEFAULT_TURN_TIME);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Calculate timer progress
  const timerProgress = (turnTimer / DEFAULT_TURN_TIME) * 100;
  const isTimerWarning = turnTimer <= WARNING_TIME && turnTimer > 0;
  const isTimerExpired = turnTimer === 0;

  // Get current combatant info
  const getCurrentCombatant = () => {
    if (combat.initiative_order.length === 0) return null;
    const currentIndex = combat.current_turn;
    if (currentIndex >= combat.initiative_order.length) return null;
    return combat.initiative_order[currentIndex];
  };

  const currentCombatant = getCurrentCombatant();

  // Handle next turn with timer reset
  const handleNextTurn = () => {
    onNextTurn();
    resetTimer();
    // Auto-start timer for next turn
    setTimeout(() => startTimer(), 100);
  };

  // Handle end combat confirmation
  const handleEndCombat = () => {
    pauseTimer();
    onEndCombat();
    setShowEndDialog(false);
  };

  return (
    <TooltipProvider>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Combat Controls
              <Badge
                variant={combat.status === "active" ? "default" : "secondary"}
              >
                {combat.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Round {combat.round}
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Turn Info */}
          {currentCombatant && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="font-medium">
                  Current Turn: {currentCombatant.name || currentCombatant.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentCombatant.type === "character"
                    ? "Player Character"
                    : "NPC"}{" "}
                  • Initiative {currentCombatant.initiative}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentCombatant.has_acted && (
                  <Badge variant="outline" className="text-xs">
                    Acted
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Turn Timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="font-medium">Turn Timer</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-mono ${
                    isTimerExpired
                      ? "text-red-600"
                      : isTimerWarning
                      ? "text-orange-600"
                      : "text-foreground"
                  }`}
                >
                  {formatTime(turnTimer)}
                </span>

                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={timerRunning ? pauseTimer : startTimer}
                        disabled={turnTimer === 0}
                      >
                        {timerRunning ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {timerRunning ? "Pause Timer" : "Start Timer"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={resetTimer}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset Timer</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Timer Progress Bar */}
            <Progress
              value={timerProgress}
              className={`h-2 ${
                isTimerExpired
                  ? "[&>div]:bg-red-600"
                  : isTimerWarning
                  ? "[&>div]:bg-orange-600"
                  : "[&>div]:bg-primary"
              }`}
            />

            {/* Timer Warnings */}
            {isTimerExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Turn timer has expired! Consider moving to the next combatant.
                </AlertDescription>
              </Alert>
            )}

            {isTimerWarning && !isTimerExpired && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Less than 1 minute remaining on turn timer.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNextTurn}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  Next Turn
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Advance to the next combatant in initiative order
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetTimer();
                    startTimer();
                  }}
                  className="flex items-center gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip Turn
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Skip current turn and move to next combatant
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={() => setShowEndDialog(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  End Combat
                </Button>
              </TooltipTrigger>
              <TooltipContent>End the current combat encounter</TooltipContent>
            </Tooltip>
          </div>

          {/* Combat Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {combat.round}
              </div>
              <div className="text-xs text-muted-foreground">Rounds</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {combat.initiative_order.length}
              </div>
              <div className="text-xs text-muted-foreground">Combatants</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {combat.initiative_order.filter((c) => c.has_acted).length}
              </div>
              <div className="text-xs text-muted-foreground">Acted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* End Combat Confirmation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Combat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this combat encounter? This action
              cannot be undone. All combat data will be saved to the combat
              history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Combat Summary:</p>
            <ul className="text-sm space-y-1">
              <li>• Round {combat.round}</li>
              <li>• {combat.initiative_order.length} combatants</li>
              <li>• {combat.events?.length || 0} recorded actions</li>
              <li>• {combat.conditions?.length || 0} active conditions</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndCombat}
              disabled={isLoading}
            >
              {isLoading ? "Ending..." : "End Combat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
