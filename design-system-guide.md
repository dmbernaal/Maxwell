# Maxwell Design System Guide

> **Version:** 1.0  
> **Last Updated:** 2026-02-04  
> **Status:** ACTIVE - All new components MUST follow this guide

---

## **PHILOSOPHY**

Maxwell uses a **terminal-inspired, grid-based aesthetic** with strict systematic constraints. Every pixel should feel intentional, every spacing calculated, every color purposeful.

**Core Principles:**
1. **System over intuition** - Never eyeball; always reference this guide
2. **Consistency is king** - Same patterns everywhere
3. **Restraint with accent** - Orange (#FA5D19) is precious, use sparingly
4. **Hierarchy through structure** - Headers, sections, content follow strict sizing

---

## **1. TYPOGRAPHY SCALE**

### **The 4-Size System**

| Size | Usage | Weight | Transform | Letter Spacing |
|------|-------|--------|-----------|----------------|
| `text-[10px]` | Meta labels, metadata, counts, badges | `font-medium` | `uppercase` | `tracking-wider` |
| `text-[12px]` | Navigation, tabs, secondary labels | `font-medium` | varies | `tracking-wide` |
| `text-[14px]` | Body text, primary content, data values | `font-normal` or `font-medium` | none | default |
| `text-[16px]` | Section titles ONLY | `font-semibold` | `uppercase` | `tracking-tight` |

### **Font Families**

| Family | Usage |
|--------|-------|
| `font-mono` | Labels, data, metadata, navigation, timestamps |
| `font-sans` | Body text, descriptions, prose content |

**Rule:** Headers are often mono (labels/metadata), content is often sans (readable prose).

### **DO NOT USE**

❌ `text-[8px]` - Too small  
❌ `text-[9px]` - Non-standard  
❌ `text-[11px]` - Too close to 10px/12px  
❌ `text-[13px]` - Redundant with 12px/14px  
❌ `text-[15px]` - One-off, not in system  
❌ `text-xs`, `text-sm`, `text-base`, `text-lg` - Use explicit pixel values

---

## **2. COLOR SYSTEM**

### **Background Colors**

| Color | Usage |
|-------|-------|
| `#0A0A0A` | Deepest background (rare) |
| `#111111` | Main panel background, header backgrounds |
| `#141414` | Content sections, card backgrounds |
| `#1A1A1A` | Hover states, elevated surfaces |

### **Text Colors (White Opacity Scale)**

| Opacity | Hex Equivalent | Usage |
|---------|---------------|-------|
| `text-white/90` | ~#E5E5E5 | Primary text, important data |
| `text-white/70` | ~#B3B3B3 | Secondary text, less important |
| `text-white/60` | ~#999999 | Body text, descriptions |
| `text-white/40` | ~#666666 | Muted labels, placeholders |
| `text-white/30` | ~#4D4D4D | Disabled, subtle hints |
| `text-white/10` | ~#1A1A1A | Very subtle, dividers |

### **DO NOT USE (Deprecated)**

❌ `#e8e8e8` → Use `text-white/90`  
❌ `#A3A3A3` → Use `text-white/60`  
❌ `#666666` → Use `text-white/40`  
❌ `#525252` → Use `text-white/30`  
❌ `#EDEDED` → Use `text-white/90`

### **Accent & Semantic Colors**

| Color | Usage |
|-------|-------|
| `#FA5D19` | Brand orange - CTAs, active states, highlights |
| `#4ade80` | Success, positive, verified |
| `#f87171` | Error, risk, negative, disputed |
| `#fbbf24` | Warning, uncertain, attention |

---

## **3. SPACING SYSTEM**

### **Padding**

| Value | Usage |
|-------|-------|
| `p-4` (16px) | Compact content, tight spaces |
| `p-6` (24px) | Standard content padding |
| `px-6 py-4` | Panel content (asymmetric vertical) |

**Rule:** Use symmetric padding (`p-6`) unless specific layout needs require asymmetric.

### **DO NOT USE**

❌ `pl-10`, `pr-10` - Asymmetric padding is deprecated  
❌ Arbitrary values like `p-[18px]` - Stick to 4px scale

### **Header Heights**

| Height | Usage |
|--------|-------|
| `h-14` (56px) | Main panel headers (Maxwell top bar) |
| `h-12` (48px) | Section headers (Thesis, Outcomes, Sources) |
| `h-10` (40px) | Subsection headers (MarketDataPanel) |

**Hierarchy:** Main (56px) > Section (48px) > Subsection (40px)

---

## **4. BORDER SYSTEM**

### **Border Colors**

| Color | Usage |
|-------|-------|
| `border-[#2A2A2A]` | Structural borders, section dividers |
| `border-white/[0.08]` | Subtle dividers, inner separators |

### **DO NOT USE**

❌ `border-white/[0.06]` → Use `border-[#2A2A2A]`  
❌ `border-white/[0.04]` → Use `border-[#2A2A2A]`  
❌ `border-white/10` → Use `border-white/[0.08]`

---

## **5. CORNER DECORATIONS**

Corner decorations are a **signature design element**. Use consistently:

```tsx
<CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
<CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
<CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
<CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
```

**Rules:**
- Place on main container elements
- Use `z-30` to ensure visibility
- Offset by `-10px` (top/bottom) and `-11px` (left/right)

---

## **6. COMPONENT PATTERNS**

### **Panel Section Pattern**

```tsx
function PanelSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col border-b border-[#2A2A2A] last:border-0 ${className}`}>
      {children}
    </div>
  );
}
```

### **Panel Header Pattern**

```tsx
function PanelHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center px-6 h-10 shrink-0 bg-[#111111] ${className}`}>
      {children}
    </div>
  );
}
```

### **Section Header (Maxwell)**

```tsx
<div className="h-12 flex items-center px-6 border-b border-[#2A2A2A] select-none">
  <div className="flex items-center gap-2">
    <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
    <span className="font-semibold text-[16px] text-white tracking-tight uppercase">
      Section Title
    </span>
  </div>
