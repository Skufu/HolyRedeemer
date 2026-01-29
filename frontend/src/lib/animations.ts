import { Variants, Transition } from 'framer-motion';

// ============================================
// Duration Constants (in seconds)
// ============================================
export const DURATIONS = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
} as const;

// ============================================
// Easing Functions
// ============================================
export const EASINGS = {
  // Standard easings
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  
  // Spring-like easings
  backOut: [0.34, 1.56, 0.64, 1],
  backIn: [0.36, 0, 0.66, -0.56],
  backInOut: [0.68, -0.55, 0.265, 1.55],
  
  // Bouncy
  bouncy: [0.68, -0.55, 0.265, 1.55],
  
  // Smooth
  smooth: [0.25, 0.1, 0.25, 1],
} as const;

// ============================================
// Shared Transition Presets
// ============================================
export const transitions = {
  fast: {
    duration: DURATIONS.fast,
    ease: EASINGS.easeOut,
  } as Transition,
  
  normal: {
    duration: DURATIONS.normal,
    ease: EASINGS.easeOut,
  } as Transition,
  
  slow: {
    duration: DURATIONS.slow,
    ease: EASINGS.easeOut,
  } as Transition,
  
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,
  
  springBouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,
  
  backOut: {
    duration: DURATIONS.normal,
    ease: EASINGS.backOut,
  } as Transition,
} as const;

// ============================================
// Fade Variants
// ============================================
export const fadeVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
};

export const fadeInUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: transitions.fast,
  },
};

export const fadeInDownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: transitions.fast,
  },
};

// ============================================
// Scale Variants (for modals, popovers)
// ============================================
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.backOut,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: transitions.fast,
  },
};

export const scaleInVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      ...transitions.backOut,
      duration: DURATIONS.slow,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: transitions.fast,
  },
};

// ============================================
// Slide Variants
// ============================================
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: '100%' 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      ...transitions.spring,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    transition: transitions.normal,
  },
};

export const slideDownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: transitions.fast,
  },
};

export const slideFromRightVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: 20 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: transitions.fast,
  },
};

export const slideFromLeftVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: transitions.fast,
  },
};

// ============================================
// Backdrop Variants
// ============================================
export const backdropVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
};

// ============================================
// Stagger Container Variants
// ============================================
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: transitions.fast,
  },
};

// ============================================
// List Item Variants (for AnimatePresence lists)
// ============================================
export const listItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: transitions.normal,
  },
  exit: { 
    opacity: 0, 
    x: 20,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// ============================================
// Card Hover Variants
// ============================================
export const cardHoverVariants: Variants = {
  initial: { 
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  hover: { 
    y: -4,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: transitions.spring,
  },
  tap: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    transition: transitions.fast,
  },
};

// ============================================
// Button Press Variants
// ============================================
export const buttonPressVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

// ============================================
// Pulse Animation (for QR scanner, loading states)
// ============================================
export const pulseVariants: Variants = {
  initial: {
    boxShadow: '0 0 0 0 rgba(var(--primary), 0.4)',
  },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(var(--primary), 0.4)',
      '0 0 0 10px rgba(var(--primary), 0)',
      '0 0 0 0 rgba(var(--primary), 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const pulseRingVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// Sidebar Variants
// ============================================
export const sidebarVariants: Variants = {
  collapsed: {
    width: '4rem',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  expanded: {
    width: '16rem',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

export const sidebarItemVariants: Variants = {
  collapsed: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.2,
    },
  },
  expanded: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
};

// ============================================
// Toast/Notification Variants
// ============================================
export const toastVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20,
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      ...transitions.backOut,
      duration: DURATIONS.slow,
    },
  },
  exit: { 
    opacity: 0, 
    x: '100%',
    transition: transitions.normal,
  },
};

// ============================================
// Tab Indicator Variants (for layoutId)
// ============================================
export const tabIndicatorTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

// ============================================
// Page Transition Variants
// ============================================
export const pageVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: DURATIONS.slow,
      ease: EASINGS.easeOut,
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

// ============================================
// Count Up Animation Helper
// ============================================
export const countUpTransition: Transition = {
  duration: 1.5,
  ease: EASINGS.easeOut,
};

// ============================================
// Utility Functions
// ============================================

/**
 * Creates staggered children variants with custom delay
 */
export function createStaggerVariants(
  staggerDelay: number = 0.05,
  childDuration: number = DURATIONS.normal
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  };
}

/**
 * Creates a fade variant with custom direction
 */
export function createFadeVariants(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance: number = 10
): Variants {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const sign = direction === 'up' || direction === 'left' ? 1 : -1;
  
  return {
    hidden: { 
      opacity: 0, 
      [axis]: distance * sign 
    },
    visible: { 
      opacity: 1, 
      [axis]: 0,
      transition: transitions.normal,
    },
    exit: { 
      opacity: 0, 
      [axis]: distance * sign * -1,
      transition: transitions.fast,
    },
  };
}
