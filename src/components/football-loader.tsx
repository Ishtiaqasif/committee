import { SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";

export function FootballLoader({ className, withText = true }: { className?: string; withText?: boolean; }) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative w-20 h-20">
                <div className="absolute w-full h-full animate-football-bounce flex items-center justify-center">
                    <SoccerBall className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute bottom-0 w-10 h-2 left-1/2 -translate-x-1/2 bg-gray-400/30 dark:bg-gray-600/30 rounded-full animate-football-shadow"></div>
            </div>
            {withText && <p className="text-muted-foreground animate-pulse">Loading...</p>}
        </div>
    );
}