</div>
```

### **Content Area**

```tsx
<div className="p-6 bg-[#141414] relative overflow-visible">
  {/* Content here */}
  <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
  <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
</div>
```

---

## **7. QUICK REFERENCE CHEAT SHEET**

### **Creating a New Section**

```tsx
<section className="border-b border-[#2A2A2A] relative overflow-visible">
  {/* Corner decorations on container */}
  <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
  <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
  
  {/* Header */}
  <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A] select-none">
    <span className="font-semibold text-[16px] text-white tracking-tight uppercase">
      Section Name
    </span>
  </div>
  
  {/* Content */}
  <div className="p-6 bg-[#141414]">
    <p className="text-[14px] text-white/60 leading-relaxed">
      Content goes here
    </p>
  </div>
  
  {/* Bottom corners */}
  <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
  <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
</section>
```

### **Data Label + Value Pattern**

```tsx
<div className="flex flex-col items-start">
  <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-1 select-none">
    Label
  </span>
  <span className="text-[14px] font-mono tabular-nums text-white/90 tracking-tight">
    Value
  </span>
</div>
```

### **Meta Info Row**

```tsx
<div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
  <span>Meta:</span>
  <span className="text-white/60 tabular-nums">Value</span>
</div>
```

---

## **8. COMMON MISTAKES TO AVOID**

### **Typography**

❌ **Don't:** Mix text sizes randomly  
✅ **Do:** Stick to 10px/12px/14px/16px only

❌ **Don't:** Use `text-xs` or `text-sm` (ambiguous)  
✅ **Do:** Use explicit `text-[12px]` or `text-[14px]`

❌ **Don't:** Use `font-bold` for headers  
✅ **Do:** Use `font-semibold` or `font-medium`

### **Colors**

❌ **Don't:** Use hex colors for text (#A3A3A3, #525252)  
✅ **Do:** Use white opacity (text-white/60, text-white/30)

❌ **Don't:** Use arbitrary opacity values (white/[0.07])  
✅ **Do:** Stick to standard scale (90/70/60/40/30/10)

### **Spacing**

❌ **Don't:** Use asymmetric padding (pl-10)  
✅ **Do:** Use symmetric padding (p-6)

❌ **Don't:** Arbitrary spacing values  
✅ **Do:** Stick to 4px scale (4, 8, 12, 16, 24, 32)

### **Headers**

❌ **Don't:** Same height for all headers  
✅ **Do:** Use hierarchy: 56px > 48px > 40px

❌ **Don't:** Inconsistent header styling  
✅ **Do:** All section headers: 16px, semibold, uppercase

---

## **9. CHECKLIST: BEFORE COMMITTING**

Before submitting any UI code, verify:

- [ ] Only 4 font sizes used: 10px, 12px, 14px, 16px
- [ ] No hex text colors (use white opacity)
- [ ] Symmetric padding only
- [ ] Header heights follow hierarchy
- [ ] Corner decorations on main containers
- [ ] Border colors are #2A2A2A or white/[0.08]
- [ ] Build passes without errors

---

## **10. EXAMPLES BY COMPONENT TYPE**

### **Labels/Metadata**

```tsx
// Good
<span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono">
  Label
</span>

// Bad
<span className="text-[11px] text-[#666666]">Label</span>
```

### **Body Text**

```tsx
// Good
<p className="text-[14px] text-white/60 leading-relaxed">
  Content here
</p>

// Bad
<p className="text-sm text-[#A3A3A3]">
  Content here
</p>
```

### **Section Title**

```tsx
// Good
<h2 className="text-[16px] font-semibold text-white tracking-tight uppercase">
  Title
</h2>

// Bad
<h2 className="text-[13px] font-medium text-white">
  Title
</h2>
```

### **Data Value**

```tsx
// Good
<span className="text-[14px] font-mono tabular-nums text-white/90">
  $1.2M
</span>

// Bad
<span className="text-[13px] text-[#EDEDED]">
  $1.2M
</span>
```

---

## **CHANGELOG**

### **v1.0 - 2026-02-04**
- Initial design system documentation
- Consolidated typography to 4 sizes
- Migrated from hex to white opacity colors
- Standardized header heights
- Removed asymmetric padding patterns

---

## **QUESTIONS?**

When in doubt:
1. Check this guide first
2. Look at existing components for patterns
3. Ask: "Does this match the system?"
4. If still unsure, reference `HeaderSection.tsx` or `AssessmentSection.tsx` as canonical examples

**Remember: The system is your friend. Consistency is professionalism.**
