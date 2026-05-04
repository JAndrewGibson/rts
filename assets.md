# Asset Manifest: Doodle RTS Artistic Overhaul

Every asset in Doodle RTS is being transitioned from procedural shapes or web-sourced images to custom, user-drawable hand-drawn sketches.

## 👥 Units
All units require a set of animations (frames 1-10).

| Asset ID | Description | Actions / Animations |
| :--- | :--- | :--- |
| `ninja` | Fast, high-damage melee unit. | Idle, Walk, Attack, Die |
| `cowboy` | Ranged unit with medium armor. | Idle, Walk, Attack, Die |
| `pirate` | Heavy-duty tank unit. | Idle, Walk, Attack, Die |
| `doodle` | The basic worker unit. | Idle, Walk, Build, Harvest, Die |
| `vat` | Large liquid transport unit. | Idle, Walk (Empty), Walk (Full), Die |

## 🏰 Buildings
Buildings require a "Construction" state and an "Idle/Active" state.

| Asset ID | Description | States |
| :--- | :--- | :--- |
| `castle` | Home base and Ink deposit. | Idle, Constructing |
| `dojo` | Training ground for Ninjas. | Idle, Training, Constructing |
| `saloon` | Training ground for Cowboys. | Idle, Training, Constructing |
| `docks` | Training ground for Pirates. | Idle, Training, Constructing |
| `furnace` | Refines Coal into Graphite. | Idle, Refining, Constructing |
| `coffeeShop`| Support structure for speed/damage.| Idle, Active, Constructing |
| `barrier` | Wall or defensive obstacle. | Static |

## 💎 Resources & Environmental
Environmental assets that fill the map.

| Asset ID | Description | Behavior |
| :--- | :--- | :--- |
| `ink_splat` | Infinite source of Ink. | Pulsing / Flowing |
| `coal_mine` | Source of Coal. | Static |
| `ink` | Pickable Ink blob. | Static |
| `coal` | Pickable Coal rock. | Static |
| `shavings` | Pickable Eraser Shavings. | Static |
| `eraser` | Pickable Eraser bits. | Static |
| `splatter` | Death effect / resource spill. | Static (Randomized) |

## 🎨 UI & FX
Graphical effects for feedback.

| Asset ID | Description |
| :--- | :--- |
| `selection_ring` | Circle around selected units. |
| `target_reticle` | Indicator for attack targets. |
| `smoke_puff` | FX for building completion. |
| `sparkle` | FX for harvesting / building. |
