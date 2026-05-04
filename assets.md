# Asset Manifest: Doodle RTS Artistic Overhaul

Every asset in Doodle RTS is being transitioned from procedural shapes or web-sourced images to custom, user-drawable hand-drawn sketches. Use this checklist to track your progress as you create and apply each asset.

## 👥 Units
All units require a set of animations (frames 1-10).

- [ ] `ninja` - Fast, high-damage melee unit. (Idle, Walk, Attack, Die)
- [ ] `cowboy` - Ranged unit with medium armor. (Idle, Walk, Attack, Die)
- [ ] `pirate` - Heavy-duty tank unit. (Idle, Walk, Attack, Die)
- [ ] `doodle` - The basic worker unit. (Idle, Walk, Build, Harvest, Die)
- [ ] `vat` - Large liquid transport unit. (Idle, Walk (Empty), Walk (Full), Die)
- [ ] `stickman` - Swarm unit. (Idle, Walk, Attack, Die)
- [ ] `paperplane` - Aerial unit. (Idle, Walk, Attack, Die)
- [ ] `piousDoodle` - Religious unit. (Idle, Walk, Pray, Attack, Die)
- [ ] `protractor` - Siege unit. (Idle, Attack, Die)

## 🏰 Buildings
Buildings require specific states for different gameplay conditions.

- [ ] `castle` - Home base and Ink deposit. (Idle, Constructing)
- [ ] `dojo` - Training ground for Ninjas. (Idle, Training, Constructing)
- [ ] `saloon` - Training ground for Cowboys. (Idle, Training, Constructing)
- [ ] `docks` - Training ground for Pirates. (Idle, Training, Constructing)
- [ ] `furnace` - Refines Coal into Graphite. (Idle, Refining, Constructing)
- [ ] `theRip` - Sacred training and prayer site. (Idle, Training, Praying, Constructing)
- [ ] `sharpener` - Advanced research hub. (Idle, Training, Constructing)
- [ ] `coffeeShop` - Support structure for speed/damage. (Idle, Active, Constructing)
- [ ] `barrier` - Wall or defensive obstacle. (Static)

## 💎 Resources & Environmental
Environmental assets that fill the map.

- [ ] `ink_splat` - Infinite source of Ink. (Pulsing / Flowing)
- [ ] `coal_mine` - Source of Coal. (Static)
- [ ] `ink` - Pickable Ink blob. (Static)
- [ ] `coal` - Pickable Coal rock. (Static)
- [ ] `shavings` - Pickable Eraser Shavings. (Static)
- [ ] `eraser` - Pickable Eraser bits. (Static)
- [ ] `splatter` - Death effect / resource spill. (Static - Randomized)

## 🎨 UI & FX
Graphical effects for feedback.

- [ ] `selection_ring` - Circle around selected units.
- [ ] `target_reticle` - Indicator for attack targets.
- [ ] `smoke_puff` - FX for building completion.
- [ ] `sparkle` - FX for harvesting / building.
- [ ] `favicon` - Browser icon.
- [ ] `game_font` - Custom hand-drawn font.
