export default class Atrament {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.color = options.color || '#000000';
        this.weight = options.weight || 2;
        this.mode = 'draw';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.events = {};
        
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 30;

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.start(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stop());
        this.canvas.addEventListener('mouseleave', () => this.stop());
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.start(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.stop());
    }

    pushState() {
        this.undoStack.push(this.canvas.toDataURL());
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = []; // Clear redo stack on new action
    }

    undo() {
        if (this.undoStack.length === 0) return;
        
        const currentState = this.canvas.toDataURL();
        this.redoStack.push(currentState);
        
        const prevState = this.undoStack.pop();
        this.restoreState(prevState);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        
        const currentState = this.canvas.toDataURL();
        this.undoStack.push(currentState);
        
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
    }

    restoreState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            this.emit('dirty');
        };
        img.src = dataUrl;
    }

    start(e) {
        this.pushState();
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.lastY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.emit('strokestart');
    }

    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        
        // Jitter for pencil effect
        const jitter = this.mode === 'pencil' ? (Math.random() - 0.5) * (this.weight * 0.5) : 0;
        this.ctx.lineTo(x + jitter, y + jitter);
        
        if (this.mode === 'erase') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.globalAlpha = 1.0;
        } else if (this.mode === 'pencil') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 0.4; // Pencil is lighter
            this.ctx.strokeStyle = this.color;
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1.0;
            this.ctx.strokeStyle = this.color;
        }
        
        this.ctx.lineWidth = this.weight;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stop() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1.0;
            this.emit('dirty');
            this.emit('strokeend');
        }
    }

    clear(silent = false) {
        if (!silent) this.pushState();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!silent) {
            this.emit('dirty');
            // When switching frames or assets, we might want to clear stacks
            // but for simple 'clear' button, we should allow undoing the clear.
        }
    }

    addEventListener(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    get context() {
        return this.ctx;
    }
}
