import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const STEPS = [
  'Analyzing content…',
  'Extracting key ideas…',
  'Generating posts…',
  'Polishing output…',
]

export default function LoadingScreen() {
  const containerRef = useRef()
  const stepRef = useRef()

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance
      gsap.from('.loading-inner', { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' })

      // Cycle through steps
      const tl = gsap.timeline({ repeat: -1 })
      STEPS.forEach((step, i) => {
        tl.to(stepRef.current, {
          duration: 0.3,
          opacity: 0,
          y: -8,
          ease: 'power2.in',
          onComplete: () => { if (stepRef.current) stepRef.current.textContent = step }
        })
        tl.fromTo(stepRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        )
        tl.to({}, { duration: i === STEPS.length - 1 ? 0.5 : 1.4 })
      })

      // Pulsing dots
      gsap.to('.dot', {
        opacity: 0.2,
        duration: 0.5,
        stagger: { each: 0.2, repeat: -1, yoyo: true },
        ease: 'power1.inOut'
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="loading-screen" ref={containerRef}>
      <div className="loading-inner">
        <div className="loading-dots" aria-hidden>
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
        <p className="loading-step" ref={stepRef} role="status" aria-live="polite">
          {STEPS[0]}
        </p>
      </div>
    </div>
  )
}
