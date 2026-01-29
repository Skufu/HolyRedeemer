import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { tabIndicatorTransition } from "@/lib/animations";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground relative",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const [isActive, setIsActive] = React.useState(false);
  const internalRef = React.useRef<HTMLButtonElement>(null);

  // Use a combined ref to access the DOM element
  React.useImperativeHandle(ref, () => internalRef.current!);

  React.useEffect(() => {
    const element = internalRef.current;
    if (!element) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-state") {
          setIsActive(element.getAttribute("data-state") === "active");
        }
      });
    });

    observer.observe(element, { attributes: true });

    // Initial check
    setIsActive(element.getAttribute("data-state") === "active");

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={internalRef}
      className={cn(
        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {!prefersReducedMotion && isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute inset-0.5 bg-background rounded-[calc(var(--radius)-4px)] shadow-sm -z-0"
          transition={tabIndicatorTransition}
        />
      )}
      {prefersReducedMotion && (
        <div className="absolute inset-0.5 bg-background rounded-[calc(var(--radius)-4px)] shadow-sm -z-10 hidden data-[state=active]:block" />
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
