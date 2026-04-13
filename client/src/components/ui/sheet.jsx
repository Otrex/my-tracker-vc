import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Sheet({ open, onOpenChange, title, children, className, side = 'bottom' }) {
  const isLeft = side === 'left';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm',
            isLeft ? 'items-stretch justify-start p-0' : 'items-end justify-center px-3 pb-3'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className={cn(
              'w-full border border-border bg-card p-4',
              isLeft ? 'safe-top safe-bottom h-full max-w-[320px] rounded-none border-l-0 border-y-0' : 'max-w-[520px] rounded-lg',
              className
            )}
            initial={isLeft ? { x: -80, opacity: 0 } : { y: 80, opacity: 0 }}
            animate={isLeft ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isLeft ? { x: -80, opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close sheet">
                <X size={20} />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
