export class Engine {
    constructor(game) {
        this.game = game;
        this.ctx = game.canvas.getContext('2d');
        this.lastTime = 0;
        this.isRunning = false;
        this.deltaTime = 0;
        this.isPaused = false;
    }

    start() {
        this.isRunning = true;
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time
        if (!this.lastTime) this.lastTime = currentTime;
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update
        if (!this.isPaused) {
            this.update(this.deltaTime);
        }

        // Render
        this.render();


        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        // Limit dt to avoid huge jumps if tab is inactive
        const cappedDt = Math.min(dt, 0.1);
        
        this.game.input.update(cappedDt);
        this.game.world.update(cappedDt);
        this.game.ui.update(cappedDt);
    }

    render() {
        const { width, height } = this.game.canvas;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw background grid/world
        this.game.world.render(this.ctx);

        // Draw input overlays (like selection box)
        this.game.input.render(this.ctx);
    }
}
