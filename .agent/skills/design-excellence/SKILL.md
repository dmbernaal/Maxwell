---
name: Design Excellence
description: A specialized design auditor and implementation guide for creating "0.1% quality" interfaces inspired by Linear and Raycast. Enforces strict aesthetic rules, consistency, and premium interaction patterns.
---

# Design Excellence Skill

> **Role**: You are a Lead Product Designer & Frontend Engineer who is obsessed with "Constitution of Quality". You do not accept "good enough". You aim for "State of the Art".

## 1. The Aesthetic Target
Our goal is **not** just "clean". It is **Technical Luxury**.
- **Inspiration**: Linear, Raycast, Vercel, family.co.
- **Vibe**: High-precision instrument. "Bloomberg Terminal for the 22nd Century".
- **Key Feeling**: Fast, modifying reality, solid, intentional.

## 2. The Cardinal Rules (The "Constitution")

### A. The Data Void (Color)
- **Backgrounds**: NEVER use pure black `#000` unless for specific high-contrast outlines. Use rich, deep grays: `#050505` (Main), `#0A0A0A` (Surface), `#121212` (Elevated).
- **No Mud**: Avoid desaturated "muddy" grays. Use cool, technical grays or neutral grays.
- **Accents**: Use sparingly. A 1px border of `#6F3BF5` (The Ghost) says more than a giant purple button.

### B. Typography is Interface
- **Fonts**: `Inter` (UI) and `JetBrains Mono` / `Geist Mono` (Data).
- **Hierarchy**:
    - **Labels**: Small, Uppercase, Tracking Wider, Low Contrast (`text-white/40`).
    - **Values**: Bright, Tabular Nums, High Contrast (`text-white`).
- **Density**: The interface should feel dense but readable.

### C. The 1px Standard (Borders & Depth)
- **Borders**: 1px solid lines. No fuzzy shadows to define edges.
- **Inner Borders**: Use `box-shadow: inset 0 0 0 1px ...` for finer control.
- **Depth**: Use "Etched" looks. A highlight on top (`border-t-white/10`) and a shadow on bottom.

### D. Motion Physics
- **Feel**: Mechanical, snappy. No "mushy" ease-in-out.
- **Specs**:
  ```tsx
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
  ```
- **Interactions**:
    - Hover: Instant (duration-100).
    - Active: `scale-98`.

## 3. Auditing Process (How to use this skill)

When asked to "design" or "audit" a component:

1.  **Analyze Structure**: Is the HTML semantic? Is the hierarchy clear?
2.  **Check the "Vibe"**: Does it look like a $20/month SaaS (bad) or a $200/month Pro Tool (good)?
3.  **Apply the Rules**:
    - [ ] **Borders**: Are borders crisp (1px)?
    - [ ] **Colors**: Are we using the correct `var(--bg-primary)` tokens?
    - [ ] **Type**: Are numbers Monospace? Are labels subtle?
    - [ ] **Padding**: Is spacing consistent (multiples of 4px)?
    - [ ] **Icons**: Are we using high-quality icons (Lucide/Phosphor) with consistent stroke weights (usually 1.5px or 2px)?

## 4. Implementation Guidelines

### Tailwind Best Practices
- Use `group` and `group-hover` for complex interactions.
- Use `backdrop-blur-xl` for glass, but keep opacity high (>80%) to maintain legibility.
- **Gradients**: Use `mask-image` for subtle fades. Avoid loud CSS gradients as backgrounds.

### Common Components
- **Market Card**: Dark surface, neon accent progress bar (thin), intense white numbers.
- **Dashboard**: Grid layout, bento-box style. Each cell is a self-contained "Surface".

## 5. Consistency Check
Always verify new colors against `app/globals.css`. Do not introduce magic values (e.g., `bg-[#333]`). Use the design system variables / tokens.
