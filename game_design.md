 DoodleRTS: Official Game Design Document

## I. Project Vision
**DoodleRTS** is a competitive, browser-based real-time strategy (RTS) experience that utilizes a hand-drawn, "sketchbook" aesthetic. Players assume the role of **The Illustrator**, commanding ink-based legions on a dynamic digital canvas to achieve total creative hegemony.

## II. The Resource Economy (The Stationery Quartet)
The economy utilizes four distinct resources to balance unit production, structural fortification, and transient tactical advantages:

1.  **Ink Blots (Biological/Fluid):** The primary currency for manifesting sentient doodles.
2.  **Eraser Shavings (Substrate):** Harvested from "mistakes" on the map; used for defensive architecture and structural repairs.
3.  **Graphite Core (Mineral):** A rare resource required for permanent upgrades and high-tier structural integrity.
4.  **Coffee Stains (Transient):** A volatile catalyst that provides temporary velocity and production throughput buffs.

## III. Combat Archetypes (The Triumvirate)
The core combat logic follows a rigorous Rock-Paper-Scissors (RPS) methodology:

| Unit | Role | Counter | Attribute |
| :--- | :--- | :--- | :--- |
| **Cowboy** | Ranged / DPS | Ninja | **Ballistic Accuracy:** Pierces armor; lethal at distance. |
| **Ninja** | Stealth / Melee | Pirate | **Evasion:** High mobility; utilizes "ink clouds" for obscuration. |
| **Pirate** | Tank / AoE | Cowboy | **Grit:** High durability; deals splash damage via "Grape Shot." |

### Expanded Roster
* **Stick-Man Swarm:** Expendable scouts; exponential lethality in high-density clusters.
* **Paper Plane Aviators:** Tactical aerial units that bypass terrestrial obstacles.
* **Protractor Mecha:** Late-game siege engine utilizing geometric energy beams.

## IV. Architecture & Tech Tree
* **The Sketchpad (Command Center):** The nexus of the player’s presence; produces "Pencil Gatherers."
* **The Inkwell (Foundry):** Refines raw Ink Blots into combat-ready units.
* **The Sharpener (Tech Lab):** Facilitates "The Revisionist" upgrades (e.g., Cross-Hatching for armor, Fine-Tip Nibs for damage).
* **The Ruler Fence (Fortification):** Linear barriers that dictate and disrupt enemy pathfinding.

## V. The Creative Engine (UGC & Customization)
To preserve the ludic flow of PvP while fostering creative agency, the game features a decoupled **Asset Workshop**:

* **The Vellum Workshop:** An asynchronous interface where players trace "Master Sketches" to create custom visual packs.
* **Vector Serialization:** Custom skins are stored as SVG path data to ensure crisp rendering at any resolution.
* **Visual Mods:** Players can share and download "Ink Packs" (e.g., Neon Highlighter, Charcoal, Blueprint) as purely cosmetic overrides.

## VI. User Experience & Accessibility
* **Chromative Identification:** Players select unique team colors during the pre-match handshake.
* **Accessibility Mode:** Includes a specialized **Color-Blind Toggle** that standardizes all hostile entities as high-contrast Red, ensuring immediate threat recognition.

## VII. Technical Architecture
* **Backend:** **Flask** utilized as the core application framework.
* **Real-Time State:** **Flask-SocketIO** for low-latency synchronization of unit positions and health.
* **Frontend:** **Canvas API** for high-performance rendering of the "sketching" animations and vector-based assets.
* **Database:** PostgreSQL for persistent storage of user-generated vector manifests.