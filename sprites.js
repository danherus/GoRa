// ================================================================
//  🎨 SPRITES.JS — ПИКСЕЛЬНАЯ графика (стиль Денди/Minecraft 2D)
// ================================================================

const SpriteFactory = {
    cache: {},

    get(name, size = 64) {
        const key = `${name}_${size}`;
        if (this.cache[key]) return this.cache[key];

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        this.draw(ctx, name, size);

        this.cache[key] = canvas;
        return canvas;
    },

    px(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    },

    draw(ctx, name, s) {
        ctx.clearRect(0, 0, s, s);
        switch (name) {
            case 'rat':             this.drawRat(ctx, s); break;
            case 'cat-red':         this.drawCat(ctx, s, 'red'); break;
            case 'cat-orange':      this.drawCat(ctx, s, 'orange'); break;
            case 'cat-blue':        this.drawCat(ctx, s, 'blue'); break;
            case 'cat-pink':        this.drawCat(ctx, s, 'pink'); break;
            case 'cat-green':       this.drawCat(ctx, s, 'green'); break;
            case 'cat-frightened':  this.drawFrightenedCat(ctx, s); break;
            case 'wheat':           this.drawWheat(ctx, s, false); break;
            case 'wheat-power':     this.drawWheat(ctx, s, true); break;
            case 'cheese':          this.drawCheese(ctx, s); break;
            case 'milk':            this.drawMilk(ctx, s); break;
            case 'trap':            this.drawTrap(ctx, s); break;
            case 'trap-set':        this.drawTrapSet(ctx, s); break;
            case 'cat-house':       this.drawCatHouse(ctx, s); break;
            case 'stunned-red':     this.drawStunned(ctx, s, '#e63946', '#a4161a'); break;
            case 'stunned-orange':  this.drawStunned(ctx, s, '#ff9f43', '#c77c1f'); break;
            case 'stunned-blue':    this.drawStunned(ctx, s, '#48dbfb', '#0abde3'); break;
            case 'stunned-pink':    this.drawStunned(ctx, s, '#f368e0', '#b533b0'); break;
            case 'stunned-green':   this.drawStunned(ctx, s, '#1dd1a1', '#128764'); break;
            case 'stunned':         this.drawStunned(ctx, s, '#999999', '#666666'); break;
        }
    },

    drawRat(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const FUR   = '#9a9a9a';
        const FUR_D = '#707070';
        const FUR_L = '#c0c0c0';
        const EAR   = '#f0a0a0';
        const EYE   = '#000000';
        const EYE_W = '#ffffff';
        const NOSE  = '#ff8ba0';
        const TAIL  = '#d68a8a';

        P(13, 9, 2, 1, TAIL);
        P(14, 10, 1, 2, TAIL);

        P(2, 3, 3, 3, FUR_D);
        P(10, 3, 3, 3, FUR_D);
        P(3, 4, 2, 1, EAR);
        P(11, 4, 2, 1, EAR);

        P(4, 6, 8, 6, FUR);
        P(3, 7, 1, 4, FUR);
        P(12, 7, 1, 4, FUR);

        P(4, 4, 8, 5, FUR);
        P(3, 6, 3, 3, FUR_L);

        P(6, 5, 1, 1, EYE);
        P(6, 5, 1, 1, EYE_W);

        P(3, 7, 1, 1, NOSE);

        P(4, 11, 2, 1, FUR_D);
        P(10, 11, 2, 1, FUR_D);

        P(2, 6, 2, 1, FUR_D);
        P(2, 8, 2, 1, FUR_D);
    },

    drawCat(ctx, s, colorName) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const palette = {
            red:    { main: '#e63946', dark: '#a4161a', light: '#f77f7f' },
            orange: { main: '#ff9f43', dark: '#c77c1f', light: '#ffc98c' },
            blue:   { main: '#48dbfb', dark: '#0abde3', light: '#a0e8ff' },
            pink:   { main: '#f368e0', dark: '#b533b0', light: '#f9b0f2' },
            green:  { main: '#1dd1a1', dark: '#128764', light: '#7eebc8' },
        };
        const col = palette[colorName] || palette.red;

        const EAR   = '#f0a0a0';
        const EYE_W = '#ffea00';
        const EYE_P = '#000000';
        const NOSE  = '#ff006e';
        const WHISK = '#ffffff';
        const MOUTH = '#000000';

        P(13, 8, 2, 1, col.dark);
        P(14, 9, 1, 1, col.dark);
        P(14, 10, 1, 1, col.main);

        P(2, 2, 1, 1, col.main);
        P(3, 2, 2, 1, col.main);
        P(2, 3, 3, 3, col.main);
        P(3, 3, 1, 2, col.light);
        P(12, 2, 2, 1, col.main);
        P(13, 2, 1, 1, col.main);
        P(11, 3, 3, 3, col.main);
        P(12, 3, 1, 2, col.light);

        P(4, 4, 8, 5, col.main);
        P(3, 7, 10, 6, col.main);
        P(2, 9, 1, 3, col.dark);
        P(13, 9, 1, 3, col.dark);

        P(5, 6, 6, 3, col.light);

        P(5, 5, 2, 2, '#000');
        P(5, 5, 2, 2, EYE_W);
        P(6, 5, 1, 2, EYE_P);
        P(9, 5, 2, 2, '#000');
        P(9, 5, 2, 2, EYE_W);
        P(9, 5, 1, 2, EYE_P);

        P(7, 7, 2, 1, NOSE);
        P(8, 8, 1, 1, NOSE);

        P(6, 9, 1, 1, MOUTH);
        P(9, 9, 1, 1, MOUTH);

        P(4, 12, 2, 1, col.dark);
        P(10, 12, 2, 1, col.dark);

        P(1, 6, 3, 1, WHISK);
        P(1, 8, 3, 1, WHISK);
        P(12, 6, 3, 1, WHISK);
        P(12, 8, 3, 1, WHISK);

        P(6, 10, 4, 3, col.light);
    },

    drawFrightenedCat(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const MAIN = '#00f5ff';
        const DARK = '#008fb3';
        const EYE  = '#ffffff';
        const PUP  = '#000000';
        const SWEAT = '#66f9ff';

        P(13, 8, 2, 1, DARK);
        P(14, 9, 1, 2, DARK);

        P(2, 2, 3, 3, MAIN);
        P(11, 2, 3, 3, MAIN);

        P(4, 4, 8, 5, MAIN);
        P(3, 7, 10, 6, MAIN);

        P(5, 5, 3, 3, '#000');
        P(5, 5, 3, 3, EYE);
        P(9, 5, 3, 3, '#000');
        P(9, 5, 3, 3, EYE);
        P(6, 6, 1, 1, PUP);
        P(10, 6, 1, 1, PUP);

        P(7, 9, 2, 1, PUP);
        P(7, 10, 2, 1, '#ff006e');

        P(13, 3, 1, 2, SWEAT);

        P(4, 12, 2, 1, DARK);
        P(10, 12, 2, 1, DARK);
    },

    drawWheat(ctx, s, power) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const STALK = power ? '#ffea00' : '#ffb84d';
        const GRAIN = power ? '#fff3b0' : '#ffd700';
        const GRAIN_D = power ? '#ffd700' : '#c9a227';
        const GLOW = power ? '#ffea00' : null;

        P(7, 8, 2, 7, STALK);
        P(5, 10, 2, 1, STALK);
        P(9, 11, 2, 1, STALK);

        P(6, 2, 4, 1, GRAIN);
        P(6, 3, 4, 1, GRAIN_D);
        P(5, 4, 6, 1, GRAIN);
        P(5, 5, 6, 1, GRAIN_D);
        P(6, 6, 4, 1, GRAIN);
        P(6, 7, 4, 1, GRAIN_D);

        P(7, 1, 2, 1, GRAIN);

        if (power && GLOW) {
            P(4, 3, 1, 1, GLOW);
            P(11, 3, 1, 1, GLOW);
            P(4, 6, 1, 1, GLOW);
            P(11, 6, 1, 1, GLOW);
            P(7, 0, 2, 1, GLOW);
        }
    },

    drawCheese(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const MAIN = '#ffea00';
        const DARK = '#ffb84d';
        const HOLE = '#ff9500';

        P(3, 5, 10, 8, MAIN);
        P(3, 5, 10, 1, DARK);
        P(3, 12, 10, 1, DARK);

        P(5, 7, 2, 2, HOLE);
        P(9, 9, 2, 2, HOLE);
        P(6, 10, 1, 1, HOLE);
        P(11, 6, 1, 1, HOLE);
    },

    drawMilk(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const GLASS = '#00f5ff';
        const MILK  = '#ffffff';
        const DARK  = '#008fb3';
        const SHADE = '#a0e8ff';

        P(4, 3, 8, 11, GLASS);
        P(5, 4, 6, 9, MILK);
        P(6, 5, 1, 6, SHADE);

        P(3, 2, 10, 2, DARK);
    },

    drawTrap(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const WOOD = '#ff006e';
        const WOOD_D = '#a4004e';
        const METAL = '#ffffff';
        const METAL_D = '#cccccc';
        const CHEESE = '#ffea00';

        P(2, 12, 12, 2, WOOD);
        P(2, 12, 12, 1, WOOD_D);
        P(3, 10, 1, 2, METAL);
        P(4, 9, 8, 1, METAL);
        P(12, 10, 1, 2, METAL);
        P(5, 8, 6, 1, METAL_D);
        P(7, 11, 2, 1, CHEESE);
    },

    drawTrapSet(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const WOOD = '#ff006e';
        const METAL = '#ffffff';
        const METAL_D = '#cccccc';
        const CHEESE = '#ffea00';

        P(3, 11, 10, 2, WOOD);
        P(4, 9, 8, 1, METAL);
        P(4, 10, 1, 1, METAL_D);
        P(11, 10, 1, 1, METAL_D);
        P(7, 10, 2, 1, CHEESE);
    },

    drawStunned(ctx, s, mainColor = '#999999', darkColor = '#666666') {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const EYE = '#000000';
        const STAR = '#ffea00';
        const EAR = '#f0a0a0';

        P(2, 2, 3, 3, mainColor);
        P(3, 3, 1, 1, EAR);
        P(11, 2, 3, 3, mainColor);
        P(12, 3, 1, 1, EAR);

        P(4, 4, 8, 5, mainColor);
        P(3, 7, 10, 6, mainColor);

        P(3, 7, 10, 1, darkColor);
        P(3, 12, 10, 1, darkColor);

        P(5, 5, 1, 1, EYE);
        P(7, 5, 1, 1, EYE);
        P(6, 6, 1, 1, EYE);
        P(5, 7, 1, 1, EYE);
        P(7, 7, 1, 1, EYE);

        P(9, 5, 1, 1, EYE);
        P(11, 5, 1, 1, EYE);
        P(10, 6, 1, 1, EYE);
        P(9, 7, 1, 1, EYE);
        P(11, 7, 1, 1, EYE);

        P(7, 9, 2, 1, '#ff006e');

        P(6, 1, 1, 1, STAR);
        P(9, 1, 1, 1, STAR);
        P(7, 0, 2, 1, STAR);

        P(1, 5, 1, 1, STAR);
        P(14, 5, 1, 1, STAR);
        P(0, 8, 1, 1, STAR);
        P(15, 8, 1, 1, STAR);
    },

    drawCatHouse(ctx, s) {
        const u = s / 16;
        const P = (x, y, w, h, c) => this.px(ctx, x * u, y * u, w * u, h * u, c);

        const WOOD = '#ff006e';
        const WOOD_D = '#a4004e';
        const ROOF = '#f100ff';
        const ROOF_D = '#99009e';
        const DOOR = '#0d001a';
        const GLOW = '#ffea00';

        P(2, 4, 12, 1, ROOF);
        P(3, 3, 10, 1, ROOF);
        P(4, 2, 8, 1, ROOF_D);
        P(5, 1, 6, 1, ROOF);

        P(3, 5, 10, 10, WOOD);
        P(3, 5, 10, 1, WOOD_D);

        P(6, 9, 4, 6, DOOR);
        P(6, 9, 4, 1, '#000');

        P(7, 11, 1, 1, GLOW);
        P(9, 11, 1, 1, GLOW);
    },
};