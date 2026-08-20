import React from 'react'
import { motion } from 'framer-motion'

export default function ScrollReveal({ children, delay = 0, yOffset = 40, duration = 0.6 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
